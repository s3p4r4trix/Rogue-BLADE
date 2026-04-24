export type TriggerType = 'trigger';
export type ActionType = 'action';

/**
 * Represents an IF condition in the Gambit programming system.
 * The Shuriken evaluates this condition during combat.
 */
export interface Trigger {
  id: string; // Unique identifier for mapping (e.g. 'trig-enemy-5m')
  type: TriggerType;
  value: string;
  name: string;
  description?: string;
  lore?: string;
  disabled?: boolean;
  requiredSensor?: string;
}

/**
 * Represents a THEN action in the Gambit programming system.
 * This is executed if the corresponding Trigger condition is met.
 */
export interface Action {
  id: string; // Unique identifier for mapping (e.g. 'act-kinetic-ram')
  type: ActionType;
  value: string;
  name: string;
  description?: string;
  lore?: string;
  baseLatency?: number; // Spool-up time in ms
}

/**
 * A Routine is a combination of an IF condition (Trigger) and a THEN action (Action).
 * They are assigned to specific priority slots. Lower index = higher priority.
 */
export interface GambitRoutine {
  priority: number;
  trigger: Trigger | null;
  action: Action | null;
}
