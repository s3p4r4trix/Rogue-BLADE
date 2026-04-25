import { Injectable, signal, computed, effect } from '@angular/core';
import { Action, GambitRoutine, Trigger } from '../models/gambit.model';
import { Shuriken, HardwareComponent, AntiGravEngine, EnergyCell, Sensor, Blade, FormDesign, HullMaterial, Processor, SemiAI } from '../models/hardware.model';
import { moveItemInArray } from '@angular/cdk/drag-drop';

export const HARDWARE_INVENTORY = {
  engines: [
    { id: 'eng-drifter', name: 'Drifter (Basic)', description: 'Standard industrial mag-lev.', topSpeed: 50, acceleration: 10, evasionRate: 0.05, energyDrain: 5, stealthValue: 10 } as AntiGravEngine,
    { id: 'eng-hauler', name: 'Hauler (Tank)', description: 'Slow but high weight capacity.', topSpeed: 30, acceleration: 5, evasionRate: 0.0, energyDrain: 8, stealthValue: 0 } as AntiGravEngine,
    { id: 'eng-screamer', name: 'Screamer (Speed)', description: 'High-performance racing engine.', topSpeed: 120, acceleration: 30, evasionRate: 0.15, energyDrain: 15, stealthValue: -20 } as AntiGravEngine,
    { id: 'eng-ghost', name: 'Ghost (Stealth)', description: 'Silenced baffles and low profile.', topSpeed: 60, acceleration: 15, evasionRate: 0.10, energyDrain: 8, stealthValue: 50 } as AntiGravEngine
  ],
  energyCells: [
    { id: 'cell-scrap', name: 'Scrap Dynamo', description: 'Recovered from a junked hover-car.', maxEnergy: 100, energyRegen: 2, maxOutput: 10 } as EnergyCell,
    { id: 'cell-voltiac', name: 'Voltiac Cell', description: 'Standard corporate power supply.', maxEnergy: 300, energyRegen: 5, maxOutput: 30 } as EnergyCell
  ],
  sensors: [
    { id: 'sens-prox', name: 'Proximity Sensor', description: 'Standard short-range detection.', range: 5, accuracy: 0.8, unlocksTriggerIds: ['ifEnemyInMeleeRange'] } as Sensor,
    { id: 'sens-lidar', name: 'Lidar Array', description: 'High-precision laser tracking.', range: 20, accuracy: 0.95, unlocksTriggerIds: ['ifEnemyInSight', 'ifIncomingProjectile'] } as Sensor,
    { id: 'sens-em', name: 'EM-Scanner', description: 'Detects active energy fields.', range: 15, accuracy: 0.9, unlocksTriggerIds: ['ifEnemyIsShielded'] } as Sensor,
    { id: 'sens-bio', name: 'Biosensor', description: 'Biological signature detection.', range: 15, accuracy: 0.9, unlocksTriggerIds: ['ifEnemyIsOrganic'] } as Sensor
  ],
  blades: [
    { id: 'blade-carbon', name: 'Carbon Razor', description: 'Lightweight and surgical.', damageType: 'SLASHING', baseDamage: 20, critChance: 0.10, critMultiplier: 1.5, energyDrain: 0, unlocksActionIds: ['actionStandardStrike'] } as Blade,
    { id: 'blade-titan', name: 'Titan Breaker', description: 'Heavy slab of tungsten.', damageType: 'KINETIC', baseDamage: 40, critChance: 0.05, critMultiplier: 2.0, energyDrain: 0, unlocksActionIds: ['actionKineticRam'] } as Blade,
    { id: 'blade-plasma', name: 'Plasma Edge', description: 'Superheated energy field.', damageType: 'ENERGY', baseDamage: 35, critChance: 0.15, critMultiplier: 1.5, energyDrain: 25, unlocksActionIds: ['actionStandardStrike'] } as Blade
  ],
  formDesigns: [
    { id: 'form-striker', name: 'Striker Disc', description: 'Balanced geometry.', shape: 'disc', speedMult: 1.0, weightMult: 1.0, damageMult: 1.0 } as FormDesign,
    { id: 'form-viper', name: 'Viper Dagger', description: 'Aerodynamic needle.', shape: 'dagger', speedMult: 1.2, weightMult: 0.8, damageMult: 0.9, critChanceMult: 1.5 } as FormDesign,
    { id: 'form-juggernaut', name: 'Juggernaut Sphere', description: 'Reinforced ball.', shape: 'sphere', speedMult: 0.7, weightMult: 1.5, damageMult: 1.1, armorMult: 1.2 } as FormDesign
  ],
  hulls: [
    { id: 'hull-plasteel', name: 'Plasteel (Tier I)', description: 'Lightweight composite.', tier: 1, maxHp: 100, armorValue: 5, shieldCapacity: 0, weight: 20 } as HullMaterial,
    { id: 'hull-durasteel', name: 'Durasteel (Tier II)', description: 'Military-grade alloy.', tier: 2, maxHp: 300, armorValue: 25, shieldCapacity: 100, weight: 60 } as HullMaterial,
    { id: 'hull-neutronium', name: 'Neutronium (Tier III)', description: 'Densely packed matter.', tier: 3, maxHp: 1500, armorValue: 150, shieldCapacity: 500, weight: 300 } as HullMaterial
  ],
  processors: [
    { id: 'proc-abacus', name: 'Abacus Chip', description: 'Legacy clock-cycle board.', routineCapacity: 2, latency: 0.5 } as Processor,
    { id: 'proc-cortex', name: 'Cortex CPU', description: 'Standard neural processor.', routineCapacity: 3, latency: 0.2 } as Processor,
    { id: 'proc-omni', name: 'Omni-Node Core', description: 'Quantum logic core.', routineCapacity: 5, latency: 0.05 } as Processor
  ],
  semiAIs: [
    { id: 'semi-feral', name: 'Scrap-Code "Feral" Instinct-Chip', description: 'Highly aggressive pathing.', iffAccuracy: 70, behaviorBuff: 'aggressive' } as SemiAI,
    { id: 'semi-guardian', name: 'Aegis "Guardian" Sub-Routine', description: 'Prioritizes self-preservation.', iffAccuracy: 95, behaviorBuff: 'defensive' } as SemiAI,
    { id: 'semi-hive', name: 'Vektor "Hive-Mind" Link', description: 'Specialized in swarm coordination.', iffAccuracy: 90, behaviorBuff: 'coordinator' } as SemiAI,
    { id: 'semi-whisper', name: 'Zenith "Whisper" Singularity-Mind', description: 'Adapts to enemy tactics on the fly.', iffAccuracy: 100, behaviorBuff: 'adaptive' } as SemiAI
  ]
};

