import { Injectable, inject } from '@angular/core';
import { PlayerStore } from './player.store';
import { PlayerResources } from '../models/player.model';

@Injectable({ providedIn: 'root' })
export class ScrapFilterService {
  /** Centralized player state store. */
  private playerStore = inject(PlayerStore);

  /**
   * Intercepts incoming loot and applies the Auto-Scrap conversion protocol.
   * Logic: Simulates "low-tier component recycling" by converting a portion of Polymer into Scrap 
   * based on the player's configured tier threshold.
   * 
   * @param loot The raw resources recovered from a mission.
   * @returns The filtered resources after conversion processing.
   */
  applyFilter(loot: PlayerResources): PlayerResources {
    const tier = this.playerStore.autoScrapTier();
    
    // Logic: Protocol is inactive at tier 0.
    if (tier <= 0) return loot;

    const filteredResources = { ...loot };
    
    /** 
     * Conversion Math:
     * Tier 1 (25% conversion), Tier 2 (50%), Tier 3 (75%).
     * Effectively trades building materials (Polymer) for technical currency (Scrap).
     */
    const conversionRate = Math.min(0.75, tier * 0.25);
    const amountToConvert = Math.floor(filteredResources.polymer * conversionRate);
    
    filteredResources.polymer -= amountToConvert;
    filteredResources.scrap += amountToConvert; // Logic: 1:1 conversion for fundamental materials.

    return filteredResources;
  }
}
