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
            reactionTime: p?.reactionTime || 0.2,
            processorSpeed: p?.processorSpeed || 5,
            coordinationMode: s.coordinationMode,
            masterId: s.masterId,
            isExhausted: false,
            routines: routinesMap[s.id] || [],
            // State
            isStealthed: false,
            evasionBuff: 0,
            chaosModeTicks: 0,
            rebootTicks: 0,
            rechargeBoostTicks: 0
         };
      });

      // Enemy Stats
      let enemyHull = mission.hull;
      let enemyShields = mission.shields;
      const initialEnemyHP = enemyHull + enemyShields;
      const initialSquadHP = shurikenStates.reduce((acc, s) => acc + s.hp + s.shields, 0);

      let success = false;
      let enemyAttackCooldown = 0;

      // Track next available action time for each shuriken
      const shurikenNextAction = new Map<string, number>();
      shurikenStates.forEach(s => shurikenNextAction.set(s.id, 0));

      logs.push(`[SYSTEM] STRIKE INITIATED: ${mission.targetName}`);
      logs.push(`[SYSTEM] RESISTANCE: ${mission.expectedResistance} [H:${enemyHull} S:${enemyShields} A:${mission.armorValue}]`);

      // Simulation runs in 0.1s increments for precision, but logs are tagged by second
      const timeStep = 0.1;
      const totalTime = mission.durationSeconds;

      for (let time = 0; time <= totalTime; time += timeStep) {
         const currentSecond = Math.floor(time);
         
         // 1. Shuriken Actions
         shurikenStates.forEach(s => {
            if (s.hp <= 0) return;

            // Tick down states
            if (s.chaosModeTicks > 0) s.chaosModeTicks--;
            if (s.rebootTicks > 0) s.rebootTicks--;
            if (s.rechargeBoostTicks > 0) s.rechargeBoostTicks--;

            // Physics & Energy Update (scaled by timeStep)
            const isRebooting = s.rebootTicks > 0;
            const energyEfficiency = s.rechargeBoostTicks > 0 ? 1.5 : 1.0;
            
            if (!isRebooting) {
               s.energy = Math.min(s.maxEnergy, s.energy + ((s.energyRegen * energyEfficiency) - s.passiveDrain) * timeStep);
               if (s.energy <= 0) {
                  s.energy = 0;
                  s.rebootTicks = 30; // 3 seconds at 0.1s steps
                  logs.push(`${s.name}: [CRITICAL] Energy Depleted. Initiating Emergency Reboot.`);
               }
            } else if (s.rebootTicks === 1) {
               // Recovery phase
               s.energy = s.maxEnergy * 0.3;
               s.rechargeBoostTicks = 30; // 3 seconds of 150% regen
               logs.push(`${s.name}: [SYSTEM] Reboot Complete. Energy restored to 30%.`);
            }

            s.isExhausted = s.energy < (s.maxEnergy * 0.05); // Minor threshold for "Low Power"

            let effectiveTopSpeed = s.topSpeed;
            if (isRebooting) effectiveTopSpeed = 0;
            else if (s.isExhausted) effectiveTopSpeed *= 0.5;
            
            s.currentSpeed = Math.min(effectiveTopSpeed, s.currentSpeed + (s.acceleration * (1 - (s.baseWeight / 1000))) * timeStep);

            // Action Check
            if (!isRebooting && time >= (shurikenNextAction.get(s.id) || 0)) {
               // Calculate Reaction Time
               let rxMult = 1.0 + (s.baseWeight / 250) - (s.acceleration / 25) - (s.processorSpeed / 25);
               rxMult = Math.max(0.2, rxMult);
               
               let effectiveRX = s.reactionTime * rxMult;

               // Swarm Buffs
               if (s.coordinationMode === 'SLAVE' && s.chaosModeTicks <= 0) {
                  const master = shurikenStates.find(m => m.id === s.masterId && m.hp > 0);
                  if (master) {
                     effectiveRX *= 0.85; // 15% reduction
                  } else {
                     // Master destroyed! Enter Chaos Mode
                     s.chaosModeTicks = 50; // 5 seconds
                     logs.push(`${s.name}: [ERROR] Master Link Lost. Entering Chaos Mode.`);
                  }
               }

               // Find valid routine with fallback logic
               let actionToTake = 'actionStandardStrike';
               const routines = s.routines;
               
               if (s.chaosModeTicks > 0) {
                  // Chaos Mode: Basic attacks only, erratic movement
                  actionToTake = 'actionStandardStrike';
               } else {
                  for (const r of routines) {
                     if (!r.trigger || !r.action) continue;
                     if (this.evaluateTrigger(r.trigger.id, s, { enemyHull, enemyShields, mission, tick: currentSecond, logs })) {
                        // Check energy cost for action
                        const energyCost = this.workshop.availableActions().find(act => act.id === r.action?.id)?.energyCost || 0;
                        if (s.energy >= energyCost) {
                           actionToTake = r.action.id;
                           break; // Found valid action
                        } else {
                           // Fallback to next routine (as per section 5.0)
                           continue;
                        }
                     }
                  }
               }

               const enemyRef = { hull: enemyHull, shields: enemyShields };
               const logCountBefore = logs.length;
               
               this.executeAction(actionToTake, s, { enemyRef, mission, tick: currentSecond, logs });
               
               if (logs.length > logCountBefore) {
                  shurikenNextAction.set(s.id, time + effectiveRX);
               }
               
               enemyHull = enemyRef.hull;
               enemyShields = enemyRef.shields;
            }

            // Telemetry Log (for UI consumption)
            logs.push(`[TELEMETRY] ${s.name}: E:${Math.floor(s.energy)}/${s.maxEnergy} R:${s.rebootTicks}`);
         });

         // 2. Enemy Counter-Attack (Fair Cooldown scaling with Tier)
         if ((enemyHull + enemyShields) > 0 && time >= enemyAttackCooldown) {
            const targets = shurikenStates.filter(s => s.hp > 0 && !s.isStealthed);
            if (targets.length > 0) {
               const s = targets[Math.floor(Math.random() * targets.length)];
               
               let enemyDmg = Math.floor(10 + (currentSecond * 0.5));
               
               // Reboot vulnerability
               if (s.rebootTicks > 0) enemyDmg *= 1.5;

               let effectiveEvasion = Math.min(0.75, s.evasionRate + s.evasionBuff);
               if (s.isExhausted || s.rebootTicks > 0) effectiveEvasion = 0;

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
               
               // Enemy attack frequency scales with Tier
               let minCd = 1.5, maxCd = 2.5;
               if (mission.difficulty.includes('Tier II')) { minCd = 0.8; maxCd = 1.5; }
               else if (mission.difficulty.includes('Tier III')) { minCd = 0.4; maxCd = 0.8; }
               
               enemyAttackCooldown = time + minCd + (Math.random() * (maxCd - minCd));
            }
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

      return { 
         success, 
         totalPolymer: polymer, 
         totalScrap: scrap, 
         totalCredits: credits, 
         logs, 
         initialSquadHP, 
         initialEnemyHP,
         initialEnemyHull: mission.hull,
         initialEnemyShields: mission.shields
      };
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
      if (ctx.tick % Math.max(1, Math.floor(s.reactionTime * 10)) !== 0) return;

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
         s.evasionBuff = 0.5; // Will be capped at 0.75 in the check
         logs.push(`${s.name}: [ACTION] Executing Evasive Maneuvers.`);
         return;
      }

      if (id === 'actionActivateCloak') {
         s.isStealthed = true;
         logs.push(`${s.name}: [ACTION] Cloak engaged.`);
         return;
      }

      if (id === 'actionEmergencyReboot') {
         s.rebootTicks = 30; // 3 seconds
         logs.push(`${s.name}: [ACTION] Manual Reboot Initiated.`);
         return;
      }

      if (id === 'actionEmergencyWithdrawal') {
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
            if (enemyRef.shields <= 0) {
               logs.push(`[SYSTEM] ${mission.targetName}: SHIELD SHATTERED.`);
            }
         } else {
            const hDmg = Math.min(enemyRef.hull, netDamage);
            const hullWasFull = enemyRef.hull === mission.hull;
            enemyRef.hull -= hDmg;
            logs.push(`${s.name}: ${isCrit ? '[CRIT] ' : ''}Hull Hit (-${Math.ceil(hDmg)} H) [REM: ${Math.ceil(enemyRef.hull)}]`);
            if (hullWasFull && enemyRef.hull < mission.hull) {
               logs.push(`[SYSTEM] ${mission.targetName}: HULL BREACHED.`);
            }
         }
      }
   }

   private rng(min: number, max: number): number {
      return Math.floor(Math.random() * (max - min + 1)) + min;
   }

}
