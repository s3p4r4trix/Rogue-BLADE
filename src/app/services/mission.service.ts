import { Injectable, signal, inject } from '@angular/core';
import { MissionContract, MissionDifficulty } from '../models/mission.model';
import { WorkshopService } from './workshop.service';
import { PlayerService } from './player.service';
import { ArmorType } from '../models/hardware.model';

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

const RESISTANCES: { label: string, type: ArmorType }[] = [
  { label: 'Heavy Armor (Mech Resistance)', type: 'HEAVY_ARMOR' },
  { label: 'Energy Shields (Zenith Tech)', type: 'ENERGY_SHIELD' },
  { label: 'Unarmored Swarm (Flesh)', type: 'UNARMORED' },
  { label: 'Balanced Defense', type: 'HEAVY_ARMOR' }
];

@Injectable({ providedIn: 'root' })
export class MissionService {
  private workshop = inject(WorkshopService);
  private player = inject(PlayerService);

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
    const usedTargets = new Set<string>();

    for (let i = 0; i < 3; i++) {
      let contract: MissionContract;
      do {
        contract = this.generateSingleContract(i);
      } while (usedTargets.has(contract.targetName));

      usedTargets.add(contract.targetName);
      contracts.push(contract);
    }
    return contracts;
  }

  private calculateSquadPower(): number {
    const shurikens = this.workshop.availableShurikens();
    if (shurikens.length === 0) return 100;

    return shurikens.reduce((acc, s) => {
      const proc = s.processor?.routineCapacity || 1;
      const blade = s.blade?.baseDamage || 5;
      const sens = s.sensor?.range || 5;
      return acc + (proc * 50) + (blade * 10) + (sens * 1.0); // Reduced weight of sensor range
    }, 0) / shurikens.length;
  }

  private generateSingleContract(index: number): MissionContract {
    const stats = this.player.stats();
    const successfulRuns = stats.successfulRuns;
    const squadPower = this.calculateSquadPower();

    const target = TARGETS[Math.floor(Math.random() * TARGETS.length)];
    const desc = DESCRIPTIONS[Math.floor(Math.random() * DESCRIPTIONS.length)];

    // Force Unarmored/No-Shield for the very first few runs
    let resProfile;
    if (true) { // ToDo: Remove this check - only for testing
      resProfile = RESISTANCES.find(r => r.type === 'UNARMORED') || RESISTANCES[2];
    } else {
      resProfile = RESISTANCES[Math.floor(Math.random() * RESISTANCES.length)];
    }

    let diffStr: MissionDifficulty;
    let durSecs: number;
    let pMin, pMax, sMin, sMax, cBonus;

    // Progressive Multipliers based on success
    // Tier I starts very easy (0.4) and scales up to 0.8
    // Tier II starts at 1.0 and scales to 2.0
    // Tier III starts at 2.5 and scales to 5.0
    const tierMultiplier = [
      Math.min(0.8, 0.4 + (successfulRuns * 0.04)),
      Math.min(2.0, 1.0 + (successfulRuns * 0.1)),
      Math.min(5.0, 2.5 + (successfulRuns * 0.25))
    ][index];

    const baseLoot = squadPower * tierMultiplier;

    if (index === 0) {
      diffStr = 'Tier I (Low)';
      // Progressive Duration: Starts at 30s, +5s per success, max 90s
      durSecs = Math.min(90, 30 + (successfulRuns * 5));
    } else if (index === 1) {
      diffStr = 'Tier II (Moderate)';
      durSecs = Math.min(180, 60 + (successfulRuns * 10));
    } else {
      diffStr = 'Tier III (High)';
      durSecs = Math.min(300, 120 + (successfulRuns * 15));
    }

    pMin = Math.floor(baseLoot * 0.5);
    pMax = Math.floor(baseLoot * 0.8);
    sMin = Math.floor(baseLoot * 0.7);
    sMax = Math.floor(baseLoot * 1.2);
    cBonus = Math.floor(baseLoot * 1.5);

    const hull = Math.floor(baseLoot * 0.8); // Reduced hull multiplier from 1.5 to 0.8
    // Force 0 shields/armor for early game (onboarding)
    const shields = (successfulRuns < 10) ? 0 : (resProfile.type === 'ENERGY_SHIELD' ? Math.floor(baseLoot * 1.2) : Math.floor(baseLoot * 0.2));
    const armorValue = (successfulRuns < 10) ? 0 : (resProfile.type === 'HEAVY_ARMOR' ? Math.floor(baseLoot * 0.15) : 0);
    const enemyEvasionRate = resProfile.type === 'UNARMORED' ? 0.10 : 0.05;

    return {
      id: `mission-${Date.now()}-${index}`,
      targetName: target,
      description: desc,
      difficulty: diffStr,
      durationSeconds: durSecs,
      expectedResistance: resProfile.label,
      potentialLoot: {
        polymerMin: pMin,
        polymerMax: pMax,
        scrapMin: sMin,
        scrapMax: sMax,
        creditsBonus: cBonus
      },
      hull,
      shields,
      armorValue,
      armorType: resProfile.type,
      enemyEvasionRate
    };
  }
}
