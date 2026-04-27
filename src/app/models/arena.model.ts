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
  damageType: 'ENERGY' | 'KINETIC'; // Added to support matrix
  ownerId: string;
  isEnemy: boolean;
  color: string;
  lifeTime: number; 
}


/**
 * Runtime entity representing a combatant (Drone or Hostile) in the arena
 */
export interface ArenaEntity {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;                 
  vx: number;
  vy: number;
  speed: number;
  topSpeed: number;
  acceleration: number;
  radius: number;            
  color: string;
  sensorRange: number;
  state: AIState;
  orbitAngle: number;        
  isEnemy: boolean;
  hp: number;
  maxHp: number;
  
  // Energy System (New)
  energy: number;
  maxEnergy: number;
  energyRegen: number;
  energyDrain: number;
  rebootTimer: number;
  rechargeBoostTimer: number;

  // Offensive Stats (New)
  baseDamage: number;
  damageType: 'SLASHING' | 'KINETIC' | 'ENERGY' | 'EMP';
  critChance: number;
  critMultiplier: number;

  // Defensive Stats (New)
  armorValue: number;
  evasionRate: number;

  // Weight / Inertia (New)
  baseWeight: number;
  
  // Strike gating
  strikeCooldown: number;    
  canStrike: boolean;        
  
  // Intelligence memory
  lastSeenPos: Vec2 | null;  
  searchTimer: number;       
  stuckTimer: number;
  
  // Visual Effects
  hitFlashTimer: number;     
  
  // Combat Logic
  withdrawalTimer: number;   
  rotation: number;          
  patrolPos: Vec2 | null;    
  sensorId: string;          
}
