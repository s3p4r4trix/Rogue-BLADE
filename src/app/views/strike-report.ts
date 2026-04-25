import { Component, inject, signal, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MissionService } from '../services/mission.service';
import { WorkshopService } from '../services/workshop.service';
import { PlayerService } from '../services/player.service';
import { CombatSimulationService } from '../services/combat-simulation.service';
import { StrikeResult, ShurikenStatus } from '../models/combat.model';


@Component({
  selector: 'app-strike-report',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-screen bg-black text-green-500 font-mono p-8 flex flex-col overflow-hidden">
      <!-- War Room Header -->
      <div class="border-b-2 border-green-900 pb-4 mb-6 flex justify-between items-center">
        <div class="flex items-center gap-6">
          <div class="text-3xl font-black bg-green-900/20 px-4 py-1 border border-green-800 animate-pulse">
            {{ formatTime(timeRemaining()) }}
          </div>
          <div>
            <h1 class="text-xl font-black tracking-tighter uppercase italic text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">Liberation_Strike // LIVE_FEED</h1>
            <p class="text-[10px] text-green-800 uppercase tracking-widest">Target: {{ mission()?.targetName }} | Status: [ACTIVE_ENGAGEMENT]</p>
          </div>
        </div>
        
        <div class="flex gap-12">
          <!-- Enemy Integrity -->
          <div class="text-right">
            <div class="text-[9px] text-red-900 uppercase mb-1 font-bold">Hostile_Integrity</div>
            <div class="w-64 h-3 bg-red-900/30 border border-red-900 relative shadow-[0_0_15px_rgba(239,68,68,0.2)]">
               <div class="h-full bg-red-600 shadow-[0_0_10px_#ef4444] transition-all duration-1000" [style.width.%]="enemyIntegrity()"></div>
               <div class="absolute inset-0 flex items-center justify-center text-[8px] text-white font-bold">{{ enemyIntegrity().toFixed(0) }}%</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Feed -->
      <div class="flex-1 overflow-hidden flex flex-col lg:flex-row gap-8">
        <!-- Terminal Logs -->
        <div class="flex-1 bg-[#050110] border border-white/5 p-4 flex flex-col relative overflow-hidden">
          <!-- Background Grid -->
          <div class="absolute inset-0 opacity-10 pointer-events-none" style="background-image: linear-gradient(#1e1b4b 1px, transparent 1px), linear-gradient(90deg, #1e1b4b 1px, transparent 1px); background-size: 40px 40px;"></div>
          
          <div class="absolute top-0 right-0 p-2 text-[8px] text-cyan-900 uppercase tracking-widest bg-black/40 border-l border-b border-white/5">Secure_Link: 256-bit_AES</div>
          
          <div class="flex-1 overflow-y-auto space-y-1 pr-4 relative z-10" id="log-container">
            @for (log of visibleLogs(); track $index) {
              @if (!log.startsWith('[ENERGY]')) {
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

        <!-- Tactical Sidebar -->
        <div class="w-full lg:w-96 flex flex-col gap-6 overflow-hidden">
           <!-- Squad Monitor -->
           <div class="flex-1 border border-white/5 p-5 bg-[#050110]/50 overflow-y-auto">
              <h3 class="text-[9px] uppercase font-black text-gray-500 mb-6 tracking-[0.4em] flex items-center gap-3">
                <span class="w-2 h-[1px] bg-red-500"></span>
                SQUAD_VITAL_TELEMETRY
              </h3>
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
                      
                      <div class="space-y-1">
                        <!-- Shield Bar -->
                        @if (s.maxShields > 0) {
                          <div class="w-full h-1 bg-white/5 relative">
                             <div class="h-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.4)] transition-all duration-500" 
                                  [style.width.%]="(s.shields / s.maxShields) * 100"></div>
                          </div>
                        }

                        <!-- Hull Bar -->
                        <div class="w-full h-1.5 bg-white/5">
                          <div class="h-full transition-all duration-1000" 
                               [ngClass]="s.hp > (s.maxHp * 0.5) ? 'bg-green-500' : (s.hp > (s.maxHp * 0.2) ? 'bg-yellow-500 animate-pulse' : 'bg-red-600')"
                               [style.width.%]="(s.hp / s.maxHp) * 100"></div>
                        </div>

                        <!-- Energy Bar -->
                        <div class="w-full h-0.5 bg-white/5 relative">
                           <div class="h-full bg-yellow-600 transition-all duration-300 opacity-50" 
                                [style.width.%]="(s.energy / s.maxEnergy) * 100"></div>
                        </div>
                      </div>
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
export class StrikeReport implements OnInit, OnDestroy {
  private missionService = inject(MissionService);
  private workshop = inject(WorkshopService);
  private player = inject(PlayerService);
  private combat = inject(CombatSimulationService);
  private router = inject(Router);

  mission = this.missionService.activeStrikeMission;
  shurikens = this.workshop.availableShurikens;

  visibleLogs = signal<string[]>([]);
  result = signal<StrikeResult | null>(null);
  isFinished = signal(false);
  
  squadStatuses = signal<ShurikenStatus[]>([]);
  enemyIntegrity = signal(100);
  timeRemaining = signal(0);

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
      maxEnergy: s.energyCell?.maxEnergy || 100
    })));
    this.startSimulation();
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  private startSimulation() {
    const res = this.combat.simulateStrike(this.mission()!, this.shurikens());
    this.result.set(res);
    
    let logIndex = 0;
    this.intervalId = setInterval(() => {
      if (logIndex < res.logs.length) {
        const log = res.logs[logIndex];
        this.visibleLogs.update(logs => [...logs, log]);
        this.processLogEvent(log);
        this.timeRemaining.update(t => Math.max(0, t - 1));
        logIndex++;
      } else {
        this.finishStrike();
      }
    }, 1000);
  }

  private processLogEvent(log: string) {
    // 1. Enemy HP Parsing (Total HP is hull + shields)
    const enemyMatch = log.match(/\[REM: (\d+)\]/);
    if (enemyMatch && this.result()) {
      const remaining = parseInt(enemyMatch[1]);
      const percentage = (remaining / this.result()!.initialEnemyHP) * 100;
      this.enemyIntegrity.set(percentage);
    }

    // 2. Shuriken Shield Parsing: "Beam-Pulse -> ShurikenName (Shields: -10)"
    const shieldMatch = log.match(/Beam-Pulse -> (.*) \(Shields: -(\d+)\)/);
    if (shieldMatch) {
       const name = shieldMatch[1];
       const dmg = parseInt(shieldMatch[2]);
       this.squadStatuses.update(statuses => statuses.map(s => 
         s.name === name ? { ...s, shields: Math.max(0, s.shields - dmg) } : s
       ));
    }

    // 3. Shuriken Hull Parsing: "Impact -> ShurikenName (Hull: -10) [REM: 45 HP]"
    const hullMatch = log.match(/Impact -> (.*) \(Hull: -(\d+)\) \[REM: (\d+) HP\]/);
    if (hullMatch) {
       const name = hullMatch[1];
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

  private finishStrike() {
    this.isFinished.set(true);
    this.timeRemaining.set(0);
    this.currentPolymer.set(this.result()?.totalPolymer || 0);
    this.currentScrap.set(this.result()?.totalScrap || 0);
    this.currentCredits.set(this.result()?.totalCredits || 0);
    if (this.intervalId) clearInterval(this.intervalId);
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  getLogClass(log: string): string {
    if (log.includes('[CRITICAL]') || log.includes('[FAILURE]')) return 'text-red-500 font-black italic';
    if (log.includes('[SUCCESS]') || log.includes('[SYSTEM] TARGET NEUTRALIZED')) return 'text-green-400 font-bold';
    if (log.includes('[OVERCLOCK]')) return 'text-yellow-400 font-black shadow-[0_0_10px_rgba(250,204,21,0.5)]';
    if (log.includes('HOSTILE_ENTITY') || log.includes('HOSTILE:')) return 'text-orange-500 font-bold';
    if (log.includes('[SYSTEM]')) return 'text-cyan-500 opacity-80';
    if (log.includes('[MISS]')) return 'text-gray-600 italic';
    return 'text-green-600';
  }

  abandon() {
    if (this.intervalId) clearInterval(this.intervalId);
    const res = this.result();
    if (res) {
      res.success = false;
      res.totalPolymer = Math.floor(res.totalPolymer * 0.05);
      res.totalScrap = Math.floor(res.totalScrap * 0.05);
      res.totalCredits = Math.floor(res.totalCredits * 0.05);
      this.result.set(res);
      this.finishStrike();
    }
  }

  finalize() {
    const res = this.result();
    if (res) {
      this.player.addResources({
        polymer: res.totalPolymer,
        scrap: res.totalScrap,
        credits: res.totalCredits
      });
    }
    this.missionService.refreshContracts();
    this.missionService.clearStrike();
    this.router.navigate(['/liberation']);
  }
}
