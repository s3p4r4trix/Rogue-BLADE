import { Injectable } from '@angular/core';
import { CombatEntity, AABB, Vector2D } from '../models/combat-model';

@Injectable({ providedIn: 'root' })
export class SensorService {
  /**
   * Checks if there is a clear line of sight between an entity and a target.
   * @param entity The source entity.
   * @param target The target position or entity.
   * @param obstacles List of obstacles to check for collision.
   * @returns True if LOS is clear, false otherwise.
   */
  checkLineOfSight(entity: CombatEntity, target: Vector2D, obstacles: AABB[]): boolean {
    // TODO: Implement parametric raycasting against AABBs
    return true;
  }

  /**
   * Scans for enemies within a certain radar radius.
   * @param entity The scanning entity.
   * @param allEntities List of all entities in the arena.
   * @returns Array of entities detected within range.
   */
  getEnemiesInRadar(entity: CombatEntity, allEntities: CombatEntity[]): CombatEntity[] {
    // TODO: Implement radius check excluding the scanning entity itself and its team
    return allEntities.filter(e => e.id !== entity.id && e.type !== entity.type);
  }

  /**
   * Checks if a target is within melee range.
   * @param entity The source entity.
   * @param target The target entity.
   * @returns True if within range, false otherwise.
   */
  isInMeleeRange(entity: CombatEntity, target: CombatEntity): boolean {
    // TODO: Implement distance calculation vs combined radii + offset
    return false;
  }
}
