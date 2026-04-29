import { computed } from '@angular/core';
import { signalStore, withState, withMethods, patchState, withComputed } from '@ngrx/signals';
import { CombatEntity, AABB, CombatState, Projectile, PulseEffect } from '../models/combat-model';

const initialState: CombatState = {
  entities: [],
  obstacles: [],
  projectiles: [],
  pulses: [],
  deltaTime: 0,
  timeElapsed: 0,
  isFinished: false,
  success: false,
  logs: [],
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
  withComputed((store) => ({
    /** Returns the primary enemy entity hull telemetry. */
    enemyEntity: computed(() => store.entities().find(e => e.type === 'ENEMY')),
    enemyHull: computed(() => store.entities().find(e => e.type === 'ENEMY')?.stats.hp ?? 0),
    enemyMaxHull: computed(() => store.entities().find(e => e.type === 'ENEMY')?.stats.maxHp ?? 0),
    
    /** Returns formatted statuses for all player-owned drones. */
    squadStatuses: computed(() => store.entities()
      .filter(e => e.type === 'PLAYER')
      .map(e => ({
        id: e.id,
        name: e.name,
        hp: e.stats.hp,
        maxHp: e.stats.maxHp,
        energy: e.stats.energy,
        maxEnergy: e.stats.maxEnergy,
        rebootTicks: e.state === 'REBOOTING' ? Math.ceil(e.stateTimer * 10) : 0,
        state: e.state
      })))
  })),
  withMethods((store) => ({
    /**
     * Updates the deltaTime for the current frame.
     */
    setDeltaTime(dt: number): void {
      patchState(store, (state) => ({ 
        deltaTime: dt,
        timeElapsed: state.timeElapsed + dt
      }));
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
     * Sets the projectiles in the arena.
     */
    setProjectiles(projectiles: Projectile[]): void {
      patchState(store, { projectiles });
    },

    /**
     * Sets the visual pulse effects in the arena.
     */
    setPulses(pulses: PulseEffect[]): void {
      patchState(store, { pulses });
    },

    /**
     * Adds a single pulse effect to the arena.
     */
    addPulse(pulse: PulseEffect): void {
      patchState(store, (state) => ({
        pulses: [...state.pulses, pulse]
      }));
    },

    /**
     * Toggles the simulation pause state.
     */
    setPaused(isPaused: boolean): void {
      patchState(store, { isPaused });
    },

    /**
     * Adds a log entry to the combat feed.
     */
    addLog(message: string): void {
      patchState(store, (state) => ({
        logs: [...state.logs.slice(-49), `[${state.timeElapsed.toFixed(1)}s] ${message}`]
      }));
    },

    /**
     * Sets the mission completion status.
     */
    setFinished(success: boolean): void {
      patchState(store, { isFinished: true, success });
    },

    /**
     * Resets the entire store for a new simulation.
     */
    reset(): void {
      patchState(store, initialState);
    }
  }))
);
