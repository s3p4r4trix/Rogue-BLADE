import { ArmorType, DamageType } from '../models/combat-model';

/**
 * Defines the base structure for enemy archetypes.
 */
export interface EnemyTemplate {
  id: string;
  name: string;
  radius: number;
  color: string;
  stats: {
    maxHp: number;
    maxShields: number;
    armorValue: number;
    armorType: ArmorType;
    evasionRate: number;
    energy: number;
    maxEnergy: number;
    energyRegen: number;
    energyDrain: number;
    maxSpeed: number;
    acceleration: number;
    weight: number;
    baseDamage: number;
    damageType: DamageType;
    critChance: number;
    critMultiplier: number;
  };
}

/**
 * Central repository of Zenith Collective enemy units and their default combat stats.
 * These templates serve as the foundation for mission generation and arena spawning.
 */
export const ENEMY_TEMPLATES: Record<string, EnemyTemplate> = {
  SCYTHE_DRONE: {
    id: 'scythe-drone',
    name: 'Zenith Scythe-Drone',
    radius: 12,
    color: '#fb7185',
    stats: {
      maxHp: 100,
      maxShields: 0,
      armorValue: 2,
      armorType: 'UNARMORED',
      evasionRate: 0.25,
      energy: 100,
      maxEnergy: 100,
      energyRegen: 5,
      energyDrain: 0,
      maxSpeed: 220,
      acceleration: 150,
      weight: 70,
      baseDamage: 18,
      damageType: 'SLASHING',
      critChance: 0.15,
      critMultiplier: 1.5
    }
  },
  GUARDIAN_UNIT: {
    id: 'guardian-unit',
    name: 'Zenith Guardian Unit',
    radius: 18,
    color: '#ef4444',
    stats: {
      maxHp: 250,
      maxShields: 50,
      armorValue: 15,
      armorType: 'HEAVY_ARMOR',
      evasionRate: 0.05,
      energy: 1000,
      maxEnergy: 1000,
      energyRegen: 10,
      energyDrain: 0,
      maxSpeed: 200,
      acceleration: 150,
      weight: 250,
      baseDamage: 35,
      damageType: 'KINETIC',
      critChance: 0.05,
      critMultiplier: 1.5
    }
  },
  PHALANX_TANK: {
    id: 'phalanx-tank',
    name: 'Zenith Phalanx Tank',
    radius: 25,
    color: '#991b1b',
    stats: {
      maxHp: 400,
      maxShields: 100,
      armorValue: 40,
      armorType: 'HEAVY_ARMOR',
      evasionRate: 0.0,
      energy: 100,
      maxEnergy: 100,
      energyRegen: 15,
      energyDrain: 0,
      maxSpeed: 140,
      acceleration: 80,
      weight: 400,
      baseDamage: 55,
      damageType: 'KINETIC',
      critChance: 0.0,
      critMultiplier: 1.2
    }
  },
  EMP_WARDEN: {
    id: 'emp-warden',
    name: 'Zenith EMP Warden',
    radius: 15,
    color: '#a855f7',
    stats: {
      maxHp: 150,
      maxShields: 300,
      armorValue: 10,
      armorType: 'ENERGY_SHIELD',
      evasionRate: 0.1,
      energy: 800,
      maxEnergy: 800,
      energyRegen: 20,
      energyDrain: 0,
      maxSpeed: 160,
      acceleration: 60,
      weight: 120,
      baseDamage: 10,
      damageType: 'EMP',
      critChance: 0.05,
      critMultiplier: 1.5
    }
  }
};
