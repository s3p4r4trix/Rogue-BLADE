import {
  Component, ChangeDetectionStrategy, input, effect,
  ElementRef, viewChild, OnDestroy, output,
  untracked, afterNextRender, inject
} from '@angular/core';
import { Shuriken } from '../models/hardware.model';
import { MissionContract } from '../models/mission.model';
import { Vec2, AABB, ArenaEntity, Projectile } from '../models/arena.model';
import { CombatStore } from '../services/combat.store';
import { ShurikenStatus } from '../models/combat.model';

// ─── Arena Constants ───────────────────────────────────────────────
const ARENA_W = 800;
const ARENA_H = 800;
const WALL_THICKNESS = 16;
const TILE_SIZE = 40;
const PERSPECTIVE_SCALE_Y = 0.7;
const MIN_STRIKE_SPEED = 0.4;
const STRIKE_COOLDOWN = 1.0;
const SEARCH_LINGER_TIME = 3;
const ENEMY_STRIKE_COOLDOWN = 2.0;
const ENEMY_DAMAGE = 15;
const PROJECTILE_SPEED = 300;
const PROJECTILE_RADIUS = 3;
const FIRE_RATE = 2.0; // Seconds between shots

const EFFECTIVENESS_MATRIX: Record<string, Record<string, number>> = {
  'SLASHING': { 'UNARMORED': 1.5, 'HEAVY_ARMOR': 0.4, 'ENERGY_SHIELD': 0.8 },
  'KINETIC': { 'UNARMORED': 1.0, 'HEAVY_ARMOR': 1.5, 'ENERGY_SHIELD': 0.5 },
  'ENERGY': { 'UNARMORED': 1.0, 'HEAVY_ARMOR': 1.0, 'ENERGY_SHIELD': 2.0 },
  'EMP': { 'UNARMORED': 0.0, 'HEAVY_ARMOR': 0.0, 'ENERGY_SHIELD': 100.0 }
};

