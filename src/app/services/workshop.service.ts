import { Injectable, signal, computed, effect } from '@angular/core';
import { Action, GambitRoutine, Trigger } from '../models/gambit.model';
import { Shuriken, AntiGravEngine, EnergyCell, Reactor, Sensor, Blade, FormDesign, HullMaterial, Processor, SemiAI, ShieldGenerator } from '../models/hardware.model';
import { moveItemInArray } from '@angular/cdk/drag-drop';

export const HARDWARE_INVENTORY = {
  engines: [
    { id: 'eng-drifter', name: 'Drifter (Basic)', description: 'Salvaged industrial mag-lev.', topSpeed: 150, acceleration: 50, evasionRate: 0.05, energyDrain: 5, stealthValue: 10, weight: 10 } as AntiGravEngine,
    { id: 'eng-hauler', name: 'Hauler (Tank)', description: 'Slow but high weight capacity.', topSpeed: 120, acceleration: 40, evasionRate: 0.0, energyDrain: 8, stealthValue: 0, weight: 25 } as AntiGravEngine,
    { id: 'eng-screamer', name: 'Screamer (Speed)', description: 'High-performance racing engine.', topSpeed: 300, acceleration: 100, evasionRate: 0.15, energyDrain: 15, stealthValue: -20, weight: 8 } as AntiGravEngine,
    { id: 'eng-ghost', name: 'Ghost (Stealth)', description: 'Silenced baffles and low profile.', topSpeed: 200, acceleration: 133, evasionRate: 0.10, energyDrain: 8, stealthValue: 50, weight: 12 } as AntiGravEngine
  ],
  energyCells: [
    { id: 'cell-scrap', name: 'Scrap Dynamo', description: 'Recovered from a junked hover-car.', maxEnergy: 100, maxOutput: 10, weight: 15 } as EnergyCell,
    { id: 'cell-voltiac', name: 'Voltiac Cell', description: 'Standard corporate power supply.', maxEnergy: 300, maxOutput: 30, weight: 10 } as EnergyCell
  ],
  reactors: [
    { id: 'react-fusion', name: 'Fusion Core', description: 'Basic hydrogen reactor.', energyRegen: 2, weight: 5 } as Reactor,
    { id: 'react-plasma', name: 'Plasma Injector', description: 'High-yield ion source.', energyRegen: 5, weight: 8 } as Reactor,
    { id: 'react-quantum', name: 'Quantum Singularity', description: 'Infinite-loop gravity-well.', energyRegen: 12, weight: 15 } as Reactor
  ],
  sensors: [
    { id: 'sens-optical', name: 'Optical Sensors', description: 'Short-range camera array.', range: 500, accuracy: 0.7, unlocksTriggerIds: ['ifEnemyInMeleeRange'], weight: 1 } as Sensor,
    { id: 'sens-bio', name: 'Biosensors', description: 'Organic signature tracking.', range: 1000, accuracy: 0.85, unlocksTriggerIds: ['ifEnemyIsOrganic'], weight: 2 } as Sensor,
    { id: 'sens-thermal', name: 'Thermal Sensors', description: 'Infrared heat detection.', range: 800, accuracy: 0.9, unlocksTriggerIds: ['ifEnemyInSight'], weight: 2 } as Sensor,
    { id: 'sens-em', name: 'EM-Sensors', description: 'Detects active energy fields.', range: 1200, accuracy: 0.9, unlocksTriggerIds: ['ifEnemyIsShielded'], weight: 3 } as Sensor,
    { id: 'sens-radar', name: 'Radar Array', description: 'Long-range monitoring.', range: 2000, accuracy: 0.8, unlocksTriggerIds: ['ifEnemyInSight'], weight: 5 } as Sensor,
    { id: 'sens-lidar', name: 'Lidar Array', description: 'Precision optical targeting.', range: 1600, accuracy: 0.98, unlocksTriggerIds: ['ifIncomingProjectile'], weight: 4 } as Sensor,
    { id: 'sens-terahertz', name: 'Terahertz Array', description: 'Penetrates physical obstacles.', range: 600, accuracy: 0.9, unlocksTriggerIds: ['ifEnemyBehindCover'], weight: 3 } as Sensor
  ],
  blades: [
    { id: 'blade-edge', name: 'Sharpened Edge', description: 'Simple metal rim.', damageType: 'SLASHING', baseDamage: 15, critChance: 0.05, critMultiplier: 1.5, energyDrain: 0, unlocksActionIds: ['actionStandardStrike'], weight: 5 } as Blade,
    { id: 'blade-hammer', name: 'Hammer Profile', description: 'Heavy, blunt momentum edge.', damageType: 'KINETIC', baseDamage: 30, critChance: 0.02, critMultiplier: 2.0, energyDrain: 0, unlocksActionIds: ['actionKineticRam'], weight: 15 } as Blade,
    { id: 'blade-vibro', name: 'Vibro-Blade', description: 'High-frequency oscillation.', damageType: 'SLASHING', baseDamage: 25, critChance: 0.12, critMultiplier: 1.5, energyDrain: 5, unlocksActionIds: ['actionStandardStrike'], weight: 8 } as Blade,
    { id: 'blade-energy', name: 'Energy Blade', description: 'Superheated plasma field.', damageType: 'ENERGY', baseDamage: 35, critChance: 0.15, critMultiplier: 1.5, energyDrain: 25, unlocksActionIds: ['actionStandardStrike'], weight: 12 } as Blade
  ],
  formDesigns: [
    { id: 'form-shuriken', name: 'Shuriken', description: 'Aerodynamic cutting geometry.', shape: 'shuriken', speedMult: 1.0, weightMult: 0.7, damageMult: 1.1, armorMult: 0.8, critChanceMult: 1.0, weight: 0 } as FormDesign,
    { id: 'form-disc', name: 'Disc', description: 'Balanced kinetic geometry.', shape: 'disc', speedMult: 1.0, weightMult: 1.1, damageMult: 1.0, armorMult: 1.0, critChanceMult: 1.0, weight: 0 } as FormDesign,
    { id: 'form-dagger', name: 'Dagger', description: 'Sleek piercing needle.', shape: 'dagger', speedMult: 1.2, weightMult: 0.8, damageMult: 0.3, armorMult: 0.5, critChanceMult: 1.5, weight: 0 } as FormDesign,
    { id: 'form-sphere', name: 'Sphere', description: 'Reinforced mass-driver.', shape: 'sphere', speedMult: 0.7, weightMult: 1.5, damageMult: 2.0, armorMult: 1.7, critChanceMult: 0.3, weight: 0 } as FormDesign,
    { id: 'form-ion', name: 'Ion-Edge', description: 'Plasma-infused perimeter.', shape: 'ion-edge', speedMult: 1.1, weightMult: 0.9, damageMult: 0.9, armorMult: 0.9, critChanceMult: 1.2, weight: 0 } as FormDesign
  ],
  hulls: [
    { id: 'hull-scrap', name: 'Scrap-Metal', description: 'Rusted appliance parts.', tier: 1, maxHp: 80, armorValue: 2, shieldCapacity: 0, weight: 25 } as HullMaterial,
    { id: 'hull-carbon', name: 'Carbon-Composite', description: 'Lightweight salvaged aircraft.', tier: 1, maxHp: 100, armorValue: 5, shieldCapacity: 0, weight: 15 } as HullMaterial,
    { id: 'hull-durasteel', name: 'Durasteel', description: 'Heavy industrial standard.', tier: 2, maxHp: 300, armorValue: 25, shieldCapacity: 100, weight: 60 } as HullMaterial,
    { id: 'hull-neutronium', name: 'Neutronium-Cast', description: 'Near-indestructible dead star matter.', tier: 3, maxHp: 1500, armorValue: 150, shieldCapacity: 500, weight: 300 } as HullMaterial
  ],
  processors: [
    { id: 'proc-abacus', name: 'Abacus Chip', description: 'Legacy clock-cycle board.', routineCapacity: 2, reactionTime: 0.5, processorSpeed: 5, weight: 1 } as Processor,
    { id: 'proc-cortex', name: 'Cortex CPU', description: 'Standard neural processor.', routineCapacity: 3, reactionTime: 0.2, processorSpeed: 15, weight: 1 } as Processor,
    { id: 'proc-omni', name: 'Omni-Node Core', description: 'Quantum logic core.', routineCapacity: 5, reactionTime: 0.05, processorSpeed: 40, weight: 2 } as Processor
  ],
  semiAIs: [
    { id: 'semi-feral', name: 'Scrap-Code "Feral"', description: 'Aggressive instinct paths.', iffAccuracy: 70, behaviorBuff: 'aggressive', weight: 1 } as SemiAI,
    { id: 'semi-guardian', name: 'Aegis "Guardian"', description: 'Protective sub-routines.', iffAccuracy: 95, behaviorBuff: 'defensive', weight: 1 } as SemiAI
  ],
  shields: [
    { id: 'shield-basic', name: 'Scrap-Capacitor', description: 'Crude static field generator.', shieldCapacity: 50, regenRate: 2, energyCostPerRegen: 5, weight: 10 } as ShieldGenerator
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
  reactor: HARDWARE_INVENTORY.reactors[0],
  shield: null, // Locked until research
  semiAI: null, // Optional, unlocked later
  coordinationMode: 'SOLO',
  stats: { enemiesKilled: 0, timeRepairing: 0, lostHealth: 0, timeOnline: 0 }
};

function loadShurikens(): Shuriken[] {
  const defaults = [
    { ...DEFAULT_SHURIKEN, id: 'shuriken-01', name: 'Rogue_Unit_01', creationDate: Date.now() }
  ];
  const saved = localStorage.getItem('rogueBlade_shurikens');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) { }
  }
  return defaults;
}

