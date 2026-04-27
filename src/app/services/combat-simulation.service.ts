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
    * Defines the damage multiplier based on Damage Type vs. Armor Type.
    */
   private readonly effectivenessMatrix: Record<DamageType, Record<ArmorType, number>> = {
      'SLASHING': { 'UNARMORED': 1.5, 'HEAVY_ARMOR': 0.2, 'ENERGY_SHIELD': 0.8 },
      'KINETIC': { 'UNARMORED': 1.0, 'HEAVY_ARMOR': 1.5, 'ENERGY_SHIELD': 0.5 },
      'ENERGY': { 'UNARMORED': 1.0, 'HEAVY_ARMOR': 1.0, 'ENERGY_SHIELD': 2.0 },
      'EMP': { 'UNARMORED': 0.0, 'HEAVY_ARMOR': 0.0, 'ENERGY_SHIELD': 100.0 } // 100x to simulate instant shield depletion.
   };

   /**
    * Simulates a liberation strike in a high-fidelity offline mode.
    * Logic: Runs a tick-based simulation calculating AI decisions, physics, and combat resolutions.
    * @param mission The mission contract details.
    * @param shurikens The array of shurikens participating in the strike.
    * @returns A StrikeResult containing logs and outcome data.
    */
   simulateStrike(mission: MissionContract, shurikens: Shuriken[]): StrikeResult {
      const combatLogs: string[] = [];
      const routinesMap = this.workshop.routinesMap();

      // 1. Initial State Mapping: Convert shuriken data into simulation-friendly state objects.
      const shurikenStates: ShurikenSimulationState[] = shurikens.map(shuriken => {
         const formDesign = shuriken.formDesign;
         const hull = shuriken.hull;
         const engine = shuriken.engine;
         const blade = shuriken.blade;
         const processor = shuriken.processor;

         return {
            id: shuriken.id,
            name: shuriken.name,
            // Survival Stats
            hp: hull?.maxHp || 100,
            maxHp: hull?.maxHp || 100,
            armorValue: (hull?.armorValue || 0) * (formDesign?.armorMult || 1.0),
            shields: 0,
            maxShields: 0,
            evasionRate: engine?.evasionRate || 0.0,
            // Mobility Stats
            baseWeight: ((hull?.weight || 20) * (formDesign?.weightMult || 1.0)) + 
                        (engine?.weight || 0) + (shuriken.energyCell?.weight || 0) + (shuriken.sensor?.weight || 0) + 
                        (blade?.weight || 0) + (processor?.weight || 0) + (shuriken.semiAI?.weight || 0) + 
                        (shuriken.shield?.weight || 0) + (shuriken.reactor?.weight || 0),
            topSpeed: (engine?.topSpeed || 50) * (formDesign?.speedMult || 1.0),
            acceleration: engine?.acceleration || 10,
            currentSpeed: 0,
            // Energy Stats
            energy: shuriken.energyCell?.maxEnergy || 100,
            maxEnergy: shuriken.energyCell?.maxEnergy || 100,
            energyRegen: shuriken.reactor?.energyRegen || 2,
            passiveDrain: (engine?.energyDrain || 5) + (blade?.energyDrain || 0),
            // Offense Stats
            baseDamage: (blade?.baseDamage || 10) * (formDesign?.damageMult || 1.0),
            damageType: (blade?.damageType as DamageType) || 'SLASHING',
            critChance: (blade?.critChance || 0.05) * (formDesign?.critChanceMult || 1.0),
            critMultiplier: blade?.critMultiplier || 1.5,
            reactionTime: processor?.reactionTime || 0.2,
            processorSpeed: processor?.processorSpeed || 5,
            coordinationMode: shuriken.coordinationMode,
            masterId: shuriken.masterId,
            isExhausted: false,
            routines: routinesMap[shuriken.id] || [],
            // Active Buffs/States
            isStealthed: false,
            evasionBuff: 0,
            chaosModeTicks: 0,
            rebootTicks: 0,
            rechargeBoostTicks: 0
         };
      });

      // 2. Enemy and Squad Metadata
      let enemyHull = mission.hull;
      let enemyShields = 0; // Shield implementation deferred for this version.
      const initialEnemyHP = enemyHull + enemyShields;
      const initialSquadHP = shurikenStates.reduce((accumulator, state) => accumulator + state.hp + state.shields, 0);

      let success = false;
      let enemyAttackCooldown = 0;

      // Tracking reaction delays per shuriken.
      const shurikenNextAction = new Map<string, number>();
      shurikenStates.forEach(state => shurikenNextAction.set(state.id, 0));

      combatLogs.push(`[SYSTEM] STRIKE INITIATED: ${mission.targetName}`);
      combatLogs.push(`[SYSTEM] RESISTANCE: ${mission.expectedResistance} [H:${enemyHull} S:${enemyShields} A:${mission.armorValue}]`);

      const timeStep = 0.1; // 100ms precision for simulation resolution.
      const totalTime = mission.durationSeconds;

      // 3. Main Simulation Loop
      for (let currentTime = 0; currentTime <= totalTime; currentTime += timeStep) {
         const currentSecond = Math.floor(currentTime);
         
         shurikenStates.forEach(shuriken => {
            if (shuriken.hp <= 0) return;

            // Tick down temporal state effects.
            if (shuriken.chaosModeTicks > 0) shuriken.chaosModeTicks--;
            if (shuriken.rebootTicks > 0) shuriken.rebootTicks--;
            if (shuriken.rechargeBoostTicks > 0) shuriken.rechargeBoostTicks--;

            // Logic: Physics & Energy updates based on time step.
            const isRebooting = shuriken.rebootTicks > 0;
            const energyEfficiency = shuriken.rechargeBoostTicks > 0 ? 1.5 : 1.0;
            
            if (!isRebooting) {
               shuriken.energy = Math.min(shuriken.maxEnergy, shuriken.energy + ((shuriken.energyRegen * energyEfficiency) - shuriken.passiveDrain) * timeStep);
               if (shuriken.energy <= 0) {
                  shuriken.energy = 0;
                  shuriken.rebootTicks = 30; // Emergency shutdown for 3 seconds.
                  combatLogs.push(`${shuriken.name}: [CRITICAL] Energy Depleted. Initiating Emergency Reboot.`);
               }
            } else if (shuriken.rebootTicks === 1) {
               // Recovery phase: Restore partial energy and apply temporary regen boost.
               shuriken.energy = shuriken.maxEnergy * 0.3;
               shuriken.rechargeBoostTicks = 30;
               combatLogs.push(`${shuriken.name}: [SYSTEM] Reboot Complete. Energy restored to 30%.`);
            }

            shuriken.isExhausted = shuriken.energy < (shuriken.maxEnergy * 0.05);

            let effectiveTopSpeed = shuriken.topSpeed;
            if (isRebooting) effectiveTopSpeed = 0;
            else if (shuriken.isExhausted) effectiveTopSpeed *= 0.5;
            
            shuriken.currentSpeed = Math.min(effectiveTopSpeed, shuriken.currentSpeed + (shuriken.acceleration * (1 - (shuriken.baseWeight / 1000))) * timeStep);

            // Action Evaluation Logic
            if (!isRebooting && currentTime >= (shurikenNextAction.get(shuriken.id) || 0)) {
               // Reaction Time: Influenced by weight, acceleration, and processor speed.
               let reactionTimeMultiplier = 1.0 + (shuriken.baseWeight / 250) - (shuriken.acceleration / 25) - (shuriken.processorSpeed / 25);
               reactionTimeMultiplier = Math.max(0.2, reactionTimeMultiplier);
               
               let effectiveReactionTime = shuriken.reactionTime * reactionTimeMultiplier;

               // Coordination Buff: Slaves react faster when their master is online.
               if (shuriken.coordinationMode === 'SLAVE' && shuriken.chaosModeTicks <= 0) {
                  const master = shurikenStates.find(m => m.id === shuriken.masterId && m.hp > 0);
                  if (master) {
                     effectiveReactionTime *= 0.85; 
                  } else {
                     shuriken.chaosModeTicks = 50; 
                     combatLogs.push(`${shuriken.name}: [ERROR] Master Link Lost. Entering Chaos Mode.`);
                  }
               }

               // Gambit Logic: Iterate through routines until a valid trigger is met.
               let actionIdToTake = 'actionStandardStrike';
               const routines = shuriken.routines;
               
               if (shuriken.chaosModeTicks > 0) {
                  actionIdToTake = 'actionStandardStrike';
               } else {
                  for (const routine of routines) {
                     if (!routine.trigger || !routine.action) continue;
                     if (this.evaluateTrigger(routine.trigger.id, shuriken, { enemyHull, enemyShields, mission, tick: currentSecond, logs: combatLogs })) {
                        const energyCost = this.workshop.availableActions().find(action => action.id === routine.action?.id)?.energyCost || 0;
                        if (shuriken.energy >= energyCost) {
                           actionIdToTake = routine.action.id;
                           break; 
                        }
                     }
                  }
               }

               const enemyState = { hull: enemyHull, shields: enemyShields };
               const logCountBefore = combatLogs.length;
               
               this.executeAction(actionIdToTake, shuriken, { enemyRef: enemyState, mission, tick: currentSecond, logs: combatLogs });
               
               if (combatLogs.length > logCountBefore) {
                  shurikenNextAction.set(shuriken.id, currentTime + effectiveReactionTime);
               }
               
               enemyHull = enemyState.hull;
               enemyShields = enemyState.shields;
            }

            // High-frequency telemetry for UI synchronization.
            combatLogs.push(`[TELEMETRY] ${shuriken.name}: H:${Math.ceil(shuriken.hp)}/${shuriken.maxHp} S:${Math.ceil(shuriken.shields)}/${shuriken.maxShields} E:${Math.floor(shuriken.energy)}/${shuriken.maxEnergy} R:${shuriken.rebootTicks}`);
         });

         // 4. Enemy Response Logic
         if ((enemyHull + enemyShields) > 0 && currentTime >= enemyAttackCooldown) {
            const validTargets = shurikenStates.filter(state => state.hp > 0 && !state.isStealthed);
            if (validTargets.length > 0) {
               const target = validTargets[Math.floor(Math.random() * validTargets.length)];
               
               let enemyDamage = Math.floor(10 + (currentSecond * 0.5)); // Damage ramps over time.
               if (target.rebootTicks > 0) enemyDamage *= 1.5;

               let effectiveEvasion = Math.min(0.75, target.evasionRate + target.evasionBuff);
               if (target.isExhausted || target.rebootTicks > 0) effectiveEvasion = 0;

               if (Math.random() <= effectiveEvasion) {
                  combatLogs.push(`${target.name}: [EVADED] Evasive thrusters active.`);
               } else {
                  if (target.shields > 0) {
                     const shieldDamage = Math.min(target.shields, enemyDamage);
                     target.shields -= shieldDamage;
                     enemyDamage -= shieldDamage;
                     combatLogs.push(`HOSTILE: Beam-Pulse -> ${target.name} (Shields: -${Math.ceil(shieldDamage)})`);
                  }
                  if (enemyDamage > 0 && target.hp > 0) {
                     const netDamage = Math.max(1, enemyDamage - (target.armorValue / 5));
                     target.hp = Math.max(0, target.hp - netDamage);
                     combatLogs.push(`HOSTILE: Impact -> ${target.name} (Hull: -${Math.ceil(netDamage)}) [REM: ${Math.ceil(target.hp)} HP]`);
                  }
               }
               
               // Enemy cooldown scales with mission difficulty (Tier).
               let minCooldown = 1.5, maxCooldown = 2.5;
               if (mission.difficulty.includes('Tier II')) { minCooldown = 0.8; maxCooldown = 1.5; }
               else if (mission.difficulty.includes('Tier III')) { minCooldown = 0.4; maxCooldown = 0.8; }
               
               enemyAttackCooldown = currentTime + minCooldown + (Math.random() * (maxCooldown - minCooldown));
            }
         }

         // Termination Checks
         if (shurikenStates.every(state => state.hp <= 0)) {
            combatLogs.push(`[CRITICAL] SQUAD DESTROYED.`);
            break;
         }

         if ((enemyHull + enemyShields) <= 0) {
            success = true;
            combatLogs.push(`[SYSTEM] MISSION OBJECTIVE NEUTRALIZED.`);
            break;
         }
      }

      // 5. Reward Calculation
      const lootMultiplier = success ? 1 : 0.05;
      const polymer = Math.floor(this.rng(mission.potentialLoot.polymerMin, mission.potentialLoot.polymerMax) * lootMultiplier);
      const scrap = Math.floor(this.rng(mission.potentialLoot.scrapMin, mission.potentialLoot.scrapMax) * lootMultiplier);
      const credits = Math.floor(mission.potentialLoot.creditsBonus * lootMultiplier);

      return { 
         success, 
         totalPolymer: polymer, 
         totalScrap: scrap, 
         totalCredits: credits, 
         logs: combatLogs, 
         initialSquadHP, 
         initialEnemyHP,
         initialEnemyHull: mission.hull,
         initialEnemyShields: mission.shields
      };
   }

   /**
    * Evaluates whether a gambit trigger condition is met.
    * @param id The trigger ID.
    * @param state Current shuriken state.
    * @param context Global simulation context.
    */
   private evaluateTrigger(id: string, state: ShurikenSimulationState, context: SimulationContext): boolean {
      switch (id) {
         case 'ifEnemyInMeleeRange': return true;
         case 'ifEnemyInSight': return true;
         case 'ifEnemyIsShielded': return (context.enemyShields || 0) > 0;
         case 'ifEnemyIsOrganic': return context.mission.armorType === 'UNARMORED';
         case 'ifSelfHpCritical': return state.hp < (state.maxHp * 0.2);
         case 'ifEnergyHigh': return state.energy > (state.maxEnergy * 0.8);
         case 'ifIncomingProjectile': return Math.random() < 0.3;
         default: return false;
      }
   }

   /**
    * Executes a specific shuriken action and modifies the simulation state.
    * Logic: Applies damage multipliers and matrix effectiveness.
    * @param id The action ID to execute.
    * @param state The shuriken performing the action.
    * @param context Global simulation context.
    */
   private executeAction(id: string, state: ShurikenSimulationState, context: SimulationContext) {
      // Logic: Reaction speed check.
      if (context.tick % Math.max(1, Math.floor(state.reactionTime * 10)) !== 0) return;

      const { enemyRef, mission, logs } = context;
      if (!enemyRef || (enemyRef.hull + enemyRef.shields) <= 0) return;

      // Logic: Energy cost verification and deduction.
      const energyCost = this.workshop.availableActions().find(action => action.id === id)?.energyCost || 0;
      if (state.energy < energyCost) {
         // Logic: Fallback to basic strike if energy reserves are insufficient.
         id = 'actionStandardStrike';
      } else {
         state.energy -= energyCost;
      }

      if (id === 'actionEvasiveManeuver') {
         state.evasionBuff = 0.5;
         logs.push(`${state.name}: [ACTION] Executing Evasive Maneuvers.`);
         return;
      }

      if (id === 'actionActivateCloak') {
         state.isStealthed = true;
         logs.push(`${state.name}: [ACTION] Cloak engaged.`);
         return;
      }

      if (id === 'actionEmergencyReboot') {
         state.rebootTicks = 30;
         logs.push(`${state.name}: [ACTION] Manual Reboot Initiated.`);
         return;
      }

      if (id === 'actionEmergencyWithdrawal') {
         logs.push(`${state.name}: [ACTION] Emergency extraction vectors set.`);
         return;
      }

      // Attack Logic
      let isCrit = Math.random() <= state.critChance;
      let grossDamage = state.baseDamage * (isCrit ? state.critMultiplier : 1.0);

      // Logic: Kinetic damage scaling based on mass and velocity (momentum).
      if (state.damageType === 'KINETIC' || id === 'actionKineticRam') {
         const momentumMultiplier = 1.0 + ((state.currentSpeed * state.baseWeight) / 10000);
         grossDamage *= momentumMultiplier;
         if (id === 'actionKineticRam') grossDamage *= 1.5;
      }

      // Logic: Damage effectiveness matrix lookup.
      const currentArmorType: ArmorType = enemyRef.shields > 0 ? 'ENERGY_SHIELD' : mission.armorType;
      const matrix = this.effectivenessMatrix[state.damageType] || this.effectivenessMatrix['SLASHING'];
      const multiplier = matrix[currentArmorType] || 1.0;
      grossDamage *= multiplier;

      if (state.isExhausted && state.damageType === 'ENERGY') {
         logs.push(`${state.name}: [EXHAUSTED] Energy blade offline.`);
         return;
      }

      // Logic: Evasion resolution for the hostile entity.
      if (Math.random() <= mission.enemyEvasionRate) {
         logs.push(`${state.name}: [EVADED] Hostile maneuver successful.`);
      } else {
         const netDamage = Math.max(1, grossDamage - (enemyRef.shields > 0 ? 0 : mission.armorValue));

         const hullDamage = Math.min(enemyRef.hull, netDamage);
         enemyRef.hull -= hullDamage;
         logs.push(`${state.name}: ${isCrit ? '[CRIT] ' : ''}Hull Hit (-${Math.ceil(hullDamage)} H) [REM: ${Math.max(0, Math.ceil(enemyRef.hull))} HP]`);
      }
   }

   private rng(min: number, max: number): number {
      return Math.floor(Math.random() * (max - min + 1)) + min;
   }

}
