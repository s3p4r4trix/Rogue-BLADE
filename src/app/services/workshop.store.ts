import { computed, inject, effect } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, withHooks, patchState } from '@ngrx/signals';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { Action, GambitRoutine, Trigger } from '../models/gambit.model';
import { Shuriken } from '../models/hardware-model';
import { HARDWARE_INVENTORY, loadShurikens, loadUnlockedComponents, loadSavedRoutinesMap } from '../data/hardware-inventory.data';

/** ─── Workshop State Definition ─────────────────────────────────────────────── */

export interface WorkshopState {
  /** Master list of all potential combat triggers. */
  availableTriggers: Trigger[];
  /** Master list of all potential combat actions. */
  availableActions: Action[];
  /** List of shurikens currently in the player's hangar. */
  availableShurikens: Shuriken[];
  /** IDs of hardware components currently unlocked via research. */
  unlockedComponentIds: string[];
  /** The unique ID of the shuriken currently being modified in the workshop. */
  activeShurikenId: string;
  /** Mapping of shuriken IDs to their prioritized routine lists. */
  routinesMap: Record<string, GambitRoutine[]>;
  /** Rolling buffer of system status and compilation logs. */
  systemLogs: string[];
  /** The currently inspected item in the UI info panel. */
  selectedInfoItem: Trigger | Action | null;
}

// Logic: Pre-load data to avoid multiple calls to load functions during initialization.
const loadedShurikens = loadShurikens();
const loadedUnlocked = loadUnlockedComponents();
const loadedRoutines = loadSavedRoutinesMap();
const savedActiveId = localStorage.getItem('rogueBlade_activeShuriken');

const initialState: WorkshopState = {
  availableTriggers: [
    { id: 'ifEnemyInMeleeRange', type: 'trigger', value: 'Enemy in melee range', name: 'Enemy: Close Proximity', description: 'Target is within strike radius.' },
    { id: 'ifEnemyInSight', type: 'trigger', value: 'Enemy in sight', name: 'Enemy: Detected', description: 'Target detected by radar/lidar.', requiredSensor: 'Radar/Lidar' },
    { id: 'ifEnemyIsShielded', type: 'trigger', value: 'Enemy has active shield', name: 'Enemy: Shield Active', description: 'Target is protected by EM field.', requiredSensor: 'EM-Sensors' },
    { id: 'ifEnemyIsOrganic', type: 'trigger', value: 'Enemy is organic', name: 'Enemy: Soft Target', description: 'Target is flesh/light armored.', requiredSensor: 'Biosensors' },
    { id: 'ifSelfHpCritical', type: 'trigger', value: 'Hull integrity < 20%', name: 'Self: Hull Breach', description: 'Critical internal damage detected.' },
    { id: 'ifEnergyHigh', type: 'trigger', value: 'Energy pool > 80%', name: 'Self: Power Overload', description: 'System capacity ready for high-drain actions.' },
    { id: 'ifIncomingProjectile', type: 'trigger', value: 'Incoming projectile detected', name: 'Self: Incoming Fire', description: 'Hostile fire on collision course.', requiredSensor: 'Lidar Array' },
    { id: 'ifEnemyBehindCover', type: 'trigger', value: 'Enemy behind obstacle', name: 'Enemy: Obscured', description: 'Target is hidden by cover.', requiredSensor: 'Terahertz Array' }
  ],
  availableActions: [
    { id: 'actionStandardStrike', type: 'action', value: 'Standard Strike', name: 'Execute: Standard Strike', energyCost: 0, description: 'Basic attack maneuver.', baseLatency: 200 },
    { id: 'actionKineticRam', type: 'action', value: 'Kinetic Ram', name: 'Execute: Kinetic Ram', energyCost: 20, description: 'High-speed physical collision.', baseLatency: 500 },
    { id: 'actionEvasiveManeuver', type: 'action', value: 'Evasive Maneuver', name: 'Execute: Evasive Action', energyCost: 15, description: 'Briefly maximize evasion.', baseLatency: 100 },
    { id: 'actionActivateCloak', type: 'action', value: 'Activate Cloak', name: 'Execute: Ghost Protocol', energyCost: 10, description: 'Consume energy to disappear.', baseLatency: 300 },
    { id: 'actionEmergencyReboot', type: 'action', value: 'Emergency Reboot', name: 'Execute: Emergency Reboot', energyCost: 0, description: 'Stand still to regain energy.', baseLatency: 3000 },
    { id: 'actionEmergencyWithdrawal', type: 'action', value: 'Emergency Withdrawal', name: 'Execute: Emergency Withdrawal', energyCost: 0, description: 'Withdraw to safety zones.', baseLatency: 0 }
  ],
  availableShurikens: loadedShurikens,
  unlockedComponentIds: loadedUnlocked,
  activeShurikenId: savedActiveId || loadedShurikens[0]?.id || 'shuriken-01',
  routinesMap: loadedRoutines,
  systemLogs: ['> System ready.', '> Waiting for input...'],
  selectedInfoItem: null,
};

