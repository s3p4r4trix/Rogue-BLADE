import { Injectable, inject } from '@angular/core';
import { PlayerService } from './player.service';
import { PlayerResources } from '../models/player.model';

@Injectable({ providedIn: 'root' })
export class ScrapFilterService {
  private player = inject(PlayerService);

  /**
   * Intercepts loot and applies the Auto-Scrap filter.
   * Currently, since we only have resources (Polymer, Scrap, Credits), 
   * we simulate "low-tier conversion" by allowing the player to convert 
   * a portion of Polymer into Scrap if the filter is active.
   */
  applyFilter(loot: PlayerResources): PlayerResources {
    const tier = this.player.autoScrapTier();
    if (tier <= 0) return loot;

    const filtered = { ...loot };
    
    // Logic: If tier > 0, convert 'Polymer' (simulated low-tier material) into 'Scrap'
    // Tier 1: 25% conversion
    // Tier 2: 50% conversion
    // Tier 3: 75% conversion
    const conversionRate = Math.min(0.75, tier * 0.25);
    const amountToConvert = Math.floor(filtered.polymer * conversionRate);
    
    filtered.polymer -= amountToConvert;
    filtered.scrap += amountToConvert; // 1:1 conversion for now

    return filtered;
  }
}
