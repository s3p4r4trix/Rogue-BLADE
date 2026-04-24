import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-genesis-chamber',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-black text-purple-300 p-8 font-mono relative">
      <header class="mb-6 flex justify-between items-end border-b-2 border-purple-800 pb-2">
        <div class="flex items-center gap-4">
          <a routerLink="/hub" class="text-purple-500 border border-purple-800 hover:bg-purple-900/50 px-3 py-1 font-mono text-sm uppercase transition-colors">
              < Back to Hub
          </a>
          <div>
            <h1 class="text-2xl font-bold tracking-widest text-purple-400 drop-shadow-[0_0_5px_rgba(192,132,252,0.5)]">
                GENESIS CHAMBER // RESEARCH
            </h1>
            <p class="text-sm text-purple-700">Accessing Zenith Technology Databanks</p>
          </div>
        </div>
      </header>
      
      <div class="flex items-center justify-center h-[60vh] border border-purple-900/50 bg-purple-950/10">
        <div class="text-center">
            <div class="text-purple-500 text-6xl mb-4 animate-pulse">⚛</div>
            <h2 class="text-xl font-bold mb-2">RESEARCH LAB OFFLINE</h2>
            <p class="text-purple-600 text-sm">Awaiting implementation of Tier II and Tier III research trees.</p>
        </div>
      </div>
    </div>
  `,
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GenesisChamber {}
