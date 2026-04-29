import { GambitRoutine } from './gambit-model';

/**
 * Basic 2D Vector for position and velocity.
 */
export interface Vector2D {
  x: number;
  y: number;
}

/**
 * Axis-Aligned Bounding Box for obstacles and collision detection.
 */
export interface AABB {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zHeight: number; // Height of the obstacle along the Z-axis
}

export type DamageType = 'KINETIC' | 'SLASHING' | 'ENERGY' | 'EMP';
export type ArmorType = 'UNARMORED' | 'HEAVY_ARMOR' | 'ENERGY_SHIELD';

/**
 * Possible AI states for the state machine.
 */
export type AIState = 'PATROLLING' | 'PURSUING' | 'STRIKING' | 'ORBITING' | 'SEARCHING' | 'REBOOTING' | 'WITHDRAWN' | 'IDLE' | 'SHOOTING' | 'ENGAGING' | 'STUNNED';

/**
 * Represents a drone or enemy in the combat arena.
 */
export interface CombatEntity {
  id: string;
  name: string;
  type: 'PLAYER' | 'ENEMY';

  // Physics / Transform
  position: Vector2D;
  z: number; // Elevation / Height
  velocity: Vector2D;
  rotation: number; // in radians

  stats: {
    hp: number;
    maxHp: number;
    shields: number;
    maxShields: number;
    armorValue: number;
    armorType: ArmorType;
    evasionRate: number;
    energy: number;
    maxEnergy: number;
    energyRegen: number;
    energyDrain: number;
    speed: number; // Current movement speed
    maxSpeed: number; // Top speed from engine
    acceleration: number;
    weight: number;
    baseDamage: number;
    damageType: DamageType;
    critChance: number;
    critMultiplier: number;
    aoeRadius?: number;
    pulseCooldown?: number;
  };

  // AI / Logic
  state: AIState;
  archetype?: string; // e.g. 'EMP_WARDEN'
  pulseTriggered?: boolean; // Flag to execute AoE pulse
  gambits: GambitRoutine[];
  targetId?: string; // ID of the entity currently being targeted
  lastSeenPos?: Vector2D; // For SEARCHING behavior

  // State machine helpers
  stateTimer: number; // Generic timer for state-specific logic (e.g. searching, orbiting)
  retaliationTimer: number; // Dedicated timer for enemy retaliation cooldown
  waypoint?: Vector2D; // Current movement target for patrolling

  // Visual / Debug
  radius: number; // Collision radius
  color: string;
  hitFlash: number; // Timer for hit flash effect (seconds)
}

/**
 * Represents a flying projectile in the combat arena.
 */
export interface Projectile {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  damage: number;
  damageType: DamageType;
  sourceId: string;
  targetId?: string;
  radius: number;
}

/**
 * Visual representation of an EMP pulse or other AoE effect.
 */
export interface PulseEffect {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  timer: number; // current time in animation
  duration: number; // total animation time
}

/**
 * State definition for the CombatStore and simulation context.
 */
export interface CombatState {
  entities: CombatEntity[];
  obstacles: AABB[];
  projectiles: Projectile[];
  pulses: PulseEffect[];
  deltaTime: number;
  timeElapsed: number;
  isFinished: boolean;
  success: boolean;
  logs: string[];
  isPaused: boolean;
  activePlayerId: string | null;
}

/**
 * Contextual data provided to AI and Gambit evaluation during a tick.
 */
export interface BehaviorContext extends CombatState {
  nearbyEnemies?: CombatEntity[];
  currentTarget?: CombatEntity | null;
}

/**
 * Result of a high-fidelity offline combat simulation.
 */
export interface StrikeResult {
  success: boolean;
  durationSeconds: number;
  remainingHull: number;
  remainingDrones: number;
  totalDamageDealt: number;
  log: string[];
}
