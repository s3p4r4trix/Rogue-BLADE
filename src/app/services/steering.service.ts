import { Injectable } from '@angular/core';
import { CombatEntity, Vector2D, AABB } from '../models/combat.model';

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
  calculateFinalVelocity(entity: CombatEntity, desiredVelocity: Vector2D, obstacles: AABB[]): Vector2D {
    // 1. Start with desired velocity
    let finalVelocity = { ...desiredVelocity };

    // 2. TODO: Implement 5-Feeler-System
    // Cast rays in front of the entity to detect obstacles
    
    // 3. TODO: Implement Wall-Sliding logic
    // If a collision is imminent, project the velocity along the obstacle surface

    // 4. Clamp to max speed
    return finalVelocity;
  }
}
