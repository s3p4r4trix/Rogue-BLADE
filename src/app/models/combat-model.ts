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

/**
 * Possible AI states for the state machine.
 */
export type AIState = 'PATROLLING' | 'PURSUING' | 'STRIKING' | 'ORBITING' | 'SEARCHING' | 'REBOOTING' | 'WITHDRAWN' | 'IDLE';

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
    energy: number;
    maxEnergy: number;
    speed: number; // Current movement speed
    maxSpeed: number; // Top speed from engine
    acceleration: number;
    weight: number;
    baseDamage: number;
  };
  
  // AI / Logic
  state: AIState;
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
}

/**
 * State definition for the CombatStore and simulation context.
 */
export interface CombatState {
  entities: CombatEntity[];
  obstacles: AABB[];
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
