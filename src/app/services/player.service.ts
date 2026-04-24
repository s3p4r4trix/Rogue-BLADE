import { Injectable, signal, effect, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface PlayerResources {
  credits: number;
  polymer: number;
  scrap: number;
}

export interface PlayerProfile {
  username: string;
  email: string;
}

export interface PlayerStats {
  totalPlayTime: number;
  successfulRuns: number;
  failedRuns: number;
}

function loadResources(): PlayerResources {
  const saved = localStorage.getItem('rogueBlade_resources');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved resources', e);
    }
  }
  // Starting values
  return { credits: 0, polymer: 0, scrap: 0 };
}

function loadStats(): PlayerStats {
  const saved = localStorage.getItem('rogueBlade_stats');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved stats', e);
    }
  }
  return { totalPlayTime: 0, successfulRuns: 0, failedRuns: 0 };
}

@Injectable({ providedIn: 'root' })
export class PlayerService {
  readonly resources = signal<PlayerResources>(loadResources());
  readonly profile = signal<PlayerProfile>({ username: 'Guest_774', email: 'guest.774@zenith-net.local' });
  readonly stats = signal<PlayerStats>(loadStats());
  readonly theme = signal<'zenith' | 'ripperdoc' | 'neuromancer'>(
    (localStorage.getItem('rogueBlade_theme') as 'zenith' | 'ripperdoc' | 'neuromancer') || 'neuromancer'
  );

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    // Automatically save resources to localStorage whenever they change
    effect(() => {
      localStorage.setItem('rogueBlade_resources', JSON.stringify(this.resources()));
    });

    effect(() => {
      const currentTheme = this.theme();
      localStorage.setItem('rogueBlade_theme', currentTheme);
      if (isPlatformBrowser(this.platformId)) {
        document.body.classList.remove('theme-zenith', 'theme-ripperdoc', 'theme-neuromancer');
        document.body.classList.add(`theme-${currentTheme}`);
      }
    });

    if (isPlatformBrowser(this.platformId)) {
      // Smooth UI Playtime Tick (1 second)
      setInterval(() => {
        this.stats.update(s => ({ ...s, totalPlayTime: s.totalPlayTime + 1 }));
      }, 1000);

      // Optimized Local Storage Save (5 seconds)
      setInterval(() => {
        localStorage.setItem('rogueBlade_stats', JSON.stringify(this.stats()));
      }, 5000);

      // Mock Remote Cloud Sync (60 seconds)
      setInterval(() => {
        console.log(`[NETWORK] Syncing accumulated gameplay telemetry to Zenith remote servers...`);
      }, 60000);
    }
  }

  addCredits(amount: number) {
    this.resources.update(r => ({ ...r, credits: r.credits + amount }));
  }

  spendCredits(amount: number): boolean {
    if (this.resources().credits >= amount) {
      this.resources.update(r => ({ ...r, credits: r.credits - amount }));
      return true;
    }
    return false;
  }

  addPolymer(amount: number) {
    this.resources.update(r => ({ ...r, polymer: r.polymer + amount }));
  }

  spendPolymer(amount: number): boolean {
    if (this.resources().polymer >= amount) {
      this.resources.update(r => ({ ...r, polymer: r.polymer - amount }));
      return true;
    }
    return false;
  }

  addScrap(amount: number) {
    this.resources.update(r => ({ ...r, scrap: r.scrap + amount }));
  }

  addResources(res: { polymer: number, scrap: number, credits: number }) {
    this.resources.update(r => ({
      ...r,
      polymer: r.polymer + res.polymer,
      scrap: r.scrap + res.scrap,
      credits: r.credits + res.credits
    }));
  }

  spendScrap(amount: number): boolean {
    if (this.resources().scrap >= amount) {
      this.resources.update(r => ({ ...r, scrap: r.scrap - amount }));
      return true;
    }
    return false;
  }
}
