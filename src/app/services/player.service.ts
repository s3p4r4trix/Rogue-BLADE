import { Injectable, signal, effect } from '@angular/core';

export interface PlayerResources {
  credits: number;
  polymer: number;
  scrap: number;
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

@Injectable({ providedIn: 'root' })
export class PlayerService {
  readonly resources = signal<PlayerResources>(loadResources());

  constructor() {
    // Automatically save resources to localStorage whenever they change
    effect(() => {
      localStorage.setItem('rogueBlade_resources', JSON.stringify(this.resources()));
    });
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

  spendScrap(amount: number): boolean {
    if (this.resources().scrap >= amount) {
      this.resources.update(r => ({ ...r, scrap: r.scrap - amount }));
      return true;
    }
    return false;
  }
}
