import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { PlayerService } from '../services/player.service';

@Component({
  selector: 'app-hub',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  template: `
    <div class="min-h-screen bg-black text-gray-300 p-8 font-mono relative overflow-hidden">
      <!-- Ambient effects -->
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-900/10 via-black to-black pointer-events-none"></div>
      <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMDAwIiBmaWxsLW9wYWNpdHk9IjAiLz4KPHBhdGggZD0iTTAgMGg0djRIMEowem0yIDJoMnYySDJWMHptLTIgMmgydjJIMFYyem0wLTJoMnYySDBWMHoiIGZpbGw9IiMzMzMiIGZpbGwtb3BhY2l0eT0iMC4xIi8+Cjwvc3ZnPg==')] opacity-30 pointer-events-none"></div>
      
      <!-- Top Bar -->
      <header class="relative border-b border-green-800/50 pb-4 mb-8 flex justify-between items-end z-10">
        <div>
          <h1 class="text-3xl font-bold tracking-widest text-green-500 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]">RESISTANCE HQ</h1>
          <p class="text-xs text-green-700 uppercase mt-1">Underground Sector 4 // Status: Undetected</p>
        </div>
        <div class="text-right">
          <div class="text-green-500 text-sm">Credits: <span class="text-white">{{ player.resources().credits | number }}</span></div>
          <div class="text-blue-400 text-sm">Polymer units: <span class="text-white">{{ player.resources().polymer | number }}</span></div>
          <div class="text-purple-400 text-sm">Scrap in kg: <span class="text-white">{{ player.resources().scrap | number }}</span></div>
        </div>
      </header>

      <!-- Main Navigation Grid -->
      <div class="relative grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto z-10">
        
        <!-- Routine Compiler (Rogue OS) -->
        <a routerLink="/routine" class="group relative block bg-gray-900/50 border border-green-800 hover:border-green-400 p-6 transition-all duration-300 hover:bg-green-900/20">
          <div class="absolute inset-0 bg-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <h2 class="text-xl font-bold text-green-400 mb-2 group-hover:text-green-300 flex items-center gap-2">
            <span class="text-green-600">></span> ROGUE OS
          </h2>
          <p class="text-sm text-gray-500 mb-4 h-10">Program your Shuriken swarm's If-Then combat logic routines.</p>
          <div class="text-xs text-green-700 uppercase">System Status: <span class="text-green-500 font-bold">ONLINE</span></div>
        </a>

        <!-- Hardware Workshop -->
        <a routerLink="/hardware" class="group relative block bg-gray-900/50 border border-blue-800 hover:border-blue-400 p-6 transition-all duration-300 hover:bg-blue-900/20">
          <div class="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <h2 class="text-xl font-bold text-blue-400 mb-2 group-hover:text-blue-300 flex items-center gap-2">
            <span class="text-blue-600">></span> HARDWARE WORKSHOP
          </h2>
          <p class="text-sm text-gray-500 mb-4 h-10">Tune engines, swap blades, and repair damaged units with Polymer.</p>
          <div class="text-xs text-blue-700 uppercase">Ripperdoc: <span class="text-blue-500 font-bold">AVAILABLE</span></div>
        </a>

        <!-- Genesis Chamber -->
        <a routerLink="/genesis" class="group relative block bg-gray-900/50 border border-purple-800 hover:border-purple-400 p-6 transition-all duration-300 hover:bg-purple-900/20">
          <div class="absolute inset-0 bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <h2 class="text-xl font-bold text-purple-400 mb-2 group-hover:text-purple-300 flex items-center gap-2">
            <span class="text-purple-600">></span> GENESIS CHAMBER
          </h2>
          <p class="text-sm text-gray-500 mb-4 h-10">Reverse-engineer Zenith tech. Research Tier II & III materials.</p>
          <div class="text-xs text-purple-700 uppercase">Research Node: <span class="text-purple-500 font-bold">IDLE</span></div>
        </a>

        <!-- Liberation Strike -->
        <a routerLink="/liberation" class="group relative block bg-red-950/30 border border-red-900 hover:border-red-500 p-6 transition-all duration-300 hover:bg-red-900/20">
          <div class="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <h2 class="text-xl font-bold text-red-500 mb-2 group-hover:text-red-400 flex items-center gap-2">
            <span class="text-red-700">></span> LIBERATION STRIKE
          </h2>
          <p class="text-sm text-gray-500 mb-4 h-10">Deploy your swarm to the occupied surface and sabotage the Zenith Collective.</p>
          <div class="text-xs text-red-700 uppercase animate-pulse">Threat Level: <span class="text-red-500 font-bold">CRITICAL</span></div>
        </a>

      </div>
    </div>
  `,
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Hub {
  player = inject(PlayerService);
}