@Component({
  selector: 'app-combat-arena',
  standalone: true,
  template: `
    <div class="relative w-full flex flex-col items-center gap-2">
      <canvas #arenaCanvas class="border border-white/10 bg-black" style="image-rendering: pixelated;"></canvas>
    </div>
  `,
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CombatArena implements OnDestroy {
  // ─── Angular Architecture ───────────────────────────────────────────────
  mission = input<MissionContract | null>(null);
  shurikens = input<Shuriken[]>([]);

  arenaLog = output<string>();
  missionComplete = output<{ success: boolean }>();

  private store = inject(CombatStore);

  private canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('arenaCanvas');
  private canvasContext!: CanvasRenderingContext2D;

  private animationFrameId = 0;
  private lastTimestamp = 0;

  // ─── Arena State ───────────────────────────────────────────────
  private obstacles: AABB[] = [];
  private drones: ArenaEntity[] = [];
  private enemy!: ArenaEntity;
  private arenaTime = 0;
  private isGameOver = false;
  private projectiles: Projectile[] = [];

  private renderList: ArenaEntity[] = [];

  /**
   * Initializes the CombatArena component.
   * Sets up the render loop and entity initialization logic based on input signals.
   */
  constructor() {
    afterNextRender(() => {
      const element = this.canvas().nativeElement;
      element.width = ARENA_W;
      element.height = ARENA_H;
      this.canvasContext = element.getContext('2d')!;

      this.initObstacles();

      const missionData = this.mission();
      const shurikenData = this.shurikens();
      if (missionData && shurikenData.length > 0) {
        this.initEntities(shurikenData, missionData);
      } else {
        const mockDrone = {
          id: 'mock-1', name: 'Alpha-Blade',
          engine: { topSpeed: 180, acceleration: 60 } as any,
          hull: { maxHp: 100 } as any,
          sensor: { range: 200 } as any
        } as Shuriken;
        this.initEntities([mockDrone], null);
      }

      this.lastTimestamp = performance.now();
      this.tick(this.lastTimestamp);
    });

    effect(() => {
      const missionData = this.mission();
      const shurikenData = this.shurikens();

      untracked(() => {
        if (this.canvasContext && missionData && shurikenData.length > 0) {
          this.initEntities(shurikenData, missionData);
        }
      });
    });
  }

  /**
   * Cleans up the component when destroyed.
   * Ensures the animation frame is cancelled to prevent memory leaks.
   */
  ngOnDestroy() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
  }

  // ═══════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Defines the static environment for the combat simulation.
   * Generates solid obstacles (AABBs) that block movement and line-of-sight.
   */
  private initObstacles() {
    this.obstacles = [
      { x: 300, y: 300, width: 200, height: 60 },
      { x: 150, y: 500, width: 80, height: 120 },
      { x: 550, y: 150, width: 80, height: 120 },
      { x: 400, y: 600, width: 120, height: 60 }
    ];
  }

  /**
   * Populates the arena with combatants based on mission parameters and squad composition.
   * Resets the game state and initializes the SignalStore for the new engagement.
   * @param shurikenList Array of Shuriken configurations from the workshop.
   * @param currentMission The active mission contract.
   */
  private initEntities(shurikenList: Shuriken[], currentMission: MissionContract | null) {
    this.isGameOver = false;
    this.arenaTime = 0;
    this.drones = [];
    this.projectiles = [];

    shurikenList.forEach((shuriken, index) => {
      const formDesign = shuriken.formDesign;
      const hull = shuriken.hull;
      const engine = shuriken.engine;
      const blade = shuriken.blade;
      const processor = shuriken.processor;
      const energyCell = shuriken.energyCell;
      const reactor = shuriken.reactor;
      const tacticalSensor = shuriken.sensor;

      const baseWeight = ((hull?.weight || 20) * (formDesign?.weightMult || 1.0)) +
        (engine?.weight || 0) + (energyCell?.weight || 0) + (tacticalSensor?.weight || 0) +
        (blade?.weight || 0) + (processor?.weight || 0) + (shuriken.semiAI?.weight || 0) +
        (shuriken.shield?.weight || 0) + (reactor?.weight || 0);

      this.drones.push({
        id: shuriken.id,
        name: shuriken.name,
        x: 100 + (index * 50), y: 700, z: 20,
        velocityX: 0, velocityY: 0,
        speed: 0,
        topSpeed: (engine?.topSpeed || 150) * (formDesign?.speedMult || 1.0),
        acceleration: engine?.acceleration || 50,
        radius: 12,
        color: '#00f0ff',
        sensorRange: tacticalSensor?.range || 200,
        state: 'PATROLLING',
        orbitAngle: 0,
        isEnemy: false,
        hp: hull?.maxHp || 100,
        maxHp: hull?.maxHp || 100,

        // Energy
        energy: energyCell?.maxEnergy || 100,
        maxEnergy: energyCell?.maxEnergy || 100,
        energyRegen: reactor?.energyRegen || 2,
        energyDrain: (engine?.energyDrain || 5) + (blade?.energyDrain || 0),
        rebootTimer: 0,
        rechargeBoostTimer: 0,

        // Offensive
        baseDamage: (blade?.baseDamage || 10) * (formDesign?.damageMult || 1.0),
        damageType: (blade?.damageType as any) || 'SLASHING',
        critChance: (blade?.critChance || 0.05) * (formDesign?.critChanceMult || 1.0),
        critMultiplier: blade?.critMultiplier || 1.5,

        // Defensive
        armorValue: (hull?.armorValue || 0) * (formDesign?.armorMult || 1.0),
        evasionRate: engine?.evasionRate || 0.0,

        // Weight
        baseWeight: baseWeight,

        lastSeenPos: null,
        searchTimer: 0,
        stuckTimer: 0,
        strikeCooldown: 0,
        canStrike: false,
        hitFlashTimer: 0,
        withdrawalTimer: 0,
        rotation: -Math.PI / 2,
        patrolPos: this.getRandomPatrolPos(),
        sensorId: tacticalSensor?.id || 'sens-optical'
      });
    });

    const targetHull = currentMission?.hull || 500;
    const targetShields = currentMission?.shields || 0;
    const targetName = currentMission?.targetName || 'Zenith Warden';

    this.enemy = {
      id: 'enemy_1',
      name: targetName,
      x: 400, y: 100, z: 0,
      velocityX: 0, velocityY: 0,
      speed: 0,
      topSpeed: 80,
      acceleration: 30,
      radius: 18,
      color: '#ff3366',
      sensorRange: 200,
      state: 'PATROLLING',
      orbitAngle: 0,
      isEnemy: true,
      hp: targetHull,
      maxHp: targetHull,

      // Energy (Hostiles have high capacity usually)
      energy: 500,
      maxEnergy: 500,
      energyRegen: 5,
      energyDrain: 0,
      rebootTimer: 0,
      rechargeBoostTimer: 0,

      // Offensive
      baseDamage: ENEMY_DAMAGE,
      damageType: 'ENERGY',
      critChance: 0.05,
      critMultiplier: 1.5,

      // Defensive
      armorValue: currentMission?.armorValue || 0,
      evasionRate: currentMission?.enemyEvasionRate || 0,

      // Weight
      baseWeight: 500,

      lastSeenPos: null,
      searchTimer: 0,
      stuckTimer: 0,
      strikeCooldown: 0,
      canStrike: false,
      hitFlashTimer: 0,
      withdrawalTimer: 0,
      rotation: Math.PI / 2,
      patrolPos: this.getRandomPatrolPos(),
      sensorId: 'sens-radar'
    };

    // Initialize Store
    const initialStatuses: ShurikenStatus[] = this.drones.map(drone => ({
      id: drone.id,
      name: drone.name,
      hp: drone.hp,
      maxHp: drone.maxHp,
      shields: 0,
      maxShields: 0,
      energy: drone.energy,
      maxEnergy: drone.maxEnergy,
      rebootTicks: 0
    }));

    this.store.reset();
    this.store.setInitialState(targetHull, initialStatuses, currentMission?.durationSeconds || 60);

    this.emitLog(`Mission Initiated. Entities deployed.`);
  }

  private getRandomPatrolPos(): Vec2 {
    return {
      x: 100 + Math.random() * (ARENA_W - 200),
      y: 100 + Math.random() * (ARENA_H - 200)
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // GAME LOOP
  // ═══════════════════════════════════════════════════════════════

  /**
   * The core animation frame callback.
   * Calculates the delta time and triggers the update/render cycle.
   * @param currentTimestamp The high-resolution timestamp provided by requestAnimationFrame.
   */
  private tick = (currentTimestamp: number) => {
    const deltaTime = Math.max(0, Math.min((currentTimestamp - this.lastTimestamp) / 1000, 0.05));
    this.lastTimestamp = currentTimestamp;
    this.arenaTime += deltaTime;

    this.update(deltaTime);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.tick);
  };

  /**
   * Emits a tactical log message to both the component output and the SignalStore.
   * Prefixes the message with the current arena timestamp.
   * @param message The descriptive log text.
   */
  private emitLog(message: string) {
    const formattedLog = `[${this.arenaTime.toFixed(1)}s] ${message}`;
    this.arenaLog.emit(formattedLog);
    this.store.addLog(formattedLog);
  }

  // ═══════════════════════════════════════════════════════════════
  // UPDATE (Physics + AI)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Updates the physics and AI state for all entities in the arena.
   * Resolves collisions, energy consumption, and mission objectives.
   * @param deltaTime Time elapsed since the last frame in seconds.
   */
  private update(deltaTime: number) {
    if (this.isGameOver) return;

    this.drones.forEach(drone => {
      // 1. Energy & Reboot Logic
      // Logic: Drones consume energy while operational. If energy hits zero, 
      // they initiate a 3-second reboot sequence where they are vulnerable.
      if (drone.rebootTimer > 0) {
        drone.rebootTimer -= deltaTime;
        if (drone.rebootTimer <= 0) {
          drone.energy = drone.maxEnergy * 0.3;
          drone.rechargeBoostTimer = 3.0;
          this.emitLog(`${drone.name}: [SYSTEM] Reboot Complete. Energy restored to 30%.`);
        }
      } else {
        const energyEfficiency = drone.rechargeBoostTimer > 0 ? 1.5 : 1.0;
        drone.energy = Math.min(drone.maxEnergy, drone.energy + ((drone.energyRegen * energyEfficiency) - drone.energyDrain) * deltaTime);
        if (drone.energy <= 0) {
          drone.energy = 0;
          drone.rebootTimer = 3.0;
          this.emitLog(`${drone.name}: [CRITICAL] Energy Depleted. Initiating Emergency Reboot.`);
        }
      }
      if (drone.rechargeBoostTimer > 0) drone.rechargeBoostTimer -= deltaTime;

      const isRebooting = drone.rebootTimer > 0;

      // 2. AI & Physics
      // Logic: Update the state machine and calculate movement vectors.
      this.updateEntityAI(drone, this.enemy, deltaTime);
      const targetVelocity = isRebooting ? { x: 0, y: 0 } : this.getBehaviorVelocity(drone, this.enemy, deltaTime);
      this.updateEntityPhysics(drone, targetVelocity, deltaTime, 0.6);

      if (drone.strikeCooldown > 0) drone.strikeCooldown -= deltaTime;
      if (drone.hitFlashTimer > 0) drone.hitFlashTimer -= deltaTime;

      const isExhausted = drone.energy < (drone.maxEnergy * 0.05);
      const strikeSpeedMultiplier = isExhausted ? 0.6 : MIN_STRIKE_SPEED;
      drone.canStrike = drone.speed >= (drone.topSpeed * strikeSpeedMultiplier) && !isRebooting;
    });

    // 3. Entity-to-Entity Collision Resolution
    // Logic: Simple circle-to-circle overlap resolution to prevent stacking.
    const allEntities = [...this.drones, this.enemy];
    for (let indexI = 0; indexI < allEntities.length; indexI++) {
      for (let indexJ = indexI + 1; indexJ < allEntities.length; indexJ++) {
        const entityA = allEntities[indexI];
        const entityB = allEntities[indexJ];
        if (entityA.hp <= 0 || entityB.hp <= 0 || entityA.state === 'WITHDRAWN' || entityB.state === 'WITHDRAWN') continue;

        const diffX = entityB.x - entityA.x;
        const diffY = entityB.y - entityA.y;
        const distance = Math.sqrt(diffX * diffX + diffY * diffY);
        const minDistance = entityA.radius + entityB.radius;
        if (distance < minDistance && distance > 0) {
          const overlap = minDistance - distance;
          const normalX = diffX / distance;
          const normalY = diffY / distance;
          // Push both away by half the overlap to resolve the collision
          entityA.x -= normalX * overlap * 0.5;
          entityA.y -= normalY * overlap * 0.5;
          entityB.x += normalX * overlap * 0.5;
          entityB.y += normalY * overlap * 0.5;
        }
      }
    }

    if (this.enemy.hp > 0) {
      const hostileEntity = this.enemy;

      // Enemy Energy Logic (Simplified)
      if (hostileEntity.rebootTimer > 0) {
        hostileEntity.rebootTimer -= deltaTime;
      } else {
        hostileEntity.energy = Math.min(hostileEntity.maxEnergy, hostileEntity.energy + hostileEntity.energyRegen * deltaTime);
      }

      const isRebooting = hostileEntity.rebootTimer > 0;

      let closestDrone = null;
      let minDistance = Infinity;
      this.drones.forEach(drone => {
        const distance = this.calculateDistance(hostileEntity, drone);
        if (distance < minDistance && drone.state !== 'WITHDRAWN' && drone.hp > 0) {
          minDistance = distance;
          closestDrone = drone;
        }
      });

      if (closestDrone && !isRebooting) {
        this.updateEntityAI(hostileEntity, closestDrone, deltaTime);
        const enemyVelocity = this.getBehaviorVelocity(hostileEntity, closestDrone, deltaTime);
        this.updateEntityPhysics(hostileEntity, enemyVelocity, deltaTime, 0.4);
      } else {
        const patrolVelocity = isRebooting ? { x: 0, y: 0 } : this.getBehaviorVelocity(hostileEntity, hostileEntity, deltaTime);
        this.updateEntityPhysics(hostileEntity, patrolVelocity, deltaTime, 0.4);
      }
      if (hostileEntity.strikeCooldown > 0) hostileEntity.strikeCooldown -= deltaTime;
      if (hostileEntity.hitFlashTimer > 0) hostileEntity.hitFlashTimer -= deltaTime;
      hostileEntity.canStrike = !isRebooting;
    }

    this.updateProjectiles(deltaTime);

    // Sync Store (Every 0.2s for smooth UI)
    // Logic: Throttled update to the global SignalStore to maintain UI performance.
    if (Math.floor(this.arenaTime * 5) > Math.floor((this.arenaTime - deltaTime) * 5)) {
      this.store.updateEnemyHull(this.enemy.hp);
      this.store.updateTime(this.arenaTime, Math.max(0, (this.mission()?.durationSeconds || 60) - this.arenaTime));
      
      const statuses: ShurikenStatus[] = this.drones.map(drone => ({
        id: drone.id,
        name: drone.name,
        hp: drone.hp,
        maxHp: drone.maxHp,
        shields: 0,
        maxShields: 0,
        energy: drone.energy,
        maxEnergy: drone.maxEnergy,
        rebootTicks: Math.ceil(drone.rebootTimer * 10)
      }));
      this.store.updateSquadStatus(statuses);
    }

    const livingDrones = this.drones.filter(drone => drone.hp > 0 && drone.state !== 'WITHDRAWN');

    if (livingDrones.length === 0) {
      this.isGameOver = true;
      this.missionComplete.emit({ success: false });
    } else if (this.enemy.hp <= 0) {
      this.isGameOver = true;
      this.emitLog('MISSION OBJECTIVE NEUTRALIZED');
      this.missionComplete.emit({ success: true });
    }
  }

  /**
   * Updates the behavioral state machine for an entity.
   * Logic: Checks sensors, Line of Sight (LOS), and Field of View (FOV) to determine next action.
   * @param entity The entity whose state is being evaluated.
   * @param target The primary hostile or allied target to interact with.
   * @param deltaTime Time elapsed since the last frame.
   */
  private updateEntityAI(entity: ArenaEntity, target: ArenaEntity, deltaTime: number) {
    if (entity.hp <= 0) {
      entity.state = 'WITHDRAWN';
      return;
    }

    if (entity.state === 'WITHDRAWN') return;

    const distanceToTarget = this.calculateDistance(entity, target);

    // FOV Logic: Enemies have a limited 120-degree FOV cone, drones have 360-degree radar.
    let isWithinFOV = true;
    if (entity.isEnemy) {
      const angleToTarget = Math.atan2(target.y - entity.y, target.x - entity.x);
      const angleDifference = Math.abs(this.normalizeAngle(entity.rotation - angleToTarget));
      isWithinFOV = angleDifference <= Math.PI / 3; // 60 degrees left/right arc
    }

    const hasLineOfSight = !this.isLOSBlocked(entity, target);
    const isTerahertzSensor = entity.sensorId === 'sens-terahertz';
    // Detection Condition: Target is within range, and either has LOS or entity has Terahertz penetration.
    const canSeeTarget = distanceToTarget <= entity.sensorRange && (hasLineOfSight || isTerahertzSensor) && target.hp > 0 && isWithinFOV;

    // Critical Damage Check: Drones flee to preserve hardware if HP is low.
    if (!entity.isEnemy && entity.hp < entity.maxHp * 0.2 && entity.state !== 'FLEEING') {
      entity.state = 'FLEEING';
      this.emitLog(`${entity.name} sustained critical damage. Initiating Emergency Withdrawal.`);
    }

    if (entity.state === 'FLEEING') {
      if (canSeeTarget) {
        entity.lastSeenPos = { x: target.x, y: target.y };
        entity.searchTimer = 0;
      }
      return;
    }

    if (entity.rebootTimer > 0) {
      entity.state = 'REBOOTING';
      return;
    }

    if (canSeeTarget) {
      // Memory Update: Update last known position of target for search logic.
      entity.lastSeenPos = { x: target.x, y: target.y };
      entity.searchTimer = 0;

      if (entity.isEnemy) {
        if (entity.strikeCooldown <= 0) {
          entity.state = 'SHOOTING';
          this.fireProjectile(entity, target);
        } else {
          entity.state = 'IDLE'; // Stop and wait for weapon recharge
        }
      } else {
        // Strike threshold requires physical contact (overlapping radii) and sufficient velocity.
        if (distanceToTarget <= (entity.radius + target.radius) && entity.canStrike && entity.strikeCooldown <= 0) {
          entity.state = 'FIGHTING';
          this.executeStrike(entity, target);
        } else if (entity.strikeCooldown > 0) {
          entity.state = 'ORBITING'; // Repositioning for next pass
        } else {
          entity.state = 'PURSUING';
        }
      }
    } else {
      // Lost Target Logic: Search last known position before reverting to patrol.
      if (entity.lastSeenPos) {
        entity.state = 'SEARCHING';
        entity.searchTimer += deltaTime;
        if (entity.searchTimer >= SEARCH_LINGER_TIME) {
          entity.lastSeenPos = null;
          entity.state = 'PATROLLING';
        }
      } else {
        entity.state = 'PATROLLING';
      }
    }
  }

  /**
   * Executes a physical strike calculation between two entities.
   * Logic: Calculates damage based on weapon type, momentum, and enemy armor effectiveness.
   * @param attacker The entity performing the strike.
   * @param defender The entity receiving the impact.
   */
  private executeStrike(attacker: ArenaEntity, defender: ArenaEntity) {
    const isCriticalHit = Math.random() <= attacker.critChance;
    let grossDamage = attacker.baseDamage * (isCriticalHit ? attacker.critMultiplier : 1.0);

    // Momentum Scaling: Kinetic weapons deal more damage the faster the drone is moving.
    if (attacker.damageType === 'KINETIC') {
      const momentumMultiplier = 1.0 + ((attacker.speed * attacker.baseWeight) / 10000);
      grossDamage *= momentumMultiplier;
    }

    // Effectiveness Matrix: Damage is multiplied based on weapon type vs target armor.
    const currentMission = this.mission();
    const armorType = defender.isEnemy ? (currentMission?.armorType || 'HEAVY_ARMOR') : 'UNARMORED';
    const effectivenessArray = EFFECTIVENESS_MATRIX[attacker.damageType] || EFFECTIVENESS_MATRIX['SLASHING'];
    const typeMultiplier = effectivenessArray[armorType] || 1.0;
    grossDamage *= typeMultiplier;

    // Evasion Check: Chance to completely dodge the incoming strike.
    let effectiveEvasion = defender.evasionRate;
    if (defender.rebootTimer > 0 || defender.energy < defender.maxEnergy * 0.05) effectiveEvasion = 0;

    if (Math.random() <= effectiveEvasion) {
      this.emitLog(`${attacker.name} missed -> ${defender.name} (EVADED)`);
    } else {
      // Armor Mitigation: Flat damage reduction based on defender's armor value.
      const mitigationValue = defender.isEnemy ? defender.armorValue : (defender.armorValue / 5);
      let netDamage = Math.max(1, grossDamage - mitigationValue);

      // Reboot vulnerability: Entities taking reboot are 50% more vulnerable.
      if (defender.rebootTimer > 0) netDamage *= 1.5;

      defender.hp = Math.max(0, defender.hp - netDamage);
      defender.hitFlashTimer = 0.2;

      const damageLabel = isCriticalHit ? 'CRITICAL HIT' : 'Hit';
      const logPrefix = attacker.isEnemy ? 'HOSTILE: ' : '';
      this.emitLog(`${logPrefix}${attacker.name} ${damageLabel} -> ${defender.name}: Hull Hit (-${Math.ceil(netDamage)} H) [REM: ${Math.max(0, Math.ceil(defender.hp))} HP]`);
    }

    // Reactive Awareness: Target immediately locks on to the attacker's position upon being hit.
    defender.lastSeenPos = { x: attacker.x, y: attacker.y };
    defender.searchTimer = 0;

    attacker.strikeCooldown = attacker.isEnemy ? ENEMY_STRIKE_COOLDOWN : STRIKE_COOLDOWN;

    // Physical Bounce: Redirect velocity away from target to create fly-by patterns.
    const bounceVector = this.normalizeVector({ x: attacker.x - defender.x, y: attacker.y - defender.y });
    attacker.velocityX = bounceVector.x * attacker.topSpeed;
    attacker.velocityY = bounceVector.y * attacker.topSpeed;
  }

  /**
   * Calculates the desired velocity for an entity based on its current AI state.
   * Logic: Implements different steering behaviors (Pursuit, Orbit, Search, Flee, Patrol).
   * @param entity The entity whose movement is being calculated.
   * @param target The primary target for the behavior.
   * @param deltaTime Time elapsed since the last frame.
   * @returns A Vec2 representing the target velocity.
   */
  private getBehaviorVelocity(entity: ArenaEntity, target: ArenaEntity, deltaTime: number): Vec2 {
    let targetVelocityX = 0;
    let targetVelocityY = 0;

    switch (entity.state) {
      case 'PURSUING':
      case 'FIGHTING':
        // Logic: Straight-line pursuit toward the target's current position.
        const pursuitDirection = this.normalizeVector({ x: target.x - entity.x, y: target.y - entity.y });
        targetVelocityX = pursuitDirection.x * entity.topSpeed;
        targetVelocityY = pursuitDirection.y * entity.topSpeed;
        break;

      case 'ORBITING':
        // Logic: Maintains a set radius around the target by combining tangent movement and radial pull.
        const vectorToTarget = { x: entity.x - target.x, y: entity.y - target.y };
        const distance = Math.max(1, Math.sqrt(vectorToTarget.x ** 2 + vectorToTarget.y ** 2));
        const orbitRadius = entity.sensorRange * 0.6;
        const radialPull = (orbitRadius - distance) * 2;

        const tangentX = -vectorToTarget.y / distance;
        const tangentY = vectorToTarget.x / distance;

        targetVelocityX = (tangentX * entity.topSpeed) + ((vectorToTarget.x / distance) * radialPull);
        targetVelocityY = (tangentY * entity.topSpeed) + ((vectorToTarget.y / distance) * radialPull);
        break;

      case 'SEARCHING':
        // Logic: Navigates to last seen position. If close, performs an expanding spiral search.
        if (entity.lastSeenPos) {
          const searchDistance = this.calculateDistance(entity, entity.lastSeenPos);
          if (searchDistance > 30) {
            const searchDirection = this.normalizeVector({ x: entity.lastSeenPos.x - entity.x, y: entity.lastSeenPos.y - entity.y });
            targetVelocityX = searchDirection.x * entity.topSpeed;
            targetVelocityY = searchDirection.y * entity.topSpeed;
          } else {
            entity.orbitAngle += deltaTime * 2;
            const spiralRadius = 30 + (entity.searchTimer * 20);
            const goalX = entity.lastSeenPos.x + Math.cos(entity.orbitAngle) * spiralRadius;
            const goalY = entity.lastSeenPos.y + Math.sin(entity.orbitAngle) * spiralRadius;
            const spiralDirection = this.normalizeVector({ x: goalX - entity.x, y: goalY - entity.y });
            targetVelocityX = spiralDirection.x * entity.topSpeed;
            targetVelocityY = spiralDirection.y * entity.topSpeed;
          }
        }
        break;

      case 'FLEEING':
        // Logic: Moves directly away from the enemy toward the nearest arena boundary.
        const fleeDirection = this.normalizeVector({ x: entity.x - target.x, y: entity.y - target.y });
        targetVelocityX = fleeDirection.x * entity.topSpeed;
        targetVelocityY = fleeDirection.y * entity.topSpeed;

        // Disengagement Logic: Sustained contact with a wall for 2s triggers withdrawal.
        const isTouchingWall = entity.x <= WALL_THICKNESS + 2 || entity.x >= ARENA_W - WALL_THICKNESS - 2 ||
                             entity.y <= WALL_THICKNESS + 2 || entity.y >= ARENA_H - WALL_THICKNESS - 2;
        if (isTouchingWall) {
          entity.withdrawalTimer += deltaTime;
          if (entity.withdrawalTimer >= 2.0) {
            entity.state = 'WITHDRAWN';
            this.emitLog(`${entity.name} successfully withdrew from combat.`);
          }
        } else {
          entity.withdrawalTimer = 0;
        }
        break;

      case 'PATROLLING':
        // Logic: Moves toward random waypoints to scan for hostiles.
        if (!entity.patrolPos || this.calculateDistance(entity, entity.patrolPos) < 20) {
          entity.patrolPos = this.getRandomPatrolPos();
        }
        const patrolDirection = this.normalizeVector({ x: entity.patrolPos.x - entity.x, y: entity.patrolPos.y - entity.y });
        targetVelocityX = patrolDirection.x * (entity.topSpeed * 0.8);
        targetVelocityY = patrolDirection.y * (entity.topSpeed * 0.8);
        break;

      case 'FIGHTING':
      case 'SHOOTING':
      case 'IDLE':
      case 'REBOOTING':
        // Logic: Stationary state where the entity performs non-movement actions or is recovering.
        targetVelocityX = 0;
        targetVelocityY = 0;
        break;
    }

    return { x: targetVelocityX, y: targetVelocityY };
  }

  /**
   * Spawns a projectile from an attacker toward a target.
   * Logic: Calculates direction and applies projectile constants.
   * @param attacker The entity firing the projectile.
   * @param target The entity being fired upon.
   */
  private fireProjectile(attacker: ArenaEntity, target: ArenaEntity) {
    const projectileId = `projectile_${this.arenaTime}_${Math.random().toString(36).substr(2, 4)}`;
    const fireDirection = this.normalizeVector({ x: target.x - attacker.x, y: target.y - attacker.y });

    // Rotate attacker towards target for visual consistency.
    attacker.rotation = Math.atan2(fireDirection.y, fireDirection.x);

    this.projectiles.push({
      id: projectileId,
      x: attacker.x + fireDirection.x * attacker.radius,
      y: attacker.y + fireDirection.y * attacker.radius,
      velocityX: fireDirection.x * PROJECTILE_SPEED,
      velocityY: fireDirection.y * PROJECTILE_SPEED,
      radius: PROJECTILE_RADIUS,
      damage: attacker.baseDamage || ENEMY_DAMAGE,
      damageType: (attacker.damageType as any) || 'ENERGY',
      ownerId: attacker.id,
      isEnemy: attacker.isEnemy,
      color: attacker.color,
      lifeTime: 3.0
    });

    attacker.strikeCooldown = FIRE_RATE;
    const logPrefix = attacker.isEnemy ? 'HOSTILE: ' : '';
    this.emitLog(`${logPrefix}${attacker.name} fired energy projectile at ${target.name}`);
  }

  /**
   * Updates the position and collision state of all active projectiles.
   * Logic: Handles wall, obstacle, and entity impacts.
   * @param deltaTime Time elapsed since the last frame.
   */
  private updateProjectiles(deltaTime: number) {
    for (let index = this.projectiles.length - 1; index >= 0; index--) {
      const projectile = this.projectiles[index];
      projectile.x += projectile.velocityX * deltaTime;
      projectile.y += projectile.velocityY * deltaTime;
      projectile.lifeTime -= deltaTime;

      // Logic: Cleanup expired projectiles.
      if (projectile.lifeTime <= 0) {
        this.projectiles.splice(index, 1);
        continue;
      }

      // Logic: Boundary check for arena walls.
      if (projectile.x < WALL_THICKNESS || projectile.x > ARENA_W - WALL_THICKNESS ||
          projectile.y < WALL_THICKNESS || projectile.y > ARENA_H - WALL_THICKNESS) {
        this.projectiles.splice(index, 1);
        continue;
      }

      // Logic: AABB intersection check for arena obstacles.
      let hitObstacle = false;
      for (const obstacle of this.obstacles) {
        if (projectile.x >= obstacle.x && projectile.x <= obstacle.x + obstacle.width && 
            projectile.y >= obstacle.y && projectile.y <= obstacle.y + obstacle.height) {
          hitObstacle = true;
          break;
        }
      }

      if (hitObstacle) {
        this.projectiles.splice(index, 1);
        continue;
      }

      // Logic: Collision check against all valid combatants in the arena.
      const allEntities = [...this.drones, this.enemy];
      for (const entity of allEntities) {
        // Skip if entity is dead, withdrawn, or the owner of the projectile.
        if (entity.hp <= 0 || entity.state === 'WITHDRAWN' || entity.id === projectile.ownerId) continue;

        const distanceX = entity.x - projectile.x;
        const distanceY = entity.y - projectile.y;
        const collisionDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

        if (collisionDistance < entity.radius + projectile.radius) {
          // Apply Armor Mitigation (Hostiles have flat mitigation, drones have /5 scaling).
          const mitigationValue = entity.isEnemy ? entity.armorValue : (entity.armorValue / 5);
          const netDamage = Math.max(1, projectile.damage - mitigationValue);
          
          entity.hp -= netDamage;
          entity.hitFlashTimer = 0.2;
          
          const logPrefix = projectile.isEnemy ? 'HOSTILE: ' : '';
          this.emitLog(`${logPrefix}Impact -> ${entity.name} (Hull: -${Math.ceil(netDamage)}) [REM: ${Math.max(0, Math.ceil(entity.hp))} HP]`);

          // Reactive Awareness: Target immediately locks on to the attacker's position.
          const attacker = allEntities.find(e => e.id === projectile.ownerId);
          if (attacker) {
            entity.lastSeenPos = { x: attacker.x, y: attacker.y };
            entity.searchTimer = 0;
          }

          this.projectiles.splice(index, 1);
          break;
        }
      }
    }
  }

  /**
   * Updates an entity's position and velocity based on physics calculations.
   * Logic: Combines steering, avoidance, weight-based acceleration, and an unstuck mechanism.
   * @param entity The entity being moved.
   * @param targetVelocity The desired velocity calculated by the AI behaviors.
   * @param deltaTime Time elapsed since the last frame.
   * @param avoidanceWeight Strength of the steering avoidance influence (0 to 1).
   */
  private updateEntityPhysics(entity: ArenaEntity, targetVelocity: Vec2, deltaTime: number, avoidanceWeight: number) {
    const avoidanceVector = this.getSteeringAvoidance(entity);

    let finalTargetVelocityX = targetVelocity.x;
    let finalTargetVelocityY = targetVelocity.y;
    let finalAvoidanceWeight = avoidanceWeight;

    // Combat Intent: Reduce avoidance when pursuing a target that is very close.
    // Logic: This allows drones to close the gap for a strike even near walls or obstacles.
    if (entity.state === 'PURSUING' && entity.lastSeenPos) {
      const distanceToTarget = this.calculateDistance(entity, entity.lastSeenPos);
      if (distanceToTarget < 50) {
        finalAvoidanceWeight *= 0.3; // Allow much closer approach for combat engagement.
      }
    }

    // Logic: Blend the target behavior velocity with the environmental avoidance vector.
    if (avoidanceVector.x !== 0 || avoidanceVector.y !== 0) {
      finalTargetVelocityX = (targetVelocity.x * (1 - finalAvoidanceWeight)) + (avoidanceVector.x * finalAvoidanceWeight);
      finalTargetVelocityY = (targetVelocity.y * (1 - finalAvoidanceWeight)) + (avoidanceVector.y * finalAvoidanceWeight);
    }

    // Weight-based acceleration scaling: Heavier entities accelerate slower but maintain more inertia.
    // Logic: Scales the raw acceleration by the entity's weight relative to the 1000kg reference point.
    const weightFactor = Math.max(0.1, 1 - (entity.baseWeight / 1000));
    const accelerationStep = entity.acceleration * weightFactor * deltaTime * 10;

    // 1. Unstuck Mechanism: Detects if an entity is trying to move but is blocked (e.g., by a wall corner).
    const targetSpeedSquared = targetVelocity.x ** 2 + targetVelocity.y ** 2;
    if (targetSpeedSquared > 100 && entity.speed < 10) {
      entity.stuckTimer += deltaTime;
      if (entity.stuckTimer > 1.2) {
        // Logic: Apply a gentle perpendicular nudge to help the entity slide around the obstruction.
        const perpendicularX = -targetVelocity.y * 0.2;
        const perpendicularY = targetVelocity.x * 0.2;
        entity.velocityX += perpendicularX;
        entity.velocityY += perpendicularY;
        entity.stuckTimer = 0;
        this.emitLog(`${entity.name}: [NAVIGATION] Applying gentle unstuck nudge.`);
      }
    } else {
      entity.stuckTimer = 0;
    }

    // 2. Physics Acceleration: Linearly interpolate current velocity toward the target velocity.
    if (entity.velocityX < finalTargetVelocityX) entity.velocityX = Math.min(finalTargetVelocityX, entity.velocityX + accelerationStep);
    if (entity.velocityX > finalTargetVelocityX) entity.velocityX = Math.max(finalTargetVelocityX, entity.velocityX - accelerationStep);
    if (entity.velocityY < finalTargetVelocityY) entity.velocityY = Math.min(finalTargetVelocityY, entity.velocityY + accelerationStep);
    if (entity.velocityY > finalTargetVelocityY) entity.velocityY = Math.max(finalTargetVelocityY, entity.velocityY - accelerationStep);

    entity.speed = Math.sqrt(entity.velocityX ** 2 + entity.velocityY ** 2);

    if (entity.speed > 5) {
      // Smooth rotation interpolation
      const targetRotation = Math.atan2(entity.velocityY, entity.velocityX);
      const rotDiff = this.normalizeAngle(targetRotation - entity.rotation);
      entity.rotation += rotDiff * (deltaTime * 10);
    }

    let nextX = entity.x + entity.velocityX * deltaTime;
    let nextY = entity.y + entity.velocityY * deltaTime;

    // Hard Boundary Bounce
    if (nextX < WALL_THICKNESS + entity.radius) { nextX = WALL_THICKNESS + entity.radius; entity.velocityX *= -0.2; }
    if (nextX > ARENA_W - WALL_THICKNESS - entity.radius) { nextX = ARENA_W - WALL_THICKNESS - entity.radius; entity.velocityX *= -0.2; }
    if (nextY < WALL_THICKNESS + entity.radius) { nextY = WALL_THICKNESS + entity.radius; entity.velocityY *= -0.2; }
    if (nextY > ARENA_H - WALL_THICKNESS - entity.radius) { nextY = ARENA_H - WALL_THICKNESS - entity.radius; entity.velocityY *= -0.2; }

    const resolved = this.resolveCollisions(entity, nextX, nextY);
    entity.x = resolved.x;
    entity.y = resolved.y;
  }

  // ═══════════════════════════════════════════════════════════════
  // MATH & SPATIAL QUERIES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Calculates the Euclidean distance between two points in 2D space.
   * @param pointA The first point.
   * @param pointB The second point.
   * @returns The straight-line distance.
   */
  private calculateDistance(pointA: Vec2, pointB: Vec2): number {
    return Math.sqrt((pointA.x - pointB.x) ** 2 + (pointA.y - pointB.y) ** 2);
  }

  /**
   * Scales a vector to have a length of 1 while maintaining its direction.
   * @param vector The vector to normalize.
   * @returns A normalized Vec2 or {0, 0} if the input is zero-length.
   */
  private normalizeVector(vector: Vec2): Vec2 {
    const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
    if (length === 0) return { x: 0, y: 0 };
    return { x: vector.x / length, y: vector.y / length };
  }

  /**
   * Constrains an angle in radians to the [-PI, PI] range.
   * Logic: Ensures rotation calculations don't accumulate large values or wrap incorrectly.
   * @param angle The angle to normalize.
   * @returns The normalized angle.
   */
  private normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }

  /**
   * Calculates a steering vector to avoid static obstacles.
   * Logic: Casts 5 "feelers" (short rays) in a fan pattern. If a feeler hits an obstacle, 
   * a force is generated away from the obstacle's center.
   * @param entity The entity requesting avoidance steering.
   * @returns A velocity vector representing the avoidance force.
   */
  private getSteeringAvoidance(entity: ArenaEntity): Vec2 {
    const feelerDistance = 25;
    // Weighted feelers: [AngleOffset, Weight]. Front-facing feelers are weighted heavier.
    const sensors = [
      { angle: 0, weight: 0.8 },              // Front
      { angle: -Math.PI / 4, weight: 0.4 },    // Diagonal Left
      { angle: Math.PI / 4, weight: 0.4 },     // Diagonal Right
      { angle: -Math.PI / 2, weight: 0.2 },    // Side Left
      { angle: Math.PI / 2, weight: 0.2 }      // Side Right
    ];

    let bestSteerVector: Vec2 = { x: 0, y: 0 };
    let totalWeight = 0;

    for (const sensor of sensors) {
      const angle = entity.rotation + sensor.angle;
      const feelerX = entity.x + Math.cos(angle) * feelerDistance;
      const feelerY = entity.y + Math.sin(angle) * feelerDistance;

      for (const obstacle of this.obstacles) {
        if (feelerX >= obstacle.x && feelerX <= obstacle.x + obstacle.width && 
            feelerY >= obstacle.y && feelerY <= obstacle.y + obstacle.height) {
          const centerX = obstacle.x + obstacle.width / 2;
          const centerY = obstacle.y + obstacle.height / 2;
          const steer = this.normalizeVector({ x: entity.x - centerX, y: entity.y - centerY });
          bestSteerVector.x += steer.x * sensor.weight;
          bestSteerVector.y += steer.y * sensor.weight;
          totalWeight += sensor.weight;
          break; // Hit one obstacle, no need to check others for this feeler.
        }
      }
    }

    if (totalWeight > 0) {
      const finalSteer = this.normalizeVector({ x: bestSteerVector.x, y: bestSteerVector.y });
      // Logic: Scaling strength for smoother transitions into avoidance.
      const steeringStrength = 0.8;
      return { x: finalSteer.x * entity.topSpeed * steeringStrength, y: finalSteer.y * entity.topSpeed * steeringStrength };
    }
    return { x: 0, y: 0 };
  }

  /**
   * Resolves hard collisions between an entity and static obstacles.
   * @param entity The entity being resolved.
   * @param x Desired X coordinate.
   * @param y Desired Y coordinate.
   * @returns A Vec2 representing the final valid position.
   */
  private resolveCollisions(entity: ArenaEntity, x: number, y: number): Vec2 {
    let currentX = x;
    let currentY = y;

    // Logic: 2 iterations for multi-obstacle stability (prevents corner jitter).
    for (let iteration = 0; iteration < 2; iteration++) {
      for (const obstacle of this.obstacles) {
        const resolution = this.resolveCircleAABB(currentX, currentY, entity.radius, obstacle);
        // Logic: Entities slide along walls because we only adjust position, not velocity here.
        currentX = resolution.x;
        currentY = resolution.y;
      }
    }
    return { x: currentX, y: currentY };
  }

  /**
   * Projects a circle out of an AABB (Axis-Aligned Bounding Box).
   * @param centerX Circle center X.
   * @param centerY Circle center Y.
   * @param radius Circle radius.
   * @param box The obstacle box.
   * @returns A Vec2 representing the nearest non-overlapping position.
   */
  private resolveCircleAABB(centerX: number, centerY: number, radius: number, box: AABB): Vec2 {
    let closestX = Math.max(box.x, Math.min(centerX, box.x + box.width));
    let closestY = Math.max(box.y, Math.min(centerY, box.y + box.height));

    let diffX = centerX - closestX;
    let diffY = centerY - closestY;

    // Logic: Fallback for entities completely embedded inside an obstacle.
    // Forces the entity to the nearest edge.
    if (diffX === 0 && diffY === 0) {
      const distLeft = centerX - box.x;
      const distRight = (box.x + box.width) - centerX;
      const distTop = centerY - box.y;
      const distBottom = (box.y + box.height) - centerY;
      const minDistance = Math.min(distLeft, distRight, distTop, distBottom);
      if (minDistance === distLeft) { diffX = -1; diffY = 0; closestX = box.x; }
      else if (minDistance === distRight) { diffX = 1; diffY = 0; closestX = box.x + box.width; }
      else if (minDistance === distTop) { diffX = 0; diffY = -1; closestY = box.y; }
      else { diffX = 0; diffY = 1; closestY = box.y + box.height; }
    }

    const distanceSquared = diffX * diffX + diffY * diffY;

    if (distanceSquared < radius * radius) {
      const distance = Math.sqrt(distanceSquared) || 0.001; // Avoid division by zero
      const overlap = radius - distance;
      const normalX = diffX / distance;
      const normalY = diffY / distance;
      return { x: centerX + normalX * overlap, y: centerY + normalY * overlap };
    }
    return { x: centerX, y: centerY };
  }

  /**
   * Checks if the line of sight between two points is obstructed by any arena obstacles.
   * @param origin Starting point of the observation.
   * @param target Destination point being observed.
   * @returns True if a collision is detected, false otherwise.
   */
  private isLOSBlocked(origin: Vec2, target: Vec2): boolean {
    for (const obstacle of this.obstacles) {
      if (this.checkRayAABBIntersection(origin.x, origin.y, target.x, target.y, obstacle)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Determines if a line segment intersects with an Axis-Aligned Bounding Box.
   * Logic: Performs a broad-phase boundary check, then tests against all four edges of the box.
   * @param startX X coordinate of segment start.
   * @param startY Y coordinate of segment start.
   * @param endX X coordinate of segment end.
   * @param endY Y coordinate of segment end.
   * @param boundingBox The AABB to check against.
   * @returns True if the ray intersects the box.
   */
  private checkRayAABBIntersection(startX: number, startY: number, endX: number, endY: number, boundingBox: AABB): boolean {
    const minX = boundingBox.x;
    const maxX = boundingBox.x + boundingBox.width;
    const minY = boundingBox.y;
    const maxY = boundingBox.y + boundingBox.height;

    // Logic: Quick rejection test using the ray's bounding box.
    if (Math.max(startX, endX) < minX || Math.min(startX, endX) > maxX ||
        Math.max(startY, endY) < minY || Math.min(startY, endY) > maxY) {
      return false;
    }

    const testLineIntersection = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number) => {
      const denominator = ((bx - ax) * (dy - cy)) - ((by - ay) * (dx - cx));
      if (denominator === 0) return false;
      const numerator1 = ((ay - cy) * (dx - cx)) - ((ax - cx) * (dy - cy));
      const numerator2 = ((ay - cy) * (bx - ax)) - ((ax - cx) * (by - ay));
      const r = numerator1 / denominator;
      const s = numerator2 / denominator;
      return (r >= 0 && r <= 1) && (s >= 0 && s <= 1);
    };

    if (testLineIntersection(startX, startY, endX, endY, minX, minY, maxX, minY)) return true; // Top
    if (testLineIntersection(startX, startY, endX, endY, minX, maxY, maxX, maxY)) return true; // Bottom
    if (testLineIntersection(startX, startY, endX, endY, minX, minY, minX, maxY)) return true; // Left
    if (testLineIntersection(startX, startY, endX, endY, maxX, minY, maxX, maxY)) return true; // Right

    return false;
  }

  /**
   * Calculates the exact intersection point (as a fraction [0, 1]) along a ray hitting an AABB.
   * Logic: Uses the Liang-Barsky algorithm for efficient ray-box clipping.
   * @param startX X coordinate of ray start.
   * @param startY Y coordinate of ray start.
   * @param endX X coordinate of ray end.
   * @param endY Y coordinate of ray end.
   * @param boundingBox The AABB to test against.
   * @returns The fraction [0, 1] of the distance to intersection, or Infinity if no hit.
   */
  private calculateRayIntersectionDistance(startX: number, startY: number, endX: number, endY: number, boundingBox: AABB): number {
    const diffX = endX - startX;
    const diffY = endY - startY;
    let tMin = 0;
    let tMax = 1;

    // X-axis intersections
    if (diffX !== 0) {
      const tx1 = (boundingBox.x - startX) / diffX;
      const tx2 = ((boundingBox.x + boundingBox.width) - startX) / diffX;
      tMin = Math.max(tMin, Math.min(tx1, tx2));
      tMax = Math.min(tMax, Math.max(tx1, tx2));
    } else if (startX < boundingBox.x || startX > boundingBox.x + boundingBox.width) {
      return Infinity; // Ray is parallel and outside the X bounds.
    }

    // Y-axis intersections
    if (diffY !== 0) {
      const ty1 = (boundingBox.y - startY) / diffY;
      const ty2 = ((boundingBox.y + boundingBox.height) - startY) / diffY;
      tMin = Math.max(tMin, Math.min(ty1, ty2));
      tMax = Math.min(tMax, Math.max(ty1, ty2));
    } else if (startY < boundingBox.y || startY > boundingBox.y + boundingBox.height) {
      return Infinity; // Ray is parallel and outside the Y bounds.
    }

    if (tMax >= tMin && tMin >= 0 && tMin <= 1) {
      return tMin; // Returns fraction of distance to intersection point.
    }
    return Infinity;
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  /**
   * Main render loop.
   * Logic: Clears the canvas, draws the environment, entities (sorted by Y for perspective), and effects.
   */
  private render() {
    const canvasContext = this.canvasContext;
    if (!canvasContext) return;

    // Clear Background
    canvasContext.fillStyle = '#0a0a1a';
    canvasContext.fillRect(0, 0, ARENA_W, ARENA_H);

    // Draw Grid for spatial reference
    canvasContext.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    canvasContext.lineWidth = 1;
    canvasContext.beginPath();
    for (let x = 0; x < ARENA_W; x += TILE_SIZE) { canvasContext.moveTo(x, 0); canvasContext.lineTo(x, ARENA_H); }
    for (let y = 0; y < ARENA_H; y += TILE_SIZE) { canvasContext.moveTo(0, y); canvasContext.lineTo(ARENA_W, y); }
    canvasContext.stroke();

    // Draw Boundary Walls
    canvasContext.strokeStyle = '#333';
    canvasContext.lineWidth = WALL_THICKNESS;
    canvasContext.strokeRect(WALL_THICKNESS / 2, WALL_THICKNESS / 2, ARENA_W - WALL_THICKNESS, ARENA_H - WALL_THICKNESS);

    this.drawObstacles(canvasContext);

    // Depth Sorting: Entities are sorted by Y position (adjusted for Z/height) to handle visual overlapping.
    this.renderList.length = 0;
    for (const drone of this.drones) {
      if (drone.state !== 'WITHDRAWN') this.renderList.push(drone);
    }
    if (this.enemy && this.enemy.state !== 'WITHDRAWN') this.renderList.push(this.enemy);

    this.renderList.sort((entityA, entityB) => {
      const sortValueA = entityA.y - (entityA.z * PERSPECTIVE_SCALE_Y);
      const sortValueB = entityB.y - (entityB.z * PERSPECTIVE_SCALE_Y);
      return sortValueA - sortValueB;
    });

    // Draw Shadows
    for (const entity of this.renderList) {
      canvasContext.fillStyle = 'rgba(0,0,0,0.5)';
      canvasContext.beginPath();
      canvasContext.ellipse(entity.x, entity.y, entity.radius, entity.radius * PERSPECTIVE_SCALE_Y, 0, 0, Math.PI * 2);
      canvasContext.fill();
    }

    // Draw Vision and Sensor effects
    if (this.enemy && this.enemy.hp > 0 && this.enemy.state !== 'WITHDRAWN') {
      this.drawEnemyFOV(canvasContext, this.enemy);
    }

    for (const drone of this.drones) {
      if (drone.state !== 'WITHDRAWN') {
        this.drawSensorLink(canvasContext, drone);
        this.drawDebugOverlay(canvasContext, drone);
      }
    }

    // Draw Entities
    for (const entity of this.renderList) {
      if (entity.isEnemy) {
        this.drawEnemy(canvasContext, entity);
      } else {
        this.drawDrone(canvasContext, entity);
      }
    }

    // Draw Projectiles with trails
    canvasContext.lineWidth = 2;
    for (const projectile of this.projectiles) {
      canvasContext.strokeStyle = projectile.color;
      canvasContext.beginPath();
      canvasContext.moveTo(projectile.x, projectile.y);
      canvasContext.lineTo(projectile.x - projectile.velocityX * 0.05, projectile.y - projectile.velocityY * 0.05);
      canvasContext.stroke();

      canvasContext.fillStyle = '#fff';
      canvasContext.beginPath();
      canvasContext.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
      canvasContext.fill();
    }
  }

  /**
   * Draws static obstacles with a subtle 3D-like perspective.
   * @param canvasContext The rendering context.
   */
  private drawObstacles(canvasContext: CanvasRenderingContext2D) {
    for (const obstacle of this.obstacles) {
      canvasContext.fillStyle = '#111520';
      canvasContext.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);

      // Draw "top" face for perspective
      canvasContext.fillStyle = '#1c2333';
      canvasContext.fillRect(obstacle.x, obstacle.y - 15, obstacle.width, 15);

      canvasContext.strokeStyle = '#2d3748';
      canvasContext.lineWidth = 2;
      canvasContext.strokeRect(obstacle.x, obstacle.y - 15, obstacle.width, obstacle.height + 15);
    }
  }

  /**
   * Renders the Field of View (FOV) cone for the enemy.
   * Logic: Casts multiple rays within the FOV angle to create a vision polygon clipped by obstacles.
   * @param canvasContext The rendering context.
   * @param enemy The enemy entity whose FOV is being drawn.
   */
  private drawEnemyFOV(canvasContext: CanvasRenderingContext2D, enemy: ArenaEntity) {
    const drawY = enemy.y - enemy.z * PERSPECTIVE_SCALE_Y;
    const fovRadians = Math.PI * 2 / 3; // 120 degrees total arc.
    const halfFov = fovRadians / 2;
    const steps = 30; // Resolution of the raycast polygon.

    canvasContext.fillStyle = 'rgba(255, 50, 50, 0.15)';
    canvasContext.beginPath();
    canvasContext.moveTo(enemy.x, drawY);

    for (let index = 0; index <= steps; index++) {
      const angle = enemy.rotation - halfFov + (fovRadians * index / steps);
      const targetX = enemy.x + Math.cos(angle) * enemy.sensorRange;
      const targetY = enemy.y + Math.sin(angle) * enemy.sensorRange;

      let minT = 1.0; // Max ray distance fraction.
      for (const obstacle of this.obstacles) {
        const intersectionT = this.calculateRayIntersectionDistance(enemy.x, enemy.y, targetX, targetY, obstacle);
        if (intersectionT < minT) minT = intersectionT;
      }

      const hitX = enemy.x + Math.cos(angle) * (enemy.sensorRange * minT);
      const hitY = enemy.y + Math.sin(angle) * (enemy.sensorRange * minT);
      const hitDrawY = hitY - enemy.z * PERSPECTIVE_SCALE_Y;

      canvasContext.lineTo(hitX, hitDrawY);
    }

    canvasContext.closePath();
    canvasContext.fill();

    canvasContext.strokeStyle = 'rgba(255, 50, 50, 0.3)';
    canvasContext.lineWidth = 1;
    canvasContext.stroke();
  }

  /**
   * Renders a drone entity on the canvas.
   * Logic: Draws a triangular ship shape with hit-flash effects and status bars.
   * @param canvasContext The rendering context.
   * @param drone The drone entity to draw.
   */
  private drawDrone(canvasContext: CanvasRenderingContext2D, drone: ArenaEntity) {
    canvasContext.save();
    const drawY = drone.y - drone.z * PERSPECTIVE_SCALE_Y;

    canvasContext.translate(drone.x, drawY);

    // Logic: Visual feedback for taking damage.
    if (drone.hitFlashTimer > 0) {
      canvasContext.fillStyle = '#ffffff';
      canvasContext.beginPath();
      canvasContext.arc(0, 0, drone.radius * 1.5, 0, Math.PI * 2);
      canvasContext.fill();

      // Logic: Expanding shockwave ring effect.
      canvasContext.strokeStyle = 'rgba(255, 255, 255, ' + (drone.hitFlashTimer * 5) + ')';
      canvasContext.lineWidth = 2;
      canvasContext.beginPath();
      canvasContext.arc(0, 0, drone.radius * (2 - drone.hitFlashTimer * 5), 0, Math.PI * 2);
      canvasContext.stroke();
    }

    canvasContext.rotate(drone.rotation);

    // Logic: Triangle ship geometry.
    canvasContext.fillStyle = drone.color;
    canvasContext.beginPath();
    canvasContext.moveTo(drone.radius, 0);
    canvasContext.lineTo(-drone.radius, drone.radius * 0.8);
    canvasContext.lineTo(-drone.radius * 0.5, 0);
    canvasContext.lineTo(-drone.radius, -drone.radius * 0.8);
    canvasContext.closePath();
    canvasContext.fill();

    canvasContext.strokeStyle = '#ffffff';
    canvasContext.lineWidth = 1;
    canvasContext.stroke();

    canvasContext.restore();
    this.drawStatusBars(canvasContext, drone.x, drawY - drone.radius - 10, drone);
  }

  /**
   * Renders the enemy entity on the canvas.
   * Logic: Draws a hexagonal shape with an "eye" indicator for rotation.
   * @param canvasContext The rendering context.
   * @param enemy The enemy entity to draw.
   */
  private drawEnemy(canvasContext: CanvasRenderingContext2D, enemy: ArenaEntity) {
    canvasContext.save();
    const drawY = enemy.y - enemy.z * PERSPECTIVE_SCALE_Y;
    canvasContext.translate(enemy.x, drawY);

    // Logic: Visual feedback for taking damage.
    if (enemy.hitFlashTimer > 0) {
      canvasContext.fillStyle = '#ffffff';
      canvasContext.beginPath();
      canvasContext.arc(0, 0, enemy.radius * 1.5, 0, Math.PI * 2);
      canvasContext.fill();

      // Logic: Expanding shockwave ring effect.
      canvasContext.strokeStyle = 'rgba(255, 255, 255, ' + (enemy.hitFlashTimer * 5) + ')';
      canvasContext.lineWidth = 2;
      canvasContext.beginPath();
      canvasContext.arc(0, 0, enemy.radius * (2 - enemy.hitFlashTimer * 5), 0, Math.PI * 2);
      canvasContext.stroke();
    }

    canvasContext.rotate(enemy.rotation);

    // Logic: Hexagonal geometry for the hostile entity.
    canvasContext.fillStyle = enemy.color;
    canvasContext.beginPath();
    for (let index = 0; index < 6; index++) {
      const angle = (Math.PI / 3) * index;
      const pointX = Math.cos(angle) * enemy.radius;
      const pointY = Math.sin(angle) * enemy.radius;
      if (index === 0) canvasContext.moveTo(pointX, pointY);
      else canvasContext.lineTo(pointX, pointY);
    }
    canvasContext.closePath();
    canvasContext.fill();

    // Logic: Small indicator representing the entity's forward facing "eye".
    canvasContext.fillStyle = '#fff';
    canvasContext.beginPath();
    canvasContext.arc(enemy.radius * 0.6, 0, 4, 0, Math.PI * 2);
    canvasContext.fill();

    canvasContext.restore();
    this.drawStatusBars(canvasContext, enemy.x, drawY - enemy.radius - 15, enemy);
  }

  /**
   * Draws health and energy bars above an entity.
   * @param canvasContext The rendering context.
   * @param x X coordinate for the bars.
   * @param y Y coordinate for the bars.
   * @param entity The entity whose status is being displayed.
   */
  private drawStatusBars(canvasContext: CanvasRenderingContext2D, x: number, y: number, entity: ArenaEntity) {
    const barWidth = 30;
    const barHeight = 3;
    const verticalGap = 2;

    // HP Bar logic: Green if healthy, red if low.
    canvasContext.fillStyle = '#111';
    canvasContext.fillRect(x - barWidth / 2, y, barWidth, barHeight);
    canvasContext.fillStyle = entity.hp > entity.maxHp * 0.2 ? '#00ffaa' : '#ff3333';
    canvasContext.fillRect(x - barWidth / 2, y, barWidth * Math.max(0, entity.hp / entity.maxHp), barHeight);

    // Energy Bar logic: Yellow bar representing current action resource.
    canvasContext.fillStyle = '#111';
    canvasContext.fillRect(x - barWidth / 2, y + barHeight + verticalGap, barWidth, barHeight - 1);
    canvasContext.fillStyle = '#ffee00';
    canvasContext.fillRect(x - barWidth / 2, y + barHeight + verticalGap, barWidth * Math.max(0, entity.energy / entity.maxEnergy), barHeight - 1);
  }

  /**
   * Draws a visual link between a drone and the enemy if they are within sensor range.
   * Logic: Colors the link based on line-of-sight and sensor capabilities.
   * @param canvasContext The rendering context.
   * @param drone The drone searching for the enemy.
   */
  private drawSensorLink(canvasContext: CanvasRenderingContext2D, drone: ArenaEntity) {
    if (this.enemy.hp <= 0 || drone.state === 'WITHDRAWN') return;

    const currentDistance = this.calculateDistance(drone, this.enemy);
    if (currentDistance > drone.sensorRange) return;

    const isBlocked = this.isLOSBlocked(drone, this.enemy);

    canvasContext.beginPath();
    canvasContext.moveTo(drone.x, drone.y - drone.z * PERSPECTIVE_SCALE_Y);
    canvasContext.lineTo(this.enemy.x, this.enemy.y - this.enemy.z * PERSPECTIVE_SCALE_Y);

    if (isBlocked) {
      if (drone.sensorId === 'sens-terahertz') {
        canvasContext.strokeStyle = 'rgba(200, 50, 255, 0.6)'; // Terahertz "x-ray" purple.
        canvasContext.setLineDash([2, 2]);
      } else {
        canvasContext.strokeStyle = 'rgba(255, 50, 50, 0.4)'; // Obstructed view.
        canvasContext.setLineDash([4, 4]);
      }
    } else {
      canvasContext.strokeStyle = 'rgba(0, 255, 255, 0.6)'; // Clear target lock.
      canvasContext.setLineDash([]);
    }

    canvasContext.lineWidth = 1;
    canvasContext.stroke();
    canvasContext.setLineDash([]);
  }

  /**
   * Draws debug overlays for a drone, including sensor range and current state.
   * Logic: Standard sensors draw a raycasted polygon; Terahertz draws a simple circle.
   * @param canvasContext The rendering context.
   * @param drone The drone whose overlay is being drawn.
   */
  private drawDebugOverlay(canvasContext: CanvasRenderingContext2D, drone: ArenaEntity) {
    const drawY = drone.y - drone.z * PERSPECTIVE_SCALE_Y;

    canvasContext.strokeStyle = 'rgba(0, 255, 255, 0.2)';
    canvasContext.setLineDash([5, 5]);
    canvasContext.beginPath();

    if (drone.sensorId === 'sens-terahertz') {
      // Logic: Terahertz penetration allows seeing through obstacles, represented as a simple circle.
      canvasContext.ellipse(drone.x, drone.y, drone.sensorRange, drone.sensorRange * PERSPECTIVE_SCALE_Y, 0, 0, Math.PI * 2);
    } else {
      // Logic: Standard sensors are clipped by obstacles, rendered as a 360-degree raycast polygon.
      const resolutionSteps = 72; // High-res scan for visual fidelity.
      const stepAngle = (Math.PI * 2) / resolutionSteps;
      canvasContext.moveTo(drone.x, drone.y);

      for (let index = 0; index <= resolutionSteps; index++) {
        const angle = index * stepAngle;
        const targetPointX = drone.x + Math.cos(angle) * drone.sensorRange;
        const targetPointY = drone.y + Math.sin(angle) * drone.sensorRange;

        let minFraction = 1.0;
        for (const obstacle of this.obstacles) {
          const intersectionFraction = this.calculateRayIntersectionDistance(drone.x, drone.y, targetPointX, targetPointY, obstacle);
          if (intersectionFraction < minFraction) minFraction = intersectionFraction;
        }

        const hitX = drone.x + Math.cos(angle) * (drone.sensorRange * minFraction);
        const hitY = drone.y + Math.sin(angle) * (drone.sensorRange * minFraction);
        canvasContext.lineTo(hitX, hitY);
      }
    }

    canvasContext.stroke();
    canvasContext.setLineDash([]);

    // Add a faint fill to make the sensor range more tangible.
    canvasContext.fillStyle = drone.sensorId === 'sens-terahertz' ? 'rgba(200, 50, 255, 0.05)' : 'rgba(0, 255, 255, 0.03)';
    canvasContext.fill();

    canvasContext.fillStyle = 'rgba(255,255,255,0.7)';
    canvasContext.font = '10px monospace';
    canvasContext.textAlign = 'center';
    canvasContext.fillText(drone.state, drone.x, drawY - drone.radius - 22);

    // Logic: Status indicators for rebooting and strike readiness.
    if (drone.rebootTimer > 0) {
      canvasContext.fillStyle = '#ff3333';
      canvasContext.font = 'bold 10px monospace';
      canvasContext.fillText(`REBOOTING ${drone.rebootTimer.toFixed(1)}s`, drone.x, drawY - drone.radius - 32);
    } else if (drone.canStrike) {
      canvasContext.fillStyle = '#ffee00';
      canvasContext.font = 'bold 12px monospace';
      canvasContext.fillText('⚡', drone.x, drawY - drone.radius - 32);
    }

    // Logic: Visual marker for the last known location during a search.
    if (drone.state === 'SEARCHING' && drone.lastSeenPos) {
      canvasContext.strokeStyle = 'rgba(255, 255, 0, 0.8)';
      canvasContext.beginPath();
      const lastX = drone.lastSeenPos.x;
      const lastY = drone.lastSeenPos.y;
      canvasContext.moveTo(lastX - 5, lastY); canvasContext.lineTo(lastX + 5, lastY);
      canvasContext.moveTo(lastX, lastY - 5); canvasContext.lineTo(lastX, lastY + 5);
      canvasContext.stroke();

      canvasContext.beginPath();
      canvasContext.setLineDash([2, 4]);
      canvasContext.moveTo(drone.x, drone.y);
      canvasContext.lineTo(lastX, lastY);
      canvasContext.stroke();
      canvasContext.setLineDash([]);
    }
  }
}