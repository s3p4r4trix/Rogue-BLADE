import { Component, inject, signal, OnInit, OnDestroy, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MissionService } from '../services/mission.service';
import { WorkshopService } from '../services/workshop.service';
import { PlayerService } from '../services/player.service';
import { CombatSimulationService, StrikeResult } from '../services/combat-simulation.service';

interface ShurikenStatus {
  id: string;
  name: string;
  hp: number;
}

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
            <h1 class="text-xl font-black tracking-tighter uppercase italic">Liberation_Strike // LIVE_FEED</h1>
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
        <div class="flex-1 bg-black/80 border border-green-900/50 p-4 flex flex-col neuro-panel relative">
          <div class="absolute top-0 right-0 p-2 text-[8px] text-green-900 uppercase">Secure_Link: 128-bit_Encrypted</div>
          <div class="flex-1 overflow-y-auto space-y-1 pr-4" id="log-container">
            @for (log of visibleLogs(); track $index) {
              <div class="text-sm animate-in fade-in slide-in-from-left-2 duration-300">
                <span class="opacity-50 font-mono text-[10px] mr-2">[{{ $index.toString().padStart(3, '0') }}s]</span>
                <span [ngClass]="getLogClass(log)">{{ log }}</span>
              </div>
            }
            @if (!isFinished()) {
              <div class="animate-pulse text-green-400">_</div>
            }
          </div>
        </div>

        <!-- Tactical Sidebar -->
        <div class="w-full lg:w-80 flex flex-col gap-6 overflow-hidden">
           <!-- Squad Monitor -->
           <div class="flex-1 border border-green-900/30 p-4 bg-green-950/5 overflow-y-auto">
              <h3 class="text-[10px] uppercase font-bold text-green-800 mb-4 tracking-[0.2em]">// SQUAD_MONITOR</h3>
              <div class="space-y-4">
                 @for (s of squadStatuses(); track s.id) {
                   <div class="space-y-1">
                      <div class="flex justify-between items-center">
                        <span class="text-[10px] font-bold" [ngClass]="s.hp > 0 ? 'text-green-500' : 'text-red-900'">{{ s.name }}</span>
                        <span class="text-[9px] font-mono">{{ s.hp }} HP</span>
                      </div>
                      <div class="w-full h-1.5 bg-green-900/20 border border-green-900/30">
                        <div class="h-full transition-all duration-1000 shadow-[0_0_5px_#22c55e]" 
                             [ngClass]="s.hp > 50 ? 'bg-green-500' : (s.hp > 20 ? 'bg-yellow-500' : 'bg-red-600')"
                             [style.width.%]="s.hp"></div>
                      </div>
                   </div>
                 }
              </div>
           </div>

           <!-- Resources Recovered -->
           <div class="border border-green-900/30 p-4 bg-green-950/10">
              <h3 class="text-[10px] uppercase font-bold text-green-800 mb-4 tracking-widest">// RECOVERED_RESOURCES</h3>
              <div class="space-y-4">
                 <div class="flex justify-between items-end border-b border-green-900/20 pb-1">
                    <span class="text-xs text-green-700">Polymer</span>
                    <span class="text-xl font-bold">{{ currentPolymer() }}</span>
                 </div>
                 <div class="flex justify-between items-end border-b border-green-900/20 pb-1">
                    <span class="text-xs text-green-700">Scrap</span>
                    <span class="text-xl font-bold">{{ currentScrap() }}</span>
                 </div>
                 <div class="flex justify-between items-end">
                    <span class="text-xs text-green-700">Credits</span>
                    <span class="text-xl font-bold text-yellow-500">{{ currentCredits() }}</span>
                 </div>
              </div>
           </div>

           <!-- Completion Status -->
           @if (isFinished()) {
             <div class="animate-in zoom-in duration-500">
                <div class="p-6 border-2 flex flex-col items-center gap-4 shadow-[0_0_20px_rgba(34,197,94,0.1)]"
                     [ngClass]="result()?.success ? 'border-green-500 bg-green-500/10' : 'border-red-600 bg-red-600/10'">
                   <h2 class="text-2xl font-black uppercase tracking-widest"
                       [ngClass]="result()?.success ? 'text-green-400' : 'text-red-500'">
                     {{ result()?.success ? 'SUCCESS' : 'MISSION FAILED' }}
                   </h2>
                   <p class="text-[10px] text-center opacity-70">
                     {{ result()?.success ? 'Objectives secured. Returning home.' : 'Tactical failure. Emergency extraction complete.' }}
                   </p>
                   <button (click)="finalize()" class="w-full py-3 bg-green-500 text-black font-black uppercase hover:bg-green-400 transition-colors shadow-[0_0_15px_rgba(34,197,94,0.5)]">
                     CONFIRM & CLOSE
                   </button>
                </div>
             </div>
           } @else {
             <div class="p-4 bg-red-950/10 border border-red-900/30">
               <p class="text-[9px] text-red-900 uppercase mb-2 font-bold tracking-tighter">! CAUTION: Manual override triggers 95% penalty !</p>
               <button (click)="abandon()" class="w-full py-2 border border-red-900 text-red-600 hover:bg-red-900/20 uppercase font-bold text-xs tracking-widest transition-colors">
                 ABANDON STRIKE
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
    // Initialize squad status bars
    this.squadStatuses.set(this.shurikens().map(s => ({ id: s.id, name: s.name, hp: 100 })));
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
    // 1. Enemy HP Parsing
    const enemyMatch = log.match(/Hostile .* \[REMAINING: (\d+)\]/);
    if (enemyMatch && this.result()) {
      const remaining = parseInt(enemyMatch[1]);
      const percentage = (remaining / this.result()!.initialEnemyHP) * 100;
      this.enemyIntegrity.set(percentage);
    }

    // 2. Shuriken HP Parsing: "Counter-Strike -> ShurikenName (-10 HP) [REMAINING: 45]"
    const shurikenMatch = log.match(/Counter-Strike -> (.*) \(-(\d+) HP\) \[REMAINING: (\d+)\]/);
    if (shurikenMatch) {
       const name = shurikenMatch[1];
       const remaining = parseInt(shurikenMatch[3]);
       this.squadStatuses.update(statuses => statuses.map(s => 
         s.name === name ? { ...s, hp: remaining } : s
       ));
    }

    if (log.includes('CRITICAL')) {
      this.squadStatuses.update(statuses => statuses.map(s => ({ ...s, hp: 0 })));
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
    if (log.includes('CRITICAL') || log.includes('FAILURE')) return 'text-red-500 font-bold';
    if (log.includes('SUCCESS') || log.includes('NEUTRALIZED')) return 'text-green-400 font-bold';
    if (log.includes('HOSTILE_ENTITY')) return 'text-orange-500';
    if (log.includes('[SYSTEM]')) return 'text-cyan-500 opacity-80';
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
    this.missionService.refreshContracts(); // Refresh bounty board for new missions
    this.missionService.clearStrike();
    this.router.navigate(['/liberation']);
  }
}
