import { Injectable, signal, inject, effect } from '@angular/core';
import { ResearchProject } from '../models/research.model';
import { PlayerService } from './player.service';
import { WorkshopService } from './workshop.service';

@Injectable({ providedIn: 'root' })
export class ResearchService {
  private player = inject(PlayerService);
  private workshop = inject(WorkshopService);

  readonly projects = signal<ResearchProject[]>(this.loadProjects());
  readonly activeProjectId = signal<string | null>(localStorage.getItem('rogueBlade_activeResearch'));

  constructor() {
    effect(() => {
      localStorage.setItem('rogueBlade_projects', JSON.stringify(this.projects()));
      if (this.activeProjectId()) {
        localStorage.setItem('rogueBlade_activeResearch', this.activeProjectId()!);
      } else {
        localStorage.removeItem('rogueBlade_activeResearch');
      }
    });

    // Research Tick
    setInterval(() => {
      this.tick();
    }, 1000);
  }

  private tick() {
    const activeId = this.activeProjectId();
    if (!activeId) return;

    this.projects.update(list => list.map(p => {
      if (p.id === activeId && !p.isCompleted) {
        const increment = (100 / p.timeToCompleteSeconds);
        const newProgress = Math.min(100, p.progressPercent + increment);
        
        if (newProgress >= 100 && !p.isCompleted) {
          // Completion logic
          this.completeProject(p);
          return { ...p, progressPercent: 100, isCompleted: true, isStarted: false };
        }
        return { ...p, progressPercent: newProgress };
      }
      return p;
    }));

    // If completed, clear active
    const currentActive = this.projects().find(p => p.id === activeId);
    if (currentActive?.isCompleted) {
      this.activeProjectId.set(null);
    }
  }

  private completeProject(p: ResearchProject) {
    if (p.unlockedComponentId) {
      this.workshop.unlockedComponentIds.update(ids => Array.from(new Set([...ids, p.unlockedComponentId!])));
    }
    console.log(`[RESEARCH] Project Completed: ${p.name}`);
  }

  startResearch(projectId: string) {
    const p = this.projects().find(proj => proj.id === projectId);
    if (!p || p.isCompleted || this.activeProjectId()) return;

    // Check prerequisites
    const unmetPrereqs = p.prerequisites.filter(preId => {
       const pre = this.projects().find(proj => proj.id === preId);
       return !pre?.isCompleted;
    });
    if (unmetPrereqs.length > 0) return;

    // Check resources
    if (this.player.resources().polymer >= p.costPolymer &&
        this.player.resources().scrap >= p.costScrap &&
        this.player.resources().credits >= p.costCredits) {
      
      this.player.resources.update(r => ({
        ...r,
        polymer: r.polymer - p.costPolymer,
        scrap: r.scrap - p.costScrap,
        credits: r.credits - p.costCredits
      }));

      this.projects.update(list => list.map(proj => proj.id === projectId ? { ...proj, isStarted: true } : proj));
      this.activeProjectId.set(projectId);
    }
  }

  private loadProjects(): ResearchProject[] {
    const saved = localStorage.getItem('rogueBlade_projects');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
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
      }
    ];
  }
}
