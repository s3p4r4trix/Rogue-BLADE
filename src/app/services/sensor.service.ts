import { Injectable } from '@angular/core';
import { CombatEntity, AABB, Vector2D } from '../models/combat-model';
import { VectorMath } from '../utils/vector-math.utils';
import { COMBAT_CONFIG } from '../constants/combat-config';

@Injectable({ providedIn: 'root' })
export class SensorService {
  /**
   * Checks if there is a clear line of sight between an entity and a target.
   * @param entity The source entity.
   * @param target The target position.
   * @param obstacles List of obstacles to check for collision.
   * @returns True if LOS is clear, false otherwise.
   */
  checkLineOfSight(entity: CombatEntity, target: Vector2D, obstacles: AABB[]): boolean {
    const dist = VectorMath.dist(entity.position, target);
    if (dist < 1) return true;

    const dir = VectorMath.normalize(VectorMath.sub(target, entity.position));

    for (const obstacle of obstacles) {
      // If entity is flying higher than the obstacle, LOS is not blocked by it
      if (entity.z >= (obstacle.zHeight ?? 0)) continue;

      // Raycast from entity to target (on the ground plane)
      const hit = VectorMath.intersectRayAABB(entity.position, dir, dist, obstacle);
      if (hit) return false;
    }
    return true;
  }

  /**
   * Returns the first obstacle that blocks the line of sight between two points.
   */
  getBlockingObstacle(entity: CombatEntity, target: Vector2D, obstacles: AABB[]): AABB | null {
    const dist = VectorMath.dist(entity.position, target);
    if (dist < 1) return null;

    const dir = VectorMath.normalize(VectorMath.sub(target, entity.position));

    for (const obstacle of obstacles) {
      // If entity is flying higher than the obstacle, it doesn't block LOS
      if (entity.z >= (obstacle.zHeight ?? 0)) continue;

      const hit = VectorMath.intersectRayAABB(entity.position, dir, dist, obstacle);
      if (hit) return obstacle;
    }
    return null;
  }

  /**
   * Scans for enemies within a certain radar radius.
   * @param entity The scanning entity.
   * @param allEntities List of all entities in the arena.
   * @returns Array of entities detected within range.
   */
  getEnemiesInRadar(entity: CombatEntity, allEntities: CombatEntity[]): CombatEntity[] {
    const radarRange = COMBAT_CONFIG.RANGES.RADAR_RANGE;

    return allEntities.filter((e) => {
      if (e.id === entity.id) return false;
      if (e.type === entity.type) return false; // Ignore teammates

      const dist = VectorMath.dist(entity.position, e.position);
      return dist <= radarRange;
    });
  }

  /**
   * Checks if a target is within melee range.
   * @param entity The source entity.
   * @param target The target entity.
   * @returns True if within range, false otherwise.
   */
  isInMeleeRange(entity: CombatEntity, target: CombatEntity): boolean {
    const meleeRange =
      entity.radius + target.radius + COMBAT_CONFIG.RANGES.MELEE_RANGE_BUFFER;
    const dist = VectorMath.dist(entity.position, target.position);
    return dist <= meleeRange;
  }
}
