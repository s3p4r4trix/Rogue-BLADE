import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDropListGroup } from '@angular/cdk/drag-drop';
import { RouterLink } from '@angular/router';
import { Inventory } from '../components/inventory';
import { GambitSlot } from '../components/gambit-slot';
import { CompilerConsole } from '../components/compiler-console';
import { WorkshopService } from '../services/workshop.service';

@Component({
  selector: 'app-routine-compiler',
  standalone: true,
  imports: [CommonModule, CdkDropListGroup, RouterLink, Inventory, GambitSlot, CompilerConsole],
  template: `
    <div class="h-screen flex flex-col p-4 sm:p-8 overflow-hidden" cdkDropListGroup>
      <!-- Header -->
      <header class="mb-6 flex justify-between items-end border-b-2 border-green-500 pb-2">
          <div class="flex items-center gap-4">
              <a routerLink="/hub" class="text-green-500 border border-green-500 hover:bg-green-900/50 px-3 py-1 font-mono text-sm uppercase transition-colors">
                  < Back to Hub
              </a>
              <div>
                  <h1 class="text-2xl font-bold tracking-widest text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.8)]">
                      SMART-SHURIKEN // ROGUE-OS
                  </h1>
                  <p class="text-sm text-green-700">User: MECHANIC_77 | Status: OFFLINE_MODE</p>
              </div>
          </div>
          <div class="text-right">
              <span class="text-xs bg-green-900 text-green-300 px-2 py-1 uppercase border border-green-500">Shuriken #01 (Plasteel)</span>
          </div>
      </header>

      <!-- Main Content -->
      <div class="flex flex-col lg:flex-row gap-8 h-full min-h-0">
          <!-- Linke Seite: Inventar (Drag Sources) -->
          <div class="w-full lg:w-1/3 neon-border bg-black/80 p-4 flex flex-col h-full">
              <app-inventory class="h-full flex-1 min-h-0 block"></app-inventory>
          </div>

          <!-- Rechte Seite: Programmierung (Drop Zones) -->
          <div class="w-full lg:w-2/3 neon-border bg-black/80 p-4 flex flex-col h-full min-h-0">
              <h2 class="text-lg font-bold border-b border-green-800 pb-2 mb-4">// ROUTINE COMPILER</h2>
              
              <div id="gambit-list" class="flex-1 overflow-y-auto pr-2 flex flex-col gap-4">
                  <!-- Dynamisch gerenderte Slots -->
                  @for (routine of routines; track routine.priority) {
                    <app-gambit-slot [routine]="routine"></app-gambit-slot>
                  }
                  
                  <!-- Fallback (Always active) -->
                  <div class="bg-gray-900/50 border border-gray-800 p-3 flex flex-col sm:flex-row items-center gap-3 mt-4">
                      <div class="text-gray-600 font-bold w-16 text-center">FALL<br>BACK</div>
                      <div class="flex-1 text-center text-gray-500 text-sm">If no priority applies:</div>
                      <div class="flex-1 border border-gray-700 p-2 text-center text-gray-400">{{ fallbackAction }}</div>
                      <div class="w-8"></div>
                  </div>
              </div>

              <!-- Konsole & Upload -->
              <app-compiler-console></app-compiler-console>
          </div>
      </div>
    </div>
  `,
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoutineCompiler {
  workshop = inject(WorkshopService);
  
  get routines() {
    return this.workshop.routines();
  }

  get fallbackAction() {
    return this.workshop.fallbackAction();
  }
}
