import { Injectable } from '@angular/core';
import { CombatEntity, Vector2D, AABB } from '../models/combat.model';
import { VectorMath } from '../utils/vector-math.utils';

@Injectable({ providedIn: 'root' })
export class SteeringService {
  private readonly BASE_FEELER_LENGTH = 40;
  private readonly SPEED_LOOKAHEAD_FACTOR = 0.5;
  private readonly MAX_AVOIDANCE_FORCE = 250;

  /**
   * Translates desired behavior into safe, obstacle-aware movement.
   * Implements the 5-Feeler-System and Wall-Sliding logic.
   * @param entity The entity moving.
   * @param desiredVelocity The target velocity vector from AI.
   * @param obstacles List of walls/cover to avoid.
   * @returns The final, safe movement vector.
   */
  calculateFinalVelocity(entity: CombatEntity, desiredVelocity: Vector2D, obstacles: AABB[]): Vector2D {
    // 1. Calculate Dynamic Feeler Length
    const currentSpeed = VectorMath.length(entity.velocity);
    const feelerLength = this.BASE_FEELER_LENGTH + (currentSpeed * this.SPEED_LOOKAHEAD_FACTOR);

    // 2. Project 5 Feelers based on current rotation
    // Angles in radians: 0, -45, 45, -90, 90
    const angles = [0, -Math.PI / 4, Math.PI / 4, -Math.PI / 2, Math.PI / 2];
    const lengths = [1.0, 0.75, 0.75, 0.5, 0.5];

    let avoidanceForce = { x: 0, y: 0 };
    let closestHit: { normal: Vector2D; distance: number; feelerLength: number } | null = null;

    for (let i = 0; i < angles.length; i++) {
      const angle = entity.rotation + angles[i];
      const dir = { x: Math.cos(angle), y: Math.sin(angle) };
      const l = feelerLength * lengths[i];

      for (const obstacle of obstacles) {
        const hit = VectorMath.intersectRayAABB(entity.position, dir, l, obstacle);
        if (hit) {
          // If multiple feelers hit, we prioritize the closest one for sliding
          if (!closestHit || hit.distance < closestHit.distance) {
            closestHit = { normal: hit.normal, distance: hit.distance, feelerLength: l };
          }

          // Accumulate avoidance force
          const penetrationRatio = 1.0 - (hit.distance / l);
          const force = VectorMath.mul(hit.normal, penetrationRatio * this.MAX_AVOIDANCE_FORCE);
          avoidanceForce = VectorMath.add(avoidanceForce, force);
        }
      }
    }

    // 3. Wall-Sliding Logic
    let finalVelocity = VectorMath.add(desiredVelocity, avoidanceForce);

    if (closestHit) {
      const dot = VectorMath.dot(finalVelocity, closestHit.normal);
      // If dot < 0, we are moving INTO the wall
      if (dot < 0) {
        const slideVelocity = VectorMath.sub(finalVelocity, VectorMath.mul(closestHit.normal, dot));
        finalVelocity = slideVelocity;
      }
    }

    // 4. Clamp to max speed
    return VectorMath.limit(finalVelocity, entity.stats.maxSpeed);
  }
}