function loadUnlockedComponents(): string[] {
  const saved = localStorage.getItem('rogueBlade_unlockedComponents');
  if (saved) {
    try { return JSON.parse(saved); } catch (e) { }
  }
  return [
    'eng-drifter', 'cell-scrap', 'react-fusion', 'sens-optical', 'blade-edge', 'form-shuriken', 'hull-scrap', 'proc-abacus', 'sens-terahertz'
  ];
}

function loadSavedRoutinesMap(): Record<string, GambitRoutine[]> {
  const saved = localStorage.getItem('rogueBlade_routinesMap');
  if (saved) {
    try { return JSON.parse(saved); } catch (e) { }
  }

  // Default routines for new players
  const defaultRoutines: GambitRoutine[] = [
    {
      priority: 1,
      trigger: { id: 'ifEnemyInMeleeRange', type: 'trigger', value: 'Enemy in melee range', name: 'Enemy: Close Proximity', description: 'Target is within strike radius.' },
      action: { id: 'actionStandardStrike', type: 'action', value: 'Standard Strike', name: 'Execute: Standard Strike', energyCost: 0, description: 'Basic attack maneuver.', baseLatency: 200 }
    },
    {
      priority: 2,
      trigger: { id: 'ifEnemyInSight', type: 'trigger', value: 'Enemy in sight', name: 'Enemy: Detected', description: 'Target detected by radar/lidar.', requiredSensor: 'Radar/Lidar' },
      action: { id: 'actionKineticRam', type: 'action', value: 'Kinetic Ram', name: 'Execute: Kinetic Ram', energyCost: 15, description: 'High-speed physical collision.', baseLatency: 500 }
    }
  ];

  return {
    'shuriken-01': [...defaultRoutines]
  };
}

