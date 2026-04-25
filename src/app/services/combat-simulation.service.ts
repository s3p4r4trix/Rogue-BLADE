import { Injectable, inject } from '@angular/core';
import { MissionContract } from '../models/mission.model';
import { Shuriken, DamageType, ArmorType } from '../models/hardware.model';
import { WorkshopService } from './workshop.service';

export interface StrikeResult {
  success: boolean;
  totalPolymer: number;
  totalScrap: number;
  totalCredits: number;
  logs: string[];
  initialSquadHP: number;
  initialEnemyHP: number;
}

@Injectable({ providedIn: 'root' })
export class CombatSimulationService {
  private workshop = inject(WorkshopService);

  /**
   * Official Effectiveness Matrix (Table 4.0)
   */
  private readonly effectivenessMatrix: Record<DamageType, Record<ArmorType, number>> = {
    'SLASHING': { 'UNARMORED': 1.5, 'HEAVY_ARMOR': 0.2, 'ENERGY_SHIELD': 0.8 },
    'KINETIC':  { 'UNARMORED': 1.0, 'HEAVY_ARMOR': 1.5, 'ENERGY_SHIELD': 0.5 },
    'ENERGY':   { 'UNARMORED': 1.0, 'HEAVY_ARMOR': 1.0, 'ENERGY_SHIELD': 2.0 },
    'EMP':      { 'UNARMORED': 0.0, 'HEAVY_ARMOR': 0.0, 'ENERGY_SHIELD': 100.0 } // 100x to simulate "Instantly Breaks"
  };

