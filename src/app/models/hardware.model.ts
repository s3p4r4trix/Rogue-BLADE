export interface HardwareComponent {
  id: string;
  name: string;
  description: string;
}

export interface AntiGravEngine extends HardwareComponent {
  speed: number;
  stealth: number;
  energyConsumption: number;
  evasionRate: number;
}

export interface HullMaterial extends HardwareComponent {
  tier: number;
  hp: number;
  armor: number;
  weight: number;
}

export interface EnergyCell extends HardwareComponent {
  maxEnergy: number;
  regenRate: number;
  maxOutput: number;
}

export interface Sensor extends HardwareComponent {
  range: number;
  unlocksTriggerIds: string[];
}

export interface Blade extends HardwareComponent {
  damageType: 'kinetic' | 'vibro' | 'mono-molecular' | 'plasma';
  damage: number;
}

export interface Shuriken {
  id: string;
  name: string;
  engine: AntiGravEngine | null;
  hull: HullMaterial | null;
  energyCell: EnergyCell | null;
  sensor: Sensor | null;
  blade: Blade | null;
}
