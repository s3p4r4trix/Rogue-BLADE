import { MissionContract } from './mission.model';
import { Shuriken, DamageType, ArmorType } from './hardware.model';
import { GambitRoutine } from './gambit.model';

export interface StrikeResult {
  success: boolean;
  totalPolymer: number;
  totalScrap: number;
  totalCredits: number;
  logs: string[];
  initialSquadHP: number;
  initialEnemyHP: number;
}

export interface ShurikenSimulationState {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  armorValue: number;
  shields: number;
  maxShields: number;
  evasionRate: number;
  baseWeight: number;
  topSpeed: number;
  acceleration: number;
  currentSpeed: number;
  energy: number;
  maxEnergy: number;
  energyRegen: number;
  passiveDrain: number;
  baseDamage: number;
  damageType: DamageType;
  critChance: number;
  critMultiplier: number;
  latency: number;
  coordinationMode: 'SOLO' | 'MASTER' | 'SLAVE';
  masterId?: string;
  isExhausted: boolean;
  routines: GambitRoutine[];
  isStealthed: boolean;
  evasionBuff: number;
}

export interface ShurikenStatus {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  shields: number;
  maxShields: number;
  energy: number;
  maxEnergy: number;
}

export interface SimulationContext {
  enemyRef?: { hull: number; shields: number };
  enemyHull?: number;
  enemyShields?: number;
  mission: MissionContract;
  tick: number;
  logs: string[];
}