@Injectable({ providedIn: 'root' })
export class WorkshopService {
  readonly availableTriggers = signal<Trigger[]>([
    { id: 'ifEnemyInMeleeRange', type: 'trigger', value: 'Enemy in melee range', name: 'Enemy: Close Proximity', description: 'Target is within strike radius.' },
    { id: 'ifEnemyInSight', type: 'trigger', value: 'Enemy in sight', name: 'Enemy: Detected', description: 'Target detected by radar/lidar.', requiredSensor: 'Radar/Lidar' },
    { id: 'ifEnemyIsShielded', type: 'trigger', value: 'Enemy has active shield', name: 'Enemy: Shield Active', description: 'Target is protected by EM field.', requiredSensor: 'EM-Sensors' },
    { id: 'ifEnemyIsOrganic', type: 'trigger', value: 'Enemy is organic', name: 'Enemy: Soft Target', description: 'Target is flesh/light armored.', requiredSensor: 'Biosensors' },
    { id: 'ifSelfHpCritical', type: 'trigger', value: 'Hull integrity < 20%', name: 'Self: Hull Breach', description: 'Critical internal damage detected.' },
    { id: 'ifEnergyHigh', type: 'trigger', value: 'Energy pool > 80%', name: 'Self: Power Overload', description: 'System capacity ready for high-drain actions.' },
    { id: 'ifIncomingProjectile', type: 'trigger', value: 'Incoming projectile detected', name: 'Self: Incoming Fire', description: 'Hostile fire on collision course.', requiredSensor: 'Lidar Array' },
    { id: 'ifEnemyBehindCover', type: 'trigger', value: 'Enemy behind obstacle', name: 'Enemy: Obscured', description: 'Target is hidden by cover.', requiredSensor: 'Terahertz Array' }
  ]);

