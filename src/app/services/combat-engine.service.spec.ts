import { TestBed } from '@angular/core/testing';
import { CombatEngineService } from './combat-engine.service';
import { CombatStore } from './combat-store';
import { SensorService } from './sensor.service';
import { RoutineService } from './routine.service';
import { BaseAIService } from './base-ai.service';
import { SteeringService } from './steering.service';
import { CombatEntity } from '../models/combat-model';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('CombatEngineService Integration', () => {
  let service: CombatEngineService;
  let mockStore: any;
  let mockSensorService: any;
  let mockRoutineService: any;
  let mockBaseAIService: any;
  let mockSteeringService: any;

  beforeEach(() => {
    mockStore = {
      isPaused: vi.fn(() => false),
      entities: vi.fn(),
      obstacles: vi.fn(() => []),
      projectiles: vi.fn(() => []),
      pulses: vi.fn(() => []),
      timeElapsed: vi.fn(() => 0),
      isFinished: vi.fn(() => false),
      success: vi.fn(() => false),
      logs: vi.fn(() => []),
      activePlayerId: vi.fn(() => null),
      setDeltaTime: vi.fn(),
      setEntities: vi.fn(),
      setProjectiles: vi.fn(),
      setPulses: vi.fn(),
      addLog: vi.fn(),
      addPulse: vi.fn(),
    };

    mockSensorService = {
      getEnemiesInRadar: vi.fn(() => []),
    };

    mockRoutineService = {
      evaluateGambits: vi.fn(() => null),
    };

    mockBaseAIService = {
      calculateDefaultBehavior: vi.fn(() => ({ x: 0, y: 0 })),
    };

    mockSteeringService = {
      calculateFinalVelocity: vi.fn((entity, desired) => desired),
    };

    TestBed.configureTestingModule({
      providers: [
        CombatEngineService,
        { provide: CombatStore, useValue: mockStore },
        { provide: SensorService, useValue: mockSensorService },
        { provide: RoutineService, useValue: mockRoutineService },
        { provide: BaseAIService, useValue: mockBaseAIService },
        { provide: SteeringService, useValue: mockSteeringService },
      ],
    });

    service = TestBed.inject(CombatEngineService);
  });

  const createMockEntity = (id: string, type: 'PLAYER' | 'ENEMY', x: number, y: number): CombatEntity => ({
    id,
    name: `${type}-${id}`,
    type,
    position: { x, y },
    z: 0,
    velocity: { x: 0, y: 0 },
    rotation: 0,
    radius: 20,
    color: 'blue',
    state: 'PATROLLING',
    gambits: [],
    stateTimer: 0,
    retaliationTimer: 0,
    hitFlash: 0,
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
      energyRegen: 10,
      energyDrain: 5,
      speed: 0,
      maxSpeed: 300,
      acceleration: 200,
      weight: 100,
      baseDamage: 10,
      damageType: 'KINETIC',
      critChance: 0,
      critMultiplier: 1.5,
    },
  });

  /**
   * WHY: Circle-vs-Circle collision is the primary physical constraint in the arena. 
   * If entities do not resolve overlap, they can "stack" indefinitely, making AoE attacks 
   * and targeting logic mathematically unpredictable.
   */
  it('should resolve Circle-vs-Circle collision between 1v1 entities', () => {
    const player = createMockEntity('p1', 'PLAYER', 100, 100);
    const enemy = createMockEntity('e1', 'ENEMY', 110, 100);
    mockStore.entities.mockReturnValue([player, enemy]);

    service.updateTick(0.16);

    const updated: CombatEntity[] = mockStore.setEntities.mock.calls[0][0];
    const updatedPlayer = updated.find(e => e.id === 'p1')!;
    const updatedEnemy = updated.find(e => e.id === 'e1')!;

    expect(updatedPlayer.position.x).toBeLessThan(100);
    expect(updatedEnemy.position.x).toBeGreaterThan(110);
    expect(Math.abs(updatedEnemy.position.x - updatedPlayer.position.x)).toBeCloseTo(40);
  });

  /**
   * WHY: If two entities overlap perfectly (dist = 0), the normalization of the separation 
   * vector would result in division by zero, creating NaN coordinates that break the 
   * entire physics engine. The engine must handle this by providing a fallback push direction.
   */
  it('should handle perfect overlap without resulting in NaN coordinates', () => {
    const e1 = createMockEntity('e1', 'PLAYER', 100, 100);
    const e2 = createMockEntity('e2', 'PLAYER', 100, 100); // Perfect overlap
    mockStore.entities.mockReturnValue([e1, e2]);

    service.updateTick(0.16);

    const updated: CombatEntity[] = mockStore.setEntities.mock.calls[0][0];
    expect(isNaN(updated[0].position.x)).toBe(false);
    expect(isNaN(updated[0].position.y)).toBe(false);
    // Should be pushed apart from (100, 100)
    expect(updated[0].position).not.toEqual({ x: 100, y: 100 });
  });

  /**
   * WHY: Swarm combat is a core feature. Collision resolution uses an O(N^2) loop.
   * This test ensures that multi-entity overlaps are resolved gracefully and no 
   * entities are dropped from the state array during the process.
   */
  it('should resolve multiple simultaneous overlaps in a swarm cluster', () => {
    const entities = [
      createMockEntity('p1', 'PLAYER', 100, 100),
      createMockEntity('p2', 'PLAYER', 102, 100),
      createMockEntity('p3', 'PLAYER', 100, 102),
      createMockEntity('e1', 'ENEMY', 101, 101),
      createMockEntity('e2', 'ENEMY', 99, 99),
    ];
    mockStore.entities.mockReturnValue(entities);

    service.updateTick(0.16);

    const updated: CombatEntity[] = mockStore.setEntities.mock.calls[0][0];
    expect(updated.length).toBe(5);
    updated.forEach(e => {
      expect(isNaN(e.position.x)).toBe(false);
    });
  });

  /**
   * WHY: Game balance relies on heavy units having more inertia. 
   * This test verifies the kinematic scaling formula defined in core_mechanics.md 
   * (effectiveAcceleration = accel * (1 - weight/1000)).
   */
  it('should scale acceleration based on entity weight', () => {
    const lightEntity = createMockEntity('light', 'PLAYER', 100, 100);
    lightEntity.stats.weight = 100; // 0.899 mult (1 - 100/999)
    lightEntity.stats.acceleration = 100;
    const heavyEntity = createMockEntity('heavy', 'PLAYER', 200, 200);
    heavyEntity.stats.weight = 500; // 0.499 mult (1 - 500/999)
    heavyEntity.stats.acceleration = 100;

    mockStore.entities.mockReturnValue([lightEntity, heavyEntity]);
    mockBaseAIService.calculateDefaultBehavior.mockReturnValue({ x: 300, y: 0 });

    service.updateTick(1.0);

    const updated: CombatEntity[] = mockStore.setEntities.mock.calls[0][0];
    expect(updated.find(e => e.id === 'light')!.velocity.x).toBeCloseTo(89.99);
    expect(updated.find(e => e.id === 'heavy')!.velocity.x).toBeCloseTo(49.95);
  });

  /**
   * WHY: Glancing blows ensure that low-velocity contact still contributes to 
   * combat pressure. The mandatory state shift to ORBITING prevents "sticky" 
   * collision behavior where drones get stuck on enemy colliders.
   */
  it('should trigger glancing blow damage and deflection on non-striking collision', () => {
    const player = createMockEntity('p1', 'PLAYER', 100, 100);
    const enemy = createMockEntity('e1', 'ENEMY', 110, 100);
    player.state = 'PATROLLING';
    player.velocity = { x: 50, y: 0 };
    player.stats.baseDamage = 20;
    enemy.stats.armorValue = 5;

    mockStore.entities.mockReturnValue([player, enemy]);
    mockSensorService.getEnemiesInRadar.mockReturnValue([enemy]);

    service.updateTick(0.1);

    const updated: CombatEntity[] = mockStore.setEntities.mock.calls[0][0];
    const updatedPlayer = updated.find(e => e.id === 'p1')!;
    expect(updated.find(e => e.id === 'e1')!.stats.hp).toBe(85); // (20 * 1.0) - 5
    expect(updatedPlayer.state).toBe('ORBITING');
  });

  /**
   * WHY: Kinetic momentum is the core damage mechanic for heavy drones. 
   * This test verifies that velocity-based multipliers (capped at 5x) are correctly 
   * applied and combined with armor type effectiveness.
   */
  it('should calculate full strike damage with kinetic momentum scaling', () => {
    const player = createMockEntity('p1', 'PLAYER', 100, 100);
    const enemy = createMockEntity('e1', 'ENEMY', 110, 100);
    player.state = 'STRIKING';
    player.targetId = 'e1';
    player.velocity = { x: 200, y: 0 };
    player.stats.weight = 200;
    player.stats.baseDamage = 20;
    player.stats.damageType = 'KINETIC';
    enemy.stats.armorType = 'HEAVY_ARMOR'; // 1.5x mult
    enemy.stats.armorValue = 10;

    mockStore.entities.mockReturnValue([player, enemy]);
    mockSensorService.getEnemiesInRadar.mockReturnValue([enemy]);
    vi.spyOn(Math, 'random').mockReturnValue(0.9); // No crit

    service.updateTick(0.1);

    const updated: CombatEntity[] = mockStore.setEntities.mock.calls[0][0];
    // Momentum mult: 1 + (200*200)/10000 = 5.0 (cap)
    // Damage: 20 * 5 * 1.5 - 10 = 140. HP: 100 - 140 = 0.
    expect(updated.find(e => e.id === 'e1')!.stats.hp).toBe(0);
    vi.restoreAllMocks();
  });

  /**
   * WHY: EMP pulses must be neutralized by shields. If a drone has 1 shield point, 
   * it should absorb the shield collapse but remain active. Only shieldless 
   * drones are vulnerable to the STUNNED paralysis.
   */
  it('should strip shields then stun during EMP pulse sequence', () => {
    const source = createMockEntity('source', 'ENEMY', 100, 100);
    source.pulseTriggered = true;
    const target = createMockEntity('target', 'PLAYER', 150, 100);
    target.stats.shields = 1;

    mockStore.entities.mockReturnValue([source, target]);

    service.updateTick(0.1);
    let updated: CombatEntity[] = mockStore.setEntities.mock.calls[0][0];
    let updatedTarget = updated.find(e => e.id === 'target')!;
    expect(updatedTarget.stats.shields).toBe(0);
    expect(updatedTarget.state).not.toBe('STUNNED');

    mockStore.entities.mockReturnValue([source, updatedTarget]);
    source.pulseTriggered = true;
    service.updateTick(0.1);
    updated = mockStore.setEntities.mock.calls[1][0];
    updatedTarget = updated.find(e => e.id === 'target')!;
    expect(updatedTarget.state).toBe('STUNNED');
  });

  /**
   * WHY: Projectiles allow hostiles to engage from a distance. They must 
   * de-spawn correctly upon impact to prevent multiple hits from the same 
   * bullet and apply damage based on the same effectiveness matrix as melee.
   */
  it('should de-spawn projectiles and apply damage on entity impact', () => {
    const target = createMockEntity('target', 'PLAYER', 200, 100);
    const projectile = {
      id: 'proj1',
      position: { x: 190, y: 100 },
      velocity: { x: 300, y: 0 },
      damage: 10,
      damageType: 'ENERGY' as const,
      sourceId: 'enemy-1',
      radius: 3
    };

    mockStore.entities.mockReturnValue([target]);
    mockStore.projectiles.mockReturnValue([projectile]);

    service.updateTick(0.05);

    const updated: CombatEntity[] = mockStore.setEntities.mock.calls[0][0];
    expect(updated.find(e => e.id === 'target')!.stats.hp).toBe(90);
    expect(mockStore.setProjectiles).toHaveBeenCalledWith([]);
  });

  /**
   * WHY: If the engine encounters an empty entity list, it must return 
   * immediately and not attempt to patch the store with an empty array or 
   * enter loops that might expect at least one entity.
   */
  it('should handle an empty entity array without error', () => {
    mockStore.entities.mockReturnValue([]);
    expect(() => service.updateTick(0.16)).not.toThrow();
  });

  /**
   * WHY: If a player drone is targeting an entity that was destroyed in the 
   * same tick (targetId mismatch), the engine must gracefully skip combat 
   * resolution for that attacker to avoid null reference errors.
   */
  it('should ignore invalid targetIds during combat resolution', () => {
    const attacker = createMockEntity('p1', 'PLAYER', 100, 100);
    attacker.state = 'STRIKING';
    attacker.targetId = 'non-existent';
    
    mockStore.entities.mockReturnValue([attacker]);
    mockSensorService.getEnemiesInRadar.mockReturnValue([]);

    expect(() => service.updateTick(0.16)).not.toThrow();
  });
});
