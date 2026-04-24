import { Injectable, signal, computed, effect } from '@angular/core';
import { Action, GambitRoutine, Trigger } from '../models/gambit.model';
import { Shuriken, HardwareComponent, AntiGravEngine, EnergyCell, Sensor, Blade, FormDesign, HullMaterial, Processor, SemiAI } from '../models/hardware.model';
import { moveItemInArray } from '@angular/cdk/drag-drop';

export const HARDWARE_INVENTORY = {
  engines: [
    { id: 'eng-drifter', name: 'Kuro-Tech "Drifter" Mag-Lev', description: 'Cheap, reliable, mass-produced.', speed: 10, stealth: 5, energyConsumption: 2, evasionRate: 5 } as AntiGravEngine,
    { id: 'eng-hauler', name: 'Atlas "Hauler" Grav-Drive', description: 'Slow but heavy lifting.', speed: 5, stealth: 2, energyConsumption: 5, evasionRate: 1 } as AntiGravEngine
  ],
  energyCells: [
    { id: 'cell-scrap', name: 'Scrap-Built Dynamo Cell', description: 'Barely holds a charge.', maxEnergy: 50, regenRate: 1, maxOutput: 10 } as EnergyCell,
    { id: 'cell-longhaul', name: 'Voltaic "Long-Haul" Battery', description: 'Huge pool, slow recharge.', maxEnergy: 200, regenRate: 0.5, maxOutput: 15 } as EnergyCell
  ],
  sensors: [
    { id: 'sens-vital', name: 'Vital-Scan "Pulse" Biosensor', description: 'Tracks heartbeats.', range: 10, unlocksTriggerIds: [] } as Sensor,
    { id: 'sens-spectra', name: 'Spectra EM-Scanner', description: 'Highlights shields.', range: 15, unlocksTriggerIds: ['Enemy has shield'] } as Sensor
  ],
  blades: [
    { id: 'blade-carbon', name: 'Carbon "Razor" Edge', description: 'Standard sharpened rim.', damageType: 'kinetic', damage: 10 } as Blade,
    { id: 'blade-breaker', name: 'Titan "Breaker" Profile', description: 'Crushes armor.', damageType: 'kinetic', damage: 25 } as Blade
  ],
  formDesigns: [
    { id: 'form-striker', name: 'Mk1 "Striker" Disc', description: 'Classic shuriken shape.', shape: 'disc', primaryDamageType: 'cutting' } as FormDesign,
    { id: 'form-viper', name: 'Aero "Viper" Dagger', description: 'Sleek dart-like chassis.', shape: 'dagger', primaryDamageType: 'piercing' } as FormDesign
  ],
  hulls: [
    { id: 'hull-sinter', name: 'Sinter-Scrap', description: 'Tier I Human Scrap.', tier: 1, hp: 50, armor: 2, weight: 5 } as HullMaterial,
    { id: 'hull-durasteel', name: 'Durasteel', description: 'Tier II Pre-War Military.', tier: 2, hp: 150, armor: 10, weight: 15 } as HullMaterial
  ],
  processors: [
    { id: 'proc-abacus', name: 'Scrap-Town "Abacus" Micro-Board', description: 'Barely holds two logic slots together.', routineCapacity: 2, latencyModifier: 50 } as Processor,
    { id: 'proc-cortex', name: 'Kuro-Tech "Cortex" CPU', description: 'Reliable 3-slot logic board.', routineCapacity: 3, latencyModifier: 0 } as Processor,
    { id: 'proc-overthinker', name: 'Dynacorp "Overthinker" Logic-Core', description: 'Unlocks advanced branching slots.', routineCapacity: 5, latencyModifier: -40 } as Processor,
    { id: 'proc-omni', name: 'Zenith "Omni-Node" Quantum Core', description: 'Processes variables instantaneously.', routineCapacity: 8, latencyModifier: -150 } as Processor
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
  semiAI: HARDWARE_INVENTORY.semiAIs[0]
};

function loadShurikens(): Shuriken[] {
  const defaults = [
    { ...DEFAULT_SHURIKEN, id: 'shuriken-01', name: 'Shuriken #01 (Scrap)' },
    { ...DEFAULT_SHURIKEN, id: 'shuriken-02', name: 'Shuriken #02 (Scrap)' }
  ];
  const saved = localStorage.getItem('rogueBlade_shurikens');
  if (saved) {
    try { 
      const parsed = JSON.parse(saved);
      if (parsed && parsed.length > 0 && parsed[0].semiAI !== undefined) {
        return parsed;
      }
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
    'eng-drifter', 'cell-scrap', 'sens-vital', 'blade-carbon', 'form-striker', 'hull-sinter', 'proc-abacus', 'semi-feral'
  ];
}

function loadSavedRoutinesMap(): Record<string, GambitRoutine[]> {
  const saved = localStorage.getItem('rogueBlade_routinesMap');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved routines', e);
    }
  }
  return {
    'shuriken-01': [
      { priority: 1, trigger: null, action: null },
      { priority: 2, trigger: null, action: null }
    ],
    'shuriken-02': [
      { priority: 1, trigger: null, action: null }
    ]
  };
}

@Injectable({
  providedIn: 'root'
})
export class WorkshopService {
  readonly availableTriggers = signal<Trigger[]>([
    { type: 'trigger', value: 'Enemy within 5m radius', name: '[+] Enemy within 5m radius' },
    { type: 'trigger', value: 'Enemy has shield', name: '[+] Enemy has shield' },
    { type: 'trigger', value: 'Self HP < 20%', name: '[+] Self HP < 20%' },
    { type: 'trigger', value: 'Enemy behind cover', name: '[!] Enemy behind cover', disabled: true, requiredSensor: 'Terahertz Sensor' }
  ]);

