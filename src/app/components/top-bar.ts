import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, NavigationEnd } from '@angular/router';
import { PlayerStore } from '../services/player.store';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';

@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="fixed top-4 right-6 z-50 flex items-center gap-6 bg-[#030014]/90 border border-gray-800/80 p-3 shadow-[0_0_15px_rgba(0,0,0,0.8)] backdrop-blur-sm pointer-events-auto transition-all neuro-panel">
      <div class="flex gap-6 font-mono text-xs hidden sm:flex">
        <div [class.opacity-40]="!isCreditsActive()" [class.text-green-400]="isCreditsActive()" [class.drop-shadow-[0_0_5px_rgba(74,222,128,0.8)]]="isCreditsActive()" class="transition-all duration-300">
          <span class="text-gray-500 uppercase tracking-widest mr-1">Credits:</span>
          <span class="font-bold text-white">{{ playerStore.resources().credits | number }}</span>
        </div>
        <div [class.opacity-40]="!isPolymerActive()" [class.text-blue-400]="isPolymerActive()" [class.drop-shadow-[0_0_5px_rgba(96,165,250,0.8)]]="isPolymerActive()" class="transition-all duration-300">
          <span class="text-gray-500 uppercase tracking-widest mr-1">Polymer:</span>
          <span class="font-bold text-white">{{ playerStore.resources().polymer | number }}</span>
        </div>
        <div [class.opacity-40]="!isScrapActive()" [class.text-purple-400]="isScrapActive()" [class.drop-shadow-[0_0_5px_rgba(192,132,252,0.8)]]="isScrapActive()" class="transition-all duration-300">
          <span class="text-gray-500 uppercase tracking-widest mr-1">Scrap:</span>
          <span class="font-bold text-white">{{ playerStore.resources().scrap | number }}</span>
        </div>
      </div>
      <div class="w-[1px] h-6 bg-gray-700 hidden sm:block"></div>
      <a routerLink="/settings" class="text-xs bg-gray-900 border border-gray-700 hover:border-gray-400 text-gray-400 hover:text-white px-3 py-1.5 transition-colors cursor-pointer font-mono tracking-wider flex items-center gap-2 neuro-border-draw">
        <div class="border-anim"></div><div class="border-anim-v"></div>
        <span class="text-blue-500 relative z-10">⚙</span> <span class="relative z-10">SETTINGS</span>
      </a>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TopBar {
  /** Centralized player state store. */
  playerStore = inject(PlayerStore);
  
  /** Navigation service. */
  private router = inject(Router);

  /** 
   * Tracks the current URL to determine which resources should be highlighted.
   * Logic: Converts Router events into a reactive signal for template consumption.
   */
  private currentUrl = toSignal(
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(event => (event as NavigationEnd).urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );

  /** Computed flag to highlight credits on hub, liberation, or settings views. */
  isCreditsActive = computed(() => {
    const url = this.currentUrl();
    return url?.includes('/hub') || url?.includes('/liberation') || url?.includes('/settings');
  });

  /** Computed flag to highlight polymer on hardware or genesis views. */
  isPolymerActive = computed(() => {
    const url = this.currentUrl();
    return url?.includes('/hub') || url?.includes('/hardware') || url?.includes('/genesis') || url?.includes('/settings');
  });

  /** Computed flag to highlight scrap on hardware or routine views. */
  isScrapActive = computed(() => {
    const url = this.currentUrl();
    return url?.includes('/hub') || url?.includes('/routine') || url?.includes('/hardware') || url?.includes('/settings');
  });
}
