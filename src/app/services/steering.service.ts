import { Injectable } from '@angular/core';
import { CombatEntity, Vector2D, AABB } from '../models/combat-model';
import { VectorMath } from '../utils/vector-math.utils';
import { COMBAT_CONFIG } from '../constants/combat-config';

@Injectable({ providedIn: 'root' })
export class SteeringService {
  /**
   * Translates desired behavior into safe, obstacle-aware movement.
   * Implements the 5-Feeler-System and Wall-Sliding logic.
   * @param entity The entity moving.
   * @param desiredVelocity The target velocity vector from AI.
   * @param obstacles List of walls/cover to avoid.
   * @returns The final, safe movement vector.
   */
  calculateFinalVelocity(
    entity: CombatEntity,
    desiredVelocity: Vector2D,
    obstacles: AABB[]
  ): Vector2D {
    // 1. Calculate Dynamic Feeler Length
    const currentSpeed = VectorMath.length(entity.velocity);
    const feelerLength =
      COMBAT_CONFIG.PHYSICS.BASE_FEELER_LENGTH +
      currentSpeed * COMBAT_CONFIG.PHYSICS.SPEED_LOOKAHEAD_FACTOR;

    // 2. Project 5 Feelers based on current rotation
    // Angles in radians: 0, -45, 45, -90, 90
    const angles = [0, -Math.PI / 4, Math.PI / 4, -Math.PI / 2, Math.PI / 2];
    const lengths = [1.0, 0.75, 0.75, 0.5, 0.5];

    let avoidanceForce = { x: 0, y: 0 };
    let closestHit: { normal: Vector2D; distance: number; feelerLength: number } | null = null;
    let centerBlocked = false;
    let leftClear = true;
    let rightClear = true;

    for (let i = 0; i < angles.length; i++) {
      const angle = entity.rotation + angles[i];
      const dir = { x: Math.cos(angle), y: Math.sin(angle) };
      const l = feelerLength * lengths[i];

      let feelerHit = false;
      for (const obstacle of obstacles) {
        const hit = VectorMath.intersectRayAABB(entity.position, dir, l, obstacle);
        if (hit) {
          feelerHit = true;
          if (i === 0) centerBlocked = true;
          if (i === 1 || i === 3) leftClear = false;
          if (i === 2 || i === 4) rightClear = false;

          if (!closestHit || hit.distance < closestHit.distance) {
            closestHit = { normal: hit.normal, distance: hit.distance, feelerLength: l };
          }

          const penetrationRatio = 1.0 - hit.distance / l;
          const force = VectorMath.mul(
            hit.normal,
            penetrationRatio * COMBAT_CONFIG.PHYSICS.MAX_AVOIDANCE_FORCE
          );
          avoidanceForce = VectorMath.add(avoidanceForce, force);
        }
      }
    }

    // Add Side Bias if blocked head-on
    if (centerBlocked) {
      const biasStrength = COMBAT_CONFIG.PHYSICS.MAX_AVOIDANCE_FORCE * 0.5;
      if (leftClear && !rightClear) {
        const leftDir = VectorMath.rotate({ x: 1, y: 0 }, entity.rotation - Math.PI / 2);
        avoidanceForce = VectorMath.add(avoidanceForce, VectorMath.mul(leftDir, biasStrength));
      } else if (rightClear && !leftClear) {
        const rightDir = VectorMath.rotate({ x: 1, y: 0 }, entity.rotation + Math.PI / 2);
        avoidanceForce = VectorMath.add(avoidanceForce, VectorMath.mul(rightDir, biasStrength));
      } else if (leftClear && rightClear) {
        // Both clear? Pick one to break symmetry
        const nudgeDir = VectorMath.rotate({ x: 1, y: 0 }, entity.rotation + Math.PI / 2);
        avoidanceForce = VectorMath.add(
          avoidanceForce,
          VectorMath.mul(nudgeDir, biasStrength * 0.5)
        );
      }
    }

    // 3. Wall-Sliding Logic (Applied to desiredVelocity first)
    let slidingVelocity = { ...desiredVelocity };

    if (closestHit) {
      const dot = VectorMath.dot(slidingVelocity, closestHit.normal);
      // If dot < 0, we are moving INTO the wall
      if (dot < 0) {
        const slide = VectorMath.sub(slidingVelocity, VectorMath.mul(closestHit.normal, dot));
        slidingVelocity = slide;
      }
    }

    // Combined Result: Sliding velocity + Avoidance forces
    let finalVelocity = VectorMath.add(slidingVelocity, avoidanceForce);

    // 4. Clamp to max speed
    return VectorMath.limit(finalVelocity, entity.stats.maxSpeed);
  }
}
