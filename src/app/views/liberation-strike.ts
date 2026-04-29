import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { MissionStore } from '../services/mission.store';
import { WorkshopStore } from '../services/workshop.store';
import { MissionContract } from '../models/mission-model';
import { ENEMY_TEMPLATES } from '../constants/enemy-templates';

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
              < BACK_TO_HUB
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
             <span class="text-red-700">|</span> ACTIVE_BOUNTIES
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
             @for (contract of availableContracts(); track contract.id) {
               <div class="bg-[#050110] border-t-2 p-5 flex flex-col gap-4 transition-all duration-300 cursor-pointer relative group overflow-hidden"
                    [ngClass]="{
                      'border-red-500 shadow-[0_10px_30px_-10px_rgba(239,68,68,0.2)] bg-[#0a051a]': selectedContract()?.id === contract.id,
                      'border-red-900/30 hover:border-red-700/50 hover:bg-[#070215]': selectedContract()?.id !== contract.id
                    }"
                    (click)="selectContract(contract)">
                  
                  <!-- Background Pattern -->
                  <div class="absolute inset-0 opacity-[0.03] pointer-events-none group-hover:opacity-[0.05] transition-opacity" 
                       style="background-image: radial-gradient(#ef4444 1px, transparent 0); background-size: 20px 20px;"></div>

                  <div class="relative z-10">
                    <div class="flex justify-between items-start mb-3">
                      <div class="px-2 py-0.5 text-[9px] font-black tracking-tighter uppercase border border-red-500/50 bg-red-950/20 text-red-400">
                        {{ contract.difficulty }}
                      </div>
                      <div class="text-[9px] text-red-900 font-mono">ID: {{ contract.id.split('-').pop() }}</div>
                    </div>

                    <h3 class="text-xl font-black tracking-tight leading-none mb-2 transition-colors uppercase"
                        [ngClass]="selectedContract()?.id === contract.id ? 'text-white' : 'text-red-500 group-hover:text-red-400'">
                      {{ contract.targetName }}
                    </h3>
                    <p class="text-xs text-gray-400 italic mb-5 leading-relaxed line-clamp-2 h-10">
                      "{{ contract.description }}"
                    </p>
                    
                    <!-- Defense Analysis -->
                    @let template = ENEMY_TEMPLATES[contract.enemyTypeId];
                    <div class="bg-black/40 border border-white/5 p-4 mb-4">
                      <div class="text-[10px] text-cyan-700 uppercase font-bold tracking-[0.2em] mb-3 border-b border-white/5 pb-2 flex justify-between">
                        <span>Defensive_Profile</span>
                        <span class="text-cyan-900">v4.2</span>
                      </div>
                      <div class="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        <div class="flex justify-between">
                          <span class="text-gray-500 uppercase font-bold tracking-tighter text-[10px]">Hull</span>
                          <span class="text-cyan-400 font-mono font-bold">{{ template.stats.maxHp }}</span>
                        </div>
                        <div class="flex justify-between">
                          <span class="text-gray-500 uppercase font-bold tracking-tighter text-[10px]">Shields</span>
                          <span class="text-cyan-400 font-mono font-bold">{{ template.stats.maxShields }}</span>
                        </div>
                        <div class="flex justify-between">
                          <span class="text-gray-500 uppercase font-bold tracking-tighter text-[10px]">Armor</span>
                          <span class="text-cyan-400 font-mono">{{ template.stats.armorValue }} <span class="text-[9px] opacity-40">[{{ template.stats.armorType.split('_')[0] }}]</span></span>
                        </div>
                        <div class="flex justify-between">
                          <span class="text-gray-500 uppercase font-bold tracking-tighter text-[10px]">Evasion</span>
                          <span class="text-red-500 font-mono font-bold">{{ (template.stats.evasionRate * 100).toFixed(0) }}%</span>
                        </div>
                      </div>
                    </div>

                    <!-- Intelligence -->
                    <div class="flex justify-between text-xs text-gray-400 mb-2 px-1">
                      <div class="flex items-center gap-1.5">
                        <span class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                        <span class="uppercase tracking-widest text-[10px] font-bold">{{ contract.durationSeconds }}s DEP</span>
                      </div>
                      <div class="text-right italic text-gray-500 text-[10px]">
                        {{ contract.expectedResistance }}
                      </div>
                    </div>
                  </div>

                  <!-- Reward Manifest (The Payout) -->
                  <div class="mt-auto pt-4 border-t border-white/5 relative z-10">
                    <div class="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-4 flex items-center gap-2">
                       ESTIMATED_REWARD_MANIFEST
                       <div class="h-[1px] flex-1 bg-white/5"></div>
                    </div>
                    
                    <div class="grid grid-cols-3 gap-2">
                      <div class="bg-white/5 p-2.5 border border-white/5 text-center group-hover:border-blue-900/50 transition-colors">
                        <div class="text-[9px] text-gray-500 uppercase font-bold mb-1">Polymer</div>
                        <div class="text-sm font-black text-blue-400 tracking-tighter">{{ contract.potentialLoot.polymerMin }}<span class="text-[9px] mx-0.5 opacity-30">-</span>{{ contract.potentialLoot.polymerMax }}</div>
                      </div>
                      <div class="bg-white/5 p-2.5 border border-white/5 text-center group-hover:border-orange-900/50 transition-colors">
                        <div class="text-[9px] text-gray-500 uppercase font-bold mb-1">Scrap</div>
                        <div class="text-sm font-black text-orange-400 tracking-tighter">{{ contract.potentialLoot.scrapMin }}<span class="text-[9px] mx-0.5 opacity-30">-</span>{{ contract.potentialLoot.scrapMax }}</div>
                      </div>
                      <div class="bg-white/5 p-2.5 border border-white/5 text-center group-hover:border-yellow-900/50 transition-colors">
                        <div class="text-[9px] text-gray-500 uppercase font-bold mb-1">Credits</div>
                        <div class="text-sm font-black text-yellow-500 tracking-tighter">+{{ contract.potentialLoot.creditsBonus }}</div>
                      </div>
                    </div>
                  </div>

                  @if (selectedContract()?.id === contract.id) {
                    <div class="absolute inset-0 border border-red-500/50 pointer-events-none z-20"></div>
                    <div class="absolute top-0 right-0 w-8 h-8 bg-red-500/10 flex items-center justify-center border-l border-b border-red-500/50">
                      <span class="text-red-500 text-[10px]">✓</span>
                    </div>
                  }
               </div>
             }
          </div>
          <div class="mt-8 flex justify-between items-center border-t border-red-900/20 pt-4">
            <p class="text-[10px] text-red-900 uppercase tracking-widest">// WARNING: DEPLOYMENT IS FINAL ONCE ENGAGED</p>
            <button (click)="refreshContracts()" class="text-red-500 border border-red-800 hover:bg-red-500 hover:text-black px-4 py-1.5 font-mono text-xs uppercase transition-all cursor-pointer">
              [ REFRESH_INTEL ]
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
  /** Centralized repository of enemy unit data. */
  protected readonly ENEMY_TEMPLATES = ENEMY_TEMPLATES;

  /** Centralized store for mission state and logic. */
  missionStore = inject(MissionStore);
  
  /** Reference to the workshop for squad state and routine mapping. */
  workshopStore = inject(WorkshopStore);
  
  /** Navigation service. */
  router = inject(Router);

  /** Signal exposing the current list of available contracts from the store. */
  availableContracts = this.missionStore.availableContracts;
  
  /** Internal tracking for the contract currently clicked by the user. */
  selectedContract = signal<MissionContract | null>(null);

  /**
   * Computed flight readiness for all owned shurikens.
   * Logic: A drone is 'fit' if it has at least one valid routine assigned (trigger + action).
   */
  swarmStatus = computed(() => {
    const shurikens = this.workshopStore.availableShurikens();
    const routinesMap = this.workshopStore.routinesMap();
    
    return shurikens.map(shuriken => {
      const routines = routinesMap[shuriken.id] || [];
      const validRoutines = routines.filter(routine => routine.trigger && routine.action).length;
      
      // Hardware integrity check: Requires active logic routines for autonomous flight.
      const isFit = validRoutines > 0;
      
      return { shuriken, validRoutines, isFit };
    });
  });

  /** Computed flag indicating if the swarm contains at least one combat-ready unit. */
  isLaunchReady = computed(() => {
    return this.swarmStatus().some(status => status.isFit);
  });

  /**
   * Selects a contract for potential deployment.
   * @param contract The mission contract object.
   */
  selectContract(contract: MissionContract) {
    this.selectedContract.set(contract);
  }

  /**
   * Clears selection and requests fresh intelligence data from the store.
   */
  refreshContracts() {
    this.selectedContract.set(null);
    this.missionStore.refreshContracts();
  }

  /**
   * Navigates to the routine editor for a specific shuriken.
   * @param shurikenId The unique ID of the drone.
   */
  configureShuriken(shurikenId: string) {
    this.workshopStore.setActiveShuriken(shurikenId);
    this.router.navigate(['/routine']);
  }

  /**
   * Finalizes mission selection and transitions to the live combat arena.
   * Logic: Commits the active mission to the store before navigation.
   */
  deploySwarm() {
    const chosenContract = this.selectedContract();
    if (this.isLaunchReady() && chosenContract) {
      this.missionStore.startStrike(chosenContract);
      this.router.navigate(['/strike-report']);
    }
  }
}
