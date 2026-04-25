import { Injectable, inject } from '@angular/core';
import { MissionContract } from '../models/mission.model';
import { Shuriken, DamageType, ArmorType } from '../models/hardware.model';
import { GambitRoutine } from '../models/gambit.model';
import { StrikeResult, ShurikenSimulationState, SimulationContext } from '../models/combat.model';
import { WorkshopService } from './workshop.service';

@Injectable({ providedIn: 'root' })
export class CombatSimulationService {
   private workshop = inject(WorkshopService);

   /**
    * Official Effectiveness Matrix (Table 4.0)
    */
   private readonly effectivenessMatrix: Record<DamageType, Record<ArmorType, number>> = {
      'SLASHING': { 'UNARMORED': 1.5, 'HEAVY_ARMOR': 0.2, 'ENERGY_SHIELD': 0.8 },
      'KINETIC': { 'UNARMORED': 1.0, 'HEAVY_ARMOR': 1.5, 'ENERGY_SHIELD': 0.5 },
      'ENERGY': { 'UNARMORED': 1.0, 'HEAVY_ARMOR': 1.0, 'ENERGY_SHIELD': 2.0 },
      'EMP': { 'UNARMORED': 0.0, 'HEAVY_ARMOR': 0.0, 'ENERGY_SHIELD': 100.0 } // 100x to simulate "Instantly Breaks"
   };

