import { Component, inject, signal, OnInit, OnDestroy, ChangeDetectionStrategy, ElementRef, AfterViewChecked, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MissionStore } from '../services/mission.store';
import { WorkshopService } from '../services/workshop.service';
import { PlayerStore } from '../services/player.store';
import { CombatSimulationService } from '../services/combat-simulation.service';
import { StrikeResult } from '../models/combat.model';
import { ScrapFilterService } from '../services/scrap-filter.service';
import { CombatArena } from '../components/combat-arena';
import { CombatStore } from '../services/combat.store';


@Component({
  selector: 'app-strike-report',
  standalone: true,
  imports: [CommonModule, CombatArena, RouterLink],
  template: `
    <div class="h-screen bg-black text-green-500 font-mono p-8 flex flex-col overflow-hidden">
      <!-- War Room Header -->
      <div class="border-b-2 border-green-900 pb-4 mb-6 flex justify-between items-end">
        <div class="flex items-center gap-6">
          <!-- Hub Navigation -->
          <a routerLink="/hub" class="h-[38px] flex items-center justify-center text-green-500 border border-green-800 hover:bg-green-900/50 px-3 font-mono text-sm uppercase transition-colors">
              < BACK_TO_HUB
          </a>

          <div class="flex flex-col">
            <h1 class="text-xl font-black tracking-tighter uppercase italic text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">
              Liberation_Strike // {{ activeView() === 'LIVE_FEED' ? 'LIVE_FEED' : 'TACTICAL_MAP' }}
            </h1>
            <p class="text-[10px] text-green-800 uppercase tracking-widest">Target: {{ mission()?.targetName }} | Status: [ACTIVE_ENGAGEMENT]</p>
          </div>

          <!-- Divider -->
          <div class="w-[1px] h-10 bg-green-900/50 mx-2"></div>

          <!-- Elapsed Time -->
          <div class="flex flex-col items-center">
            <div class="h-[38px] flex items-center justify-center bg-green-900/20 px-4 border border-green-800 animate-pulse text-green-400 font-black text-lg">
              {{ formatTime(Math.floor(combatStore.timeElapsed())) }}
            </div>
          </div>

          <!-- View Toggle Button -->
          <button (click)="toggleView()" class="h-[38px] px-4 border text-[10px] uppercase font-black tracking-widest transition-all cursor-pointer flex items-center justify-center"
                  [ngClass]="activeView() === 'LIVE_FEED'
                    ? 'border-cyan-700 text-cyan-400 hover:bg-cyan-900/30'
                    : 'border-green-700 text-green-400 hover:bg-green-900/30'">
            {{ activeView() === 'LIVE_FEED' ? '[ TACTICAL_MAP ]' : '[ LIVE_FEED ]' }}
          </button>
        </div>

        <!-- Right Side: Empty to avoid TopBar overlap -->
        <div class="hidden lg:block w-96"></div>
      </div>

      <!-- Main Feed -->
      <div class="flex-1 overflow-hidden flex flex-col lg:flex-row gap-8">
        <!-- View: Terminal Logs (LIVE_FEED) -->
        <div class="flex-1 bg-[#050110] border border-white/5 p-4 flex flex-col relative overflow-hidden"
             [class.hidden]="activeView() !== 'LIVE_FEED'">
          <!-- Background Grid -->
          <div class="absolute inset-0 opacity-10 pointer-events-none" style="background-image: linear-gradient(#1e1b4b 1px, transparent 1px), linear-gradient(90deg, #1e1b4b 1px, transparent 1px); background-size: 40px 40px;"></div>
          
          <div class="absolute top-0 right-0 p-2 text-[8px] text-cyan-900 uppercase tracking-widest bg-black/40 border-l border-b border-white/5">Secure_Link: 256-bit_AES</div>
          
          <div #logContainer class="flex-1 overflow-y-auto space-y-1 pr-4 relative z-10">
            @for (log of combatStore.logs(); track $index) {
              @if (shouldShowLog(log)) {
                <div class="text-[11px] font-mono animate-in fade-in slide-in-from-left-1 duration-200">
                  <span class="opacity-30 mr-2">[{{ $index.toString().padStart(3, '0') }}]</span>
                  <span [ngClass]="getLogClass(log)">{{ log }}</span>
                </div>
              }
            }
            @if (!combatStore.isFinished()) {
              <div class="animate-pulse text-cyan-500 font-bold ml-10">_</div>
            }
          </div>
        </div>

        <div class="flex-1 bg-[#050110] border border-white/5 p-4 flex items-center justify-center relative overflow-hidden"
             [class.hidden]="activeView() !== 'TACTICAL_MAP'">
          <app-combat-arena 
            [mission]="mission()" 
            [shurikens]="shurikens()" 
            (arenaLog)="onArenaLog($event)"
            (missionComplete)="onMissionComplete($event)" />
        </div>

        <!-- Tactical Sidebar -->
        <div class="w-full lg:w-96 flex flex-col gap-6 overflow-hidden">
           <!-- Squad Monitor -->
           <div class="flex-1 border border-white/5 p-5 bg-[#050110]/50 overflow-y-auto">
              <h3 class="text-[9px] uppercase font-black text-gray-500 mb-6 tracking-[0.4em] flex items-center gap-3">
                <span class="w-2 h-[1px] bg-red-500"></span>
                 SQUAD_VITAL_TELEMETRY
              </h3>

              <!-- Hostile Intel -->
              <div class="mb-10 p-4 border border-red-900/30 bg-red-950/10 relative overflow-hidden group">
                <div class="absolute top-0 right-0 p-1 text-[7px] text-red-900 uppercase font-black">Target_Lock: Active</div>
                <h4 class="text-[9px] text-red-500 font-black mb-3 tracking-widest uppercase flex items-center gap-2">
                  <span class="w-1 h-1 bg-red-500 animate-ping"></span>
                  HOSTILE_ENTITY_DETECTION
                </h4>
                
                <div class="space-y-4">
                  <div class="flex justify-between items-end">
                    <span class="text-xs font-black text-gray-100 uppercase tracking-tighter">{{ mission()?.targetName || 'UNKNOWN_TARGET' }}</span>
                    <span class="text-[10px] font-mono text-red-500">{{ Math.ceil(combatStore.enemyHull()) }} <span class="opacity-30">/</span> {{ combatStore.enemyMaxHull() }}</span>
                  </div>
                  
                  <div class="space-y-1.5">
                      <div class="flex justify-between items-center text-[8px] text-red-900 uppercase font-bold tracking-tighter">
                        <span>Hull_Integrity</span>
                        <span>{{ combatStore.enemyMaxHull() > 0 ? Math.ceil((combatStore.enemyHull() / combatStore.enemyMaxHull()) * 100) : 0 }}%</span>
                      </div>
                    <div class="w-full h-2 bg-red-950/20">
                      <div class="h-full bg-red-600 transition-all duration-300" 
                           [ngClass]="{'animate-pulse bg-red-500': combatStore.enemyHull() < (combatStore.enemyMaxHull() * 0.3)}"
                           [style.width.%]="(combatStore.enemyHull() / combatStore.enemyMaxHull()) * 100"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="space-y-8">
                 @for (squadStatus of combatStore.squadStatuses(); track squadStatus.id) {
                   <div class="space-y-3 group">
                      <div class="flex justify-between items-end">
                        <div class="flex flex-col">
                          <span class="text-[8px] text-gray-600 uppercase font-bold tracking-tighter">Unit_Node</span>
                          <span class="text-xs font-black tracking-tight" [ngClass]="squadStatus.hp > 0 ? 'text-gray-100' : 'text-red-900'">{{ squadStatus.name }}</span>
                        </div>
                        <span class="text-[10px] font-mono text-cyan-700 bg-cyan-950/20 px-2 py-0.5 border border-cyan-900/30">
                          {{ Math.ceil(squadStatus.hp) }} <span class="opacity-30">/</span> {{ squadStatus.maxHp }}
                        </span>
                      </div>
                      
                         <!-- Hull Bar -->
                         <div class="flex justify-between items-center text-[7px] font-black text-gray-500 uppercase tracking-tighter mb-0.5">
                            <span>HULL_INTEGRITY</span>
                            <span>{{ Math.ceil((squadStatus.hp / squadStatus.maxHp) * 100) }}%</span>
                         </div>
                         <div class="w-full h-1.5 bg-white/5 mb-2">
                           <div class="h-full transition-all duration-1000" 
                                [ngClass]="squadStatus.hp > (squadStatus.maxHp * 0.5) ? 'bg-green-500' : (squadStatus.hp > (squadStatus.maxHp * 0.2) ? 'bg-yellow-500 animate-pulse' : 'bg-red-600')"
                                [style.width.%]="(squadStatus.hp / squadStatus.maxHp) * 100"></div>
                         </div>

                         <!-- Energy Bar -->
                         <div class="flex justify-between items-center text-[7px] font-black text-yellow-900/50 uppercase tracking-tighter mb-0.5">
                            <span>CORE_STABILITY</span>
                            <span>{{ Math.ceil((squadStatus.energy / squadStatus.maxEnergy) * 100) }}%</span>
                         </div>
                         <div class="w-full h-1 bg-white/5 relative mb-1">
                            <div class="h-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)] transition-all duration-75" 
                                 [style.width.%]="(squadStatus.energy / squadStatus.maxEnergy) * 100"></div>
                         </div>

                        <!-- Reboot Status -->
                        @if (squadStatus.rebootTicks > 0) {
                           <div class="text-[8px] font-black text-red-500 animate-pulse flex justify-between uppercase">
                              <span>Status: Rebooting...</span>
                              <span>{{ (squadStatus.rebootTicks / 10).toFixed(1) }}s</span>
                           </div>
                        } @else {
                           <div class="text-[8px] font-bold text-green-900 uppercase">Status: Online</div>
                        }
                      </div>
                 }
              </div>
           </div>

           <!-- Resources Recovered -->
           <div class="border border-white/5 p-5 bg-[#050110]">
              <h3 class="text-[9px] uppercase font-black text-gray-500 mb-6 tracking-[0.4em] flex items-center gap-3">
                <span class="w-2 h-[1px] bg-cyan-500"></span>
                RECOVERY_MANIFEST
              </h3>
              <div class="grid grid-cols-1 gap-4">
                 <div class="flex justify-between items-center bg-white/5 p-3 border-l-2 border-blue-500">
                    <span class="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Polymer</span>
                    <span class="text-xl font-mono font-black text-blue-400">{{ combatStore.currentPolymer() }}</span>
                 </div>
                 <div class="flex justify-between items-center bg-white/5 p-3 border-l-2 border-orange-500">
                    <span class="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Scrap</span>
                    <span class="text-xl font-mono font-black text-orange-400">{{ combatStore.currentScrap() }}</span>
                 </div>
                 <div class="flex justify-between items-center bg-white/5 p-3 border-l-2 border-yellow-500">
                    <span class="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Credits</span>
                    <span class="text-xl font-mono font-black text-yellow-500">{{ combatStore.currentCredits() }}</span>
                 </div>
              </div>
           </div>

           <!-- Completion Status -->
           @if (combatStore.isFinished()) {
             <div class="animate-in zoom-in duration-300">
                <div class="p-6 border flex flex-col items-center gap-4 bg-black/40"
                     [ngClass]="combatStore.success() ? 'border-cyan-500/50' : 'border-red-600/50'">
                   <h2 class="text-2xl font-black uppercase tracking-[0.2em]"
                       [ngClass]="combatStore.success() ? 'text-cyan-400' : 'text-red-500'">
                     {{ combatStore.success() ? 'MISSION_COMPLETE' : 'STRIKE_FAILED' }}
                   </h2>
                   <p class="text-[9px] text-center text-gray-500 uppercase tracking-widest leading-loose">
                     {{ combatStore.success() ? 'Secure extraction successful. Loot verified.' : 'Tactical withdrawal initiated. High resource loss.' }}
                   </p>
                   <button (click)="finalize()" class="w-full py-4 bg-gray-100 text-black font-black uppercase text-xs tracking-[0.3em] hover:bg-white transition-all shadow-[0_10px_20px_-10px_rgba(255,255,255,0.2)]">
                     [ FINALIZE_DATA_STREAM ]
                   </button>
                </div>
            </div>
           } @else {
             <div class="p-5 bg-red-950/5 border border-red-900/20">
               <p class="text-[8px] text-red-900 uppercase mb-4 font-black tracking-widest text-center italic">! MANUAL_OVERRIDE_ACTIVE: 95% PENALTY_PROTOCOL !</p>
               <button (click)="abandon()" class="w-full py-3 border border-red-900/50 text-red-700 hover:bg-red-900 hover:text-white uppercase font-black text-[10px] tracking-[0.2em] transition-all">
                 ABANDON_STRIKE
               </button>
             </div>
           }
        </div>
      </div>
    </div>
  `,
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StrikeReport implements OnInit, OnDestroy, AfterViewChecked {
  /** Signal-based view child for the log terminal container. */
  private logContainer = viewChild<ElementRef>('logContainer');

  /** Centralized mission state store. */
  private missionStore = inject(MissionStore);
  
  /** Drone hardware and routine mapping. */
  private workshop = inject(WorkshopService);
  
  /** Centralized player state store. */
  private playerStore = inject(PlayerStore);
  
  /** High-fidelity offline combat simulation. */
  private combat = inject(CombatSimulationService);
  
  /** Resource filtering service. */
  private scrapFilter = inject(ScrapFilterService);
  
  /** Navigation service. */
  private router = inject(Router);
  
  /** Live combat state manager. */
  readonly combatStore = inject(CombatStore);

  /** Signal exposing the current active mission details. */
  mission = this.missionStore.activeStrikeMission;
  
  /** Signal containing the list of shurikens available for the strike. */
  shurikens = this.workshop.availableShurikens;

  /** Internal signal to store the simulation result for loot calculation. */
  strikeResult = signal<StrikeResult | null>(null);

  /** Toggle state for UI layout (Logs vs tactical map). */
  activeView = signal<'LIVE_FEED' | 'TACTICAL_MAP'>('TACTICAL_MAP');

  /** Exposing Math utility to the template. */
  Math = Math;

  private intervalId: any;

  /**
   * Component Lifecycle: Initialization.
   * Logic: Validates that a mission is active before proceeding with simulation.
   */
  ngOnInit() {
    const currentMission = this.mission();
    if (!currentMission) {
      this.router.navigate(['/liberation']);
      return;
    }
    this.startSimulation(currentMission);
  }

  /**
   * Component Lifecycle: Destruction.
   * Logic: Ensures simulation background processes are terminated.
   */
  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  /**
   * Switches the active tactical view.
   */
  toggleView() {
    this.activeView.update(previousView => previousView === 'LIVE_FEED' ? 'TACTICAL_MAP' : 'LIVE_FEED');
  }

  /**
   * Initiates the combat simulation to determine the potential outcome and loot.
   * @param activeMission The mission contract.
   */
  private startSimulation(activeMission: any) {
    const result = this.combat.simulateStrike(activeMission, this.shurikens());
    this.strikeResult.set(result);
  }

  /**
   * Bridge for manual log entries from the arena.
   */
  onArenaLog(logContent: string) {
    // Note: Live telemetry is now managed via CombatStore internally.
  }

  /**
   * Handles mission termination events from the arena component.
   * @param completionEvent Success/Failure status.
   */
  onMissionComplete(completionEvent: { success: boolean }) {
    this.finishStrike(completionEvent.success);
  }

  /**
   * Ensures the log terminal remains focused on the latest events.
   */
  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  /**
   * Logic: Automatically scrolls the log container to the maximum vertical height.
   */
  private scrollToBottom(): void {
    try {
      const container = this.logContainer();
      if (container) {
        container.nativeElement.scrollTop = container.nativeElement.scrollHeight;
      }
    } catch (error) {
      // Logic: Silently fail if UI is not yet rendered.
    }
  }

  /**
   * Finalizes the combat state and performs resource distribution math.
   * Logic: On failure, a 95% resource loss penalty is applied.
   * @param success The victory condition.
   */
  private finishStrike(success: boolean) {
    if (this.combatStore.isFinished()) return;

    this.combatStore.setFinished(success);

    // Logic: Update simulation result status.
    this.strikeResult.update(currentResult => currentResult ? { ...currentResult, success } : currentResult);

    const result = this.strikeResult();
    if (success) {
      this.combatStore.updateLoot(
        result?.totalPolymer || 0,
        result?.totalScrap || 0,
        result?.totalCredits || 0
      );
    } else {
      // 95% penalty on failure (Extraction failure).
      this.combatStore.updateLoot(
        Math.floor((result?.totalPolymer || 0) * 0.05),
        Math.floor((result?.totalScrap || 0) * 0.05),
        Math.floor((result?.totalCredits || 0) * 0.05)
      );
    }
  }

  /**
   * Formats time into MM:SS for the UI.
   */
  formatTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Logic: Filters out low-level telemetry logs from the main feed for readability.
   */
  shouldShowLog(logContent: string): boolean {
    return !logContent.startsWith('[ENERGY]') && !logContent.startsWith('[TELEMETRY]');
  }

  /**
   * Logic: Maps log content keywords to CSS color tokens.
   */
  getLogClass(logContent: string): string {
    if (logContent.includes('[CRITICAL]') || logContent.includes('[FAILURE]')) return 'text-red-500 font-black italic';
    if (logContent.includes('[SUCCESS]') || logContent.includes('MISSION OBJECTIVE NEUTRALIZED')) return 'text-green-400 font-bold';
    if (logContent.includes('HOSTILE_ENTITY') || logContent.includes('HOSTILE:')) return 'text-orange-500 font-bold';
    if (logContent.includes('[SYSTEM]')) return 'text-cyan-500 opacity-80';
    if (logContent.includes('[STATE]')) return 'text-purple-400 opacity-70';
    if (logContent.includes('[SEARCH]')) return 'text-yellow-500 italic opacity-80';
    if (logContent.includes('[MISS]') || logContent.includes('[EVADED]')) return 'text-gray-600 italic';
    if (logContent.includes('Hull Hit')) return 'text-green-400 font-bold';
    return 'text-green-600';
  }

  /**
   * Initiates an immediate tactical withdrawal.
   */
  abandon() {
    this.finishStrike(false);
  }

  /**
   * Logic: Finalizes the session, processes loot through filters, and resets mission state.
   */
  finalize() {
    const result = this.strikeResult();
    if (result) {
      const filteredLoot = this.scrapFilter.applyFilter({
        polymer: result.totalPolymer,
        scrap: result.totalScrap,
        credits: result.totalCredits
      });

      this.playerStore.addResources(filteredLoot);
    }
    
    this.missionStore.refreshContracts();
    this.missionStore.clearStrike();
    this.router.navigate(['/liberation']);
  }
}
