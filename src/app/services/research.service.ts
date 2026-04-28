import { Injectable, signal, inject, effect } from '@angular/core';
import { ResearchProject } from '../models/research-model';
import { PlayerStore } from './player.store';
import { WorkshopStore } from './workshop.store';

@Injectable({ providedIn: 'root' })
export class ResearchService {
  /** Centralized player state store. */
  private playerStore = inject(PlayerStore);
  
  /** Workshop for unlocking hardware components. */
  private workshopStore = inject(WorkshopStore);

  /** Signal containing the list of all potential and active research project states. */
  readonly projects = signal<ResearchProject[]>(this.loadProjects());
  
  /** Signal containing the ID of the project currently being processed. */
  readonly activeProjectId = signal<string | null>(localStorage.getItem('rogueBlade_activeResearch'));

  constructor() {
    // Logic: Automatically persist project progress and active research ID to local storage.
    effect(() => {
      localStorage.setItem('rogueBlade_projects', JSON.stringify(this.projects()));
      if (this.activeProjectId()) {
        localStorage.setItem('rogueBlade_activeResearch', this.activeProjectId()!);
      } else {
        localStorage.removeItem('rogueBlade_activeResearch');
      }
    });

    /** 
     * Background Tick:
     * Logic: Increments progress for the active project every second.
     */
    setInterval(() => {
      this.tick();
    }, 1000);
  }

  /**
   * Logic: Calculates progress increments and handles project completion events.
   */
  private tick() {
    const activeId = this.activeProjectId();
    if (!activeId) return;

    this.projects.update(list => list.map(project => {
      if (project.id === activeId && !project.isCompleted) {
        const increment = (100 / project.timeToCompleteSeconds);
        const newProgress = Math.min(100, project.progressPercent + increment);
        
        if (newProgress >= 100 && !project.isCompleted) {
          // Completion logic
          this.completeProject(project);
          return { ...project, progressPercent: 100, isCompleted: true, isStarted: false };
        }
        return { ...project, progressPercent: newProgress };
      }
      return project;
    }));

    // Logic: Clear active ID if the project just completed.
    const currentActive = this.projects().find(p => p.id === activeId);
    if (currentActive?.isCompleted) {
      this.activeProjectId.set(null);
    }
  }

  /**
   * Logic: Permanently unlocks the project's component ID in the WorkshopStore.
   * @param project The completed project.
   */
  private completeProject(project: ResearchProject) {
    if (project.unlockedComponentId) {
      this.workshopStore.unlockComponent(project.unlockedComponentId);
    }
    console.log(`[RESEARCH] Project Completed: ${project.name}`);
  }

  /**
   * Initiates the research process for a specific project.
   * Logic: Validates prerequisites and deducts resources from PlayerStore before starting.
   * @param projectId The target project ID.
   */
  startResearch(projectId: string) {
    const project = this.projects().find(proj => proj.id === projectId);
    if (!project || project.isCompleted || this.activeProjectId()) return;

    // Logic: Validate that all required prerequisite projects are already completed.
    const unmetPrereqs = project.prerequisites.filter(preId => {
       const pre = this.projects().find(proj => proj.id === preId);
       return !pre?.isCompleted;
    });
    if (unmetPrereqs.length > 0) return;

    // Logic: Check if player can afford the materials via the PlayerStore state.
    const playerResources = this.playerStore.resources();
    if (playerResources.polymer >= project.costPolymer &&
        playerResources.scrap >= project.costScrap &&
        playerResources.credits >= project.costCredits) {
      
      // Logic: Atomic resource deduction.
      this.playerStore.addResources({
        polymer: -project.costPolymer,
        scrap: -project.costScrap,
        credits: -project.costCredits
      });

      this.projects.update(list => list.map(proj => proj.id === projectId ? { ...proj, isStarted: true } : proj));
      this.activeProjectId.set(projectId);
    }
  }

  /**
   * Logic: Loads projects from local storage or returns the default research tree.
   */
  private loadProjects(): ResearchProject[] {
    const savedData = localStorage.getItem('rogueBlade_projects');
    if (savedData) {
      try { return JSON.parse(savedData); } catch (error) {}
    }

    return [
      {
        id: 'res-durasteel',
        name: 'Durasteel Synthesis',
        description: 'Advanced smelting process for Tier II hull plating.',
        category: 'ALLOY',
        costPolymer: 100,
        costScrap: 200,
        costCredits: 500,
        timeToCompleteSeconds: 60,
        unlockedComponentId: 'hull-durasteel',
        prerequisites: [],
        isCompleted: false,
        isStarted: false,
        progressPercent: 0
      },
      {
        id: 'res-cortex',
        name: 'Cortex Logic Gates',
        description: 'Refined neural-paths for better reaction times.',
        category: 'AI',
        costPolymer: 150,
        costScrap: 100,
        costCredits: 800,
        timeToCompleteSeconds: 90,
        unlockedComponentId: 'proc-cortex',
        prerequisites: [],
        isCompleted: false,
        isStarted: false,
        progressPercent: 0
      },
      {
        id: 'res-plasma',
        name: 'Plasma Stabilization',
        description: 'Coherent energy fields for the Plasma Edge blade.',
        category: 'COMPONENT',
        costPolymer: 300,
        costScrap: 150,
        costCredits: 1200,
        timeToCompleteSeconds: 120,
        unlockedComponentId: 'blade-energy',
        prerequisites: ['res-durasteel'],
        isCompleted: false,
        isStarted: false,
        progressPercent: 0
      },
      {
        id: 'res-shielding',
        name: 'Energy Shielding',
        description: 'Atmospheric ionization for personal kinetic shields.',
        category: 'SHIELD',
        costPolymer: 500,
        costScrap: 300,
        costCredits: 2000,
        timeToCompleteSeconds: 180,
        unlockedComponentId: 'shield-basic',
        prerequisites: ['res-plasma'],
        isCompleted: false,
        isStarted: false,
        progressPercent: 0
      }
    ];
  }
}
