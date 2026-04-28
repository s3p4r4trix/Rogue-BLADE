import { Injectable } from '@angular/core';
import { CombatEntity, Vector2D, BehaviorContext } from '../models/combat.model';

@Injectable({ providedIn: 'root' })
export class BaseAIService {
  /**
   * Calculates the default behavior (desired velocity) based on the state machine.
   * Executed only if RoutineService returns no override action.
   * @param entity The entity processing its AI.
   * @param context Contextual data for decision making.
   * @returns A vector representing the desired direction and magnitude of movement.
   */
  calculateDefaultBehavior(entity: CombatEntity, context: BehaviorContext): Vector2D {
    const desiredVelocity: Vector2D = { x: 0, y: 0 };

    switch (entity.state) {
      case 'PATROLLING':
        // TODO: Implement patrol logic (e.g., move between waypoints)
        break;
      case 'PURSUING':
        // TODO: Implement seek behavior towards target
        break;
      case 'SEARCHING':
        // TODO: Implement search sweep at last known position
        break;
      case 'FLEEING':
        // TODO: Implement flee behavior away from threat
        break;
      case 'ATTACKING':
        // TODO: Implement combat positioning
        break;
    }

    return desiredVelocity;
  }
}
