import { Injectable, inject } from '@angular/core';
import { MissionContract } from '../models/mission.model';
import { Shuriken } from '../models/hardware.model';
import { WorkshopService } from './workshop.service';
import { PlayerService } from './player.service';

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
  private player = inject(PlayerService);

  /**
   * Simulates a full Liberation Strike combat sequence.
   * Runs in 3-second ticks as requested.
   */
  simulateStrike(mission: MissionContract, shurikens: Shuriken[]): StrikeResult {
    const totalTicks = mission.durationSeconds; // 1 tick per second
    const logs: string[] = [];
    
    // Initial stats
    // Track individual HP for each shuriken
    const shurikenHPs = shurikens.map(s => ({ id: s.id, name: s.name, hp: 100, maxHp: 100 }));
    const initialEnemyHP = (mission.potentialLoot.creditsBonus || 100) / 2.5; // Nerfed from 1.5
    
    let enemyHP = initialEnemyHP;
    let success = false;

    logs.push(`[SYSTEM] STRIKE INITIATED: ${mission.targetName}`);
    logs.push(`[SYSTEM] SQUAD CAPACITY: ${shurikens.length} UNITS`);
    logs.push(`[SYSTEM] SCANNING RESISTANCE: ${mission.expectedResistance}`);

    for (let tick = 1; tick <= totalTicks; tick++) {
      const time = tick; // 1:1 ratio for time to tick
      
      // 1. Shurikens Attack
      shurikens.forEach((s, idx) => {
        if (enemyHP <= 0 || shurikenHPs[idx].hp <= 0) return;
        
        const routines = this.workshop.routinesMap()[s.id] || [];
        const actionName = (routines.length > 0 && routines[0].action) 
          ? routines[0].action.name 
          : this.workshop.fallbackAction();
        
        const dmg = s.blade?.damage || 5;
        enemyHP = Math.max(0, enemyHP - dmg);
        logs.push(`[T+${time}s] ${s.name}: ${actionName} -> Hostile (-${dmg} HP) [REMAINING: ${Math.ceil(enemyHP)}]`);
      });

      // 2. Enemy Counter-Attacks (Random Targeting)
      if (enemyHP > 0) {
        const activeShurikens = shurikenHPs.filter(s => s.hp > 0);
        if (activeShurikens.length > 0) {
          const target = activeShurikens[Math.floor(Math.random() * activeShurikens.length)];
          const enemyDmg = Math.floor(8 + (tick * 0.8)); // Reduced scaling from 10 + 1.5
          target.hp = Math.max(0, target.hp - enemyDmg);
          logs.push(`[T+${time}s] HOSTILE_ENTITY: Counter-Strike -> ${target.name} (-${enemyDmg} HP) [REMAINING: ${target.hp}]`);
        }
      }

      // Check termination conditions
      const totalSquadHP = shurikenHPs.reduce((acc, s) => acc + s.hp, 0);
      if (totalSquadHP <= 0) {
        logs.push(`[CRITICAL] SQUAD INTEGRITY FAILURE. EMERGENCY EVAC INITIATED.`);
        break;
      }

      if (enemyHP <= 0) {
        success = true;
        logs.push(`[SYSTEM] TARGET NEUTRALIZED. SECURING PERIMETER.`);
        break;
      }
    }

    const finalSquadHP = shurikenHPs.reduce((acc, s) => acc + s.hp, 0);
    if (enemyHP > 0 && finalSquadHP > 0) {
       logs.push(`[SYSTEM] DURATION EXPIRED. FORCED TACTICAL WITHDRAWAL.`);
       success = false; 
    }

    // Loot Calculation
    const lootMultiplier = success ? 1 : 0.05; // 5% loot on failure
    const polymer = Math.floor(this.rng(mission.potentialLoot.polymerMin, mission.potentialLoot.polymerMax) * lootMultiplier);
    const scrap = Math.floor(this.rng(mission.potentialLoot.scrapMin, mission.potentialLoot.scrapMax) * lootMultiplier);
    const credits = Math.floor(mission.potentialLoot.creditsBonus * lootMultiplier);

    if (success) {
      logs.push(`[SUCCESS] MISSION ACCOMPLISHED. RETURNING TO HUB.`);
    } else {
       logs.push(`[FAILURE] OBJECTIVE NOT MET. RECOVERED ONLY 5% OF ESTIMATED SCRAP.`);
    }

    return { success, totalPolymer: polymer, totalScrap: scrap, totalCredits: credits, logs, initialSquadHP: shurikens.length * 100, initialEnemyHP };
  }

  private rng(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
