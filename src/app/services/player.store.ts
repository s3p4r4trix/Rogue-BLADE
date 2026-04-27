import { inject, PLATFORM_ID, computed, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { signalStore, withState, withMethods, withHooks, patchState, withComputed } from '@ngrx/signals';
import { PlayerResources, PlayerProfile, PlayerStats } from '../models/player.model';

/** ─── Persistence Utilities ─────────────────────────────────────────────── */

/**
 * Logic: Attempts to retrieve player resources from local storage.
 * Returns default values if data is missing or corrupted.
 */
function loadResources(): PlayerResources {
  const savedResources = localStorage.getItem('rogueBlade_resources');
  if (savedResources) {
    try {
      return JSON.parse(savedResources);
    } catch (error) {
      console.error('Failed to parse saved resources', error);
    }
  }
  return { credits: 0, polymer: 0, scrap: 0 };
}

/**
 * Logic: Attempts to retrieve player statistics from local storage.
 */
function loadStats(): PlayerStats {
  const savedStats = localStorage.getItem('rogueBlade_stats');
  if (savedStats) {
    try {
      return JSON.parse(savedStats);
    } catch (error) {
      console.error('Failed to parse saved stats', error);
    }
  }
  return { totalPlayTime: 0, successfulRuns: 0, failedRuns: 0 };
}

/** ─── Player State Definition ─────────────────────────────────────────────── */

export interface PlayerState {
  /** Reactive tracking of currency and upgrade materials. */
  resources: PlayerResources;
  /** Operative metadata (username, etc). */
  profile: PlayerProfile;
  /** Persistent progress metrics. */
  stats: PlayerStats;
  /** Active UI aesthetic theme. */
  theme: 'zenith' | 'ripperdoc' | 'neuromancer';
  /** User-defined threshold for automatic material processing. */
  autoScrapTier: number;
}

const initialState: PlayerState = {
  resources: loadResources(),
  profile: { username: 'Guest_774', email: 'guest.774@zenith-net.local' },
  stats: loadStats(),
  theme: (localStorage.getItem('rogueBlade_theme') as any) || 'neuromancer',
  autoScrapTier: parseInt(localStorage.getItem('rogueBlade_autoScrapTier') || '0')
};

/**
 * PlayerStore
 * Centralized SignalStore for operative profile management, resources, and persistence.
 */
export const PlayerStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  /** ─── Derived State (Computeds) ─────────────────────────────────────────────── */
  withComputed(({ stats }) => ({
    /** Returns formatted playtime string in HH:MM:SS format. */
    formattedPlayTime: computed(() => {
      const seconds = stats().totalPlayTime;
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = seconds % 60;
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    })
  })),

  /** ─── Methods (Actions) ─────────────────────────────────────────────── */
  withMethods((store) => ({
    /**
     * Updates the player's currency balance.
     * @param amount The value to add.
     */
    addCredits(amount: number): void {
      patchState(store, (state) => ({
        resources: { ...state.resources, credits: state.resources.credits + amount }
      }));
    },

    /**
     * Spends player credits if sufficient funds are available.
     * @param amount The cost.
     * @returns True if the transaction completed.
     */
    spendCredits(amount: number): boolean {
      if (store.resources().credits >= amount) {
        patchState(store, (state) => ({
          resources: { ...state.resources, credits: state.resources.credits - amount }
        }));
        return true;
      }
      return false;
    },

    /**
     * Increments polymer stock.
     */
    addPolymer(amount: number): void {
      patchState(store, (state) => ({
        resources: { ...state.resources, polymer: state.resources.polymer + amount }
      }));
    },

    /**
     * Attempts to consume polymer materials.
     */
    spendPolymer(amount: number): boolean {
      if (store.resources().polymer >= amount) {
        patchState(store, (state) => ({
          resources: { ...state.resources, polymer: state.resources.polymer - amount }
        }));
        return true;
      }
      return false;
    },

    /**
     * Increments scrap stock.
     */
    addScrap(amount: number): void {
      patchState(store, (state) => ({
        resources: { ...state.resources, scrap: state.resources.scrap + amount }
      }));
    },

    /**
     * Attempts to consume scrap metal.
     */
    spendScrap(amount: number): boolean {
      if (store.resources().scrap >= amount) {
        patchState(store, (state) => ({
          resources: { ...state.resources, scrap: state.resources.scrap - amount }
        }));
        return true;
      }
      return false;
    },

    /**
     * Adds multiple resources in a single state update.
     */
    addResources(rewards: { polymer: number, scrap: number, credits: number }): void {
      patchState(store, (state) => ({
        resources: {
          polymer: state.resources.polymer + rewards.polymer,
          scrap: state.resources.scrap + rewards.scrap,
          credits: state.resources.credits + rewards.credits
        }
      }));
    },

    /**
     * Updates the UI theme preference.
     * @param theme The selected theme name.
     */
    setTheme(theme: 'zenith' | 'ripperdoc' | 'neuromancer'): void {
      patchState(store, { theme });
    },

    /**
     * Updates the automatic item scapping threshold.
     */
    setAutoScrapTier(tier: number): void {
      patchState(store, { autoScrapTier: tier });
    },

    /**
     * Increments the successful mission count in persistent stats.
     */
    incrementSuccessfulRuns(): void {
      patchState(store, (state) => ({
        stats: { ...state.stats, successfulRuns: state.stats.successfulRuns + 1 }
      }));
    },

    /**
     * Increments the failed mission count in persistent stats.
     */
    incrementFailedRuns(): void {
      patchState(store, (state) => ({
        stats: { ...state.stats, failedRuns: state.stats.failedRuns + 1 }
      }));
    }
  })),

  /** ─── Lifecycle Hooks & Effects ─────────────────────────────────────────────── */
  withHooks({
    onInit(store, platformId = inject(PLATFORM_ID)) {
      
      // Logic: Persist resources to local storage whenever they change.
      effect(() => {
        localStorage.setItem('rogueBlade_resources', JSON.stringify(store.resources()));
      });

      // Logic: Apply theme class to body and persist preference.
      effect(() => {
        const currentTheme = store.theme();
        localStorage.setItem('rogueBlade_theme', currentTheme);
        if (isPlatformBrowser(platformId)) {
          document.body.classList.remove('theme-zenith', 'theme-ripperdoc', 'theme-neuromancer');
          document.body.classList.add(`theme-${currentTheme}`);
        }
      });

      // Logic: Persist auto-scrap settings.
      effect(() => {
        localStorage.setItem('rogueBlade_autoScrapTier', store.autoScrapTier().toString());
      });

      if (isPlatformBrowser(platformId)) {
        // Logic: Passive playtime tracking (1s interval).
        setInterval(() => {
          patchState(store, (state) => ({
            stats: { ...state.stats, totalPlayTime: state.stats.totalPlayTime + 1 }
          }));
        }, 1000);

        // Logic: Periodic full stats persistence (50s interval).
        setInterval(() => {
          localStorage.setItem('rogueBlade_stats', JSON.stringify(store.stats()));
        }, 50000);
      }
    }
  })
);
