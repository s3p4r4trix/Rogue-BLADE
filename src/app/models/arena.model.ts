/**
 * 2D spatial vector helper
 */
export interface Vec2 {
  x: number;
  y: number;
}

/**
 * Axis-Aligned Bounding Box for arena obstacles
 */
export interface AABB {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * AI behavior state machine labels for combatants
 */
export type AIState = 
  | 'PURSUING' 
  | 'ORBITING' 
  | 'FLEEING' 
  | 'IDLE' 
  | 'REBOOTING' 
  | 'SEARCHING' 
  | 'WITHDRAWN' 
  | 'PATROLLING' 
  | 'FIGHTING'
  | 'SHOOTING';

/**
 * Projectile entity fired by combatants
 */
export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  ownerId: string;
  isEnemy: boolean;
  color: string;
  lifeTime: number; // Time in seconds before it despawns if it doesn't hit anything
}


/**
 * Runtime entity representing a combatant (Drone or Hostile) in the arena
 */
export interface ArenaEntity {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;                 // Simulated elevation (drones fly, ground units stay at 0)
  vx: number;
  vy: number;
  speed: number;
  topSpeed: number;
  acceleration: number;
  radius: number;            // Collision / visual radius
  color: string;
  sensorRange: number;
  state: AIState;
  orbitAngle: number;        // Current angle when orbiting/searching
  isEnemy: boolean;
  hp: number;
  maxHp: number;
  
  // Strike gating
  strikeCooldown: number;    // Seconds remaining before next strike
  canStrike: boolean;        // True when speed conditions are met
  
  // Intelligence memory
  lastSeenPos: Vec2 | null;  // Where the target was last visible
  searchTimer: number;       // Time spent searching at last-seen position
  
  // Visual Effects
  hitFlashTimer: number;     // Remaining flash duration (seconds)
  
  // Combat Logic
  withdrawalTimer: number;   // Seconds spent at edge while fleeing
  rotation: number;          // Current facing direction (radians)
  patrolPos: Vec2 | null;    // Destination when patrolling
  sensorId: string;          // ID of the equipped sensor
}
