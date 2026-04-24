import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-liberation-strike',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen text-red-300 p-8 font-mono relative">
      <header class="mb-6 flex justify-between items-end border-b-2 border-red-800 pb-2">
        <div class="flex items-center gap-4">
          <a routerLink="/hub" class="text-red-500 border border-red-800 hover:bg-red-900/50 px-3 py-1 font-mono text-sm uppercase transition-colors">
              < Back to Hub
          </a>
          <div>
            <h1 class="text-2xl font-bold tracking-widest text-red-500 drop-shadow-[0_0_5px_rgba(248,113,113,0.5)]">
                LIBERATION STRIKE // SECTOR DEPLOYMENT
            </h1>
            <p class="text-sm text-red-700">Warning: High Zenith Activity Detected</p>
          </div>
        </div>
      </header>
      
      <div class="flex items-center justify-center h-[60vh] border border-red-900/50 bg-red-950/10">
        <div class="text-center">
            <div class="text-red-500 text-6xl mb-4 animate-pulse">⚠</div>
            <h2 class="text-xl font-bold mb-2">MAP UNAVAILABLE</h2>
            <p class="text-red-600 text-sm">Awaiting implementation of the procedurally generated city map.</p>
        </div>
      </div>
    </div>
  `,
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LiberationStrike {}
