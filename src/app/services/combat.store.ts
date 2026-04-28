import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { CombatEntity, AABB, CombatState } from '../models/combat.model';

const initialState: CombatState = {
  entities: [],
  obstacles: [],
  deltaTime: 0,
  isPaused: false,
  activePlayerId: null,
};

/**
 * SignalStore for managing the combat simulation state.
 * This is the single source of truth for the synchronous game loop.
 */
export const CombatStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => ({
    /**
     * Updates the deltaTime for the current frame.
     */
    setDeltaTime(dt: number): void {
      patchState(store, { deltaTime: dt });
    },

    /**
     * Updates a single entity's properties.
     */
    updateEntity(entityId: string, partialEntity: Partial<CombatEntity>): void {
      patchState(store, (state) => ({
        entities: state.entities.map((e) =>
          e.id === entityId ? { ...e, ...partialEntity } : e
        ),
      }));
    },

    /**
     * Sets the entire entities list.
     */
    setEntities(entities: CombatEntity[]): void {
      patchState(store, { entities });
    },

    /**
     * Sets the obstacles in the arena.
     */
    setObstacles(obstacles: AABB[]): void {
      patchState(store, { obstacles });
    },

    /**
     * Toggles the simulation pause state.
     */
    setPaused(isPaused: boolean): void {
      patchState(store, { isPaused });
    }
  }))
);
