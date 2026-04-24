import { Injectable, signal, computed, effect } from '@angular/core';
import { Action, GambitRoutine, Trigger } from '../models/gambit.model';
import { Shuriken } from '../models/hardware.model';
import { moveItemInArray } from '@angular/cdk/drag-drop';

const MOCK_SHURIKENS: Shuriken[] = [
  {
    id: 'shuriken-01',
    name: 'Shuriken #01 (Plasteel)',
    engine: null, hull: null, energyCell: null, sensor: null, blade: null, formDesign: null,
    processor: { id: 'b1', name: 'Basic AI', description: '', routineCapacity: 2, iffAccuracy: 90, reactionBonus: 0, isAI: true }
  },
  {
    id: 'shuriken-02',
    name: 'Shuriken #02 (Durasteel)',
    engine: null, hull: null, energyCell: null, sensor: null, blade: null, formDesign: null,
    processor: { id: 'b2', name: 'Advanced AI', description: '', routineCapacity: 4, iffAccuracy: 95, reactionBonus: 10, isAI: true }
  }
];

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
    { type: 'action', value: 'Kinetic Ram Attack', name: '[>] Kinetic Ram Attack' },
    { type: 'action', value: 'Mark Target (Debuff)', name: '[>] Mark Target (Debuff)' },
    { type: 'action', value: 'Defensive Formation (Parry)', name: '[>] Defensive Formation (Parry)' }
  ]);

  readonly availableShurikens = signal<Shuriken[]>(MOCK_SHURIKENS);
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
      localStorage.setItem('rogueBlade_routinesMap', JSON.stringify(this.routinesMap()));
      localStorage.setItem('rogueBlade_activeShuriken', this.activeShurikenId());
    });
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

