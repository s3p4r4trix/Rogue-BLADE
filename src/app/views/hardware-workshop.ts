import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-hardware-workshop',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-black text-blue-300 p-8 font-mono relative">
      <header class="mb-6 flex justify-between items-end border-b-2 border-blue-800 pb-2">
        <div class="flex items-center gap-4">
          <a routerLink="/hub" class="text-blue-500 border border-blue-800 hover:bg-blue-900/50 px-3 py-1 font-mono text-sm uppercase transition-colors">
              < Back to Hub
          </a>
          <div>
            <h1 class="text-2xl font-bold tracking-widest text-blue-400 drop-shadow-[0_0_5px_rgba(96,165,250,0.5)]">
                HARDWARE // TUNING
            </h1>
            <p class="text-sm text-blue-700">NPC: RIPPERDOC_01</p>
          </div>
        </div>
      </header>
      
      <div class="flex items-center justify-center h-[60vh] border border-blue-900/50 bg-blue-950/10">
        <div class="text-center">
            <div class="text-blue-500 text-6xl mb-4 animate-pulse">⚙</div>
            <h2 class="text-xl font-bold mb-2">WORKSHOP OFFLINE</h2>
            <p class="text-blue-600 text-sm">Awaiting implementation of hardware progression systems.</p>
        </div>
      </div>
    </div>
  `,
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HardwareWorkshop {}
