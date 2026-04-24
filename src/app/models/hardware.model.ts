/**
 * Base interface for all Shuriken hardware parts.
 */
export interface HardwareComponent {
  id: string;
  name: string;
  description: string;
}

/**
 * Determines mobility and evasion stats.
 * Directly affects the 2D auto-battler simulation movement.
 */
export interface AntiGravEngine extends HardwareComponent {
  speed: number;
  stealth: number;
  energyConsumption: number;
  evasionRate: number;
}

/**
 * Determines defensive capabilities and overall weight.
 * Weight impacts kinetic damage output and movement inertia.
 */
export interface HullMaterial extends HardwareComponent {
  tier: number;
  hp: number;
  armor: number;
  weight: number;
}

/**
 * Determines how much energy is available to power engines and actions.
 */
export interface EnergyCell extends HardwareComponent {
  maxEnergy: number;
  regenRate: number;
  maxOutput: number;
}

/**
 * Sensors unlock specific Gambit Triggers (IF conditions).
 * E.g., a Terahertz sensor allows "Enemy behind cover" to be used.
 */
export interface Sensor extends HardwareComponent {
  range: number;
  unlocksTriggerIds: string[];
}

/**
 * The offensive weapon. Determines damage type (e.g., plasma melts shields).
 */
export interface Blade extends HardwareComponent {
  damageType: 'kinetic' | 'vibro' | 'mono-molecular' | 'plasma';
  damage: number;
}

/**
 * Determines the overall physical shape and primary combat specialization of the Shuriken.
 */
export interface FormDesign extends HardwareComponent {
  shape: 'disc' | 'dagger' | 'sphere' | 'tron-disc';
  primaryDamageType: 'cutting' | 'piercing' | 'blunt' | 'burning';
}

/**
 * The Processor controlling the Shuriken's execution latency and capacity.
 */
export interface Processor extends HardwareComponent {
  routineCapacity: number;
  latencyModifier: number;
}

/**
 * The Semi-AI controlling the Shuriken's personality and IFF.
 */
export interface SemiAI extends HardwareComponent {
  iffAccuracy: number;
  behaviorBuff: 'aggressive' | 'defensive' | 'coordinator' | 'adaptive';
}

/**
 * Individual statistics for a specific Shuriken across all runs.
 */
export interface ShurikenStats {
  enemiesKilled: number;
  timeRepairing: number; // in seconds
  lostHealth: number;
  timeOnline: number; // in seconds
}

/**
 * The full representation of a configured drone, passed into the combat simulation phase.
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
  semiAI: SemiAI | null;
  stats: ShurikenStats;
  creationDate?: number; // timestamp
}
