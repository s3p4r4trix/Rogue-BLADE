import { Action, GambitRoutine, Trigger } from '../models/gambit.model';
import { Shuriken, AntiGravEngine, EnergyCell, Reactor, Sensor, Blade, FormDesign, HullMaterial, Processor, SemiAI, ShieldGenerator } from '../models/hardware.model';

/** ─── Hardware Inventory Constants ─────────────────────────────────────────────── */

export const HARDWARE_INVENTORY = {
  engines: [
    { id: 'eng-drifter', name: 'Drifter (Basic)', description: 'Salvaged industrial mag-lev.', topSpeed: 230, acceleration: 75, evasionRate: 0.05, energyDrain: 5, stealthValue: 10, weight: 10 } as AntiGravEngine,
    { id: 'eng-hauler', name: 'Hauler (Tank)', description: 'Slow but high weight capacity.', topSpeed: 180, acceleration: 55, evasionRate: 0.0, energyDrain: 8, stealthValue: 0, weight: 25 } as AntiGravEngine,
    { id: 'eng-screamer', name: 'Screamer (Speed)', description: 'High-performance racing engine.', topSpeed: 500, acceleration: 160, evasionRate: 0.15, energyDrain: 15, stealthValue: -20, weight: 8 } as AntiGravEngine,
    { id: 'eng-ghost', name: 'Ghost (Stealth)', description: 'Silenced baffles and low profile.', topSpeed: 320, acceleration: 173, evasionRate: 0.10, energyDrain: 8, stealthValue: 50, weight: 12 } as AntiGravEngine
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
    { id: 'sens-optical', name: 'Optical Sensors', description: 'Short-range camera array.', range: 300, accuracy: 0.7, unlocksTriggerIds: ['ifEnemyInMeleeRange'], weight: 1 } as Sensor,
    { id: 'sens-bio', name: 'Biosensors', description: 'Organic signature tracking.', range: 400, accuracy: 0.85, unlocksTriggerIds: ['ifEnemyIsOrganic'], weight: 2 } as Sensor,
    { id: 'sens-thermal', name: 'Thermal Sensors', description: 'Infrared heat detection.', range: 400, accuracy: 0.9, unlocksTriggerIds: ['ifEnemyInSight'], weight: 2 } as Sensor,
    { id: 'sens-em', name: 'EM-Sensors', description: 'Detects active energy fields.', range: 500, accuracy: 0.9, unlocksTriggerIds: ['ifEnemyIsShielded'], weight: 3 } as Sensor,
    { id: 'sens-radar', name: 'Radar Array', description: 'Long-range monitoring.', range: 800, accuracy: 0.8, unlocksTriggerIds: ['ifEnemyInSight'], weight: 5 } as Sensor,
    { id: 'sens-lidar', name: 'Lidar Array', description: 'Precision optical targeting.', range: 600, accuracy: 0.98, unlocksTriggerIds: ['ifIncomingProjectile'], weight: 4 } as Sensor,
    { id: 'sens-terahertz', name: 'Terahertz Array', description: 'Penetrates physical obstacles.', range: 350, accuracy: 0.9, unlocksTriggerIds: ['ifEnemyBehindCover'], weight: 3 } as Sensor
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

/** ─── Default Shuriken Template ─────────────────────────────────────────────── */

export const DEFAULT_SHURIKEN: Omit<Shuriken, 'id' | 'name'> = {
  engine: HARDWARE_INVENTORY.engines[0],
  energyCell: HARDWARE_INVENTORY.energyCells[0],
  sensor: HARDWARE_INVENTORY.sensors[0],
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
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (error) { }
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
    'sens-optical', 'sens-bio', 'sens-thermal', 'sens-em', 'sens-radar', 'sens-lidar', 'sens-terahertz',
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
  if (saved) {
    try { return JSON.parse(saved); } catch (error) { }
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