const DEFAULT_SHURIKEN: Omit<Shuriken, 'id' | 'name'> = {
  engine: HARDWARE_INVENTORY.engines[0],
  energyCell: HARDWARE_INVENTORY.energyCells[0],
  sensor: HARDWARE_INVENTORY.sensors[0],
  blade: HARDWARE_INVENTORY.blades[0],
  formDesign: HARDWARE_INVENTORY.formDesigns[0],
  hull: HARDWARE_INVENTORY.hulls[0],
  processor: HARDWARE_INVENTORY.processors[0],
  semiAI: HARDWARE_INVENTORY.semiAIs[0],
  stats: { enemiesKilled: 0, timeRepairing: 0, lostHealth: 0, timeOnline: 0 }
};

function loadShurikens(): Shuriken[] {
  const defaults = [
    { ...DEFAULT_SHURIKEN, id: 'shuriken-01', name: 'Rogue_Unit_01', creationDate: Date.now() },
    { ...DEFAULT_SHURIKEN, id: 'shuriken-02', name: 'Rogue_Unit_02', creationDate: Date.now() }
  ];
  const saved = localStorage.getItem('rogueBlade_shurikens');
  if (saved) {
    try { 
      return JSON.parse(saved);
    } catch (e) {}
  }
  return defaults;
}

