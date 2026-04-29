import { computed, inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState, withHooks } from '@ngrx/signals';
import { MissionContract, MissionDifficulty } from '../models/mission-model';
import { WorkshopStore } from './workshop.store';
import { PlayerStore } from './player.store';
import { ArmorType } from '../models/hardware-model';
import { ENEMY_TEMPLATES } from '../constants/enemy-templates';

/** ─── Mission Data Constants ─────────────────────────────────────────────── */

const TARGETS = [
  'Corporate Supply Convoy',
  'Zenith Outpost Beta',
  'Scrap-Town Raider Camp',
  'Automated Defense Grid',
  'Abandoned Tech Vault',
  'Mercenary Forward Base'
];

const DESCRIPTIONS = [
  'Heavily guarded. High value tech inside.',
  'Standard patrol. Easy picking if isolated.',
  'A fortified position. Expect casualties.',
  'Minimal lifeforms. High automated resistance.',
  'Unknown variables. High risk, high reward.'
];

const RESISTANCES: { label: string, type: ArmorType }[] = [
  { label: 'Heavy Armor (Mech Resistance)', type: 'HEAVY_ARMOR' },
  { label: 'Energy Shields (Zenith Tech)', type: 'ENERGY_SHIELD' },
  { label: 'Unarmored Swarm (Flesh)', type: 'UNARMORED' },
  { label: 'Balanced Defense', type: 'HEAVY_ARMOR' }
];

/** ─── Mission State Definition ─────────────────────────────────────────────── */

export interface MissionState {
  /** Array of currently available mission contracts for selection. */
  availableContracts: MissionContract[];
  /** The contract that has been actively selected for deployment. */
  activeStrikeMission: MissionContract | null;
  /** Tracks if a refresh operation is currently in progress. */
  isRefreshing: boolean;
}

const initialState: MissionState = {
  availableContracts: [],
  activeStrikeMission: null,
  isRefreshing: false
};

/**
 * MissionStore
 * Centralized SignalStore for managing liberation strike contracts and active deployments.
 */
export const MissionStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  /** ─── Derived State (Computeds) ─────────────────────────────────────────────── */
  withComputed((store) => ({
    /** Returns true if any mission is currently selected for strike. */
    hasActiveStrike: computed(() => !!store.activeStrikeMission()),
    
    /** Returns missions filtered by tier for UI categorization. */
    tier1Missions: computed(() => store.availableContracts().filter(m => m.difficulty.includes('Tier I'))),
    tier2Missions: computed(() => store.availableContracts().filter(m => m.difficulty.includes('Tier II'))),
    tier3Missions: computed(() => store.availableContracts().filter(m => m.difficulty.includes('Tier III'))),
  })),

  /** ─── Methods (Actions) ─────────────────────────────────────────────── */
  withMethods((store, workshopStore = inject(WorkshopStore), playerStore = inject(PlayerStore)) => {

    /**
     * Internal: Calculates the average combat power of the current drone squad.
     * Logic: Combines processor routines, blade damage, and hull durability.
     */
    const calculateSquadPower = (): number => {
      const shurikens = workshopStore.availableShurikens();
      if (shurikens.length === 0) return 100;

      const totalPower = shurikens.reduce((accumulator, shuriken) => {
        const routineCapacity = shuriken.processor?.routineCapacity || 1;
        const baseDamage = shuriken.blade?.baseDamage || 5;
        const maxHp = shuriken.hull?.maxHp || 50;
        return accumulator + (routineCapacity * 25) + (baseDamage * 15) + (maxHp * 0.5);
      }, 0);

      return totalPower / shurikens.length;
    };

    /**
     * Internal: Generates a single mission contract based on index (Tier) and player stats.
     */
    const generateSingleContract = (index: number): MissionContract => {
      const playerStats = playerStore.stats();
      const successfulRuns = playerStats.successfulRuns;
      const squadPower = calculateSquadPower();

      const targetName = TARGETS[Math.floor(Math.random() * TARGETS.length)];
      const description = DESCRIPTIONS[Math.floor(Math.random() * DESCRIPTIONS.length)];

      // Logic: Pick a random resistance profile for variety.
      const resistanceProfile = RESISTANCES[Math.floor(Math.random() * RESISTANCES.length)];

      let difficulty: MissionDifficulty;
      let durationSeconds: number;
      
      // Logic: Progressive scaling. Tier I (0.4 to 0.8), Tier II (1.0 to 2.0), Tier III (2.5 to 5.0).
      const tierMultiplier = [
        Math.min(0.8, 0.4 + (successfulRuns * 0.01)),
        Math.min(2.0, 1.0 + (successfulRuns * 0.02)),
        Math.min(5.0, 2.5 + (successfulRuns * 0.05))
      ][index];

      const baseLoot = squadPower * tierMultiplier;

      if (index === 0) {
        difficulty = 'Tier I (Low)';
        durationSeconds = Math.min(120, 60 + (successfulRuns * 5));
      } else if (index === 1) {
        difficulty = 'Tier II (Moderate)';
        durationSeconds = Math.min(180, 60 + (successfulRuns * 10));
      } else {
        difficulty = 'Tier III (High)';
        durationSeconds = Math.min(300, 120 + (successfulRuns * 15));
      }

      const polymerMin = Math.floor(baseLoot * 0.5);
      const polymerMax = Math.floor(baseLoot * 0.8);
      const scrapMin = Math.floor(baseLoot * 0.7);
      const scrapMax = Math.floor(baseLoot * 1.2);
      const creditsBonus = Math.floor(baseLoot * 1.5);


      // Map resistance profile to a specific enemy template ID
      let enemyTypeId = 'GUARDIAN_UNIT';
      if (resistanceProfile.type === 'UNARMORED') enemyTypeId = 'SCYTHE_DRONE';
      if (resistanceProfile.type === 'ENERGY_SHIELD') enemyTypeId = 'EMP_WARDEN';
      if (index === 2 && resistanceProfile.type === 'HEAVY_ARMOR') enemyTypeId = 'PHALANX_TANK';

      return {
        id: `mission-${Date.now()}-${index}`,
        targetName,
        description,
        difficulty,
        durationSeconds,
        expectedResistance: resistanceProfile.label,
        enemyTypeId,
        potentialLoot: { polymerMin, polymerMax, scrapMin, scrapMax, creditsBonus }
      };
    };

    return {
      /**
       * Starts a strike mission by locking in a contract.
       */
      startStrike(mission: MissionContract): void {
        patchState(store, { activeStrikeMission: mission });
      },

      /**
       * Clears the current active mission state.
       */
      clearStrike(): void {
        patchState(store, { activeStrikeMission: null });
      },

      /**
       * Refreshes the available contract list with new randomized missions.
       */
      refreshContracts(): void {
        patchState(store, { isRefreshing: true });
        
        const newContracts: MissionContract[] = [];
        const usedTargets = new Set<string>();

        for (let i = 0; i < 3; i++) {
          let contract: MissionContract;
          do {
            contract = generateSingleContract(i);
          } while (usedTargets.has(contract.targetName));

          usedTargets.add(contract.targetName);
          newContracts.push(contract);
        }

        patchState(store, { 
          availableContracts: newContracts, 
          isRefreshing: false,
          activeStrikeMission: null // Reset selection on refresh
        });
      }
    };
  }),

  /** ─── Lifecycle Hooks ─────────────────────────────────────────────── */
  withHooks({
    onInit(store) {
      // Logic: Initialize the store with a fresh set of contracts on startup.
      store.refreshContracts();
    }
  })
);