   simulateStrike(mission: MissionContract, shurikens: Shuriken[]): StrikeResult {
      const totalTicks = mission.durationSeconds;
      const logs: string[] = [];
      const routinesMap = this.workshop.routinesMap();

      // 1. Calculate Initial Final Stats for each Shuriken
      const shurikenStates: ShurikenSimulationState[] = shurikens.map(s => {
         const f = s.formDesign;
         const h = s.hull;
         const e = s.engine;
         const b = s.blade;
         const p = s.processor;

         return {
            id: s.id,
            name: s.name,
            // Survival
            hp: h?.maxHp || 100,
            maxHp: h?.maxHp || 100,
            armorValue: (h?.armorValue || 0) * (f?.armorMult || 1.0),
            shields: h?.shieldCapacity || 0,
            maxShields: h?.shieldCapacity || 0,
            evasionRate: e?.evasionRate || 0.0,
            // Mobility
            baseWeight: (h?.weight || 20) * (f?.weightMult || 1.0),
            topSpeed: (e?.topSpeed || 50) * (f?.speedMult || 1.0),
            acceleration: e?.acceleration || 10,
            currentSpeed: 0,
            // Energy
            energy: s.energyCell?.maxEnergy || 100,
            maxEnergy: s.energyCell?.maxEnergy || 100,
            energyRegen: s.energyCell?.energyRegen || 2,
            passiveDrain: (e?.energyDrain || 5) + (b?.energyDrain || 0),
            // Offense
            baseDamage: (b?.baseDamage || 10) * (f?.damageMult || 1.0),
            damageType: (b?.damageType as DamageType) || 'SLASHING',
            critChance: (b?.critChance || 0.05) * (f?.critChanceMult || 1.0),
            critMultiplier: b?.critMultiplier || 1.5,
            latency: p?.latency || 0.2,
            coordinationMode: s.coordinationMode,
            masterId: s.masterId,
            isExhausted: false,
            routines: routinesMap[s.id] || [],
            // State
            isStealthed: false,
            evasionBuff: 0
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
         shurikenStates.forEach(s => {
            if (s.hp <= 0) return;

            // 3.0 Physics & Energy Update
            s.isStealthed = false; // Reset stealth/evasion buffs each tick unless action reapplies
            s.evasionBuff = 0;

            s.energy = Math.min(s.maxEnergy, s.energy + s.energyRegen - s.passiveDrain);
            s.isExhausted = s.energy <= 0;

            let effectiveTopSpeed = s.topSpeed;
            if (s.isExhausted) {
               effectiveTopSpeed *= 0.5;
               if (s.energy < 0) s.energy = 0;
            }

            s.currentSpeed = Math.min(effectiveTopSpeed, s.currentSpeed + (s.acceleration * (1 - (s.baseWeight / 1000))));

            // 5.0 Gambit Evaluation
            const validRoutine = s.routines.find(r => {
               if (!r.trigger || !r.action) return false;
               return this.evaluateTrigger(r.trigger.id, s, { enemyHull, enemyShields, mission, tick, logs });
            });

            const actionToTake = validRoutine?.action?.id || 'actionStandardStrike';
            const enemyRef = { hull: enemyHull, shields: enemyShields };
            this.executeAction(actionToTake, s, { enemyRef, mission, tick, logs });
            enemyHull = enemyRef.hull;
            enemyShields = enemyRef.shields;
         });

         // Enemy Counter-Attack
         if ((enemyHull + enemyShields) > 0) {
            shurikenStates.forEach(s => {
               if (s.hp <= 0 || s.isStealthed) return;

               if (Math.random() < 0.2) { // 20% chance for enemy to target this shuriken
                  let enemyDmg = Math.floor(10 + (tick * 0.4));
                  let effectiveEvasion = s.evasionRate + s.evasionBuff;
                  if (s.isExhausted) effectiveEvasion = 0;

                  if (Math.random() <= effectiveEvasion) {
                     logs.push(`${s.name}: [EVADED] Evasive thrusters active.`);
                  } else {
                     if (s.shields > 0) {
                        const sDmg = Math.min(s.shields, enemyDmg);
                        s.shields -= sDmg;
                        enemyDmg -= sDmg;
                        logs.push(`HOSTILE: Beam-Pulse -> ${s.name} (Shields: -${Math.ceil(sDmg)})`);
                     }
                     if (enemyDmg > 0 && s.hp > 0) {
                        const netDmg = Math.max(1, enemyDmg - (s.armorValue / 5));
                        s.hp = Math.max(0, s.hp - netDmg);
                        logs.push(`HOSTILE: Impact -> ${s.name} (Hull: -${Math.ceil(netDmg)}) [REM: ${Math.ceil(s.hp)} HP]`);
                     }
                  }
               }
            });
         }

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

      const lootMultiplier = success ? 1 : 0.05;
      const polymer = Math.floor(this.rng(mission.potentialLoot.polymerMin, mission.potentialLoot.polymerMax) * lootMultiplier);
      const scrap = Math.floor(this.rng(mission.potentialLoot.scrapMin, mission.potentialLoot.scrapMax) * lootMultiplier);
      const credits = Math.floor(mission.potentialLoot.creditsBonus * lootMultiplier);

      return { success, totalPolymer: polymer, totalScrap: scrap, totalCredits: credits, logs, initialSquadHP, initialEnemyHP };
   }

   private evaluateTrigger(id: string, s: ShurikenSimulationState, ctx: SimulationContext): boolean {
      switch (id) {
         case 'ifEnemyInMeleeRange': return true;
         case 'ifEnemyInSight': return true;
         case 'ifEnemyIsShielded': return (ctx.enemyShields || 0) > 0;
         case 'ifEnemyIsOrganic': return ctx.mission.armorType === 'UNARMORED';
         case 'ifSelfHpCritical': return s.hp < (s.maxHp * 0.2);
         case 'ifEnergyHigh': return s.energy > (s.maxEnergy * 0.8);
         case 'ifIncomingProjectile': return Math.random() < 0.3;
         default: return false;
      }
   }

   private executeAction(id: string, s: ShurikenSimulationState, ctx: SimulationContext) {
      // Only execute on latency ticks
      if (ctx.tick % Math.max(1, Math.floor(s.latency * 10)) !== 0) return;

      const { enemyRef, mission, logs } = ctx;
      if (!enemyRef || (enemyRef.hull + enemyRef.shields) <= 0) return;

      // Energy check
      const energyCost = this.workshop.availableActions().find(a => a.id === id)?.energyCost || 0;
      if (s.energy < energyCost) {
         // Fallback to standard strike if not enough energy
         id = 'actionStandardStrike';
      } else {
         s.energy -= energyCost;
      }

      if (id === 'actionEvasiveManeuver') {
         s.evasionBuff = 1.0;
         logs.push(`${s.name}: [ACTION] Executing Evasive Maneuvers.`);
         return;
      }

      if (id === 'actionActivateCloak') {
         s.isStealthed = true;
         logs.push(`${s.name}: [ACTION] Cloak engaged.`);
         return;
      }

      if (id === 'actionRetreat') {
         logs.push(`${s.name}: [ACTION] Emergency extraction vectors set.`);
         return;
      }

      // Attack Actions
      let isCrit = Math.random() <= s.critChance;
      let grossDamage = s.baseDamage * (isCrit ? s.critMultiplier : 1.0);

      // Momentum Scaling (Kinetic or Ram)
      if (s.damageType === 'KINETIC' || id === 'actionKineticRam') {
         const momentumMultiplier = 1.0 + ((s.currentSpeed / 100) * (s.baseWeight / 100));
         grossDamage *= momentumMultiplier;
         if (id === 'actionKineticRam') grossDamage *= 1.5;
      }

      // Matrix Multiplier
      const currentArmorType: ArmorType = enemyRef.shields > 0 ? 'ENERGY_SHIELD' : mission.armorType;
      const matrix = this.effectivenessMatrix[s.damageType] || this.effectivenessMatrix['SLASHING'];
      const multiplier = matrix[currentArmorType] || 1.0;
      grossDamage *= multiplier;

      // Energy weapon check
      if (s.isExhausted && s.damageType === 'ENERGY') {
         logs.push(`${s.name}: [EXHAUSTED] Energy blade offline.`);
         return;
      }

      // Evasion Check
      if (Math.random() <= mission.enemyEvasionRate) {
         logs.push(`${s.name}: [EVADED] Hostile maneuver successful.`);
      } else {
         let netDamage = Math.max(1, grossDamage - (enemyRef.shields > 0 ? 0 : mission.armorValue));

         if (enemyRef.shields > 0) {
            const sDmg = Math.min(enemyRef.shields, netDamage);
            enemyRef.shields -= sDmg;
            logs.push(`${s.name}: ${isCrit ? '[CRIT] ' : ''}Shield Hit (-${Math.ceil(sDmg)} S) [REM: ${Math.ceil(enemyRef.shields + enemyRef.hull)}]`);
         } else {
            const hDmg = Math.min(enemyRef.hull, netDamage);
            enemyRef.hull -= hDmg;
            logs.push(`${s.name}: ${isCrit ? '[CRIT] ' : ''}Hull Hit (-${Math.ceil(hDmg)} H) [REM: ${Math.ceil(enemyRef.hull)}]`);
         }
      }
   }

   private rng(min: number, max: number): number {
      return Math.floor(Math.random() * (max - min + 1)) + min;
   }

}
