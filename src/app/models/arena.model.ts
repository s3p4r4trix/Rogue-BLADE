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
  width: number;
  height: number;
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
  velocityX: number;
  velocityY: number;
  radius: number;
  damage: number;
  damageType: 'ENERGY' | 'KINETIC'; // Added to support matrix
  ownerId: string;
  isEnemy: boolean;
  color: string;
  lifeTime: number; 
}


/**
 * Runtime entity representing a combatant (Drone or Hostile) in the arena.
 * This object stores the physical and logic state of an entity during the combat simulation.
 */
export interface ArenaEntity {
  /** Unique identifier for the entity. */
  id: string;
  /** Display name of the entity. */
  name: string;
  
  /** Current X coordinate in the arena. */
  x: number;
  /** Current Y coordinate in the arena. */
  y: number;
  /** Current altitude (Z coordinate), used for perspective shadows and flight effects. */
  z: number;                 
  
  /** Horizontal velocity component in pixels per second. */
  velocityX: number;
  /** Vertical velocity component in pixels per second. */
  velocityY: number;
  /** Current magnitude of velocity. */
  speed: number;
  /** Maximum speed the entity can achieve. */
  topSpeed: number;
  /** Rate of acceleration in pixels per second squared. */
  acceleration: number;
  
  /** Physical radius of the entity for collision and rendering. */
  radius: number;            
  /** Primary color used for rendering the entity's geometry. */
  color: string;
  /** Range of the onboard sensors in pixels. */
  sensorRange: number;
  /** Current behavior state of the entity's AI. */
  state: AIState;
  /** Current angle when in an ORBITING state. */
  orbitAngle: number;        
  
  /** If true, this entity is a hostile AI; otherwise, it is a player drone. */
  isEnemy: boolean;
  /** Current hull integrity (Health Points). */
  hp: number;
  /** Maximum hull integrity. */
  maxHp: number;
  
  /** Current action resource (Energy). */
  energy: number;
  /** Maximum energy capacity. */
  maxEnergy: number;
  /** Rate of energy recovery per second. */
  energyRegen: number;
  /** Passive energy consumption from engines and hardware. */
  energyDrain: number;
  /** Remaining time in seconds for a hardware reboot after energy depletion. */
  rebootTimer: number;
  /** Remaining time in seconds for the post-reboot energy generation boost. */
  rechargeBoostTimer: number;

  /** Base damage dealt by standard attacks. */
  baseDamage: number;
  /** The damage type category, checked against enemy armor in the effectiveness matrix. */
  damageType: 'SLASHING' | 'KINETIC' | 'ENERGY' | 'EMP';
  /** Probability (0 to 1) of landing a critical hit. */
  critChance: number;
  /** Multiplier applied to damage during a critical hit. */
  critMultiplier: number;

  /** Flat reduction applied to incoming damage. */
  armorValue: number;
  /** Probability (0 to 1) of evading an incoming attack. */
  evasionRate: number;

  /** Mass of the entity, used for kinetic damage scaling and acceleration calculations. */
  baseWeight: number;
  
  /** Remaining time in seconds before the next strike can be executed. */
  strikeCooldown: number;    
  /** Flag indicating if the entity is currently capable of initiating a strike. */
  canStrike: boolean;        
  
  /** Coordinates of the last known position of the enemy target. Used for SEARCHING. */
  lastSeenPos: Vec2 | null;  
  /** Time elapsed in the current search behavior. */
  searchTimer: number;       
  /** Timer used to detect if the entity is physically stuck against an obstacle. */
  stuckTimer: number;
  
  /** Timer used for visual hit-flash feedback. */
  hitFlashTimer: number;     
  
  /** Internal timer tracking the withdrawal process once health is critical. */
  withdrawalTimer: number;   
  /** Current facing rotation in radians. */
  rotation: number;          
  /** Target position for the PATROLLING state. */
  patrolPos: Vec2 | null;    
  /** ID of the sensor hardware installed on this entity. */
  sensorId: string;          
}
