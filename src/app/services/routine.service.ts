import { Injectable } from '@angular/core';
import { CombatEntity, BehaviorContext } from '../models/combat-model';
import { Action } from '../models/gambit-model';

@Injectable({ providedIn: 'root' })
export class RoutineService {
  /**
   * Evaluates an entity's Gambit routines based on the current context.
   * @param entity The entity whose gambits are being checked.
   * @param context The current state of the combat arena.
   * @returns The Action to execute if a trigger is met, or null.
   */
  evaluateGambits(entity: CombatEntity, context: BehaviorContext): Action | null {
    // TODO: Iterate through entity.gambits by priority
    // For each gambit, check if trigger is met
    // Return the action of the first triggered gambit
    return null;
  }
}