  simulateStrike(mission: MissionContract, shurikens: Shuriken[]): StrikeResult {
    const totalTicks = mission.durationSeconds;
    const logs: string[] = [];
    
    // 1. Calculate Initial Final Stats for each Shuriken
    const shurikenStates = shurikens.map(s => {
      const form = s.formDesign;
      const hull = s.hull;
      const engine = s.engine;
      const blade = s.blade;
      const proc = s.processor;

      // Apply Multipliers
      const f_speedMult = form?.speedMult || 1.0;
      const f_weightMult = form?.weightMult || 1.0;
      const f_dmgMult = form?.damageMult || 1.0;
      const f_critMult = form?.critChanceMult || 1.0;
      const f_armorMult = form?.armorMult || 1.0;

      return {
        id: s.id,
        name: s.name,
        // Survival
        hp: hull?.maxHp || 100,
        maxHp: hull?.maxHp || 100,
        armorValue: (hull?.armorValue || 0) * f_armorMult,
        shields: hull?.shieldCapacity || 0,
        maxShields: hull?.shieldCapacity || 0,
        evasionRate: engine?.evasionRate || 0.0,
        // Mobility
        baseWeight: (hull?.weight || 20) * f_weightMult,
        topSpeed: (engine?.topSpeed || 50) * f_speedMult,
        acceleration: engine?.acceleration || 10,
        currentSpeed: 0,
        // Energy
        energy: s.energyCell?.maxEnergy || 100,
        maxEnergy: s.energyCell?.maxEnergy || 100,
        energyRegen: s.energyCell?.energyRegen || 2,
        passiveDrain: (engine?.energyDrain || 5) + (blade?.energyDrain || 0),
        // Offense
        baseDamage: (blade?.baseDamage || 10) * f_dmgMult,
        damageType: blade?.damageType || 'SLASHING',
        critChance: (blade?.critChance || 0.05) * f_critMult,
        critMultiplier: blade?.critMultiplier || 1.5,
        latency: proc?.latency || 0.2,
        isExhausted: false
      };
    });

    // Enemy Stats
    let enemyHull = mission.hull;
    let enemyShields = mission.shields;
    const initialEnemyHP = enemyHull + enemyShields;
    const initialSquadHP = shurikenStates.reduce((acc, s) => acc + s.hp + s.shields, 0);

    let success = false;

    logs.push(`[SYSTEM] STRIKE INITIATED: ${mission.targetName}`);
    logs.push(`[SYSTEM] RESISTANCE: ${mission.expectedResistance} [H:${enemyHull} S:${enemyShields} A:${mission.armorValue}]`);

    for (let tick = 1; tick <= totalTicks; tick++) {
      const time = tick;
      
      shurikenStates.forEach(s => {
        if (s.hp <= 0) return;

        // 3.0 Physics & Energy Update
        s.energy = Math.min(s.maxEnergy, s.energy + s.energyRegen - s.passiveDrain);
        s.isExhausted = s.energy <= 0;
        
        // 3.3 Exhaustion Penalties
        let effectiveTopSpeed = s.topSpeed;
        let effectiveEvasion = s.evasionRate;
        if (s.isExhausted) {
           effectiveTopSpeed *= 0.5;
           effectiveEvasion = 0;
           if (s.energy < 0) s.energy = 0;
        }

        // 3.1 Acceleration Math
        s.currentSpeed = Math.min(effectiveTopSpeed, s.currentSpeed + (s.acceleration * (1 - (s.baseWeight / 1000))));

        // 4.1 Damage Calculation (Attack Phase)
        if ((enemyHull + enemyShields) > 0) {
           // Energy exhaustion check for Energy weapons
           if (s.isExhausted && s.damageType === 'ENERGY') {
              logs.push(`[T+${time}s] ${s.name}: [EXHAUSTED] Energy blade offline.`);
           } else {
              // 4.1.1 Roll for Crit
              const isCrit = Math.random() <= s.critChance;
              let grossDamage = s.baseDamage * (isCrit ? s.critMultiplier : 1.0);

              // 3.2 Momentum Scaling (Kinetic Only)
              if (s.damageType === 'KINETIC') {
                 const momentumMultiplier = 1.0 + ((s.currentSpeed / 100) * (s.baseWeight / 100));
                 grossDamage *= momentumMultiplier;
              }

              // 4.1.2 Matrix Multiplier
              const currentArmorType: ArmorType = enemyShields > 0 ? 'ENERGY_SHIELD' : mission.armorType;
              const multiplier = this.effectivenessMatrix[s.damageType][currentArmorType];
              grossDamage *= multiplier;

              // 4.1.3 Armor Mitigation & Evasion
              if (Math.random() <= mission.enemyEvasionRate) {
                 logs.push(`[T+${time}s] ${s.name}: [EVADED] Hostile maneuver successful.`);
              } else {
                 let netDamage = Math.max(1, grossDamage - (enemyShields > 0 ? 0 : mission.armorValue));
                 
                 if (enemyShields > 0) {
                    const sDmg = Math.min(enemyShields, netDamage);
                    enemyShields -= sDmg;
                    logs.push(`[T+${time}s] ${s.name}: ${isCrit ? '[CRIT] ' : ''}Shield Hit (-${Math.ceil(sDmg)} S) [REM: ${Math.ceil(enemyShields + enemyHull)}]`);
                 } else {
                    const hDmg = Math.min(enemyHull, netDamage);
                    enemyHull -= hDmg;
                    logs.push(`[T+${time}s] ${s.name}: ${isCrit ? '[CRIT] ' : ''}Hull Hit (-${Math.ceil(hDmg)} H) [REM: ${Math.ceil(enemyHull)}]`);
                 }
              }
           }
        }

        // Enemy Counter-Attack (Simplified per tick)
        if ((enemyHull + enemyShields) > 0 && Math.random() < 0.3) {
           let enemyDmg = Math.floor(10 + (tick * 0.4));
           // Evasion Check for Shuriken
           if (Math.random() <= effectiveEvasion) {
              logs.push(`[T+${time}s] ${s.name}: [EVADED] Evasive thrusters active.`);
           } else {
              if (s.shields > 0) {
                 const sDmg = Math.min(s.shields, enemyDmg);
                 s.shields -= sDmg;
                 enemyDmg -= sDmg;
              }
              if (enemyDmg > 0) {
                 s.hp = Math.max(0, s.hp - (enemyDmg - s.armorValue / 5)); // Simplified armor for shuriken
                 logs.push(`[T+${time}s] HOSTILE: Impact -> ${s.name} (-${Math.ceil(enemyDmg)} HP) [REM: ${Math.ceil(s.hp)}]`);
              }
           }
        }
      });

      if (shurikenStates.every(s => s.hp <= 0)) {
        logs.push(`[CRITICAL] SQUAD DESTROYED.`);
        break;
      }

      if ((enemyHull + enemyShields) <= 0) {
        success = true;
        logs.push(`[SYSTEM] MISSION OBJECTIVE NEUTRALIZED.`);
        break;
      }
    }

    // Final calculations...
    const lootMultiplier = success ? 1 : 0.05;
    const polymer = Math.floor(this.rng(mission.potentialLoot.polymerMin, mission.potentialLoot.polymerMax) * lootMultiplier);
    const scrap = Math.floor(this.rng(mission.potentialLoot.scrapMin, mission.potentialLoot.scrapMax) * lootMultiplier);
    const credits = Math.floor(mission.potentialLoot.creditsBonus * lootMultiplier);

    return { success, totalPolymer: polymer, totalScrap: scrap, totalCredits: credits, logs, initialSquadHP, initialEnemyHP };
  }

  private rng(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