function loadUnlockedComponents(): string[] {
  const saved = localStorage.getItem('rogueBlade_unlockedComponents');
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  return [
    'eng-drifter', 'cell-scrap', 'sens-prox', 'blade-carbon', 'form-striker', 'hull-plasteel', 'proc-abacus', 'semi-feral'
  ];
}

function loadSavedRoutinesMap(): Record<string, GambitRoutine[]> {
  const saved = localStorage.getItem('rogueBlade_routinesMap');
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  return {
    'shuriken-01': [{ priority: 1, trigger: null, action: null }],
    'shuriken-02': [{ priority: 1, trigger: null, action: null }]
  };
}

@Injectable({ providedIn: 'root' })
export class WorkshopService {
  readonly availableTriggers = signal<Trigger[]>([
    { id: 'ifEnemyInMeleeRange', type: 'trigger', value: 'Enemy in melee range', name: '[!] ifEnemyInMeleeRange', description: 'Target is within strike radius.' },
    { id: 'ifEnemyInSight', type: 'trigger', value: 'Enemy in sight', name: '[!] ifEnemyInSight', description: 'Target detected by radar/lidar.', requiredSensor: 'Lidar Array' },
    { id: 'ifEnemyIsShielded', type: 'trigger', value: 'Enemy has active shield', name: '[!] ifEnemyIsShielded', description: 'Target is protected by EM field.', requiredSensor: 'EM-Scanner' },
    { id: 'ifEnemyIsOrganic', type: 'trigger', value: 'Enemy is organic', name: '[!] ifEnemyIsOrganic', description: 'Target is flesh/light armored.', requiredSensor: 'Biosensor' },
    { id: 'ifSelfHpCritical', type: 'trigger', value: 'Hull integrity < 20%', name: '[!] ifSelfHpCritical', description: 'Critical internal damage detected.' },
    { id: 'ifEnergyHigh', type: 'trigger', value: 'Energy pool > 80%', name: '[!] ifEnergyHigh', description: 'System capacity ready for high-drain actions.' },
    { id: 'ifIncomingProjectile', type: 'trigger', value: 'Incoming projectile detected', name: '[!] ifIncomingProjectile', description: 'Hostile fire on collision course.', requiredSensor: 'Lidar Array' }
  ]);

  readonly availableActions = signal<Action[]>([
    { id: 'actionStandardStrike', type: 'action', value: 'Standard Strike', name: '[>] actionStandardStrike', energyCost: 0, description: 'Basic attack maneuver.' },
    { id: 'actionKineticRam', type: 'action', value: 'Kinetic Ram', name: '[>] actionKineticRam', energyCost: 15, description: 'High-speed physical collision.' },
    { id: 'actionEvasiveManeuver', type: 'action', value: 'Evasive Maneuver', name: '[>] actionEvasiveManeuver', energyCost: 20, description: 'Briefly maximize evasion.' },
    { id: 'actionActivateCloak', type: 'action', value: 'Activate Cloak', name: '[>] actionActivateCloak', energyCost: 10, description: 'Consume energy to disappear.' },
    { id: 'actionRetreat', type: 'action', value: 'Emergency Retreat', name: '[>] actionRetreat', energyCost: 0, description: 'Withdraw to safety zones.' }
  ]);

  readonly availableShurikens = signal<Shuriken[]>(loadShurikens());
  readonly unlockedComponentIds = signal<string[]>(loadUnlockedComponents());
  readonly activeShurikenId = signal<string>(localStorage.getItem('rogueBlade_activeShuriken') || 'shuriken-01');
  readonly routinesMap = signal<Record<string, GambitRoutine[]>>(loadSavedRoutinesMap());
  readonly systemLogs = signal<string[]>(['> System ready.', '> Waiting for input...']);
  readonly selectedInfoItem = signal<Trigger | Action | null>(null);

