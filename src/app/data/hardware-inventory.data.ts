import { Action, GambitRoutine, Trigger } from '../models/gambit-model';
import { Shuriken, AntiGravEngine, EnergyCell, Reactor, Sensor, Blade, FormDesign, HullMaterial, Processor, SemiAI, ShieldGenerator } from '../models/hardware-model';

/** ─── Hardware Inventory Constants ─────────────────────────────────────────────── */

export const HARDWARE_INVENTORY = {
  engines: [
    { id: 'eng-drifter', name: 'Drifter (Basic)', description: 'Salvaged industrial mag-lev.', topSpeed: 230, acceleration: 230, evasionRate: 0.05, energyDrain: 5, stealthValue: 10, weight: 10 } as AntiGravEngine,
    { id: 'eng-hauler', name: 'Hauler (Tank)', description: 'Slow but high weight capacity.', topSpeed: 180, acceleration: 130, evasionRate: 0.0, energyDrain: 8, stealthValue: 0, weight: 25 } as AntiGravEngine,
    { id: 'eng-screamer', name: 'Screamer (Speed)', description: 'High-performance racing engine.', topSpeed: 500, acceleration: 750, evasionRate: 0.15, energyDrain: 15, stealthValue: -20, weight: 8 } as AntiGravEngine,
    { id: 'eng-ghost', name: 'Ghost (Stealth)', description: 'Silenced baffles and low profile.', topSpeed: 320, acceleration: 185, evasionRate: 0.10, energyDrain: 8, stealthValue: 50, weight: 12 } as AntiGravEngine
  ],
  energyCells: [
    { id: 'cell-scrap', name: 'Scrap Dynamo', description: 'Recovered from a junked hover-car.', maxEnergy: 100, maxOutput: 10, weight: 15 } as EnergyCell,
    { id: 'cell-voltiac', name: 'Voltiac Cell', description: 'Standard corporate power supply.', maxEnergy: 300, maxOutput: 30, weight: 10 } as EnergyCell
  ],
  reactors: [
    { id: 'react-atomic', name: 'Atomic Reactor', description: 'Basic nuclear fission reactor.', energyRegen: 2, weight: 5 } as Reactor,
    { id: 'react-fusion', name: 'Fusion Reactor', description: 'High-yield fusion reactor.', energyRegen: 5, weight: 8 } as Reactor,
    { id: 'react-antimatter', name: 'Antimatter Reactor', description: 'High-yield antimatter reactor.', energyRegen: 12, weight: 15 } as Reactor
  ],
  sensors: [
    { id: 'sens-proximity', name: 'Proximity Array', description: 'Basic short-range proximity sensors.', range: 300, accuracy: 0.9, unlocksTriggerIds: [], weight: 1 } as Sensor,
    { id: 'sens-em', name: 'EM Scanner', description: 'Detects active energy fields and charge signatures.', range: 450, accuracy: 0.85, unlocksTriggerIds: ['trig_enemy_shielded', 'trig_enemy_charging'], weight: 2 } as Sensor,
    { id: 'sens-thermal', name: 'Thermal/Lidar Matrix', description: 'Advanced infrared and light-based tracking.', range: 500, accuracy: 0.95, unlocksTriggerIds: ['trig_incoming_fire', 'trig_enemy_vulnerable'], weight: 3 } as Sensor,
    { id: 'sens-terahertz', name: 'Terahertz Array', description: 'Penetrates physical obstacles and reveals weaknesses.', range: 350, accuracy: 0.9, unlocksTriggerIds: ['trig_flank_exposed'], weight: 4 } as Sensor,
    { id: 'sens-radar', name: 'Radar Array', description: 'Long-range tactical monitoring.', range: 800, accuracy: 0.8, unlocksTriggerIds: ['trig_ally_critical'], weight: 5 } as Sensor
  ],
  blades: [
    { id: 'blade-edge', name: 'Sharpened Edge', description: 'Simple metal rim.', damageType: 'SLASHING', baseDamage: 20, critChance: 0.05, critMultiplier: 1.5, energyDrain: 0, unlocksActionIds: ['actionStandardStrike'], weight: 5 } as Blade,
    { id: 'blade-hammer', name: 'Hammer Profile', description: 'Heavy, blunt momentum edge.', damageType: 'KINETIC', baseDamage: 40, critChance: 0.02, critMultiplier: 2.0, energyDrain: 0, unlocksActionIds: ['actionKineticRam'], weight: 15 } as Blade,
    { id: 'blade-vibro', name: 'Vibro-Blade', description: 'High-frequency oscillation.', damageType: 'SLASHING', baseDamage: 50, critChance: 0.12, critMultiplier: 1.5, energyDrain: 5, unlocksActionIds: ['actionStandardStrike'], weight: 8 } as Blade,
    { id: 'blade-energy', name: 'Energy Blade', description: 'Superheated plasma field.', damageType: 'ENERGY', baseDamage: 100, critChance: 0.15, critMultiplier: 1.5, energyDrain: 25, unlocksActionIds: ['actionStandardStrike'], weight: 12 } as Blade
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
    { id: 'semi-feral', name: 'Scrap-Code "Feral"', description: 'Aggressive instinct paths. Optimizes strike reaction.', iffAccuracy: 70, behaviorBuff: 'aggressive', reactionTimeMult: 0.85, weight: 1 } as SemiAI,
    { id: 'semi-guardian', name: 'Aegis "Guardian"', description: 'Protective sub-routines. Enhanced threat assessment.', iffAccuracy: 95, behaviorBuff: 'defensive', reactionTimeMult: 0.90, weight: 1 } as SemiAI
  ],
  shields: [
    { id: 'shield-basic', name: 'Scrap-Capacitor', description: 'Crude static field generator.', shieldCapacity: 50, regenRate: 2, energyCostPerRegen: 5, weight: 10 } as ShieldGenerator
  ]
};

