import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { MissionService } from '../services/mission.service';
import { WorkshopService } from '../services/workshop.service';
import { MissionContract } from '../models/mission.model';

@Component({
  selector: 'app-liberation-strike',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen text-red-300 p-4 md:p-8 font-mono relative">
      <!-- Header -->
      <header class="mb-6 flex justify-between items-end border-b-2 border-red-800 pb-2">
        <div class="flex items-center gap-4">
          <a routerLink="/hub" class="text-red-500 border border-red-800 hover:bg-red-900/50 px-3 py-1 font-mono text-sm uppercase transition-colors">
              < Back to Hub
          </a>
          <div>
            <h1 class="text-2xl font-bold tracking-widest text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">
                LIBERATION STRIKE
            </h1>
            <p class="text-sm text-red-700 uppercase">Deploy Swarm & Sabotage</p>
          </div>
        </div>
      </header>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <!-- Pre-Flight Checklist -->
        <div class="lg:col-span-1 flex flex-col gap-4">
          <div class="bg-[#030014]/95 border border-red-900/50 p-4 neuro-panel">
            <h2 class="text-xl text-red-500 font-bold mb-4 border-b border-red-900/50 pb-2 flex items-center gap-2">
              <span class="text-red-700">|</span> PRE-FLIGHT CHECKLIST
            </h2>
            
            <div class="space-y-3">
              @for (status of swarmStatus(); track status.shuriken.id) {
                <div class="p-3 border flex justify-between items-center transition-colors"
                     [ngClass]="{
                       'border-red-900/50 bg-black': !status.isFit,
                       'border-green-800 bg-green-950/20 shadow-[0_0_8px_rgba(34,197,94,0.1)]': status.isFit
                     }">
                  <div>
                    <div class="font-bold text-sm" [ngClass]="status.isFit ? 'text-green-400' : 'text-gray-500'">
                      {{ status.shuriken.name }}
                    </div>
                    <div class="text-xs" [ngClass]="status.isFit ? 'text-green-600' : 'text-red-600'">
                      Routines: {{ status.validRoutines }}
                    </div>
                  </div>
                  
                  <div class="flex items-center gap-3">
                    <div class="text-xs font-bold uppercase tracking-wider px-2 py-1 border"
                         [ngClass]="status.isFit ? 'text-green-400 border-green-800' : 'text-red-500 border-red-900'">
                      {{ status.isFit ? 'READY' : 'UNFIT' }}
                    </div>
                    <button (click)="configureShuriken(status.shuriken.id)" class="text-xs text-blue-500 hover:text-blue-400 uppercase tracking-wider transition-colors cursor-pointer neuro-border-draw px-2 py-1">
                      <div class="border-anim before:bg-blue-500 after:bg-blue-500"></div><div class="border-anim-v before:bg-blue-500 after:bg-blue-500"></div>
                      <span class="relative z-10">Configure</span>
                    </button>
                  </div>
                </div>
              }
            </div>

            <div class="mt-6 pt-4 border-t border-red-900/50 text-center">
               <div class="text-sm mb-2" [ngClass]="isLaunchReady() ? 'text-green-400' : 'text-red-500 font-bold'">
                 {{ isLaunchReady() ? 'Swarm is ready for deployment.' : 'No valid Shurikens. Check routines.' }}
               </div>
               <button (click)="deploySwarm()" class="w-full py-3 uppercase font-bold tracking-widest transition-all neuro-border-draw relative overflow-hidden"
                       [disabled]="!isLaunchReady() || !selectedContract()"
                       [ngClass]="{
                         'bg-red-900/30 border-red-500 text-red-400 hover:bg-red-800/50 hover:text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.3)] cursor-pointer': isLaunchReady() && selectedContract(),
                         'bg-black border-red-900/30 text-red-900 opacity-50 cursor-not-allowed': !isLaunchReady() || !selectedContract()
                       }">
                  <div class="border-anim before:bg-red-500 after:bg-red-500"></div><div class="border-anim-v before:bg-red-500 after:bg-red-500"></div>
                  <span class="relative z-10">[ DEPLOY SWARM ]</span>
               </button>
               @if (isLaunchReady() && !selectedContract()) {
                 <div class="text-xs text-red-400 mt-2 animate-pulse">Select a contract to deploy.</div>
               }
            </div>
          </div>
        </div>

        <!-- Bounty Board (Mission Selection) -->
        <div class="lg:col-span-2">
          <h2 class="text-xl text-red-500 font-bold mb-4 flex items-center gap-2">
             <span class="text-red-700">|</span> BOUNTY BOARD
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
             @for (contract of contracts(); track contract.id) {
               <div class="bg-[#030014]/95 border p-4 flex flex-col gap-3 transition-colors cursor-pointer neuro-border-draw relative group"
                    [ngClass]="{
                      'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]': selectedContract()?.id === contract.id,
                      'border-red-900/50 hover:border-red-700': selectedContract()?.id !== contract.id
                    }"
                    (click)="selectContract(contract)">
                  
                  <div class="border-anim before:bg-red-500 after:bg-red-500"></div>
                  <div class="border-anim-v before:bg-red-500 after:bg-red-500"></div>
                  
                  <div class="relative z-10 flex-1">
                    <div class="text-xs font-bold uppercase mb-1"
                         [ngClass]="{
                           'text-green-500': contract.difficulty.includes('Tier I'),
                           'text-yellow-500': contract.difficulty.includes('Tier II'),
                           'text-red-500': contract.difficulty.includes('Tier III')
                         }">
                      {{ contract.difficulty }}
                    </div>
                    <h3 class="text-lg font-bold text-red-400 leading-tight mb-2">{{ contract.targetName }}</h3>
                    <p class="text-xs text-gray-400 mb-4 h-12">{{ contract.description }}</p>
                    
                    <div class="space-y-1 text-[10px] mb-4 bg-red-950/20 p-2 border border-red-900/30">
                      <div class="flex justify-between border-b border-red-900/10 pb-1">
                        <span class="text-red-700 uppercase">Hull/Shields</span>
                        <span class="text-red-300 font-bold">{{ contract.hull }}H / {{ contract.shields }}S</span>
                      </div>
                      <div class="flex justify-between border-b border-red-900/10 pb-1">
                        <span class="text-red-700 uppercase">Protection</span>
                        <span class="text-red-300">{{ contract.armorType }} ({{ contract.armorValue }}A)</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-red-700 uppercase">Evasion</span>
                        <span class="text-red-400">{{ (contract.enemyEvasionRate * 100).toFixed(0) }}% Sign-Noise</span>
                      </div>
                    </div>

                    <div class="space-y-1 text-xs mb-4">
                      <div class="flex justify-between">
                        <span class="text-red-700">Intel:</span>
                        <span class="text-red-300 text-right">{{ contract.expectedResistance }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-red-700">Duration:</span>
                        <span class="text-red-300 font-bold">{{ contract.durationSeconds / 60 }} min</span>
                      </div>
                    </div>
                  </div>

                  <!-- Potential Loot -->
                  <div class="mt-auto border-t border-red-900/50 pt-3 relative z-10">
                    <div class="text-xs text-red-600 uppercase mb-2">Est. Payout</div>
                    <div class="flex justify-between items-center text-xs">
                      <span class="text-blue-400 font-bold">{{ contract.potentialLoot.polymerMin }}-{{ contract.potentialLoot.polymerMax }} Poly</span>
                      <span class="text-orange-400 font-bold">{{ contract.potentialLoot.scrapMin }}-{{ contract.potentialLoot.scrapMax }} Scrap</span>
                    </div>
                    @if (contract.potentialLoot.creditsBonus > 0) {
                      <div class="text-yellow-400 text-xs text-center mt-1 font-bold">
                        +{{ contract.potentialLoot.creditsBonus }} CR
                      </div>
                    }
                  </div>

                  @if (selectedContract()?.id === contract.id) {
                    <div class="absolute inset-0 border-2 border-red-500 pointer-events-none z-20"></div>
                  }
               </div>
             }
          </div>
          <div class="mt-4 flex justify-end">
            <button (click)="refreshContracts()" class="text-red-500 border border-red-800 hover:bg-red-900/50 px-3 py-1 font-mono text-sm uppercase transition-colors cursor-pointer">
              [ Refresh Intel ]
            </button>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LiberationStrike {
  missionService = inject(MissionService);
  workshop = inject(WorkshopService);
  router = inject(Router);

  contracts = this.missionService.availableContracts;
  selectedContract = signal<MissionContract | null>(null);

  // Compute flight readiness for all owned shurikens
  swarmStatus = computed(() => {
    const shurikens = this.workshop.availableShurikens();
    const routinesMap = this.workshop.routinesMap();
    
    return shurikens.map(shuriken => {
      const routines = routinesMap[shuriken.id] || [];
      // A routine is valid if both trigger and action are assigned
      const validRoutines = routines.filter(r => r.trigger && r.action).length;
      
      // In Phase 1, only requirement is > 0 valid routines
      const isFit = validRoutines > 0;
      
      return { shuriken, validRoutines, isFit };
    });
  });

  isLaunchReady = computed(() => {
    return this.swarmStatus().some(s => s.isFit);
  });

  selectContract(contract: MissionContract) {
    this.selectedContract.set(contract);
  }

  refreshContracts() {
    this.selectedContract.set(null);
    this.missionService.refreshContracts();
  }

  configureShuriken(id: string) {
    this.workshop.setActiveShuriken(id);
    this.router.navigate(['/routine']);
  }

  deploySwarm() {
    if (this.isLaunchReady() && this.selectedContract()) {
      this.missionService.startStrike(this.selectedContract()!);
      this.router.navigate(['/strike-report']);
    }
  }
}
