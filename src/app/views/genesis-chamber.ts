import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ResearchService } from '../services/research.service';
import { PlayerService } from '../services/player.service';
import { ResearchProject } from '../models/research.model';

@Component({
  selector: 'app-genesis-chamber',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen text-purple-300 p-8 font-mono relative">
      <header class="mb-6 flex justify-between items-end border-b-2 border-purple-800 pb-2">
        <div class="flex items-center gap-4">
          <a routerLink="/hub" class="text-purple-500 border border-purple-800 hover:bg-purple-900/50 px-3 py-1 font-mono text-sm uppercase transition-colors">
              < BACK_TO_HUB
          </a>
          <div>
            <h1 class="text-2xl font-bold tracking-widest text-purple-400 drop-shadow-[0_0_5px_rgba(192,132,252,0.5)]">
                GENESIS CHAMBER // RESEARCH
            </h1>
            <p class="text-sm text-purple-700">Accessing Zenith Technology Databanks</p>
          </div>
        </div>
      </header>
      
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[75vh]">
        <!-- Active Research -->
        <div class="lg:col-span-1 bg-[#030014]/95 border border-purple-900/50 p-6 neuro-panel flex flex-col">
          <h2 class="text-xl text-purple-400 font-bold mb-6 border-b border-purple-800 pb-2 flex items-center gap-2 uppercase tracking-widest">
            <span class="text-purple-700">|</span> CURRENT_PROJECT
          </h2>

          @if (activeProject(); as project) {
            <div class="flex-1 flex flex-col justify-center animate-in fade-in duration-500">
               <div class="text-6xl text-purple-400 mb-8 text-center animate-spin-slow">⚛</div>
               <h3 class="text-2xl font-black text-white text-center mb-2 uppercase">{{ project.name }}</h3>
               <p class="text-xs text-purple-600 text-center mb-10 italic">"{{ project.description }}"</p>
               
               <div class="space-y-2">
                 <div class="flex justify-between text-[10px] uppercase font-bold text-purple-500 tracking-tighter">
                   <span>Processing_Logic</span>
                   <span>{{ project.progressPercent.toFixed(1) }}%</span>
                 </div>
                 <div class="w-full h-4 bg-purple-950/20 border border-purple-900 overflow-hidden relative">
                    <div class="h-full bg-purple-500 shadow-[0_0_15px_#a855f7] transition-all duration-300" [style.width.%]="project.progressPercent"></div>
                    <div class="absolute inset-0 flex items-center justify-center mix-blend-difference text-[8px] font-black uppercase">Decoding...</div>
                 </div>
               </div>
            </div>
          } @else {
            <div class="flex-1 flex flex-col items-center justify-center opacity-30">
               <div class="text-6xl text-purple-900 mb-4 font-black">?</div>
               <p class="text-xs uppercase tracking-[0.2em]">Cores Idle. Select project.</p>
            </div>
          }
        </div>

        <!-- Research Grid -->
        <div class="lg:col-span-2 bg-[#030014]/95 border border-purple-900/50 p-6 neuro-panel overflow-y-auto">
          <h2 class="text-xl text-purple-400 font-bold mb-6 border-b border-purple-800 pb-2 flex items-center gap-2 uppercase tracking-widest">
            <span class="text-purple-700">|</span> REVERSE_ENGINEERING_QUEUE
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            @for (project of projects(); track project.id) {
              <div class="p-4 border transition-all duration-300 relative group overflow-hidden flex flex-col"
                   [ngClass]="{
                     'border-purple-500 bg-purple-950/10': project.isStarted || project.isCompleted,
                     'border-purple-900/30 bg-black opacity-70 hover:opacity-100 hover:border-purple-700': !project.isStarted && !project.isCompleted && canAfford(project),
                     'border-red-900/20 bg-black opacity-30 grayscale cursor-not-allowed': !project.isStarted && !project.isCompleted && !canAfford(project)
                   }">
                
                <div class="flex justify-between items-start mb-3">
                   <div class="text-[8px] font-black px-2 py-0.5 border uppercase tracking-widest"
                        [ngClass]="project.isCompleted ? 'bg-green-900/20 border-green-800 text-green-500' : 'bg-purple-900/20 border-purple-800 text-purple-400'">
                     {{ project.isCompleted ? 'COMPLETE' : project.category }}
                   </div>
                   @if (project.isCompleted) {
                     <span class="text-green-500 text-sm">✓</span>
                   }
                </div>

                <h3 class="text-lg font-bold text-white mb-1 uppercase tracking-tighter">{{ project.name }}</h3>
                <p class="text-[10px] text-purple-700 mb-4 leading-tight">{{ project.description }}</p>

                <div class="mt-auto pt-4 border-t border-purple-900/20">
                   @if (!project.isCompleted && !project.isStarted) {
                     <div class="grid grid-cols-3 gap-2 mb-4">
                       <div class="text-center" [ngClass]="player.resources().polymer >= project.costPolymer ? 'text-purple-400' : 'text-red-900'">
                         <div class="text-[7px] uppercase">Poly</div>
                         <div class="text-xs font-bold">{{ project.costPolymer }}</div>
                       </div>
                       <div class="text-center" [ngClass]="player.resources().scrap >= project.costScrap ? 'text-purple-400' : 'text-red-900'">
                         <div class="text-[7px] uppercase">Scrap</div>
                         <div class="text-xs font-bold">{{ project.costScrap }}</div>
                       </div>
                       <div class="text-center" [ngClass]="player.resources().credits >= project.costCredits ? 'text-purple-400' : 'text-red-900'">
                         <div class="text-[7px] uppercase">Creds</div>
                         <div class="text-xs font-bold">{{ project.costCredits }}</div>
                       </div>
                     </div>
                     <button (click)="startResearch(project.id)"
                             [disabled]="!canAfford(project) || activeProjectId()"
                             class="w-full py-2 bg-purple-900/30 border border-purple-600 text-purple-400 uppercase text-[10px] font-bold tracking-[0.2em] transition-all hover:bg-purple-600 hover:text-black disabled:opacity-30 disabled:cursor-not-allowed">
                       [ INITIALIZE ]
                     </button>
                   } @else if (project.isStarted) {
                      <div class="text-center py-2 animate-pulse text-purple-400 text-[10px] font-black uppercase tracking-widest">
                         In Progress...
                      </div>
                   } @else {
                      <div class="text-center py-2 text-green-500 text-[10px] font-black uppercase tracking-widest border border-green-900/30 bg-green-950/10">
                         Data Unlocked: {{ project.unlockedComponentId }}
                      </div>
                   }
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GenesisChamber {
  /** Reference to the research system managing project states. */
  research = inject(ResearchService);
  
  /** Reference to the player service for resource validation. */
  player = inject(PlayerService);

  /** Signal containing all available research projects. */
  projects = this.research.projects;
  
  /** Signal containing the ID of the currently active research project. */
  activeProjectId = this.research.activeProjectId;
  
  /** Computed signal that returns the project object for the currently active research. */
  activeProject = computed(() => this.projects().find(project => project.id === this.activeProjectId()));

  /**
   * Checks if the player has enough resources to begin a specific research project.
   * @param project The project to evaluate.
   * @returns True if the player can afford all required costs.
   */
  canAfford(project: ResearchProject): boolean {
    const playerResources = this.player.resources();
    return playerResources.polymer >= project.costPolymer && 
           playerResources.scrap >= project.costScrap && 
           playerResources.credits >= project.costCredits;
  }

  /**
   * Initiates the research process for a given project ID.
   * Logic: Triggers the background timer and resource deduction in the ResearchService.
   * @param projectId The ID of the project to start.
   */
  startResearch(projectId: string) {
    this.research.startResearch(projectId);
  }
}
