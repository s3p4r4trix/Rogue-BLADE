import { Injectable, signal, computed } from '@angular/core';
import { Action, GambitRoutine, Trigger } from '../models/gambit.model';

@Injectable({
  providedIn: 'root'
})
export class WorkshopService {
  // Available Inventory
  readonly availableTriggers = signal<Trigger[]>([
    { type: 'trigger', value: 'Feind in 5m Radius', name: '[+] Feind in 5m Radius' },
    { type: 'trigger', value: 'Gegner hat Schild', name: '[+] Gegner hat Schild' },
    { type: 'trigger', value: 'Eigene HP < 20%', name: '[+] Eigene HP < 20%' },
    { type: 'trigger', value: 'Feind hinter Deckung', name: '[!] Feind hinter Deckung', disabled: true, requiredSensor: 'Terahertz-Sensor' }
  ]);

  readonly availableActions = signal<Action[]>([
    { type: 'action', value: 'Kinetischer Ramm-Angriff', name: '[>] Kinetischer Ramm-Angriff' },
    { type: 'action', value: 'Ziel markieren (Debuff)', name: '[>] Ziel markieren (Debuff)' },
    { type: 'action', value: 'Schutzformation (Parieren)', name: '[>] Schutzformation (Parieren)' }
  ]);

  // Current Routines (3 Slots)
  readonly routines = signal<GambitRoutine[]>([
    { priority: 1, trigger: null, action: null },
    { priority: 2, trigger: null, action: null },
    { priority: 3, trigger: null, action: null }
  ]);

  // Fallback Action
  readonly fallbackAction = signal<string>('Kreise um Charakter');

  // System Logs
  readonly systemLogs = signal<string[]>(['> System bereit.', '> Warte auf Input...']);

  constructor() { }

  log(message: string, isError: boolean = false) {
    const cssClass = isError ? 'text-red-500' : 'text-green-500';
    this.systemLogs.update(logs => [...logs, `<span class="${cssClass}">> ${message}</span>`]);
  }

  setTrigger(priority: number, trigger: Trigger) {
    this.routines.update(routines => {
      const updated = [...routines];
      const index = updated.findIndex(r => r.priority === priority);
      if (index !== -1) {
        updated[index] = { ...updated[index], trigger };
      }
      return updated;
    });
    this.log(`Setze TRIGGER: [${trigger.value}]`);
  }

  setAction(priority: number, action: Action) {
    this.routines.update(routines => {
      const updated = [...routines];
      const index = updated.findIndex(r => r.priority === priority);
      if (index !== -1) {
        updated[index] = { ...updated[index], action };
      }
      return updated;
    });
    this.log(`Setze ACTION: [${action.value}]`);
  }

  clearSlot(priority: number) {
    this.routines.update(routines => {
      const updated = [...routines];
      const index = updated.findIndex(r => r.priority === priority);
      if (index !== -1) {
        updated[index] = { ...updated[index], trigger: null, action: null };
      }
      return updated;
    });
    this.log('Slot zurückgesetzt.');
  }

  compileCode() {
    this.log('==============================');
    this.log('Starte Kompilierung...');

    let routinesFound = 0;
    let hasError = false;

    for (const routine of this.routines()) {
      if (routine.trigger && routine.action) {
        routinesFound++;
        this.log(`Routine Prio ${routine.priority}: WENN [${routine.trigger.value}] DANN [${routine.action.value}] - OK`);
      } else if (routine.trigger || routine.action) {
        this.log(`FEHLER in Prio ${routine.priority}: Routine unvollständig!`, true);
        hasError = true;
      }
    }

    if (!hasError) {
      if (routinesFound > 0) {
        setTimeout(() => {
          this.log(`Upload von ${routinesFound} Routinen an Shuriken #01 erfolgreich.`);
          this.log('Shuriken ist einsatzbereit.');
        }, 800);
      } else {
        this.log('FEHLER: Keine gültigen Routinen gefunden.', true);
      }
    }
  }
}