  readonly availableActions = signal<Action[]>([
    { id: 'actionStandardStrike', type: 'action', value: 'Standard Strike', name: 'Execute: Standard Strike', energyCost: 0, description: 'Basic attack maneuver.', baseLatency: 200 },
    { id: 'actionKineticRam', type: 'action', value: 'Kinetic Ram', name: 'Execute: Kinetic Ram', energyCost: 20, description: 'High-speed physical collision.', baseLatency: 500 },
    { id: 'actionEvasiveManeuver', type: 'action', value: 'Evasive Maneuver', name: 'Execute: Evasive Action', energyCost: 15, description: 'Briefly maximize evasion.', baseLatency: 100 },
    { id: 'actionActivateCloak', type: 'action', value: 'Activate Cloak', name: 'Execute: Ghost Protocol', energyCost: 10, description: 'Consume energy to disappear.', baseLatency: 300 },
    { id: 'actionEmergencyReboot', type: 'action', value: 'Emergency Reboot', name: 'Execute: Emergency Reboot', energyCost: 0, description: 'Stand still to regain energy.', baseLatency: 3000 },
    { id: 'actionEmergencyWithdrawal', type: 'action', value: 'Emergency Withdrawal', name: 'Execute: Emergency Withdrawal', energyCost: 0, description: 'Withdraw to safety zones.', baseLatency: 0 }
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
    // Hardware Migration: Ensure all shurikens have valid components after refactor
    this.migrateHardware();

    effect(() => {
      localStorage.setItem('rogueBlade_shurikens', JSON.stringify(this.availableShurikens()));
      localStorage.setItem('rogueBlade_unlockedComponents', JSON.stringify(this.unlockedComponentIds()));
      localStorage.setItem('rogueBlade_routinesMap', JSON.stringify(this.routinesMap()));
      localStorage.setItem('rogueBlade_activeShuriken', this.activeShurikenId());
    });
  }

  private migrateHardware() {
    // Ensure "Lowest Tier" defaults exist in unlocked set
    const baseIds = ['eng-drifter', 'cell-scrap', 'react-fusion', 'sens-optical', 'blade-edge', 'form-shuriken', 'hull-scrap', 'proc-abacus', 'semi-feral', 'sens-terahertz'];
    this.unlockedComponentIds.update(ids => Array.from(new Set([...ids, ...baseIds])));

    this.availableShurikens.update(list => list.map(s => {
      const r = { ...s };

      // Refresh component stats from HARDWARE_INVENTORY by ID to ensure balance changes apply
      if (r.engine) {
        const cur = HARDWARE_INVENTORY.engines.find(e => e.id === r.engine?.id);
        r.engine = cur ? { ...cur } : HARDWARE_INVENTORY.engines[0];
      } else r.engine = HARDWARE_INVENTORY.engines[0];

      if (r.hull) {
        const cur = HARDWARE_INVENTORY.hulls.find(h => h.id === r.hull?.id);
        r.hull = cur ? { ...cur } : HARDWARE_INVENTORY.hulls[0];
      } else r.hull = HARDWARE_INVENTORY.hulls[0];

      if (r.energyCell) {
        const cur = HARDWARE_INVENTORY.energyCells.find(c => c.id === r.energyCell?.id);
        r.energyCell = cur ? { ...cur } : HARDWARE_INVENTORY.energyCells[0];
      } else r.energyCell = HARDWARE_INVENTORY.energyCells[0];

      if (r.sensor) {
        const cur = HARDWARE_INVENTORY.sensors.find(sn => sn.id === r.sensor?.id);
        r.sensor = cur ? { ...cur } : HARDWARE_INVENTORY.sensors[0];
      } else r.sensor = HARDWARE_INVENTORY.sensors[0];

      if (r.blade) {
        const cur = HARDWARE_INVENTORY.blades.find(b => b.id === r.blade?.id);
        r.blade = cur ? { ...cur } : HARDWARE_INVENTORY.blades[0];
      } else r.blade = HARDWARE_INVENTORY.blades[0];

      if (r.formDesign) {
        const cur = HARDWARE_INVENTORY.formDesigns.find(f => f.id === r.formDesign?.id);
        r.formDesign = cur ? { ...cur } : HARDWARE_INVENTORY.formDesigns[0];
      } else r.formDesign = HARDWARE_INVENTORY.formDesigns[0];

      if (r.processor) {
        const cur = HARDWARE_INVENTORY.processors.find(p => p.id === r.processor?.id);
        r.processor = cur ? { ...cur } : HARDWARE_INVENTORY.processors[0];
      } else r.processor = HARDWARE_INVENTORY.processors[0];

      if (r.reactor) {
        const cur = HARDWARE_INVENTORY.reactors.find(re => re.id === r.reactor?.id);
        r.reactor = cur ? { ...cur } : HARDWARE_INVENTORY.reactors[0];
      } else r.reactor = HARDWARE_INVENTORY.reactors[0];

      if (r.shield) {
        const cur = HARDWARE_INVENTORY.shields.find(sh => sh.id === r.shield?.id);
        if (cur) r.shield = { ...cur };
      }

      if (r.semiAI) {
        const cur = HARDWARE_INVENTORY.semiAIs.find(ai => ai.id === r.semiAI?.id);
        if (cur) r.semiAI = { ...cur };
      }

      // Coordination Migration
      if (!r.coordinationMode) r.coordinationMode = 'SOLO';
      if (r.semiAI && r.coordinationMode === 'SOLO') r.coordinationMode = 'MASTER';
      if (!r.semiAI && r.coordinationMode === 'MASTER') r.coordinationMode = 'SOLO';

      return r;
    }));
  }

  isRoutineValid(routine: GambitRoutine): boolean {
    if (!routine.trigger || !routine.action) return true;
    return this.unlockedTriggers().some(t => t.id === routine.trigger?.id) && this.unlockedActions().some(a => a.id === routine.action?.id);
  }

  isShurikenValid(s: Shuriken): boolean {
    return !!(s.engine && s.hull && s.energyCell && s.sensor && s.blade && s.processor && s.formDesign);
  }

  isFleetValid(): boolean {
    return this.availableShurikens().every(s => this.isShurikenValid(s));
  }

  setActiveShuriken(id: string) { this.activeShurikenId.set(id); }

  renameShuriken(id: string, newName: string) {
    this.availableShurikens.update(list => list.map(s => s.id === id ? { ...s, name: newName } : s));
  }

  equipComponent(shurikenId: string, slot: keyof Shuriken, component: any) {
    this.availableShurikens.update(list => list.map(s => {
      if (s.id !== shurikenId) return s;
      const updated = { ...s, [slot]: component };

      // Auto-update coordination mode based on AI slot
      if (slot === 'semiAI') {
        if (component) {
          updated.coordinationMode = 'MASTER';
        } else {
          updated.coordinationMode = 'SOLO';
          updated.masterId = undefined;
        }
      }
      return updated;
    }));
  }

  setCoordination(shurikenId: string, mode: 'SOLO' | 'MASTER' | 'SLAVE', masterId?: string) {
    this.availableShurikens.update(list => list.map(s => s.id === shurikenId ? { ...s, coordinationMode: mode, masterId } : s));
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
