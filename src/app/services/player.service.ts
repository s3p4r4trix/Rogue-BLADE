import { Injectable, signal, effect, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PlayerResources, PlayerProfile, PlayerStats } from '../models/player.model';

function loadResources(): PlayerResources {
  const savedResources = localStorage.getItem('rogueBlade_resources');
  if (savedResources) {
    try {
      return JSON.parse(savedResources);
    } catch (error) {
      console.error('Failed to parse saved resources', error);
    }
  }
  // Starting values for new operatives.
  return { credits: 0, polymer: 0, scrap: 0 };
}

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

@Injectable({ providedIn: 'root' })
export class PlayerService {
  /** Reactive signal tracking the player's current currency and materials. */
  readonly resources = signal<PlayerResources>(loadResources());
  
  /** Current operative profile metadata. */
  readonly profile = signal<PlayerProfile>({ username: 'Guest_774', email: 'guest.774@zenith-net.local' });
  
  /** Persistent statistics tracking player progress and engagement. */
  readonly stats = signal<PlayerStats>(loadStats());
  
  /** Current UI theme preference. Defaults to 'neuromancer' for the dark cyberpunk aesthetic. */
  readonly theme = signal<'zenith' | 'ripperdoc' | 'neuromancer'>(
    (localStorage.getItem('rogueBlade_theme') as 'zenith' | 'ripperdoc' | 'neuromancer') || 'neuromancer'
  );
  
  /** Tier threshold for automatic item scrapping during missions. */
  readonly autoScrapTier = signal<number>(parseInt(localStorage.getItem('rogueBlade_autoScrapTier') || '0'));

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    // Logic: Automatically persist resource changes to local storage.
    effect(() => {
      localStorage.setItem('rogueBlade_resources', JSON.stringify(this.resources()));
    });

    // Logic: Synchronize theme changes with the DOM for CSS variable application.
    effect(() => {
      const currentTheme = this.theme();
      localStorage.setItem('rogueBlade_theme', currentTheme);
      if (isPlatformBrowser(this.platformId)) {
        document.body.classList.remove('theme-zenith', 'theme-ripperdoc', 'theme-neuromancer');
        document.body.classList.add(`theme-${currentTheme}`);
      }
    });

    effect(() => {
      localStorage.setItem('rogueBlade_autoScrapTier', this.autoScrapTier().toString());
    });

    if (isPlatformBrowser(this.platformId)) {
      // Logic: Passive playtime tracking interval.
      setInterval(() => {
        this.stats.update(currentStats => ({ ...currentStats, totalPlayTime: currentStats.totalPlayTime + 1 }));
      }, 1000);

      // Logic: Periodic stats persistence to prevent data loss on browser crash.
      setInterval(() => {
        localStorage.setItem('rogueBlade_stats', JSON.stringify(this.stats()));
      }, 50000); // 50 seconds (Adjusted from original 5s to reduce disk I/O)

      // Logic: Mock network sync for telemetry logs.
      setInterval(() => {
        console.log(`[NETWORK] Syncing accumulated gameplay telemetry to Zenith remote servers...`);
      }, 60000);
    }
  }

  /**
   * Adds credits to the player's account.
   * @param amount The number of credits to add.
   */
  addCredits(amount: number) {
    this.resources.update(currentResources => ({ ...currentResources, credits: currentResources.credits + amount }));
  }

  /**
   * Attempts to spend a specific amount of credits.
   * @param amount The cost to subtract.
   * @returns True if the transaction was successful, false if funds were insufficient.
   */
  spendCredits(amount: number): boolean {
    if (this.resources().credits >= amount) {
      this.resources.update(currentResources => ({ ...currentResources, credits: currentResources.credits - amount }));
      return true;
    }
    return false;
  }

  /**
   * Adds polymer materials to the inventory.
   * @param amount The quantity to add.
   */
  addPolymer(amount: number) {
    this.resources.update(currentResources => ({ ...currentResources, polymer: currentResources.polymer + amount }));
  }

  /**
   * Attempts to spend polymer materials.
   * @param amount The quantity to subtract.
   * @returns True if successful.
   */
  spendPolymer(amount: number): boolean {
    if (this.resources().polymer >= amount) {
      this.resources.update(currentResources => ({ ...currentResources, polymer: currentResources.polymer - amount }));
      return true;
    }
    return false;
  }

  /**
   * Adds scrap metal to the inventory.
   * @param amount The quantity to add.
   */
  addScrap(amount: number) {
    this.resources.update(currentResources => ({ ...currentResources, scrap: currentResources.scrap + amount }));
  }

  /**
   * Bulk updates multiple resource types at once. Useful for mission loot processing.
   * @param newResources Object containing polymer, scrap, and credits to add.
   */
  addResources(newResources: { polymer: number, scrap: number, credits: number }) {
    this.resources.update(currentResources => ({
      ...currentResources,
      polymer: currentResources.polymer + newResources.polymer,
      scrap: currentResources.scrap + newResources.scrap,
      credits: currentResources.credits + newResources.credits
    }));
  }

  /**
   * Attempts to spend scrap metal.
   * @param amount The quantity to subtract.
   * @returns True if successful.
   */
  spendScrap(amount: number): boolean {
    if (this.resources().scrap >= amount) {
      this.resources.update(currentResources => ({ ...currentResources, scrap: currentResources.scrap - amount }));
      return true;
    }
    return false;
  }
}
