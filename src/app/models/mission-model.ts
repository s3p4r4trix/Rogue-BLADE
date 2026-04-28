import { ArmorType } from './hardware.model';

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
  durationSeconds: number;
  expectedResistance: string;
  potentialLoot: MissionLoot;
  // Tactical Stats
  hull: number;
  shields: number;
  armorValue: number;
  armorType: ArmorType;
  enemyEvasionRate: number; // 0.0 - 1.0
}
