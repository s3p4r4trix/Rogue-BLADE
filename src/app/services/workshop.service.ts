import { Injectable, signal, computed } from '@angular/core';
import { Action, GambitRoutine, Trigger } from '../models/gambit.model';

/**
 * The WorkshopService acts as the central state manager for the Workshop Phase.
 * It uses Angular Signals to provide reactive, synchronous state updates to the UI.
 * This service holds the inventory of available parts, the current state of the player's
 * configured routines, and the logic to compile those routines.
 */
@Injectable({
  providedIn: 'root'
})
export class WorkshopService {
  /**
   * List of available Triggers (IF conditions) the player can drag into the slots.
   * Includes disabled items to hint at progression (e.g., needing a specific sensor).
   */
  readonly availableTriggers = signal<Trigger[]>([
    { type: 'trigger', value: 'Enemy within 5m radius', name: '[+] Enemy within 5m radius' },
    { type: 'trigger', value: 'Enemy has shield', name: '[+] Enemy has shield' },
    { type: 'trigger', value: 'Self HP < 20%', name: '[+] Self HP < 20%' },
    { type: 'trigger', value: 'Enemy behind cover', name: '[!] Enemy behind cover', disabled: true, requiredSensor: 'Terahertz Sensor' }
  ]);

  /**
   * List of available Actions (THEN results) the player can assign to triggers.
   */
  readonly availableActions = signal<Action[]>([
    { type: 'action', value: 'Kinetic Ram Attack', name: '[>] Kinetic Ram Attack' },
    { type: 'action', value: 'Mark Target (Debuff)', name: '[>] Mark Target (Debuff)' },
    { type: 'action', value: 'Defensive Formation (Parry)', name: '[>] Defensive Formation (Parry)' }
  ]);

  /**
   * The active Gambit routines for the currently selected Shuriken.
   * Represented as a list of 3 priority slots. The lower the index, the higher the priority in combat.
   */
  readonly routines = signal<GambitRoutine[]>([
    { priority: 1, trigger: null, action: null },
    { priority: 2, trigger: null, action: null },
    { priority: 3, trigger: null, action: null }
  ]);

  /**
   * The default action executed by the auto-battler if none of the priority triggers match.
   */
  readonly fallbackAction = signal<string>('Circle around character');

  /**
   * A reactive list of string-based log entries mimicking a cyberpunk terminal console.
   */
  readonly systemLogs = signal<string[]>(['> System ready.', '> Waiting for input...']);

  constructor() { }

  /**
   * Appends a new message to the system console log.
   * @param message The text to display.
   * @param isError If true, the text renders in red. Otherwise, green.
   */
  log(message: string, isError: boolean = false) {
    const cssClass = isError ? 'text-red-500' : 'text-green-500';
    this.systemLogs.update(logs => [...logs, `<span class="${cssClass}">> ${message}</span>`]);
  }

  /**
   * Assigns a dragged Trigger to a specific priority slot.
   * @param priority The slot priority number (1, 2, or 3).
   * @param trigger The Trigger object dropped into the slot.
   */
  setTrigger(priority: number, trigger: Trigger) {
    this.routines.update(routines => {
      const updated = [...routines];
      const index = updated.findIndex(r => r.priority === priority);
      if (index !== -1) {
        updated[index] = { ...updated[index], trigger };
      }
      return updated;
    });
    this.log(`Set TRIGGER: [${trigger.value}]`);
  }

  /**
   * Assigns a dragged Action to a specific priority slot.
   * @param priority The slot priority number (1, 2, or 3).
   * @param action The Action object dropped into the slot.
   */
  setAction(priority: number, action: Action) {
    this.routines.update(routines => {
      const updated = [...routines];
      const index = updated.findIndex(r => r.priority === priority);
      if (index !== -1) {
        updated[index] = { ...updated[index], action };
      }
      return updated;
    });
    this.log(`Set ACTION: [${action.value}]`);
  }

  /**
   * Clears both the Trigger and Action from a specific priority slot.
   */
  clearSlot(priority: number) {
    this.routines.update(routines => {
      const updated = [...routines];
      const index = updated.findIndex(r => r.priority === priority);
      if (index !== -1) {
        updated[index] = { ...updated[index], trigger: null, action: null };
      }
      return updated;
    });
    this.log('Slot reset.');
  }

  /**
   * Validates the currently equipped routines.
   * Ensures that no slot is partially filled (e.g., has an IF but no THEN).
   * Outputs the compilation status to the terminal logs.
   */
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
          this.log(`Upload of ${routinesFound} routines to Shuriken #01 successful.`);
          this.log('Shuriken is ready for deployment.');
        }, 800);
      } else {
        this.log('ERROR: No valid routines found.', true);
      }
    }
  }
}
