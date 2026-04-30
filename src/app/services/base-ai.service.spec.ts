import { TestBed } from '@angular/core/testing';
import { BaseAIService } from './base-ai.service';
import { SensorService } from './sensor.service';
import { CombatStore } from './combat-store';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CombatEntity, BehaviorContext, Vector2D } from '../models/combat-model';

describe('BaseAIService', () => {
  let service: BaseAIService;
  let sensorServiceMock: any;
  let combatStoreMock: any;

  /**
   * Helper to create a basic mock entity with default stats.
   * WHY: Centralized factory ensures tests remain robust against CombatEntity interface changes.
   */
  const createMockEntity = (overrides: Partial<CombatEntity> = {}): CombatEntity => ({
    id: 'test-id',
    name: 'Test Unit',
    type: 'PLAYER',
    position: { x: 100, y: 100 },
    z: 0,
    velocity: { x: 0, y: 0 },
    rotation: 0,
    stats: {
      hp: 100,
      maxHp: 100,
      shields: 0,
      maxShields: 0,
      armorValue: 0,
      armorType: 'UNARMORED',
      evasionRate: 0,
      energy: 100,
      maxEnergy: 100,
      energyRegen: 0,
      energyDrain: 0,
      speed: 0,
      maxSpeed: 200,
      acceleration: 100,
      weight: 100,
      baseDamage: 10,
      damageType: 'KINETIC',
      critChance: 0,
      critMultiplier: 1.5
    },
    state: 'PATROLLING',
    stateTimer: 0,
    retaliationTimer: 0,
    radius: 15,
    color: 'blue',
    hitFlash: 0,
    gambits: [],
    ...overrides
  });

  beforeEach(() => {
    sensorServiceMock = {
      checkLineOfSight: vi.fn(),
      getBlockingObstacle: vi.fn(),
      getEnemiesInRadar: vi.fn(),
      isInMeleeRange: vi.fn(),
    };

    combatStoreMock = {
      projectiles: vi.fn(() => []),
      setProjectiles: vi.fn(),
      addLog: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        BaseAIService,
        { provide: SensorService, useValue: sensorServiceMock },
        { provide: CombatStore, useValue: combatStoreMock },
      ],
    });

    service = TestBed.inject(BaseAIService);
  });

  /**
   * WHY: Standard sanity check to ensure the Angular DI container correctly resolved the service and its mocked dependencies.
   */
  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('State Transitions & Default Behaviors', () => {
    /**
     * WHY: The transition from PATROLLING to PURSUING is the core "engagement" trigger for player-controlled drones.
     * Failure here would result in drones ignoring targets even when they are visible.
     */
    it('should transition from PATROLLING to PURSUING when a target is acquired (PLAYER)', () => {
      const entity = createMockEntity({ state: 'PATROLLING' });
      const target = createMockEntity({ id: 'target-id', type: 'ENEMY' });
      const context: BehaviorContext = { currentTarget: target, deltaTime: 0.016 } as BehaviorContext;

      service.calculateDefaultBehavior(entity, context);

      expect(entity.state).toBe('PURSUING');
    });

    /**
     * WHY: Hostile units (ENEMY type) use a different initial combat state (SHOOTING) to facilitate ranged engagement
     * instead of immediate physical pursuit. This ensures varied tactical behavior between factions.
     */
    it('should transition from PATROLLING to SHOOTING when a target is acquired (ENEMY)', () => {
      const entity = createMockEntity({ state: 'PATROLLING', type: 'ENEMY' });
      const target = createMockEntity({ id: 'target-id', type: 'PLAYER' });
      const context: BehaviorContext = { currentTarget: target, deltaTime: 0.016 } as BehaviorContext;

      service.calculateDefaultBehavior(entity, context);

      expect(entity.state).toBe('SHOOTING');
      expect(entity.stateTimer).toBe(0);
    });

    /**
     * WHY: If a drone loses its target while in a high-intensity combat state (STRIKING), it must not freeze.
     * It should transition to SEARCHING to attempt to re-acquire the target at its last known position.
     */
    it('should transition to SEARCHING if target is lost during STRIKING', () => {
      const entity = createMockEntity({ state: 'STRIKING' });
      const context: BehaviorContext = { currentTarget: null, deltaTime: 0.016 } as BehaviorContext;

      service.calculateDefaultBehavior(entity, context);

      expect(entity.state).toBe('SEARCHING');
      expect(entity.stateTimer).toBe(0);
    });

    /**
     * WHY: The SEARCHING state has a hard timeout to prevent drones from infinitely loitering in empty space.
     * After 3 seconds (as defined in COMBAT_CONFIG), the drone must return to its standard patrol route.
     */
    it('should transition from SEARCHING to PATROLLING after timeout', () => {
      const entity = createMockEntity({ 
        state: 'SEARCHING', 
        stateTimer: 3.1, // Exceeds default SEARCH_TOTAL_TIME (3.0s)
        lastSeenPos: { x: 50, y: 50 }
      });
      const context: BehaviorContext = { currentTarget: null, deltaTime: 0.016 } as BehaviorContext;

      const velocity = service.calculateDefaultBehavior(entity, context);

      expect(entity.state).toBe('PATROLLING');
      expect(velocity).toEqual({ x: 0, y: 0 });
    });
  });

  describe('Stun & Recovery Mechanics (Outlier Testing)', () => {
    /**
     * WHY: EMP pulses must completely disable the AI's "will to move". If a stunned entity still generates
     * velocity, it breaks the tactical utility of stun weapons and allows units to "slide" out of danger while rebooting.
     */
    it('should strictly return a zero vector while STUNNED, regardless of target presence', () => {
      const entity = createMockEntity({ state: 'STUNNED', stateTimer: 0.5 });
      const target = createMockEntity({ id: 'target' });
      const context: BehaviorContext = { currentTarget: target, deltaTime: 0.1 } as BehaviorContext;

      const velocity = service.calculateDefaultBehavior(entity, context);

      expect(velocity).toEqual({ x: 0, y: 0 });
      expect(entity.state).toBe('STUNNED');
      expect(entity.stateTimer).toBe(0.6);
    });

    /**
     * WHY: After the 1.5s stun duration, the AI must reset to a clean state (PATROLLING) and activate its
     * grounding immunity. This test verifies the precise timing of the reboot sequence.
     */
    it('should recover to PATROLLING exactly when stun duration (1.5s) is reached', () => {
      const entity = createMockEntity({ state: 'STUNNED', stateTimer: 1.45 });
      const context: BehaviorContext = { currentTarget: null, deltaTime: 0.05 } as BehaviorContext;

      service.calculateDefaultBehavior(entity, context);

      expect(entity.state).toBe('PATROLLING');
      expect(entity.stateTimer).toBe(0);
      expect(entity.empGroundingTimer).toBeGreaterThan(0);
    });

    /**
     * WHY: Negative deltaTimes or extreme outliers (e.g., zero) should not cause the state machine to hang or crash.
     * This ensures physics stability during edge-case frame skips.
     */
    it('should handle zero deltaTime without state progression', () => {
      const entity = createMockEntity({ state: 'STUNNED', stateTimer: 0.5 });
      const context: BehaviorContext = { currentTarget: null, deltaTime: 0 } as BehaviorContext;

      service.calculateDefaultBehavior(entity, context);

      expect(entity.stateTimer).toBe(0.5);
    });
  });

  describe('Kinematic Outliers', () => {
    /**
     * WHY: If maxSpeed is 0 (e.g., due to a debuff or broken data), the desired velocity should be zero
     * to avoid NaN or Infinity propagation in the steering engine.
     */
    it('should return zero velocity if entity maxSpeed is zero', () => {
      const entity = createMockEntity({ 
        state: 'PATROLLING', 
        stats: { ...createMockEntity().stats, maxSpeed: 0 },
        waypoint: { x: 500, y: 500 }
      });
      const context: BehaviorContext = { currentTarget: null, deltaTime: 0.016 } as BehaviorContext;

      const velocity = service.calculateDefaultBehavior(entity, context);

      expect(velocity.x).toBe(0);
      expect(velocity.y).toBe(0);
    });

    /**
     * WHY: If an entity is precisely at its waypoint (dist = 0), normalize() would return NaN.
     * This test ensures the steering logic handles perfect overlap with the waypoint gracefully.
     */
    it('should handle perfect overlap with waypoint during PATROLLING', () => {
      const pos = { x: 100, y: 100 };
      const entity = createMockEntity({ state: 'PATROLLING', position: pos, waypoint: pos });
      const context: BehaviorContext = { currentTarget: null, deltaTime: 0.016 } as BehaviorContext;

      // The service should pick a new waypoint and not crash
      const velocity = service.calculateDefaultBehavior(entity, context);

      expect(velocity).not.toEqual({ x: NaN, y: NaN });
      expect(entity.waypoint).not.toEqual(pos);
    });
  });
});
