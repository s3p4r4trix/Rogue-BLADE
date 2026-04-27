export interface ResearchProject {
  id: string;
  name: string;
  description: string;
  category: 'ALLOY' | 'COMPONENT' | 'AI' | 'UTILITY';
  costPolymer: number;
  costScrap: number;
  costCredits: number;
  timeToCompleteSeconds: number;
  unlockedComponentId?: string; // ID of the hardware component this research unlocks
  prerequisites: string[]; // IDs of other research projects
  isCompleted: boolean;
  isStarted: boolean;
  progressPercent: number;
}

export interface ResearchTree {
  projects: ResearchProject[];
}
