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
    <div class="pointer-events-auto fixed top-4 right-6 z-50 flex items-center gap-6 bg-[#030014]/90 border border-gray-800/80 p-3 shadow-[0_0_15px_rgba(0,0,0,0.8)] backdrop-blur-sm transition-all neuro-panel">
      <div class="hidden sm:flex gap-6 font-mono text-xs">
        <div class="transition-all duration-300">
          <span class="text-gray-500 uppercase tracking-widest mr-1">Credits:</span>
          <span class="font-bold text-white">{{ playerStore.resources().credits | number }}</span>
        </div>
        <div class="transition-all duration-300">
          <span class="text-gray-500 uppercase tracking-widest mr-1">Polymer:</span>
          <span class="font-bold text-white">{{ playerStore.resources().polymer | number }}</span>
        </div>
        <div class="transition-all duration-300">
          <span class="text-gray-500 uppercase tracking-widest mr-1">Scrap:</span>
          <span class="font-bold text-white">{{ playerStore.resources().scrap | number }}</span>
        </div>
      </div>
      <div class="hidden sm:block w-[1px] h-6 bg-gray-700"></div>
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
}
