/**
 * Standardized Damage Types as per Core Mechanics & Math Logic.
 */
export type DamageType = 'SLASHING' | 'KINETIC' | 'ENERGY' | 'EMP';

/**
 * Standardized Armor Types as per Core Mechanics & Math Logic.
 */
export type ArmorType = 'UNARMORED' | 'HEAVY_ARMOR' | 'ENERGY_SHIELD';

/**
 * Base interface for all Shuriken hardware parts.
 */
export interface HardwareComponent {
  id: string;
  name: string;
  description: string;
  weight: number;
}

/**
 * Mobility and evasion stats.
 */
export interface AntiGravEngine extends HardwareComponent {
  topSpeed: number;
  acceleration: number;
  evasionRate: number; // 0.0 - 1.0
  energyDrain: number;
  stealthValue: number;
}

/**
 * Defensive capabilities and weight.
 */
export interface HullMaterial extends HardwareComponent {
  tier: number;
  maxHp: number;
  armorValue: number;
  shieldCapacity: number;
}

/**
 * Energy pool management.
 */
export interface EnergyCell extends HardwareComponent {
  maxEnergy: number;
  maxOutput: number;
}

/**
 * Energy regeneration hardware.
 */
export interface Reactor extends HardwareComponent {
  energyRegen: number;
}

/**
 * Sensor capabilities.
 */
export interface Sensor extends HardwareComponent {
  range: number;
  accuracy: number; // 0.0 - 1.0
  unlocksTriggerIds: string[];
}

/**
 * Offensive weapon stats.
 */
export interface Blade extends HardwareComponent {
  damageType: DamageType;
  baseDamage: number;
  critChance: number; // 0.0 - 1.0
  critMultiplier: number;
  energyDrain: number;
  unlocksActionIds?: string[];
}

/**
 * Form / Chassis multipliers.
 */
export interface FormDesign extends HardwareComponent {
  shape: 'shuriken' | 'disc' | 'dagger' | 'sphere' | 'ion-edge';
  speedMult: number;
  weightMult: number;
  damageMult: number;
  critChanceMult?: number;
  armorMult?: number;
}

/**
 * Control Processor.
 */
export interface Processor extends HardwareComponent {
  routineCapacity: number;
  reactionTime: number; // in seconds (formerly latency)
  processorSpeed: number; // for math logic scaling
}

/**
 * Semi-AI behavior.
 */
export interface SemiAI extends HardwareComponent {
  iffAccuracy: number;
  behaviorBuff: 'aggressive' | 'defensive' | 'coordinator' | 'adaptive';
}

/**
 * Energy Shield Generator hardware.
 */
export interface ShieldGenerator extends HardwareComponent {
  shieldCapacity: number;
  regenRate: number; // Shields recovered per second
  energyCostPerRegen: number; // Energy consumed per shield point recovered
}

/**
 * Persistent stats for a specific Shuriken.
 */
export interface ShurikenStats {
  enemiesKilled: number;
  timeRepairing: number;
  lostHealth: number;
  timeOnline: number;
}

/**
 * Option configuration for UI selectors.
 */
export interface CyberOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * Final Shuriken configuration.
 */
export interface Shuriken {
  id: string;
  name: string;
  engine: AntiGravEngine | null;
  hull: HullMaterial | null;
  energyCell: EnergyCell | null;
  sensor: Sensor | null;
  blade: Blade | null;
  formDesign: FormDesign | null;
  processor: Processor | null;
  shield: ShieldGenerator | null; // New slot
  reactor: Reactor | null; // New slot
  semiAI: SemiAI | null; // Optional slot

  // Coordination Mode
  coordinationMode: 'SOLO' | 'MASTER' | 'SLAVE';
  masterId?: string; // If SLAVE, which master are we following?

  stats: ShurikenStats;
  creationDate?: number;
}
