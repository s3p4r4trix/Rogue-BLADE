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
  initialEnemyHull: number;
  initialEnemyShields: number;
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
  reactionTime: number;
  processorSpeed: number;
  coordinationMode: 'SOLO' | 'MASTER' | 'SLAVE';
  masterId?: string;
  isExhausted: boolean;
  routines: GambitRoutine[];
  isStealthed: boolean;
  evasionBuff: number;
  // New States
  chaosModeTicks: number;     // Remaining ticks for Chaos Mode
  rebootTicks: number;        // Remaining ticks for Emergency Reboot
  rechargeBoostTicks: number; // Remaining ticks for 150% energy efficiency
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
  rebootTicks: number;
}

export interface SimulationContext {
  enemyRef?: { hull: number; shields: number };
  enemyHull?: number;
  enemyShields?: number;
  mission: MissionContract;
  tick: number;
  logs: string[];
}
