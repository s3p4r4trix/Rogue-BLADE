import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Inventory } from '../components/inventory';
import { GambitSlot } from '../components/gambit-slot';
import { CompilerConsole } from '../components/compiler-console';
import { WorkshopService } from '../services/workshop.service';
import { PlayerService } from '../services/player.service';

@Component({
  selector: 'app-routine-compiler',
  standalone: true,
  imports: [CommonModule, RouterLink, Inventory, GambitSlot, CompilerConsole],
  template: `
    <div class="h-screen flex flex-col p-4 sm:p-8 overflow-hidden">
      <!-- Header -->
      <header class="mb-6 flex justify-between items-end border-b-2 border-green-500 pb-2">
          <div class="flex items-center gap-4">
              <a routerLink="/hub" class="text-green-500 border border-green-800 hover:bg-green-900/50 px-3 py-1 font-mono text-sm uppercase transition-colors">
                  < BACK_TO_HUB
              </a>
              <div>
                  <h1 class="text-2xl font-bold tracking-widest text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.8)]">
                      SMART-SHURIKEN // ROGUE-OS
                  </h1>
                  <p class="text-sm text-green-700">User: MECHANIC_77 | Status: OFFLINE_MODE</p>
              </div>
          </div>
      </header>

      <!-- Main Content -->
      <div class="flex flex-col lg:flex-row gap-8 h-full min-h-0">
          <!-- Linke Seite: System Reference -->
          <div class="w-full lg:w-1/3 neon-border bg-[#030014]/95 p-4 flex flex-col h-full neuro-panel">
              <app-inventory class="h-full flex-1 min-h-0 block"></app-inventory>
          </div>

          <!-- Rechte Seite: Programmierung -->
          <div class="w-full lg:w-2/3 neon-border bg-[#030014]/95 p-4 flex flex-col h-full min-h-0 neuro-panel">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-green-800 pb-2 mb-4 gap-4">
                  <h2 class="text-lg font-bold tracking-widest">// ROUTINE_MANAGER</h2>
                  <div class="flex gap-2">
                    <div class="w-64 relative focus-within:z-50">
                       <select class="cyber-native-select"
                               [value]="activeShuriken().id"
                               (change)="onNativeShurikenChange($event)">
                         @for (opt of getShurikenOptions(); track opt.value) {
                           <option [value]="opt.value">{{ opt.label }}</option>
                         }
                       </select>
                    </div>
                    <a routerLink="/hardware" class="bg-blue-900/30 border border-blue-600 text-blue-300 hover:bg-blue-800/50 px-4 py-2 uppercase font-bold tracking-wider transition-colors shadow-[0_0_10px_rgba(59,130,246,0.2)] neuro-border-draw flex items-center">
                       <div class="border-anim before:bg-blue-500 after:bg-green-500"></div><div class="border-anim-v before:bg-blue-500 after:bg-green-500"></div>
                       <span class="relative z-10">[>] HARDWARE TUNING</span>
                    </a>
                  </div>
              </div>
              
              <div class="flex-1 overflow-y-auto pr-2">
                  <div id="gambit-list" class="flex flex-col gap-4 overflow-visible pb-40">
                      
                      <!-- Dynamisch gerenderte Slots -->
                      @for (routine of routines(); track routine.priority; let i = $index) {
                        <app-gambit-slot [routine]="routine" [index]="i"></app-gambit-slot>
                      }
                      
                      <!-- Add Routine Button -->
                      <div class="mt-2 text-center">
                         <button class="w-full py-2 border border-green-800 text-green-600 uppercase font-bold text-sm tracking-widest transition-colors neuro-border-draw"
                                 [ngClass]="{'opacity-50 cursor-not-allowed bg-red-900/20 border-red-800 text-red-500': capacityReached(), 'hover:bg-green-900/30 hover:border-green-500 hover:text-green-400': !capacityReached()}"
                                 (click)="addRoutine()"
                                 [disabled]="capacityReached()">
                             <div class="border-anim"></div><div class="border-anim-v"></div>
                             <span class="relative z-10">+ Allocate New Priority Slot</span>
                         </button>
                         @if (capacityReached()) {
                           <div class="text-red-500 text-xs mt-1 animate-pulse">! PROCESSOR OVERLOAD: CAPACITY REACHED !</div>
                         } @else {
                           <div class="text-green-700 text-[10px] mt-1 uppercase tracking-widest">Available Cycles: {{ routines().length }} / {{ activeShuriken().processor?.routineCapacity || 2 }}</div>
                         }
                      </div>
                      
                      <!-- Fallback (Always active) -->
                      <div class="bg-gray-900/20 border border-gray-800/50 p-3 flex flex-col sm:flex-row items-center gap-3 mt-4 opacity-50">
                          <div class="text-gray-600 font-bold w-16 text-center text-xs">DEFAULT<br>GATE</div>
                          <div class="flex-1 text-center text-gray-500 text-[10px] uppercase tracking-widest">If no priority routine returns TRUE:</div>
                          <div class="flex-1 border border-gray-800 p-2 text-center text-gray-500 text-xs font-bold">{{ fallbackAction() }}</div>
                          <div class="w-8"></div>
                      </div>
                  </div>
              </div>

              <!-- Konsole & Upload -->
              <app-compiler-console></app-compiler-console>
          </div>
      </div>
    </div>
  `,
  styles: [`
    .cyber-native-select {
      @apply w-full bg-black border border-green-900/50 text-green-400 px-3 py-2 outline-none appearance-none cursor-pointer relative z-10 transition-all duration-300 text-sm font-bold;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2322c55e'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 0.75rem center;
      background-size: 1rem;
    }
    .cyber-native-select:hover { @apply border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.1)]; }
    .cyber-native-select:focus { @apply border-green-400 shadow-[0_0_15px_rgba(74,222,128,0.2)]; }
    .cyber-native-select option { @apply bg-[#030014] text-green-300; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoutineCompiler {
  workshop = inject(WorkshopService);
  player = inject(PlayerService);

  routines = this.workshop.routines;
  fallbackAction = this.workshop.fallbackAction;
  availableShurikens = this.workshop.availableShurikens;
  activeShuriken = this.workshop.activeShuriken;

  capacityReached() {
    return this.routines().length >= (this.activeShuriken().processor?.routineCapacity || 2);
  }

  getShurikenOptions() {
    return this.availableShurikens().map(s => ({
      value: s.id,
      label: `${s.name} (Cap: ${s.processor?.routineCapacity || 2})`
    }));
  }

  onNativeShurikenChange(event: Event) {
    const id = (event.target as HTMLSelectElement).value;
    if (id) {
      this.workshop.setActiveShuriken(id);
    }
  }

  addRoutine() {
    this.workshop.addRoutine();
  }
}
