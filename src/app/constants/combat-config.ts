/**
 * Global Combat Configuration Constants
 * Central source of truth for AI timings, distances, and physics thresholds.
 */
export const COMBAT_CONFIG = {
  /** Size of the square arena in pixels/units. */
  ARENA_SIZE: 800,

  /** AI State Machine Timings (seconds) */
  AI_TIMINGS: {
    SEARCH_SCAN_TIME: 2,
    SEARCH_TOTAL_TIME: 3,
    RETREAT_DURATION: 1.0,
    STRIKE_COOLDOWN: 1.0,
    RETALIATION_COOLDOWN: 1.5
  },

  /** Distances and Ranges (pixels/units) */
  RANGES: {
    RADAR_RANGE: 400,
    MELEE_RANGE_BASE: 30,
    MELEE_RANGE_BUFFER: 15,
    RETREAT_DISTANCE: 150,
    STRIKE_HIT_THRESHOLD: 10
  },

  /** Physics and Navigation Thresholds */
  PHYSICS: {
    MIN_STRIKE_SPEED_RATIO: 0.4,
    BASE_FEELER_LENGTH: 40,
    SPEED_LOOKAHEAD_FACTOR: 0.5,
    MAX_AVOIDANCE_FORCE: 250,
    POST_STRIKE_VELOCITY_MULT: -0.5,
    BOUNCE_VELOCITY_MULT: -0.2
  },

  /** Damage Effectiveness Matrix against Armor Types */
  EFFECTIVENESS_MATRIX: {
    'SLASHING': { 'UNARMORED': 1.5, 'HEAVY_ARMOR': 0.4, 'ENERGY_SHIELD': 0.8 },
    'KINETIC': { 'UNARMORED': 1.0, 'HEAVY_ARMOR': 1.5, 'ENERGY_SHIELD': 0.5 },
    'ENERGY': { 'UNARMORED': 1.0, 'HEAVY_ARMOR': 1.0, 'ENERGY_SHIELD': 2.0 },
    'EMP': { 'UNARMORED': 0.0, 'HEAVY_ARMOR': 0.0, 'ENERGY_SHIELD': 1.0 }
  } as Record<string, Record<string, number>>
} as const;