  readonly routines = computed(() => this.routinesMap()[this.activeShurikenId()] || []);
  readonly activeShuriken = computed(() => this.availableShurikens().find(s => s.id === this.activeShurikenId()) || this.availableShurikens()[0]);

  readonly unlockedTriggers = computed(() => {
    const shuriken = this.activeShuriken();
    return this.availableTriggers().filter(t => !t.requiredSensor || shuriken.sensor?.name === t.requiredSensor);
  });

  readonly unlockedActions = computed(() => this.availableActions());

  readonly isSystemValid = computed(() => {
    return this.routines().every(r => this.isRoutineValid(r));
  });

  constructor() {
    effect(() => {
      localStorage.setItem('rogueBlade_shurikens', JSON.stringify(this.availableShurikens()));
      localStorage.setItem('rogueBlade_unlockedComponents', JSON.stringify(this.unlockedComponentIds()));
      localStorage.setItem('rogueBlade_routinesMap', JSON.stringify(this.routinesMap()));
      localStorage.setItem('rogueBlade_activeShuriken', this.activeShurikenId());
    });
  }

  isRoutineValid(routine: GambitRoutine): boolean {
    if (!routine.trigger || !routine.action) return true;
    return this.unlockedTriggers().some(t => t.id === routine.trigger?.id) && this.unlockedActions().some(a => a.id === routine.action?.id);
  }

  setActiveShuriken(id: string) { this.activeShurikenId.set(id); }

  renameShuriken(id: string, newName: string) {
    this.availableShurikens.update(list => list.map(s => s.id === id ? { ...s, name: newName } : s));
  }

  equipComponent(shurikenId: string, slot: keyof Shuriken, component: any) {
    this.availableShurikens.update(list => list.map(s => s.id === shurikenId ? { ...s, [slot]: component } : s));
  }

  addRoutine() {
    const cap = this.activeShuriken().processor?.routineCapacity || 2;
    if (this.routines().length >= cap) return;
    this.updateActiveRoutines(routines => [...routines, { priority: routines.length + 1, trigger: null, action: null }]);
  }

  removeRoutine(index: number) {
    this.updateActiveRoutines(routines => routines.filter((_, i) => i !== index).map((r, i) => ({ ...r, priority: i + 1 })));
  }

  moveRoutineUp(index: number) {
    if (index <= 0) return;
    this.updateActiveRoutines(routines => {
      const updated = [...routines];
      moveItemInArray(updated, index, index - 1);
      return updated.map((r, i) => ({ ...r, priority: i + 1 }));
    });
  }

  moveRoutineDown(index: number) {
    if (index >= this.routines().length - 1) return;
    this.updateActiveRoutines(routines => {
      const updated = [...routines];
      moveItemInArray(updated, index, index + 1);
      return updated.map((r, i) => ({ ...r, priority: i + 1 }));
    });
  }

  setTrigger(index: number, trigger: Trigger) {
    this.updateActiveRoutines(routines => {
      const updated = [...routines];
      if (updated[index]) updated[index] = { ...updated[index], trigger };
      return updated;
    });
  }

  setAction(index: number, action: Action) {
    this.updateActiveRoutines(routines => {
      const updated = [...routines];
      if (updated[index]) updated[index] = { ...updated[index], action };
      return updated;
    });
  }

  clearSlot(index: number) {
    this.updateActiveRoutines(routines => {
      const updated = [...routines];
      if (updated[index]) updated[index] = { ...updated[index], trigger: null, action: null };
      return updated;
    });
  }

  setInfoItem(item: any) { this.selectedInfoItem.set(item); }

  private updateActiveRoutines(updater: (routines: GambitRoutine[]) => GambitRoutine[]) {
    this.routinesMap.update(map => ({ ...map, [this.activeShurikenId()]: updater(map[this.activeShurikenId()] || []) }));
  }

  fallbackAction() { return 'actionStandardStrike'; }

  compileCode() {
    this.systemLogs.update(logs => [...logs, '> Compiling routines...', '> Upload successful.']);
  }
}
