import { Component, inject, signal, OnInit, OnDestroy, ChangeDetectionStrategy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MissionService } from '../services/mission.service';
import { WorkshopService } from '../services/workshop.service';
import { PlayerService } from '../services/player.service';
import { CombatSimulationService } from '../services/combat-simulation.service';
import { StrikeResult, ShurikenStatus } from '../models/combat.model';
import { ScrapFilterService } from '../services/scrap-filter.service';
import { CombatArena } from '../components/combat-arena';


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
          <a routerLink="/hub" class="text-green-500 border border-green-800 hover:bg-green-900/50 px-3 py-1 font-mono text-sm uppercase transition-colors">
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

          <!-- Elapsed Time (Moved from right/left-edge to here) -->
          <div class="flex flex-col">
            <span class="text-[8px] text-green-800 uppercase font-bold tracking-widest mb-1">Elapsed_Time</span>
            <div class="text-xl font-black bg-green-900/20 px-3 py-0.5 border border-green-800 animate-pulse text-green-400">
              {{ formatTime(Math.floor(timeElapsed())) }}
            </div>
          </div>

          <!-- View Toggle Button (Moved from right edge to here) -->
          <button (click)="toggleView()" class="px-4 py-2 border text-[10px] uppercase font-black tracking-widest transition-all cursor-pointer h-fit"
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
            @for (log of visibleLogs(); track $index) {
              @if (shouldShowLog(log)) {
                <div class="text-[11px] font-mono animate-in fade-in slide-in-from-left-1 duration-200">
                  <span class="opacity-30 mr-2">[{{ $index.toString().padStart(3, '0') }}]</span>
                  <span [ngClass]="getLogClass(log)">{{ log }}</span>
                </div>
              }
            }
            @if (!isFinished()) {
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
                    <span class="text-[10px] font-mono text-red-500">{{ Math.ceil(enemyHull()) }} <span class="opacity-30">/</span> {{ enemyMaxHull() }}</span>
                  </div>
                  
                  <div class="space-y-1.5">

                    <!-- Enemy Hull -->
                      <div class="flex justify-between items-center text-[8px] text-red-900 uppercase font-bold tracking-tighter">
                        <span>Hull_Integrity</span>
                        <span>{{ enemyMaxHull() > 0 ? Math.ceil((enemyHull() / enemyMaxHull()) * 100) : 0 }}%</span>
                      </div>
                    <div class="w-full h-2 bg-red-950/20">
                      <div class="h-full bg-red-600 transition-all duration-300" 
                           [ngClass]="{'animate-pulse bg-red-500': enemyHull() < (enemyMaxHull() * 0.3)}"
                           [style.width.%]="(enemyHull() / enemyMaxHull()) * 100"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="space-y-8">
                 @for (s of squadStatuses(); track s.id) {
                   <div class="space-y-3 group">
                      <div class="flex justify-between items-end">
                        <div class="flex flex-col">
                          <span class="text-[8px] text-gray-600 uppercase font-bold tracking-tighter">Unit_Node</span>
                          <span class="text-xs font-black tracking-tight" [ngClass]="s.hp > 0 ? 'text-gray-100' : 'text-red-900'">{{ s.name }}</span>
                        </div>
                        <span class="text-[10px] font-mono text-cyan-700 bg-cyan-950/20 px-2 py-0.5 border border-cyan-900/30">
                          {{ Math.ceil(s.hp) }} <span class="opacity-30">/</span> {{ s.maxHp }}
                        </span>
                      </div>
                      

                         <!-- Hull Bar -->
                         <div class="flex justify-between items-center text-[7px] font-black text-gray-500 uppercase tracking-tighter mb-0.5">
                            <span>HULL_INTEGRITY</span>
                            <span>{{ Math.ceil((s.hp / s.maxHp) * 100) }}%</span>
                         </div>
                         <div class="w-full h-1.5 bg-white/5 mb-2">
                           <div class="h-full transition-all duration-1000" 
                                [ngClass]="s.hp > (s.maxHp * 0.5) ? 'bg-green-500' : (s.hp > (s.maxHp * 0.2) ? 'bg-yellow-500 animate-pulse' : 'bg-red-600')"
                                [style.width.%]="(s.hp / s.maxHp) * 100"></div>
                         </div>

                         <!-- Energy Bar -->
                         <div class="flex justify-between items-center text-[7px] font-black text-yellow-900/50 uppercase tracking-tighter mb-0.5">
                            <span>CORE_STABILITY</span>
                            <span>{{ Math.ceil((s.energy / s.maxEnergy) * 100) }}%</span>
                         </div>
                         <div class="w-full h-1 bg-white/5 relative mb-1">
                            <div class="h-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)] transition-all duration-75" 
                                 [style.width.%]="(s.energy / s.maxEnergy) * 100"></div>
                         </div>

                        <!-- Reboot Status -->
                        @if (s.rebootTicks > 0) {
                           <div class="text-[8px] font-black text-red-500 animate-pulse flex justify-between uppercase">
                              <span>Status: Rebooting...</span>
                              <span>{{ (s.rebootTicks / 10).toFixed(1) }}s</span>
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
                    <span class="text-xl font-mono font-black text-blue-400">{{ currentPolymer() }}</span>
                 </div>
                 <div class="flex justify-between items-center bg-white/5 p-3 border-l-2 border-orange-500">
                    <span class="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Scrap</span>
                    <span class="text-xl font-mono font-black text-orange-400">{{ currentScrap() }}</span>
                 </div>
                 <div class="flex justify-between items-center bg-white/5 p-3 border-l-2 border-yellow-500">
                    <span class="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Credits</span>
                    <span class="text-xl font-mono font-black text-yellow-500">{{ currentCredits() }}</span>
                 </div>
              </div>
           </div>

           <!-- Completion Status -->
           @if (isFinished()) {
             <div class="animate-in zoom-in duration-300">
                <div class="p-6 border flex flex-col items-center gap-4 bg-black/40"
                     [ngClass]="result()?.success ? 'border-cyan-500/50' : 'border-red-600/50'">
                   <h2 class="text-2xl font-black uppercase tracking-[0.2em]"
                       [ngClass]="result()?.success ? 'text-cyan-400' : 'text-red-500'">
                     {{ result()?.success ? 'MISSION_COMPLETE' : 'STRIKE_FAILED' }}
                   </h2>
                   <p class="text-[9px] text-center text-gray-500 uppercase tracking-widest leading-loose">
                     {{ result()?.success ? 'Secure extraction successful. Loot verified.' : 'Tactical withdrawal initiated. High resource loss.' }}
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
  @ViewChild('logContainer') private logContainer!: ElementRef;

  private missionService = inject(MissionService);
  private workshop = inject(WorkshopService);
  private player = inject(PlayerService);
  private combat = inject(CombatSimulationService);
  private scrapFilter = inject(ScrapFilterService);
  private router = inject(Router);

  mission = this.missionService.activeStrikeMission;
  shurikens = this.workshop.availableShurikens;

  visibleLogs = signal<string[]>([]);
  result = signal<StrikeResult | null>(null);
  isFinished = signal(false);

  /** Toggle between the Live Feed (logs) and the Tactical Map (arena) */
  activeView = signal<'LIVE_FEED' | 'TACTICAL_MAP'>('TACTICAL_MAP');

  squadStatuses = signal<ShurikenStatus[]>([]);
  enemyIntegrity = signal(100);
  enemyHull = signal(0);
  enemyMaxHull = signal(0);
  enemyShields = signal(0);
  enemyMaxShields = signal(0);
  timeRemaining = signal(0);
  timeElapsed = signal(0);

  Math = Math;

  // Counters for the UI
  currentPolymer = signal(0);
  currentScrap = signal(0);
  currentCredits = signal(0);

  private intervalId: any;

  ngOnInit() {
    if (!this.mission()) {
      this.router.navigate(['/liberation']);
      return;
    }
    this.timeRemaining.set(this.mission()!.durationSeconds);
    // Initialize squad status bars with shields
    this.squadStatuses.set(this.shurikens().map(s => ({
      id: s.id,
      name: s.name,
      hp: s.hull?.maxHp || 100,
      maxHp: s.hull?.maxHp || 100,
      shields: s.hull?.shieldCapacity || 0,
      maxShields: s.hull?.shieldCapacity || 0,
      energy: s.energyCell?.maxEnergy || 100,
      maxEnergy: s.energyCell?.maxEnergy || 100,
      rebootTicks: 0
    })));
    this.startSimulation();
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  /** Switch between LIVE_FEED (logs) and TACTICAL_MAP (arena) */
  toggleView() {
    this.activeView.update(v => v === 'LIVE_FEED' ? 'TACTICAL_MAP' : 'LIVE_FEED');
  }

  private startSimulation() {
    const res = this.combat.simulateStrike(this.mission()!, this.shurikens());
    this.result.set(res);

    // Initialize enemy status
    this.enemyMaxHull.set(res.initialEnemyHull);
    this.enemyHull.set(res.initialEnemyHull);
    this.enemyMaxShields.set(0);
    this.enemyShields.set(0);
    this.enemyIntegrity.set(100);

    // Elapsed time ticker (runs regardless of view)
    this.intervalId = setInterval(() => {
      this.timeElapsed.update(t => t + 0.1);
      this.timeRemaining.update(t => Math.max(0, t - 0.1));
    }, 100);
  }

  /**
   * Receives log events from the CombatArena component.
   * This is the bridge: Tactical Map emits events → Live Feed displays them.
   */
  onArenaLog(log: string) {
    this.visibleLogs.update(logs => [...logs, log]);
    this.processLogEvent(log);
  }

  /**
   * Handles the end of a mission from the arena.
   */
  onMissionComplete(event: { success: boolean }) {
    this.finishStrike(event.success);
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      this.logContainer.nativeElement.scrollTop = this.logContainer.nativeElement.scrollHeight;
    } catch (err) { }
  }

  private processLogEvent(log: string) {
    // Telemetry Parsing: "[TELEMETRY] ShurikenName: H:100/100 S:50/50 E:80/100 R:30"
    const telemetryMatch = log.match(/\[TELEMETRY\] (.*): H:(\d+)\/(\d+) S:(\d+)\/(\d+) E:(\d+)\/(\d+) R:(\d+)/);
    if (telemetryMatch) {
      const name = telemetryMatch[1];
      const hp = parseInt(telemetryMatch[2]);
      const shields = parseInt(telemetryMatch[4]);
      const energy = parseInt(telemetryMatch[6]);
      const reboot = parseInt(telemetryMatch[8]);
      this.squadStatuses.update(statuses => statuses.map(s =>
        s.name === name ? { ...s, hp, shields, energy, rebootTicks: reboot } : s
      ));
    }

    // 1. Enemy Damage Parsing
    // Shield Hit: "Carbon Razor: Shield Hit (-10 S) [REM: 190]"
    const enemyShieldMatch = log.match(/Shield Hit \(-(\d+) S\)/);
    if (enemyShieldMatch) {
      const dmg = parseInt(enemyShieldMatch[1]);
      this.enemyShields.update(s => Math.max(0, s - dmg));
    }

    // Hull Hit: "Carbon Razor: Hull Hit (-10 H) [REM: 90]"
    const enemyHullMatch = log.match(/Hull Hit \(-(\d+) H\) \[REM: (\d+)\]/);
    if (enemyHullMatch) {
      const dmg = parseInt(enemyHullMatch[1]);
      const remaining = parseInt(enemyHullMatch[2]);
      this.enemyHull.set(remaining);

      const totalNow = remaining + this.enemyShields();
      const percentage = (totalNow / (this.result()?.initialEnemyHP || 1)) * 100;
      this.enemyIntegrity.set(percentage);
    }

    if (log.includes('MISSION OBJECTIVE NEUTRALIZED')) {
      this.enemyHull.set(0);
      this.enemyShields.set(0);
      this.enemyIntegrity.set(0);
    }

    // 2. Shuriken Shield Parsing: "Beam-Pulse -> ShurikenName (Shields: -10)"
    const shieldMatch = log.match(/Beam-Pulse -> (.*) \(Shields: -(\d+)\)/);
    if (shieldMatch) {
      const name = shieldMatch[1].replace('HOSTILE: ', '').trim();
      const dmg = parseInt(shieldMatch[2]);
      this.squadStatuses.update(statuses => statuses.map(s =>
        s.name === name ? { ...s, shields: Math.max(0, s.shields - dmg) } : s
      ));
    }

    // 3. Shuriken Hull Parsing: "Impact -> ShurikenName (Hull: -10) [REM: 45 HP]"
    const hullMatch = log.match(/Impact -> (.*) \(Hull: -(\d+)\) \[REM: (\d+) HP\]/);
    if (hullMatch) {
      const name = hullMatch[1].replace('HOSTILE: ', '').trim();
      const remaining = parseInt(hullMatch[3]);
      this.squadStatuses.update(statuses => statuses.map(s =>
        s.name === name ? { ...s, hp: remaining } : s
      ));
    }

    // 4. Energy Parsing: "[ENERGY] ShurikenName: 80/100"
    const energyMatch = log.match(/\[ENERGY\] (.*): (\d+)\/(\d+)/);
    if (energyMatch) {
      const name = energyMatch[1];
      const current = parseInt(energyMatch[2]);
      this.squadStatuses.update(statuses => statuses.map(s =>
        s.name === name ? { ...s, energy: current } : s
      ));
    }

    if (log.includes('CRITICAL')) {
      this.squadStatuses.update(statuses => statuses.map(s => ({ ...s, hp: 0, shields: 0, energy: 0 })));
    }
  }

  private finishStrike(success: boolean) {
    if (this.isFinished()) return;

    this.isFinished.set(true);
    this.timeRemaining.set(0);

    // Update internal result status
    this.result.update(res => res ? { ...res, success } : res);

    if (success) {
      this.currentPolymer.set(this.result()?.totalPolymer || 0);
      this.currentScrap.set(this.result()?.totalScrap || 0);
      this.currentCredits.set(this.result()?.totalCredits || 0);
    } else {
      // 95% penalty on failure (looted items lost)
      this.currentPolymer.set(Math.floor((this.result()?.totalPolymer || 0) * 0.05));
      this.currentScrap.set(Math.floor((this.result()?.totalScrap || 0) * 0.05));
      this.currentCredits.set(Math.floor((this.result()?.totalCredits || 0) * 0.05));
    }

    if (this.intervalId) clearInterval(this.intervalId);
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  shouldShowLog(log: string): boolean {
    // Technical log shows all data except raw energy/telemetry ticks
    return !log.startsWith('[ENERGY]') && !log.startsWith('[TELEMETRY]');
  }

  getLogClass(log: string): string {
    if (log.includes('[CRITICAL]') || log.includes('[FAILURE]')) return 'text-red-500 font-black italic';
    if (log.includes('[SUCCESS]') || log.includes('[SYSTEM] TARGET NEUTRALIZED') || log.includes('MISSION OBJECTIVE NEUTRALIZED')) return 'text-green-400 font-bold';
    if (log.includes('[OVERCLOCK]')) return 'text-yellow-400 font-black shadow-[0_0_10px_rgba(250,204,21,0.5)]';
    if (log.includes('HOSTILE_ENTITY') || log.includes('HOSTILE:')) return 'text-orange-500 font-bold';
    if (log.includes('[SYSTEM]')) return 'text-cyan-500 opacity-80';
    if (log.includes('[STATE]')) return 'text-purple-400 opacity-70';
    if (log.includes('[SEARCH]')) return 'text-yellow-500 italic opacity-80';
    if (log.includes('[MISS]') || log.includes('[EVADED]')) return 'text-gray-600 italic';
    if (log.includes('Hull Hit')) return 'text-green-400 font-bold';
    return 'text-green-600';
  }

  abandon() {
    this.finishStrike(false);
  }

  finalize() {
    const res = this.result();
    if (res) {
      const filteredLoot = this.scrapFilter.applyFilter({
        polymer: res.totalPolymer,
        scrap: res.totalScrap,
        credits: res.totalCredits
      });

      this.player.addResources(filteredLoot);
    }
    this.missionService.refreshContracts();
    this.missionService.clearStrike();
    this.router.navigate(['/liberation']);
  }
}