export const AVAILABLE_TRIGGERS: Trigger[] = [
  { id: 'trig_target_acquired', type: 'trigger', value: 'Target acquired', name: 'Target: Acquired', description: 'Enemy detected within sensor lock range.' },
  { id: 'trig_self_hull_critical', type: 'trigger', value: 'Hull < 20%', name: 'Self: Hull Critical', description: 'Structural integrity at critical levels.' },
  { id: 'trig_incoming_fire', type: 'trigger', value: 'Incoming fire', name: 'Self: Incoming Fire', description: 'Hostile projectiles detected on intercept course.', requiredSensor: 'Thermal/Lidar Matrix' },
  { id: 'trig_enemy_vulnerable', type: 'trigger', value: 'Enemy vulnerable', name: 'Enemy: Vulnerable', description: 'Target is stunned or shields are down.', requiredSensor: 'Thermal/Lidar Matrix' },
  { id: 'trig_enemy_charging', type: 'trigger', value: 'Enemy charging', name: 'Enemy: Charging', description: 'Target is spooling a high-energy attack.', requiredSensor: 'EM Scanner' },
  { id: 'trig_enemy_shielded', type: 'trigger', value: 'Enemy shielded', name: 'Enemy: Shield Active', description: 'Target has active energy shielding.', requiredSensor: 'EM Scanner' },
  { id: 'trig_ally_critical', type: 'trigger', value: 'Ally critical', name: 'Ally: Critical', description: 'Nearby allied drone is in critical condition.', requiredSensor: 'Radar Array' },
  { id: 'trig_flank_exposed', type: 'trigger', value: 'Flank exposed', name: 'Tactical: Flank Exposed', description: 'Target flank or rear is vulnerable to strike.', requiredSensor: 'Terahertz Array' }
];

export const AVAILABLE_ACTIONS: Action[] = [
  { id: 'act_hit_and_run', type: 'action', value: 'Hit and run', name: 'Execute: Hit & Run', description: 'Strike the target and immediately retreat to safe distance.' },
  { id: 'act_kinetic_ram', type: 'action', value: 'Kinetic ram', name: 'Execute: Kinetic Ram', energyCost: 30, description: 'Maximize acceleration for a high-momentum collision.' },
  { id: 'act_flank_maneuver', type: 'action', value: 'Flank maneuver', name: 'Execute: Flank Maneuver', energyCost: 15, description: 'Reposition to the target\'s vulnerable flank.' },
  { id: 'act_take_cover', type: 'action', value: 'Take cover', name: 'Execute: Take Cover', energyCost: 10, description: 'Navigate to the nearest obstacle to break LOS.' },
  { id: 'act_evasive_orbit', type: 'action', value: 'Evasive orbit', name: 'Execute: Evasive Orbit', description: 'Circle the target with unpredictable movement patterns.' },
  { id: 'act_intercept_target', type: 'action', value: 'Intercept target', name: 'Execute: Intercept', description: 'Calculate and move to the target\'s projected path.' },
  { id: 'act_shield_flare', type: 'action', value: 'Shield flare', name: 'Execute: Shield Flare', energyCost: 40, description: 'Overload shields to provide brief damage immunity.' },
  { id: 'act_focus_master_target', type: 'action', value: 'Focus master target', name: 'Execute: Focus Fire', description: 'Coordinate with Swarm Master to focus on a single target.' }
];

