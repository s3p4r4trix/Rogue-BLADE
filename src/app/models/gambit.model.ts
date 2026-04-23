export type TriggerType = 'trigger';
export type ActionType = 'action';

export interface Trigger {
  type: TriggerType;
  value: string;
  name: string;
  disabled?: boolean;
  requiredSensor?: string;
}

export interface Action {
  type: ActionType;
  value: string;
  name: string;
}

export interface GambitRoutine {
  priority: number;
  trigger: Trigger | null;
  action: Action | null;
}
