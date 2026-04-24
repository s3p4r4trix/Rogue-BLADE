import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PlayerService } from '../services/player.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen p-8 text-blue-300 font-mono">
      <div class="flex flex-col gap-6">
        
        <!-- Header -->
        <div class="flex items-center gap-6 border-b border-blue-800 pb-4 neuro-panel p-4">
          <button (click)="goBack()" class="bg-blue-900/50 border border-blue-600 text-blue-400 hover:bg-blue-800 px-4 py-2 uppercase text-sm transition-colors cursor-pointer neuro-border-draw shrink-0">
            <div class="border-anim"></div><div class="border-anim-v"></div>
            <span class="relative z-10">[<] Return to Hub</span>
          </button>
          <div>
            <h1 class="text-3xl font-bold text-blue-400 tracking-wider relative z-10">SYSTEM SETTINGS</h1>
            <div class="text-xs text-blue-600 uppercase mt-1 relative z-10">Player Profile & Global Preferences</div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <!-- Player Profile -->
          <div class="bg-[#030014]/95 border border-blue-900/50 p-6 shadow-[0_0_15px_rgba(30,58,138,0.2)] neuro-panel">
            <h2 class="text-xl text-blue-500 mb-4 border-b border-blue-900/50 pb-2">USER PROFILE</h2>
            <div class="space-y-4 text-sm">
              <div class="flex justify-between items-center bg-blue-950/30 p-2 border border-blue-900/30">
                <span class="text-blue-600">ID Alias:</span>
                <span class="text-blue-300 font-bold">{{ player.profile().username }}</span>
              </div>
              <div class="flex justify-between items-center bg-blue-950/30 p-2 border border-blue-900/30">
                <span class="text-blue-600">Net Address:</span>
                <span class="text-blue-300">{{ player.profile().email }}</span>
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
                <span class="text-blue-300">{{ formatTime(player.stats().totalPlayTime) }}</span>
              </div>
              <div class="flex justify-between items-center bg-blue-950/30 p-2 border border-blue-900/30">
                <span class="text-green-600/70">Successful Extractions:</span>
                <span class="text-green-400 font-bold">{{ player.stats().successfulRuns }}</span>
              </div>
              <div class="flex justify-between items-center bg-blue-950/30 p-2 border border-blue-900/30">
                <span class="text-red-600/70">Failed Uploads:</span>
                <span class="text-red-400 font-bold">{{ player.stats().failedRuns }}</span>
              </div>
            </div>
          </div>
          
          <!-- UI Theming -->
          <div class="bg-[#030014]/95 border border-blue-900/50 p-6 shadow-[0_0_15px_rgba(30,58,138,0.2)] md:col-span-2 neuro-panel">
            <h2 class="text-xl text-blue-500 mb-4 border-b border-blue-900/50 pb-2">INTERFACE THEME</h2>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              <button (click)="setTheme('zenith')" 
                      [class.border-blue-400]="player.theme() === 'zenith'"
                      [class.bg-blue-900]="player.theme() === 'zenith'"
                      class="border border-blue-900/50 p-4 text-left hover:border-blue-700 transition-colors cursor-pointer group neuro-border-draw">
                <div class="border-anim"></div><div class="border-anim-v"></div>
                <div class="font-bold mb-1 transition-colors relative z-10"
                     [class.text-white]="player.theme() === 'zenith'"
                     [class.text-blue-400]="player.theme() !== 'zenith'">
                     ZENITH GLASS
                </div>
                <div class="text-xs relative z-10" [class.text-blue-300]="player.theme() === 'zenith'" [class.text-blue-600]="player.theme() !== 'zenith'">Sleek, ethereal, frosted effects.</div>
              </button>

              <button (click)="setTheme('ripperdoc')" 
                      [class.border-green-500]="player.theme() === 'ripperdoc'"
                      [class.bg-green-900]="player.theme() === 'ripperdoc'"
                      class="border border-blue-900/50 p-4 text-left hover:border-green-700 transition-colors cursor-pointer group neuro-border-draw">
                <div class="border-anim before:bg-green-500 after:bg-green-500"></div><div class="border-anim-v before:bg-green-500 after:bg-green-500"></div>
                <div class="font-bold mb-1 transition-colors relative z-10"
                     [class.text-white]="player.theme() === 'ripperdoc'"
                     [class.text-green-500]="player.theme() !== 'ripperdoc'">
                     RIPPERDOC TERMINAL
                </div>
                <div class="text-xs relative z-10" [class.text-green-300]="player.theme() === 'ripperdoc'" [class.text-blue-600]="player.theme() !== 'ripperdoc'">Gritty, high-contrast CRT styling.</div>
              </button>

              <button (click)="setTheme('neuromancer')" 
                      [class.border-purple-500]="player.theme() === 'neuromancer'"
                      [class.bg-purple-900]="player.theme() === 'neuromancer'"
                      class="border border-blue-900/50 p-4 text-left hover:border-purple-700 transition-colors cursor-pointer group neuro-border-draw">
                <div class="border-anim before:bg-purple-500 after:bg-purple-500"></div><div class="border-anim-v before:bg-purple-500 after:bg-purple-500"></div>
                <div class="font-bold mb-1 transition-colors relative z-10"
                     [class.text-white]="player.theme() === 'neuromancer'"
                     [class.text-purple-400]="player.theme() !== 'neuromancer'">
                     NEUROMANCER DECK
                </div>
                <div class="text-xs relative z-10" [class.text-purple-300]="player.theme() === 'neuromancer'" [class.text-blue-600]="player.theme() !== 'neuromancer'">Animated PCB circuitry & electrons.</div>
              </button>

            </div>
          </div>

        </div>
      </div>
    </div>
  `
})
export class Settings {
  router = inject(Router);
  player = inject(PlayerService);

  goBack() {
    this.router.navigate(['/hub']);
  }

  setTheme(theme: 'zenith' | 'ripperdoc' | 'neuromancer') {
    this.player.theme.set(theme);
  }

  formatTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  }
}
