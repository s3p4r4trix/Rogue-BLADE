import { Injectable } from '@angular/core';
import { MissionContract } from '../models/mission-model';
import { Shuriken } from '../models/hardware-model';
import { StrikeResult } from '../models/combat-model';
import { ENEMY_TEMPLATES } from '../constants/enemy-templates';

@Injectable({
  providedIn: 'root'
})
export class CombatSimulationService {
  /**
   * Simulates a strike engagement without a visual loop.
   * Uses basic math logic derived from the core simulation engine.
   */
  simulateStrike(mission: MissionContract, squad: Shuriken[]): StrikeResult {
    // Minimal math-based simulation for the StrikeReport view
    const squadPower = squad.reduce((acc, s) => acc + (s.blade?.baseDamage || 10), 0);
    const squadHealth = squad.reduce((acc, s) => acc + (s.hull?.maxHp || 100), 0);
    
    const template = ENEMY_TEMPLATES[mission.enemyTypeId] || ENEMY_TEMPLATES['GUARDIAN_UNIT'];
    const enemyHealth = template.stats.maxHp;
    const enemyPower = template.stats.baseDamage;
    
    const ticksToKillEnemy = enemyHealth / Math.max(1, squadPower * 0.5);
    const ticksToKillSquad = squadHealth / enemyPower;
    
    const success = ticksToKillEnemy < ticksToKillSquad;
    const duration = Math.min(mission.durationSeconds, ticksToKillEnemy * 0.5);
    
    return {
      success,
      durationSeconds: Math.floor(duration),
      remainingHull: success ? 0 : Math.floor(enemyHealth * 0.2),
      remainingDrones: success ? squad.length : Math.floor(squad.length * 0.3),
      totalDamageDealt: enemyHealth,
      log: [
        `SIMULATION_START: Target ${mission.targetName}`,
        `SQUAD_POWER: ${squadPower} | ENEMY_HEALTH: ${enemyHealth}`,
        success ? 'SIMULATION_SUCCESS: Objective Neutralized' : 'SIMULATION_FAILURE: Squad Withdrawn'
      ]
    };
  }
}