/** ─── Default Shuriken Template ─────────────────────────────────────────────── */

export const DEFAULT_SHURIKEN: Omit<Shuriken, 'id' | 'name'> = {
  engine: HARDWARE_INVENTORY.engines[0],
  energyCell: HARDWARE_INVENTORY.energyCells[0],
  sensor: HARDWARE_INVENTORY.sensors[0], // sens-proximity
  blade: HARDWARE_INVENTORY.blades[0],
  formDesign: HARDWARE_INVENTORY.formDesigns[0],
  hull: HARDWARE_INVENTORY.hulls[0],
  processor: HARDWARE_INVENTORY.processors[0],
  reactor: HARDWARE_INVENTORY.reactors[0],
  shield: null,
  semiAI: null,
  coordinationMode: 'SOLO',
  stats: { enemiesKilled: 0, timeRepairing: 0, lostHealth: 0, timeOnline: 0 }
};

/** ─── Persistence Loaders ─────────────────────────────────────────────── */

/**
 * Logic: Loads shurikens from local storage or returns defaults.
 * @returns Array of Shurikens.
 */
export function loadShurikens(): Shuriken[] {
  const defaults = [
    { ...DEFAULT_SHURIKEN, id: 'shuriken-01', name: 'Rogue_Unit_01', creationDate: Date.now() }
  ];
  const saved = localStorage.getItem('rogueBlade_shurikens');
  if (saved && saved !== 'undefined' && saved !== 'null') {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (error) {
      console.warn('[HardwareInventory] Failed to parse shurikens from LocalStorage, resetting to defaults.');
    }
  }
  return defaults;
}

/**
 * Logic: Loads unlocked component IDs from local storage.
 * @returns Array of component IDs.
 */
export function loadUnlockedComponents(): string[] {
  const saved = localStorage.getItem('rogueBlade_unlockedComponents');
  if (saved) {
    try { return JSON.parse(saved); } catch (error) { }
  }
  return [
    // Starter Hardware - DELETE THIS LINE LATER AND THE ONE BELOW WHEN NOT IN PROTOTYPE PHASE
    //'eng-drifter', 'cell-scrap', 'react-fusion', 'sens-optical', 'blade-edge', 'form-shuriken', 'hull-scrap', 'proc-abacus', 'sens-terahertz'

    // Engines
    'eng-drifter', 'eng-hauler', 'eng-screamer', 'eng-ghost',
    // Energy Cells
    'cell-scrap', 'cell-voltiac',
    // Reactors
    'react-atomic', 'react-fusion', 'react-antimatter',
    // Sensors
    'sens-proximity', 'sens-em', 'sens-thermal', 'sens-terahertz', 'sens-radar',
    // Blades
    'blade-edge', 'blade-hammer', 'blade-vibro', 'blade-energy',
    // Form Designs
    'form-shuriken', 'form-disc', 'form-dagger', 'form-sphere', 'form-ion',
    // Hulls
    'hull-scrap', 'hull-carbon', 'hull-durasteel', 'hull-neutronium',
    // Processors
    'proc-abacus', 'proc-cortex', 'proc-omni',
    // Semi-AI
    'semi-feral', 'semi-guardian',
    // Shields
    'shield-basic'
  ];
}

/**
 * Logic: Loads saved routines for each shuriken from local storage.
 * @returns Record of shuriken ID to GambitRoutine array.
 */
export function loadSavedRoutinesMap(): Record<string, GambitRoutine[]> {
  const saved = localStorage.getItem('rogueBlade_routinesMap');
  if (saved && saved !== 'undefined' && saved !== 'null') {
    try {
      return JSON.parse(saved);
    } catch (error) {
      console.warn('[HardwareInventory] Failed to parse routinesMap from LocalStorage.');
    }
  }

  // Default routines for new players
  const defaultRoutines: GambitRoutine[] = [
    {
      priority: 1,
      trigger: AVAILABLE_TRIGGERS[0], // trig_target_acquired
      action: AVAILABLE_ACTIONS[0] // act_hit_and_run
    },
    {
      priority: 2,
      trigger: AVAILABLE_TRIGGERS[1], // trig_self_hull_critical
      action: AVAILABLE_ACTIONS[4] // act_evasive_orbit
    }
  ];

  // Logic: Ensure we map the default routines to WHATEVER shurikens are currently loaded.
  const shurikens = loadShurikens();
  const map: Record<string, GambitRoutine[]> = {};
  shurikens.forEach(s => {
    map[s.id] = [...defaultRoutines];
  });

  return map;
}
