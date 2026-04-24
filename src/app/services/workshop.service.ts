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
    { id: 'blade-carbon', name: 'Carbon "Razor" Edge', description: 'Standard sharpened rim.', damageType: 'kinetic', damage: 10, unlocksActionIds: ['act-kinetic-ram', 'act-evasive-dash', 'act-defensive-parry'] } as Blade,
    { id: 'blade-plasma', name: 'Z-1 "Sun-Cutter" Plasma Blade', description: 'Cuts through shields like butter.', damageType: 'plasma', damage: 25, unlocksActionIds: ['act-kinetic-ram', 'act-plasma-edge'] } as Blade,
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
  semiAI: HARDWARE_INVENTORY.semiAIs[0],
  stats: { enemiesKilled: 0, timeRepairing: 0, lostHealth: 0, timeOnline: 0 }
};

function loadShurikens(): Shuriken[] {
  const defaults = [
    { ...DEFAULT_SHURIKEN, id: 'shuriken-01', name: 'Shuriken #01 (Scrap)', creationDate: Date.now() },
    { ...DEFAULT_SHURIKEN, id: 'shuriken-02', name: 'Shuriken #02 (Scrap)', creationDate: Date.now() }
  ];
  const saved = localStorage.getItem('rogueBlade_shurikens');
  if (saved) {
    try { 
      let parsed = JSON.parse(saved);
      if (parsed && parsed.length > 0 && parsed[0].semiAI !== undefined) {
        parsed = parsed.map((s: any) => ({
          ...s,
          stats: s.stats || { enemiesKilled: 0, timeRepairing: 0, lostHealth: 0, timeOnline: 0 },
          creationDate: s.creationDate || Date.now()
        }));
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
    { 
      id: 'trig-enemy-5m',
      type: 'trigger', 
      value: 'Enemy in range', 
      name: '[+] Enemy in range',
      description: 'Standard proximity sensor trigger. Activates when a hostile target enters the immediate combat envelope.',
      lore: 'Kuro-Tech pulse sensors are reliable, if a bit noisy. Guaranteed to detect anything with a heat signature.'
    },
    { 
      id: 'trig-enemy-shield',
      type: 'trigger', 
      value: 'Enemy has shield', 
      name: '[+] Enemy has shield',
      description: 'Analyzes energy signatures to detect active EM shielding on the target.',
      lore: 'In the corporate wars, shields were everything. This routine was written in the trenches of Neo-Tokyo.'
    },
    { 
      id: 'trig-low-hp',
      type: 'trigger', 
      value: 'Self HP < 20%', 
      name: '[+] Self HP < 20%',
      description: 'Internal diagnostic trigger. Activates when structural integrity falls below critical levels.',
      lore: 'Panic mode for machines. When the hull screams, the AI listens.'
    },
    { 
      id: 'trig-behind-cover',
      type: 'trigger', 
      value: 'Enemy behind cover', 
      name: '[!] Enemy behind cover', 
      disabled: true, 
      requiredSensor: 'Terahertz Sensor',
      description: 'Advanced occlusion analysis. Detects targets hiding behind physical obstacles.',
      lore: 'Hiding only works if they can\'t see your heartbeat through the wall.'
    }
  ]);

  readonly availableActions = signal<Action[]>([
    { 
      id: 'act-kinetic-ram',
      type: 'action', 
      value: 'Kinetic Ram (Forward)', 
      name: '[>] Kinetic Ram (Forward)', 
      baseLatency: 50,
      description: 'A high-speed physical collision. Deals significant damage but risks self-harm.',
      lore: 'The simplest solution is often the most violent one.'
    },
    { 
      id: 'act-evasive-dash',
      type: 'action', 
      value: 'Evasive Dash (Left/Right)', 
      name: '[>] Evasive Dash (Left/Right)', 
      baseLatency: 20,
      description: 'Quick lateral movement to avoid incoming fire or collisions.',
      lore: 'The best way to win a fight is to not be where the bullet is.'
    },
    { 
      id: 'act-defensive-parry',
      type: 'action', 
      value: 'Defensive Formation (Parry)', 
      name: '[>] Defensive Formation (Parry)', 
      baseLatency: 20,
      description: 'Angled hull positioning to deflect incoming kinetic projectiles.',
      lore: 'Armor is just physics waiting for an angle.'
    },
    { 
      id: 'act-plasma-edge',
      type: 'action', 
      value: 'Charge Plasma Edge', 
      name: '[>] Charge Plasma Edge', 
      baseLatency: 300,
      description: 'Heats the blade edges to extreme temperatures. Destroys shields instantly.',
      lore: 'Zenith tech at its finest. It cuts through durasteel like a hot knife through butter.'
    }
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

  // Filtered triggers based on active sensors
  readonly unlockedTriggers = computed(() => {
    const shuriken = this.activeShuriken();
    if (!shuriken) return [];
    
    const unlockedIds = new Set<string>();
    // Core triggers always available to all shurikens
    unlockedIds.add('trig-enemy-5m');
    unlockedIds.add('trig-low-hp');
    
    // Check sensors
    if (shuriken.sensor?.unlocksTriggerIds) {
      shuriken.sensor.unlocksTriggerIds.forEach(id => unlockedIds.add(id));
    }
    
    return this.availableTriggers().filter(t => unlockedIds.has(t.id) || (shuriken.sensor?.unlocksTriggerIds?.includes(t.value)));
  });

  // Filtered actions based on active blade
  readonly unlockedActions = computed(() => {
    const shuriken = this.activeShuriken();
    if (!shuriken) return [];
    
    const unlockedIds = new Set<string>();
    // Core actions always available if any blade is equipped
    unlockedIds.add('act-kinetic-ram');
    unlockedIds.add('act-evasive-dash');
    unlockedIds.add('act-defensive-parry');
    
    if (shuriken.blade?.unlocksActionIds) {
      shuriken.blade.unlocksActionIds.forEach(id => unlockedIds.add(id));
    }
    
    return this.availableActions().filter(a => unlockedIds.has(a.id));
  });

  isRoutineValid(routine: GambitRoutine): boolean {
    if (!routine.trigger || !routine.action) return true; // Incomplete routines are "valid" but non-functional
    
    const isTriggerUnlocked = this.unlockedTriggers().some(t => t.id === routine.trigger?.id);
    const isActionUnlocked = this.unlockedActions().some(a => a.id === routine.action?.id);
    
    return isTriggerUnlocked && isActionUnlocked;
  }

  readonly isSystemValid = computed(() => {
    return this.routines().every(r => this.isRoutineValid(r));
  });

  readonly fallbackAction = signal<string>('Circle around character');
  readonly systemLogs = signal<string[]>(['> System ready.', '> Waiting for input...']);
  
  // Tracking the currently selected component for the info panel
  readonly selectedInfoItem = signal<Trigger | Action | null>(null);

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

  moveRoutineUp(index: number) {
    if (index <= 0) return;
    this.reorderRoutines(index, index - 1);
  }

  moveRoutineDown(index: number) {
    if (index >= this.routines().length - 1) return;
    this.reorderRoutines(index, index + 1);
  }

  setInfoItem(item: Trigger | Action | null) {
    this.selectedInfoItem.set(item);
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

