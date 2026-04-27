import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PlayerStore } from '../services/player.store';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen p-8 text-blue-300 font-mono">
      <div class="flex flex-col gap-6">
        
        <!-- Header -->
        <header class="mb-6 flex justify-between items-end border-b-2 border-blue-800 pb-2">
          <div class="flex items-center gap-4">
            <button (click)="goBack()" class="text-blue-500 border border-blue-800 hover:bg-blue-900/50 px-3 py-1 font-mono text-sm uppercase transition-colors cursor-pointer">
              < BACK_TO_HUB
            </button>
            <div>
              <h1 class="text-2xl font-bold tracking-widest text-blue-400 drop-shadow-[0_0_5px_rgba(96,165,250,0.5)]">
                  SYSTEM SETTINGS
              </h1>
              <p class="text-sm text-blue-700 uppercase">Player Profile & Global Preferences</p>
            </div>
          </div>
        </header>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <!-- Player Profile -->
          <div class="bg-[#030014]/95 border border-blue-900/50 p-6 shadow-[0_0_15px_rgba(30,58,138,0.2)] neuro-panel">
            <h2 class="text-xl text-blue-500 mb-4 border-b border-blue-900/50 pb-2">USER PROFILE</h2>
            <div class="space-y-4 text-sm">
              <div class="flex justify-between items-center bg-blue-950/30 p-2 border border-blue-900/30">
                <span class="text-blue-600">ID Alias:</span>
                <span class="text-blue-300 font-bold">{{ playerStore.profile().username }}</span>
              </div>
              <div class="flex justify-between items-center bg-blue-950/30 p-2 border border-blue-900/30">
                <span class="text-blue-600">Net Address:</span>
                <span class="text-blue-300">{{ playerStore.profile().email }}</span>
              </div>
              <div class="text-xs text-blue-700 italic pt-2">
                * Profiling locked by corporate mandate.
              </div>
            </div>
          </div>

          <!-- Global Statistics -->
          <div class="bg-[#030014]/95 border border-blue-900/50 p-6 shadow-[0_0_15px_rgba(30,58,138,0.2)] neuro-panel">
            <h2 class="text-xl text-blue-500 mb-4 border-b border-blue-900/50 pb-2">CAREER STATISTICS</h2>
            <div class="space-y-4 text-sm">
              <div class="flex justify-between items-center bg-blue-950/30 p-2 border border-blue-900/30">
                <span class="text-blue-600">Total Time Online:</span>
                <span class="text-blue-300">{{ playerStore.formattedPlayTime() }}</span>
              </div>
              <div class="flex justify-between items-center bg-blue-950/30 p-2 border border-blue-900/30">
                <span class="text-green-600/70">Successful Extractions:</span>
                <span class="text-green-400 font-bold">{{ playerStore.stats().successfulRuns }}</span>
              </div>
              <div class="flex justify-between items-center bg-blue-950/30 p-2 border border-blue-900/30">
                <span class="text-red-600/70">Failed Uploads:</span>
                <span class="text-red-400 font-bold">{{ playerStore.stats().failedRuns }}</span>
              </div>
            </div>
          </div>
          
          <!-- UI Theming -->
          <div class="bg-[#030014]/95 border border-blue-900/50 p-6 shadow-[0_0_15px_rgba(30,58,138,0.2)] md:col-span-2 neuro-panel">
            <h2 class="text-xl text-blue-500 mb-4 border-b border-blue-900/50 pb-2">INTERFACE THEME</h2>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              <button (click)="setTheme('zenith')" 
                      [class.border-blue-400]="playerStore.theme() === 'zenith'"
                      [class.bg-blue-900]="playerStore.theme() === 'zenith'"
                      [class.neuro-border-active]="playerStore.theme() === 'zenith'"
                      class="border border-blue-900/50 p-4 text-left hover:border-blue-700 transition-colors cursor-pointer group neuro-border-draw">
                <div class="border-anim"></div><div class="border-anim-v"></div>
                <div class="font-bold mb-1 transition-colors relative z-10"
                     [class.text-white]="playerStore.theme() === 'zenith'"
                     [class.text-blue-400]="playerStore.theme() !== 'zenith'">
                     ZENITH GLASS
                </div>
                <div class="text-xs relative z-10" [class.text-blue-300]="playerStore.theme() === 'zenith'" [class.text-blue-600]="playerStore.theme() !== 'zenith'">Sleek, ethereal, frosted effects.</div>
              </button>

              <button (click)="setTheme('ripperdoc')" 
                      [class.border-green-500]="playerStore.theme() === 'ripperdoc'"
                      [class.bg-green-900]="playerStore.theme() === 'ripperdoc'"
                      [class.neuro-border-active]="playerStore.theme() === 'ripperdoc'"
                      class="border border-blue-900/50 p-4 text-left hover:border-green-700 transition-colors cursor-pointer group neuro-border-draw">
                <div class="border-anim before:bg-green-500 after:bg-green-500"></div><div class="border-anim-v before:bg-green-500 after:bg-green-500"></div>
                <div class="font-bold mb-1 transition-colors relative z-10"
                     [class.text-white]="playerStore.theme() === 'ripperdoc'"
                     [class.text-green-500]="playerStore.theme() !== 'ripperdoc'">
                     RIPPERDOC TERMINAL
                </div>
                <div class="text-xs relative z-10" [class.text-green-300]="playerStore.theme() === 'ripperdoc'" [class.text-blue-600]="playerStore.theme() !== 'ripperdoc'">Gritty, high-contrast CRT styling.</div>
              </button>

              <button (click)="setTheme('neuromancer')" 
                      [class.border-purple-500]="playerStore.theme() === 'neuromancer'"
                      [class.bg-purple-900]="playerStore.theme() === 'neuromancer'"
                      [class.neuro-border-active]="playerStore.theme() === 'neuromancer'"
                      class="border border-blue-900/50 p-4 text-left hover:border-purple-700 transition-colors cursor-pointer group neuro-border-draw">
                <div class="border-anim before:bg-purple-500 after:bg-purple-500"></div><div class="border-anim-v before:bg-purple-500 after:bg-purple-500"></div>
                <div class="font-bold mb-1 transition-colors relative z-10"
                     [class.text-white]="playerStore.theme() === 'neuromancer'"
                     [class.text-purple-400]="playerStore.theme() !== 'neuromancer'">
                     NEUROMANCER DECK
                </div>
                <div class="text-xs relative z-10" [class.text-purple-300]="playerStore.theme() === 'neuromancer'" [class.text-blue-600]="playerStore.theme() !== 'neuromancer'">Animated PCB circuitry & electrons.</div>
              </button>

            </div>
          </div>

          <!-- Auto-Scrap QoL -->
          <div class="bg-[#030014]/95 border border-blue-900/50 p-6 shadow-[0_0_15px_rgba(30,58,138,0.2)] md:col-span-2 neuro-panel">
            <h2 class="text-xl text-blue-500 mb-4 border-b border-blue-900/50 pb-2">AUTO-SCRAP PROTOCOL (QoL)</h2>
            <p class="text-xs text-blue-700 mb-6 uppercase tracking-widest">Intercept low-tier drops and automatically convert them into raw Scrap materials.</p>
            
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
               <button (click)="setAutoScrap(0)" 
                       [class.bg-blue-600]="playerStore.autoScrapTier() === 0"
                       [class.text-black]="playerStore.autoScrapTier() === 0"
                       class="border border-blue-900 p-3 text-xs font-black uppercase tracking-widest transition-all">
                 OFF
               </button>
               <button (click)="setAutoScrap(1)" 
                       [class.bg-blue-600]="playerStore.autoScrapTier() === 1"
                       [class.text-black]="playerStore.autoScrapTier() === 1"
                       class="border border-blue-900 p-3 text-xs font-black uppercase tracking-widest transition-all">
                 TIER I (25%)
               </button>
               <button (click)="setAutoScrap(2)" 
                       [class.bg-blue-600]="playerStore.autoScrapTier() === 2"
                       [class.text-black]="playerStore.autoScrapTier() === 2"
                       class="border border-blue-900 p-3 text-xs font-black uppercase tracking-widest transition-all">
                 TIER II (50%)
               </button>
               <button (click)="setAutoScrap(3)" 
                       [class.bg-blue-600]="playerStore.autoScrapTier() === 3"
                       [class.text-black]="playerStore.autoScrapTier() === 3"
                       class="border border-blue-900 p-3 text-xs font-black uppercase tracking-widest transition-all">
                 TIER III (75%)
               </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Settings {
  /** Navigation service. */
  private router = inject(Router);
  
  /** Centralized player state store. */
  playerStore = inject(PlayerStore);

  /**
   * Navigates back to the main hub.
   */
  goBack() {
    this.router.navigate(['/hub']);
  }

  /**
   * Updates the global interface theme via the store.
   * @param theme The selected theme name.
   */
  setTheme(theme: 'zenith' | 'ripperdoc' | 'neuromancer') {
    this.playerStore.setTheme(theme);
  }

  /**
   * Updates the automatic item processing threshold.
   * @param tier The tier level (0-3).
   */
  setAutoScrap(tier: number) {
    this.playerStore.setAutoScrapTier(tier);
  }
}
