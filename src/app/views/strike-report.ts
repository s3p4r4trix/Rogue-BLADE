import { Component, inject, signal, OnInit, OnDestroy, ChangeDetectionStrategy, ElementRef, AfterViewChecked, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MissionService } from '../services/mission.service';
import { WorkshopService } from '../services/workshop.service';
import { PlayerService } from '../services/player.service';
import { CombatSimulationService } from '../services/combat-simulation.service';
import { StrikeResult, ShurikenStatus } from '../models/combat.model';
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
              {{ formatTime(Math.floor(store.timeElapsed())) }}
            </div>
          </div>

          <!-- View Toggle Button (Moved from right edge to here) -->
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
            @for (log of store.logs(); track $index) {
              @if (shouldShowLog(log)) {
                <div class="text-[11px] font-mono animate-in fade-in slide-in-from-left-1 duration-200">
                  <span class="opacity-30 mr-2">[{{ $index.toString().padStart(3, '0') }}]</span>
                  <span [ngClass]="getLogClass(log)">{{ log }}</span>
                </div>
              }
            }
            @if (!store.isFinished()) {
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

              <!-- Hostile Intel (The new Status Bar) -->
              <div class="mb-10 p-4 border border-red-900/30 bg-red-950/10 relative overflow-hidden group">
                <div class="absolute top-0 right-0 p-1 text-[7px] text-red-900 uppercase font-black">Target_Lock: Active</div>
                <h4 class="text-[9px] text-red-500 font-black mb-3 tracking-widest uppercase flex items-center gap-2">
                  <span class="w-1 h-1 bg-red-500 animate-ping"></span>
                  HOSTILE_ENTITY_DETECTION
                </h4>
                
                <div class="space-y-4">
                  <div class="flex justify-between items-end">
                    <span class="text-xs font-black text-gray-100 uppercase tracking-tighter">{{ mission()?.targetName || 'UNKNOWN_TARGET' }}</span>
                    <span class="text-[10px] font-mono text-red-500">{{ Math.ceil(store.enemyHull()) }} <span class="opacity-30">/</span> {{ store.enemyMaxHull() }}</span>
                  </div>
                  
                  <div class="space-y-1.5">

                    <!-- Enemy Hull -->
                      <div class="flex justify-between items-center text-[8px] text-red-900 uppercase font-bold tracking-tighter">
                        <span>Hull_Integrity</span>
                        <span>{{ store.enemyMaxHull() > 0 ? Math.ceil((store.enemyHull() / store.enemyMaxHull()) * 100) : 0 }}%</span>
                      </div>
                    <div class="w-full h-2 bg-red-950/20">
                      <div class="h-full bg-red-600 transition-all duration-300" 
                           [ngClass]="{'animate-pulse bg-red-500': store.enemyHull() < (store.enemyMaxHull() * 0.3)}"
                           [style.width.%]="(store.enemyHull() / store.enemyMaxHull()) * 100"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="space-y-8">
                 @for (squadStatus of store.squadStatuses(); track squadStatus.id) {
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
                    <span class="text-xl font-mono font-black text-blue-400">{{ store.currentPolymer() }}</span>
                 </div>
                 <div class="flex justify-between items-center bg-white/5 p-3 border-l-2 border-orange-500">
                    <span class="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Scrap</span>
                    <span class="text-xl font-mono font-black text-orange-400">{{ store.currentScrap() }}</span>
                 </div>
                 <div class="flex justify-between items-center bg-white/5 p-3 border-l-2 border-yellow-500">
                    <span class="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Credits</span>
                    <span class="text-xl font-mono font-black text-yellow-500">{{ store.currentCredits() }}</span>
                 </div>
              </div>
           </div>

           <!-- Completion Status -->
           @if (store.isFinished()) {
             <div class="animate-in zoom-in duration-300">
                <div class="p-6 border flex flex-col items-center gap-4 bg-black/40"
                     [ngClass]="store.success() ? 'border-cyan-500/50' : 'border-red-600/50'">
                   <h2 class="text-2xl font-black uppercase tracking-[0.2em]"
                       [ngClass]="store.success() ? 'text-cyan-400' : 'text-red-500'">
                     {{ store.success() ? 'MISSION_COMPLETE' : 'STRIKE_FAILED' }}
                   </h2>
                   <p class="text-[9px] text-center text-gray-500 uppercase tracking-widest leading-loose">
                     {{ store.success() ? 'Secure extraction successful. Loot verified.' : 'Tactical withdrawal initiated. High resource loss.' }}
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
  private logContainer = viewChild<ElementRef>('logContainer');

  private missionService = inject(MissionService);
  private workshop = inject(WorkshopService);
  private player = inject(PlayerService);
  private combat = inject(CombatSimulationService);
  private scrapFilter = inject(ScrapFilterService);
  private router = inject(Router);
  readonly store = inject(CombatStore);

  /** Signal containing the active mission configuration. */
  mission = this.missionService.activeStrikeMission;
  
  /** Signal containing the list of shurikens available for the strike. */
  shurikens = this.workshop.availableShurikens;

  /** Local signal to store the simulation result for finalization. */
  strikeResult = signal<StrikeResult | null>(null);

  /** Toggle between the Live Feed (logs) and the Tactical Map (arena). */
  activeView = signal<'LIVE_FEED' | 'TACTICAL_MAP'>('TACTICAL_MAP');

  /** Exposing Math to the template for inline calculations. */
  Math = Math;

  private intervalId: any;

  /**
   * Component Initialization.
   * Logic: Navigates back to liberation hub if no active mission is found.
   */
  ngOnInit() {
    if (!this.mission()) {
      this.router.navigate(['/liberation']);
      return;
    }
    this.startSimulation();
  }

  /**
   * Component Destruction.
   * Logic: Cleans up the simulation interval to prevent memory leaks.
   */
  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  /**
   * Switches the active UI view between terminal logs and tactical map.
   */
  toggleView() {
    this.activeView.update(previousView => previousView === 'LIVE_FEED' ? 'TACTICAL_MAP' : 'LIVE_FEED');
  }

  /**
   * Triggers the combat simulation logic.
   * Logic: Simulation determines the potential loot and outcome based on squad stats.
   */
  private startSimulation() {
    const result = this.combat.simulateStrike(this.mission()!, this.shurikens());
    this.strikeResult.set(result);
  }

  /**
   * Legacy bridge for arena logs.
   * Note: Telemetry is now handled directly via CombatStore.
   * @param logContent The log string emitted by the arena.
   */
  onArenaLog(logContent: string) {
    // Note: StrikeReport now observes logs directly from the CombatStore.
  }

  /**
   * Handles the mission completion event from the CombatArena component.
   * @param completionEvent Contains the success status of the mission.
   */
  onMissionComplete(completionEvent: { success: boolean }) {
    this.finishStrike(completionEvent.success);
  }

  /**
   * Lifecycle hook triggered after view updates.
   * Logic: Ensures the log container always scrolls to show the latest entries.
   */
  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  /**
   * Scrolls the terminal log container to the bottom.
   */
  private scrollToBottom(): void {
    try {
      const container = this.logContainer();
      if (container) {
        container.nativeElement.scrollTop = container.nativeElement.scrollHeight;
      }
    } catch (error) {
      // Logic: Ignore errors if container is not yet initialized or detached.
    }
  }

  /**
   * Finalizes the combat state and calculates loot distribution.
   * Logic: Applies a 95% resource penalty on failure to simulate lost cargo.
   * @param success Whether the mission was successful.
   */
  private finishStrike(success: boolean) {
    if (this.store.isFinished()) return;

    this.store.setFinished(success);

    // Update internal result status for UI reporting.
    this.strikeResult.update(currentResult => currentResult ? { ...currentResult, success } : currentResult);

    const result = this.strikeResult();
    if (success) {
      this.store.updateLoot(
        result?.totalPolymer || 0,
        result?.totalScrap || 0,
        result?.totalCredits || 0
      );
    } else {
      // 95% penalty on failure (looted items lost in extraction failure).
      this.store.updateLoot(
        Math.floor((result?.totalPolymer || 0) * 0.05),
        Math.floor((result?.totalScrap || 0) * 0.05),
        Math.floor((result?.totalCredits || 0) * 0.05)
      );
    }
  }

  /**
   * Formats a raw second count into a MM:SS string.
   * @param totalSeconds The time in seconds.
   */
  formatTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Determines if a log entry should be displayed in the terminal feed.
   * Logic: Filters out high-frequency telemetry data to keep the feed readable.
   * @param logContent The log string to evaluate.
   */
  shouldShowLog(logContent: string): boolean {
    return !logContent.startsWith('[ENERGY]') && !logContent.startsWith('[TELEMETRY]');
  }

  /**
   * Returns the CSS class for styling specific log types based on keywords.
   * @param logContent The log content to analyze.
   */
  getLogClass(logContent: string): string {
    if (logContent.includes('[CRITICAL]') || logContent.includes('[FAILURE]')) return 'text-red-500 font-black italic';
    if (logContent.includes('[SUCCESS]') || logContent.includes('[SYSTEM] TARGET NEUTRALIZED') || logContent.includes('MISSION OBJECTIVE NEUTRALIZED')) return 'text-green-400 font-bold';
    if (logContent.includes('[OVERCLOCK]')) return 'text-yellow-400 font-black shadow-[0_0_10px_rgba(250,204,21,0.5)]';
    if (logContent.includes('HOSTILE_ENTITY') || logContent.includes('HOSTILE:')) return 'text-orange-500 font-bold';
    if (logContent.includes('[SYSTEM]')) return 'text-cyan-500 opacity-80';
    if (logContent.includes('[STATE]')) return 'text-purple-400 opacity-70';
    if (logContent.includes('[SEARCH]')) return 'text-yellow-500 italic opacity-80';
    if (logContent.includes('[MISS]') || logContent.includes('[EVADED]')) return 'text-gray-600 italic';
    if (logContent.includes('Hull Hit')) return 'text-green-400 font-bold';
    return 'text-green-600';
  }

  /**
   * Abandons the current strike mission, triggering a failure state.
   */
  abandon() {
    this.finishStrike(false);
  }

  /**
   * Finalizes the data stream, applying loot filters and distributing resources to the player.
   * Logic: Uses the ScrapFilterService to process raw materials before adding to inventory.
   */
  finalize() {
    const result = this.strikeResult();
    if (result) {
      const filteredLoot = this.scrapFilter.applyFilter({
        polymer: result.totalPolymer,
        scrap: result.totalScrap,
        credits: result.totalCredits
      });

      this.player.addResources(filteredLoot);
    }
    this.missionService.refreshContracts();
    this.missionService.clearStrike();
    this.router.navigate(['/liberation']);
  }
}
