export type MissionDifficulty = 'Tier I (Low)' | 'Tier II (Moderate)' | 'Tier III (High)' | 'Tier IV (Extreme)';

export interface MissionLoot {
  polymerMin: number;
  polymerMax: number;
  scrapMin: number;
  scrapMax: number;
  creditsBonus: number;
}

export interface MissionContract {
  id: string;
  targetName: string;
  description: string;
  difficulty: MissionDifficulty;
  durationSeconds: number; // e.g., 60, 120
  expectedResistance: string;
  potentialLoot: MissionLoot;
}