  readonly availableActions = signal<Action[]>([
    { type: 'action', value: 'Kinetic Ram (Forward)', name: '[>] Kinetic Ram (Forward)', baseLatency: 50 },
    { type: 'action', value: 'Evasive Dash (Left/Right)', name: '[>] Evasive Dash (Left/Right)', baseLatency: 20 },
    { type: 'action', value: 'Defensive Formation (Parry)', name: '[>] Defensive Formation (Parry)', baseLatency: 20 },
    { type: 'action', value: 'Charge Plasma Edge', name: '[>] Charge Plasma Edge', baseLatency: 300 }
  ]);

  readonly availableShurikens = signal<Shuriken[]>(loadShurikens());
  readonly unlockedComponentIds = signal<string[]>(loadUnlockedComponents());
  readonly activeShurikenId = signal<string>(localStorage.getItem('rogueBlade_activeShuriken') || 'shuriken-01');

  readonly routinesMap = signal<Record<string, GambitRoutine[]>>(loadSavedRoutinesMap());
  
  readonly routines = computed(() => {
    return this.routinesMap()[this.activeShurikenId()] || [];
  });

  readonly activeShuriken = computed(() => {
     return this.availableShurikens().find(s => s.id === this.activeShurikenId()) || this.availableShurikens()[0];
  });

  readonly fallbackAction = signal<string>('Circle around character');
  readonly systemLogs = signal<string[]>(['> System ready.', '> Waiting for input...']);

  constructor() {
    effect(() => {
      localStorage.setItem('rogueBlade_shurikens', JSON.stringify(this.availableShurikens()));
      localStorage.setItem('rogueBlade_unlockedComponents', JSON.stringify(this.unlockedComponentIds()));
      localStorage.setItem('rogueBlade_routinesMap', JSON.stringify(this.routinesMap()));
      localStorage.setItem('rogueBlade_activeShuriken', this.activeShurikenId());
    });
  }

  renameShuriken(id: string, newName: string) {
    this.availableShurikens.update(list => list.map(s => s.id === id ? { ...s, name: newName } : s));
  }

  equipComponent(shurikenId: string, slot: keyof Shuriken, component: any) {
    this.availableShurikens.update(list => list.map(s => s.id === shurikenId ? { ...s, [slot]: component } : s));
  }

  log(message: string, isError: boolean = false) {
    const cssClass = isError ? 'text-red-500' : 'text-green-500';
    this.systemLogs.update(logs => [...logs, `<span class="${cssClass}">> ${message}</span>`]);
  }

  setActiveShuriken(id: string) {
    this.activeShurikenId.set(id);
    this.log(`Switched to ${this.activeShuriken().name}`);
  }

  private updateActiveRoutines(updater: (routines: GambitRoutine[]) => GambitRoutine[]) {
    this.routinesMap.update(map => {
       const activeId = this.activeShurikenId();
       const current = map[activeId] || [];
       return { ...map, [activeId]: updater(current) };
    });
  }

  addRoutine() {
    const active = this.activeShuriken();
    const cap = active.processor?.routineCapacity || 2;
    if (this.routines().length >= cap) return;

    this.updateActiveRoutines(routines => {
      return [...routines, { priority: routines.length + 1, trigger: null, action: null }];
    });
    this.log(`Allocated new routine slot.`);
  }

  removeRoutine(index: number) {
    this.updateActiveRoutines(routines => {
      const updated = routines.filter((_, i) => i !== index);
      return updated.map((r, i) => ({ ...r, priority: i + 1 }));
    });
    this.log(`Deallocated routine slot.`);
  }

  reorderRoutines(previousIndex: number, currentIndex: number) {
    this.updateActiveRoutines(routines => {
      const updated = [...routines];
      moveItemInArray(updated, previousIndex, currentIndex);
      return updated.map((r, i) => ({ ...r, priority: i + 1 }));
    });
    this.log(`Routines reprioritized.`);
  }

  setTrigger(index: number, trigger: Trigger) {
    this.updateActiveRoutines(routines => {
      const updated = [...routines];
      if (updated[index]) updated[index] = { ...updated[index], trigger };
      return updated;
    });
    this.log(`Set TRIGGER: [${trigger.value}]`);
  }

  setAction(index: number, action: Action) {
    this.updateActiveRoutines(routines => {
      const updated = [...routines];
      if (updated[index]) updated[index] = { ...updated[index], action };
      return updated;
    });
    this.log(`Set ACTION: [${action.value}]`);
  }

  clearSlot(index: number) {
    this.updateActiveRoutines(routines => {
      const updated = [...routines];
      if (updated[index]) updated[index] = { ...updated[index], trigger: null, action: null };
      return updated;
    });
    this.log('Slot reset.');
  }

  compileCode() {
    this.log('==============================');
    this.log('Starting compilation...');

    let routinesFound = 0;
    let hasError = false;

    for (const routine of this.routines()) {
      if (routine.trigger && routine.action) {
        routinesFound++;
        this.log(`Routine Prio ${routine.priority}: IF [${routine.trigger.value}] THEN [${routine.action.value}] - OK`);
      } else if (routine.trigger || routine.action) {
        this.log(`ERROR in Prio ${routine.priority}: Routine incomplete!`, true);
        hasError = true;
      }
    }

    if (!hasError) {
      if (routinesFound > 0) {
        setTimeout(() => {
          this.log(`Upload of ${routinesFound} routines to ${this.activeShuriken().name} successful.`);
          this.log('Shuriken is ready for deployment.');
        }, 800);
      } else {
        this.log('ERROR: No valid routines found.', true);
      }
    }
  }
}

