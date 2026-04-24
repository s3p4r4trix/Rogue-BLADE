import { Injectable, signal, inject } from '@angular/core';
import { MissionContract, MissionDifficulty } from '../models/mission.model';

const TARGETS = [
  'Corporate Supply Convoy',
  'Zenith Outpost Beta',
  'Scrap-Town Raider Camp',
  'Automated Defense Grid',
  'Abandoned Tech Vault',
  'Mercenary Forward Base'
];

const DESCRIPTIONS = [
  'Heavily guarded. High value tech inside.',
  'Standard patrol. Easy picking if isolated.',
  'A fortified position. Expect casualties.',
  'Minimal lifeforms. High automated resistance.',
  'Unknown variables. High risk, high reward.'
];

const RESISTANCES = [
  'Heavy Armor, Weak Shields',
  'High Evasion, Swarm Tactics',
  'Plasma Weapons, Slow Movement',
  'Balanced Defense',
  'Unknown'
];

import { WorkshopService } from './workshop.service';

@Injectable({ providedIn: 'root' })
export class MissionService {
  private workshop = inject(WorkshopService);

  readonly availableContracts = signal<MissionContract[]>([]);
  readonly activeStrikeMission = signal<MissionContract | null>(null);

  constructor() {
    this.refreshContracts();
  }

  startStrike(mission: MissionContract) {
    this.activeStrikeMission.set(mission);
  }

  clearStrike() {
    this.activeStrikeMission.set(null);
  }

  refreshContracts() {
    this.availableContracts.set(this.generateContracts());
  }

  private generateContracts(): MissionContract[] {
    const contracts: MissionContract[] = [];
    for (let i = 0; i < 3; i++) {
      contracts.push(this.generateSingleContract(i));
    }
    return contracts;
  }

  private calculateSquadPower(): number {
    const shurikens = this.workshop.availableShurikens();
    if (shurikens.length === 0) return 100; // Base power

    return shurikens.reduce((acc, s) => {
      const proc = s.processor?.routineCapacity || 1;
      const blade = s.blade?.damage || 5;
      const sens = s.sensor?.range || 5;
      return acc + (proc * 50) + (blade * 10) + (sens * 5);
    }, 0) / shurikens.length;
  }

  private generateSingleContract(index: number): MissionContract {
    const squadPower = this.calculateSquadPower();
    const target = TARGETS[Math.floor(Math.random() * TARGETS.length)];
    const desc = DESCRIPTIONS[Math.floor(Math.random() * DESCRIPTIONS.length)];
    const res = RESISTANCES[Math.floor(Math.random() * RESISTANCES.length)];
    
    // Generate difficulty based on index to ensure variety
    let diffStr: MissionDifficulty;
    let durSecs: number;
    let pMin, pMax, sMin, sMax, cBonus;

    // Scaling factors based on index (difficulty tier)
    const tierMultiplier = [0.7, 1.2, 2.5][index];
    const baseLoot = squadPower * tierMultiplier;

    if (index === 0) {
      diffStr = 'Tier I (Low)';
      durSecs = 45; 
    } else if (index === 1) {
      diffStr = 'Tier II (Moderate)';
      durSecs = 90; 
    } else {
      diffStr = 'Tier III (High)';
      durSecs = 180; 
    }

    pMin = Math.floor(baseLoot * 0.5);
    pMax = Math.floor(baseLoot * 0.8);
    sMin = Math.floor(baseLoot * 0.7);
    sMax = Math.floor(baseLoot * 1.2);
    cBonus = Math.floor(baseLoot * 2);

    return {
      id: `mission-${Date.now()}-${index}`,
      targetName: target,
      description: desc,
      difficulty: diffStr,
      durationSeconds: durSecs,
      expectedResistance: res,
      potentialLoot: {
        polymerMin: pMin,
        polymerMax: pMax,
        scrapMin: sMin,
        scrapMax: sMax,
        creditsBonus: cBonus
      }
    };
  }
}