/**
 * WorkshopStore
 * Centralized SignalStore for managing drone hardware, routines, and system logs.
 */
export const WorkshopStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  /** ─── Derived State (Computeds) ─────────────────────────────────────────────── */
  withComputed((store) => ({
    /** Logic: Retrieves the specific shuriken currently being modified. */
    activeShuriken: computed(() => {
      const shurikens = store.availableShurikens();
      return shurikens.find(shuriken => shuriken.id === store.activeShurikenId()) || shurikens[0];
    }),

    /** Logic: Retrieves the routines associated with the active shuriken. */
    routines: computed(() => store.routinesMap()[store.activeShurikenId()] || []),

    /** Logic: Filters triggers based on the active shuriken's sensor package. */
    unlockedTriggers: computed(() => {
      const shuriken = store.availableShurikens().find(s => s.id === store.activeShurikenId()) || store.availableShurikens()[0];
      return store.availableTriggers().filter(trigger => 
        !trigger.requiredSensor || shuriken.sensor?.name === trigger.requiredSensor
      );
    }),

    /** Logic: Filters actions available to the user (currently all). */
    unlockedActions: computed(() => store.availableActions()),

    /** Logic: Validates if all assigned routines have both a trigger and an action. */
    isSystemValid: computed(() => {
      const activeRoutines = store.routinesMap()[store.activeShurikenId()] || [];
      return activeRoutines.every(routine => !!(routine.trigger && routine.action));
    }),

    /** Logic: Validates the hardware configuration of the entire fleet. */
    isFleetValid: computed(() => {
      return store.availableShurikens().every(shuriken => 
        !!(shuriken.engine && shuriken.hull && shuriken.energyCell && shuriken.sensor && shuriken.blade && shuriken.processor && shuriken.formDesign)
      );
    })
  })),

  /** ─── Methods (Actions) ─────────────────────────────────────────────── */
  withMethods((store) => {
    
    /** Internal Helper: Updates routines for the active shuriken. */
    const updateActiveRoutines = (updater: (routines: GambitRoutine[]) => GambitRoutine[]) => {
      const activeId = store.activeShurikenId();
      const currentMap = store.routinesMap();
      const updatedRoutines = updater(currentMap[activeId] || []);
      patchState(store, { 
        routinesMap: { ...currentMap, [activeId]: updatedRoutines } 
      });
    };

    return {
      /** Logic: Updates hardware components after a balance patch or refactor. */
      migrateHardware(): void {
        const baseIds = ['eng-drifter', 'cell-scrap', 'react-fusion', 'sens-optical', 'blade-edge', 'form-shuriken', 'hull-scrap', 'proc-abacus', 'semi-feral', 'sens-terahertz'];
        const updatedUnlocked = Array.from(new Set([...store.unlockedComponentIds(), ...baseIds]));
        
        const migratedShurikens = store.availableShurikens().map(shuriken => {
          const drone = { ...shuriken };
          console.log(`[WorkshopStore] Hydrating Drone: ${drone.name} (${drone.id})`);
          
          /**
           * Internal Helper: Maps a component ID or object back to the master inventory.
           * Logic: Ensures we use the canonical object references from HARDWARE_INVENTORY.
           */
          const refresh = (slot: string, category: any[]) => {
            const component = (drone as any)[slot];
            if (!component) return category[0];
            
            // Logic: Support both hydrated objects and raw ID strings.
            const currentId = typeof component === 'string' ? component : component.id;
            const updated = category.find(c => c.id === currentId);
            
            if (updated) {
              return updated;
            } else {
              console.warn(`[WorkshopStore] Migration Warning: Component '${currentId}' not found for slot '${slot}'. Falling back.`);
              return component && typeof component !== 'string' ? component : category[0];
            }
          };

          drone.engine = refresh('engine', HARDWARE_INVENTORY.engines);
          drone.hull = refresh('hull', HARDWARE_INVENTORY.hulls);
          drone.energyCell = refresh('energyCell', HARDWARE_INVENTORY.energyCells);
          drone.sensor = refresh('sensor', HARDWARE_INVENTORY.sensors);
          drone.blade = refresh('blade', HARDWARE_INVENTORY.blades);
          drone.formDesign = refresh('formDesign', HARDWARE_INVENTORY.formDesigns);
          drone.processor = refresh('processor', HARDWARE_INVENTORY.processors);
          drone.reactor = refresh('reactor', HARDWARE_INVENTORY.reactors);
          
          drone.shield = drone.shield ? (HARDWARE_INVENTORY.shields.find(s => s.id === (typeof drone.shield === 'string' ? drone.shield : drone.shield?.id)) || null) : null;
          drone.semiAI = drone.semiAI ? (HARDWARE_INVENTORY.semiAIs.find(a => a.id === (typeof drone.semiAI === 'string' ? drone.semiAI : drone.semiAI?.id)) || null) : null;

          if (!drone.coordinationMode) drone.coordinationMode = 'SOLO';
          if (drone.semiAI && drone.coordinationMode === 'SOLO') drone.coordinationMode = 'MASTER';
          if (!drone.semiAI && drone.coordinationMode === 'MASTER') drone.coordinationMode = 'SOLO';

          return drone;
        });

        patchState(store, { 
          availableShurikens: migratedShurikens,
          unlockedComponentIds: updatedUnlocked 
        });
        console.log('[WorkshopStore] Hardware hydration complete.');
      },

      /** Switches the active drone context in the workshop. */
      setActiveShuriken(id: string): void {
        patchState(store, { activeShurikenId: id });
      },

      /** Logic: Updates the custom name for a specific drone ID. */
      renameShuriken(id: string, newName: string): void {
        const updated = store.availableShurikens().map(s => s.id === id ? { ...s, name: newName } : s);
        patchState(store, { availableShurikens: updated });
      },

      /** Logic: Swaps a hardware component in the specified slot. */
      equipComponent(shurikenId: string, slot: any, component: any): void {
        console.log(`[WorkshopStore] Equipping ${slot}:`, component?.id || 'null', `on ${shurikenId}`);
        const updated = store.availableShurikens().map(shuriken => {
          if (shuriken.id !== shurikenId) return shuriken;
          const updatedDrone = { ...shuriken, [slot]: component };

          // Logic: Automatically update coordination mode if Semi-AI is swapped.
          if (slot === 'semiAI') {
            if (component) {
              updatedDrone.coordinationMode = 'MASTER';
            } else {
              updatedDrone.coordinationMode = 'SOLO';
              updatedDrone.masterId = undefined;
            }
          }
          return updatedDrone;
        });
        patchState(store, { availableShurikens: updated });
      },

      /** Configures drone swarm coordination behavior. */
      setCoordination(shurikenId: string, mode: 'SOLO' | 'MASTER' | 'SLAVE', masterId?: string): void {
        const updated = store.availableShurikens().map(s => s.id === shurikenId ? { ...s, coordinationMode: mode, masterId } : s);
        patchState(store, { availableShurikens: updated });
      },

      /** Logic: Allocates a new empty routine slot if capacity allows. */
      addRoutine(): void {
        const shurikens = store.availableShurikens();
        const activeId = store.activeShurikenId();
        const activeShuriken = shurikens.find(s => s.id === activeId) || shurikens[0];
        const capacity = activeShuriken.processor?.routineCapacity || 2;
        
        const currentRoutines = store.routinesMap()[activeId] || [];
        if (currentRoutines.length >= capacity) return;
        
        updateActiveRoutines(routines => [...routines, { priority: routines.length + 1, trigger: null, action: null }]);
      },

      /** Logic: Removes a routine and re-calculates priorities for the remaining list. */
      removeRoutine(index: number): void {
        updateActiveRoutines(routines => routines.filter((_, i) => i !== index).map((r, i) => ({ ...r, priority: i + 1 })));
      },

      /** Moves a routine higher in the priority list. */
      moveRoutineUp(index: number): void {
        if (index <= 0) return;
        updateActiveRoutines(routines => {
          const updated = [...routines];
          moveItemInArray(updated, index, index - 1);
          return updated.map((r, i) => ({ ...r, priority: i + 1 }));
        });
      },

      /** Moves a routine lower in the priority list. */
      moveRoutineDown(index: number): void {
        const activeId = store.activeShurikenId();
        const activeRoutines = store.routinesMap()[activeId] || [];
        if (index >= activeRoutines.length - 1) return;
        
        updateActiveRoutines(routines => {
          const updated = [...routines];
          moveItemInArray(updated, index, index + 1);
          return updated.map((r, i) => ({ ...r, priority: i + 1 }));
        });
      },

      /** Assigns a combat trigger to a routine slot. */
      setTrigger(index: number, trigger: Trigger): void {
        updateActiveRoutines(routines => {
          const updated = [...routines];
          if (updated[index]) updated[index] = { ...updated[index], trigger };
          return updated;
        });
      },

      /** Assigns an action to a routine slot. */
      setAction(index: number, action: Action): void {
        updateActiveRoutines(routines => {
          const updated = [...routines];
          if (updated[index]) updated[index] = { ...updated[index], action };
          return updated;
        });
      },

      /** Resets a specific routine slot. */
      clearSlot(index: number): void {
        updateActiveRoutines(routines => {
          const updated = [...routines];
          if (updated[index]) updated[index] = { ...updated[index], trigger: null, action: null };
          return updated;
        });
      },

      /** Updates the info panel context. */
      setInfoItem(item: any): void {
        patchState(store, { selectedInfoItem: item });
      },

      /** Logs a compilation event and updates the system log stream. */
      compileCode(): void {
        patchState(store, { 
          systemLogs: [...store.systemLogs(), '> Compiling routines...', '> Upload successful.'] 
        });
      },

      /** Logic: Unlocks a new hardware component globally. */
      unlockComponent(componentId: string): void {
        const updated = Array.from(new Set([...store.unlockedComponentIds(), componentId]));
        patchState(store, { unlockedComponentIds: updated });
      },

      /** Utility logic for fallback strikes. */
      fallbackAction(): string { return 'actionStandardStrike'; },

      /**
       * Logic: Validates if a routine's hardware requirements are met by the active shuriken.
       * @param routine The routine to validate.
       */
      isRoutineValid(routine: GambitRoutine): boolean {
        if (!routine.trigger?.requiredSensor) return true;
        const shuriken = store.availableShurikens().find(s => s.id === store.activeShurikenId()) || store.availableShurikens()[0];
        return shuriken.sensor?.name === routine.trigger.requiredSensor;
      }
    };
  }),

  /** ─── Lifecycle Hooks ─────────────────────────────────────────────── */
  withHooks({
    onInit(store) {
      // Logic: Ensure hardware is migrated to latest versions on startup.
      store.migrateHardware();

      // Logic: Setup reactive synchronization with local storage.
      effect(() => {
        const shurikens = store.availableShurikens();
        const unlocked = store.unlockedComponentIds();
        const routines = store.routinesMap();
        const activeId = store.activeShurikenId();

        console.log('[WorkshopStore] Flushing state to LocalStorage...', { shurikens, activeId });
        
        localStorage.setItem('rogueBlade_shurikens', JSON.stringify(shurikens));
        localStorage.setItem('rogueBlade_unlockedComponents', JSON.stringify(unlocked));
        localStorage.setItem('rogueBlade_routinesMap', JSON.stringify(routines));
        localStorage.setItem('rogueBlade_activeShuriken', activeId);
      });
    }
  })
);
