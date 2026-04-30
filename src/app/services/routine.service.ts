import { Injectable } from '@angular/core';
import { CombatEntity, BehaviorContext } from '../models/combat-model';
import { Action, GambitRoutine } from '../models/gambit-model';
import { VectorMath } from '../utils/vector-math.utils';
import { COMBAT_CONFIG } from '../constants/combat-config';

@Injectable({ providedIn: 'root' })
export class RoutineService {
  /**
   * Evaluates an entity's Gambit routines based on the current context.
   * @param entity The entity whose gambits are being checked.
   * @param context The current state of the combat arena.
   * @returns The Action to execute if a trigger is met, or null.
   */
  evaluateGambits(entity: CombatEntity, context: BehaviorContext): Action | null {
    // If stunned, AI routines are disabled
    if (entity.state === 'STUNNED') {
      return null;
    }

    // Sort gambits by priority (lowest number first)
    const sortedGambits = [...entity.gambits].sort((a, b) => a.priority - b.priority);

    for (const gambit of sortedGambits) {
      if (!gambit.trigger || !gambit.action) continue;

      const isTriggered = this.evaluateTrigger(gambit.trigger.id, entity, context);

      if (isTriggered) {
        // Check if entity has enough energy for the action
        const energyCost = gambit.action.energyCost || 0;
        if (entity.stats.energy >= energyCost) {
          return gambit.action;
        }
      }
    }

    return null;
  }

  /**
   * Evaluates a specific trigger condition.
   */
  private evaluateTrigger(triggerId: string, entity: CombatEntity, context: BehaviorContext): boolean {
    const { currentTarget, projectiles, entities } = context;

    switch (triggerId) {
      case 'trig_target_acquired':
        return currentTarget != null;

      case 'trig_self_hull_critical':
        return entity.stats.hp / entity.stats.maxHp <= 0.3;

      case 'trig_incoming_fire':
        if (!projectiles || projectiles.length === 0) return false;
        const sensorRange = entity.stats.sensorRange || 100;

        return projectiles.some(p => {
          // Hostile projectiles only
          const source = entities.find(e => e.id === p.sourceId);
          if (source && source.type === entity.type) return false;

          const dist = VectorMath.dist(entity.position, p.position);
          if (dist < sensorRange) {
            const toEntity = VectorMath.normalize(VectorMath.sub(entity.position, p.position));
            const projDir = VectorMath.normalize(p.velocity);
            // Check if projectile is moving towards entity (dot product > 0.8)
            return VectorMath.dot(projDir, toEntity) > 0.8;
          }
          return false;
        });

      case 'trig_enemy_vulnerable':
        if (!currentTarget) return false;
        return (
          currentTarget.state === 'STUNNED' ||
          currentTarget.stats.hp / currentTarget.stats.maxHp < 0.2
        );

      case 'trig_enemy_charging':
        if (!currentTarget) return false;
        // Use pulseCooldown or default fire rate
        const fireInterval = currentTarget.stats.pulseCooldown || COMBAT_CONFIG.AI_TIMINGS.FIRE_RATE;
        return (currentTarget.retaliationTimer || 0) >= fireInterval - 0.5;

      case 'trig_enemy_shielded':
        return (currentTarget?.stats.shields || 0) > 0;

      case 'trig_ally_critical':
        return entities.some(e =>
          e.type === 'PLAYER' &&
          e.id !== entity.id &&
          e.stats.hp / e.stats.maxHp < 0.3
        );

      case 'trig_flank_exposed':
        if (!currentTarget) return false;
        // Vector from target to drone
        const toDrone = VectorMath.normalize(VectorMath.sub(entity.position, currentTarget.position));
        // Target's forward facing direction
        const targetDir = {
          x: Math.cos(currentTarget.rotation),
          y: Math.sin(currentTarget.rotation)
        };
        // Dot product < 0 means angle > 90 degrees (behind target)
        return VectorMath.dot(toDrone, targetDir) < 0;

      default:
        return false;
    }
  }
}
