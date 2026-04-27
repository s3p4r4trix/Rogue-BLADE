import {
  Component, ChangeDetectionStrategy, input, effect,
  ElementRef, viewChild, OnDestroy, output,
  untracked, afterNextRender
} from '@angular/core';
import { Shuriken } from '../models/hardware.model';
import { MissionContract } from '../models/mission.model';
import { Vec2, AABB, ArenaEntity, Projectile } from '../models/arena.model';

// ─── Arena Constants ───────────────────────────────────────────────
const ARENA_W = 800;
const ARENA_H = 800;
const WALL_THICKNESS = 16;
const TILE_SIZE = 40;
const PERSPECTIVE_SCALE_Y = 0.7;
const MIN_STRIKE_SPEED = 0.4;
const STRIKE_COOLDOWN = 1.5;
const SEARCH_LINGER_TIME = 3;
const ENEMY_STRIKE_COOLDOWN = 2.0;
const ENEMY_DAMAGE = 15;
const PROJECTILE_SPEED = 300;
const PROJECTILE_RADIUS = 3;
const FIRE_RATE = 2.0; // Seconds between shots

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

  private canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('arenaCanvas');
  private ctx!: CanvasRenderingContext2D;

  private animFrameId = 0;
  private lastTime = 0;

  // ─── Arena State ───────────────────────────────────────────────
  private obstacles: AABB[] = [];
  private drones: ArenaEntity[] = [];
  private enemy!: ArenaEntity;
  private arenaTime = 0;
  private isGameOver = false;
  private projectiles: Projectile[] = [];

  private renderList: ArenaEntity[] = [];

  constructor() {
    afterNextRender(() => {
      const el = this.canvas().nativeElement;
      el.width = ARENA_W;
      el.height = ARENA_H;
      this.ctx = el.getContext('2d')!;

      this.initObstacles();

      const m = this.mission();
      const s = this.shurikens();
      if (m && s.length > 0) {
        this.initEntities(s, m);
      } else {
        const mockDrone = {
          id: 'mock-1', name: 'Alpha-Blade',
          engine: { topSpeed: 180, acceleration: 60 } as any,
          hull: { maxHp: 100 } as any,
          sensor: { range: 200 } as any
        } as Shuriken;
        this.initEntities([mockDrone], null);
      }

      this.lastTime = performance.now();
      this.tick(this.lastTime);
    });

    effect(() => {
      const m = this.mission();
      const s = this.shurikens();

      untracked(() => {
        if (this.ctx && m && s.length > 0) {
          this.initEntities(s, m);
        }
      });
    });
  }

  ngOnDestroy() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
  }

  // ═══════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════

  private initObstacles() {
    this.obstacles = [
      { x: 300, y: 300, w: 200, h: 60 },
      { x: 150, y: 500, w: 80, h: 120 },
      { x: 550, y: 150, w: 80, h: 120 },
      { x: 400, y: 600, w: 120, h: 60 }
    ];
  }

  private initEntities(shurikens: Shuriken[], mission: MissionContract | null) {
    this.isGameOver = false;
    this.arenaTime = 0;
    this.drones = [];
    this.projectiles = [];

    shurikens.forEach((s, idx) => {
      this.drones.push({
        id: s.id,
        name: s.name,
        x: 100 + (idx * 50), y: 700, z: 20,
        vx: 0, vy: 0,
        speed: 0,
        topSpeed: s.engine?.topSpeed || 150,
        acceleration: s.engine?.acceleration || 50,
        radius: 12,
        color: '#00f0ff',
        sensorRange: s.sensor?.range || 200,
        state: 'PATROLLING',
        orbitAngle: 0,
        isEnemy: false,
        hp: s.hull?.maxHp || 100,
        maxHp: s.hull?.maxHp || 100,
        strikeCooldown: 0,
        canStrike: false,
        lastSeenPos: null,
        searchTimer: 0,
        hitFlashTimer: 0,
        withdrawalTimer: 0,
        rotation: -Math.PI / 2,
        patrolPos: this.getRandomPatrolPos()
      });
    });

    const targetHull = mission?.hull || 500;
    const targetShields = mission?.shields || 0;
    const targetName = mission?.targetName || 'Zenith Warden';

    this.enemy = {
      id: 'enemy_1',
      name: targetName,
      x: 400, y: 100, z: 0,
      vx: 0, vy: 0,
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
      strikeCooldown: 0,
      canStrike: false,
      lastSeenPos: null,
      searchTimer: 0,
      hitFlashTimer: 0,
      withdrawalTimer: 0,
      rotation: Math.PI / 2,
      patrolPos: this.getRandomPatrolPos()
    };

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

  private tick = (now: number) => {
    const dt = Math.max(0, Math.min((now - this.lastTime) / 1000, 0.05));
    this.lastTime = now;
    this.arenaTime += dt;

    this.update(dt);
    this.render();

    this.animFrameId = requestAnimationFrame(this.tick);
  };

  private emitLog(msg: string) {
    this.arenaLog.emit(`[${this.arenaTime.toFixed(1)}s] ${msg}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // UPDATE (Physics + AI)
  // ═══════════════════════════════════════════════════════════════

  private update(dt: number) {
    if (this.isGameOver) return;

    this.drones.forEach(drone => {
      this.updateEntityAI(drone, this.enemy, dt);
      const targetV = this.getBehaviorVelocity(drone, this.enemy, dt);
      this.updateEntityPhysics(drone, targetV, dt, 0.6);

      if (drone.strikeCooldown > 0) drone.strikeCooldown -= dt;
      if (drone.hitFlashTimer > 0) drone.hitFlashTimer -= dt;
      drone.canStrike = drone.speed >= (drone.topSpeed * MIN_STRIKE_SPEED);
    });

    if (this.enemy.hp > 0) {
      let closestDrone = null;
      let minDist = Infinity;
      this.drones.forEach(d => {
        const dist = this.dist(this.enemy, d);
        if (dist < minDist && d.state !== 'WITHDRAWN' && d.hp > 0) { minDist = dist; closestDrone = d; }
      });

      if (closestDrone) {
        this.updateEntityAI(this.enemy, closestDrone, dt);
        const enemyV = this.getBehaviorVelocity(this.enemy, closestDrone, dt);
        this.updateEntityPhysics(this.enemy, enemyV, dt, 0.4);
      } else {
        // If no targets, patrol
        const patrolV = this.getBehaviorVelocity(this.enemy, this.enemy, dt);
        this.updateEntityPhysics(this.enemy, patrolV, dt, 0.4);
      }
      if (this.enemy.strikeCooldown > 0) this.enemy.strikeCooldown -= dt;
      if (this.enemy.hitFlashTimer > 0) this.enemy.hitFlashTimer -= dt;
      this.enemy.canStrike = true;
    }

    this.updateProjectiles(dt);

    // Periodic Telemetry for Squad UI (every 0.5s)
    if (Math.floor(this.arenaTime * 2) > Math.floor((this.arenaTime - dt) * 2)) {
      this.drones.forEach(d => {
        this.arenaLog.emit(`[TELEMETRY] ${d.name}: H:${Math.ceil(d.hp)}/${d.maxHp} S:0/0 E:100/100 R:0`);
      });
    }

    const livingDrones = this.drones.filter(d => d.hp > 0 && d.state !== 'WITHDRAWN');

    if (livingDrones.length === 0) {
      this.isGameOver = true;
      this.missionComplete.emit({ success: false });
    } else if (this.enemy.hp <= 0) {
      this.isGameOver = true;
      this.missionComplete.emit({ success: true });
    }
  }

  private updateEntityAI(entity: ArenaEntity, target: ArenaEntity, dt: number) {
    if (entity.hp <= 0) {
      entity.state = 'WITHDRAWN';
      return;
    }

    const dist = this.dist(entity, target);

    // Enemies have a limited 120-degree FOV cone, drones have 360-degree radar
    let isWithinFOV = true;
    if (entity.isEnemy) {
      const angleToTarget = Math.atan2(target.y - entity.y, target.x - entity.x);
      const angleDiff = Math.abs(this.normalizeAngle(entity.rotation - angleToTarget));
      isWithinFOV = angleDiff <= Math.PI / 3; // 60 degrees left/right
    }

    const hasLOS = !this.isLOSBlocked(entity, target);
    const canSeeTarget = dist <= entity.sensorRange && hasLOS && target.hp > 0 && isWithinFOV;

    if (entity.hp < entity.maxHp * 0.2 && entity.state !== 'FLEEING') {
      entity.state = 'FLEEING';
      this.emitLog(`${entity.name} sustained critical damage. Initiating Emergency Withdrawal.`);
    }

    if (entity.state === 'FLEEING') return;

    if (canSeeTarget) {
      entity.lastSeenPos = { x: target.x, y: target.y };
      entity.searchTimer = 0;

      if (entity.isEnemy) {
        if (entity.strikeCooldown <= 0) {
          entity.state = 'SHOOTING';
          this.fireProjectile(entity, target);
        } else {
          entity.state = 'IDLE'; // Stop and wait for cooldown
        }
      } else {
        // Strike threshold requires strict physical collision (overlapping radii)
        if (dist <= (entity.radius + target.radius) && entity.canStrike && entity.strikeCooldown <= 0) {
          entity.state = 'FIGHTING';
          this.executeStrike(entity, target);
        } else if (entity.strikeCooldown > 0) {
          entity.state = 'ORBITING';
        } else {
          entity.state = 'PURSUING';
        }
      }
    } else {
      if (entity.lastSeenPos) {
        entity.state = 'SEARCHING';
        entity.searchTimer += dt;
        if (entity.searchTimer >= SEARCH_LINGER_TIME) {
          entity.lastSeenPos = null;
          entity.state = 'PATROLLING';
        }
      } else {
        entity.state = 'PATROLLING';
      }
    }
  }

  private executeStrike(attacker: ArenaEntity, defender: ArenaEntity) {
    if (attacker.isEnemy) {
      defender.hp -= ENEMY_DAMAGE;
      defender.hitFlashTimer = 0.2;
      this.emitLog(`Impact -> ${defender.name} (Hull: -${ENEMY_DAMAGE}) [REM: ${Math.max(0, Math.ceil(defender.hp))} HP]`);
    } else {
      const speedMult = attacker.speed / attacker.topSpeed;
      const damage = Math.max(5, Math.floor(20 * (1 + speedMult)));
      defender.hp -= damage;
      defender.hitFlashTimer = 0.2;
      this.emitLog(`${defender.name}: Hull Hit (-${damage} H) [REM: ${Math.max(0, Math.ceil(defender.hp))}]`);
    }

    // Reactive Awareness: Defender becomes immediately aware of the attacker's position
    defender.lastSeenPos = { x: attacker.x, y: attacker.y };
    defender.searchTimer = 0;

    attacker.strikeCooldown = attacker.isEnemy ? ENEMY_STRIKE_COOLDOWN : STRIKE_COOLDOWN;

    const bounceVec = this.normalize({ x: attacker.x - defender.x, y: attacker.y - defender.y });
    attacker.vx = bounceVec.x * (attacker.topSpeed * 0.7);
    attacker.vy = bounceVec.y * (attacker.topSpeed * 0.7);
  }

  private getBehaviorVelocity(entity: ArenaEntity, target: ArenaEntity, dt: number): Vec2 {
    let targetVx = 0;
    let targetVy = 0;

    switch (entity.state) {
      case 'PURSUING':
        const dir = this.normalize({ x: target.x - entity.x, y: target.y - entity.y });
        targetVx = dir.x * entity.topSpeed;
        targetVy = dir.y * entity.topSpeed;
        break;

      case 'ORBITING':
        const toTarget = { x: entity.x - target.x, y: entity.y - target.y };
        const dist = Math.max(1, Math.sqrt(toTarget.x ** 2 + toTarget.y ** 2));
        const orbitRadius = entity.sensorRange * 0.6;

        const radialPull = (orbitRadius - dist) * 2;

        const tangentX = -toTarget.y / dist;
        const tangentY = toTarget.x / dist;

        targetVx = (tangentX * entity.topSpeed) + ((toTarget.x / dist) * radialPull);
        targetVy = (tangentY * entity.topSpeed) + ((toTarget.y / dist) * radialPull);
        break;

      case 'SEARCHING':
        if (entity.lastSeenPos) {
          const sDist = this.dist(entity, entity.lastSeenPos);
          if (sDist > 30) {
            const sDir = this.normalize({ x: entity.lastSeenPos.x - entity.x, y: entity.lastSeenPos.y - entity.y });
            targetVx = sDir.x * entity.topSpeed;
            targetVy = sDir.y * entity.topSpeed;
          } else {
            entity.orbitAngle += dt * 2;
            const radius = 30 + (entity.searchTimer * 20);
            const tx = entity.lastSeenPos.x + Math.cos(entity.orbitAngle) * radius;
            const ty = entity.lastSeenPos.y + Math.sin(entity.orbitAngle) * radius;
            const sDir = this.normalize({ x: tx - entity.x, y: ty - entity.y });
            targetVx = sDir.x * (entity.topSpeed * 0.6);
            targetVy = sDir.y * (entity.topSpeed * 0.6);
          }
        }
        break;

      case 'PATROLLING':
        if (!entity.patrolPos) entity.patrolPos = this.getRandomPatrolPos();
        const pDist = this.dist(entity, entity.patrolPos);
        if (pDist < 20) {
          entity.patrolPos = this.getRandomPatrolPos();
        } else {
          const pDir = this.normalize({ x: entity.patrolPos.x - entity.x, y: entity.patrolPos.y - entity.y });
          targetVx = pDir.x * (entity.topSpeed * 0.8);
          targetVy = pDir.y * (entity.topSpeed * 0.8);
        }
        break;

      case 'FLEEING':
        const fleeDir = this.normalize({ x: entity.x - target.x, y: entity.y - target.y });
        targetVx = fleeDir.x * entity.topSpeed;
        targetVy = fleeDir.y * entity.topSpeed;

        if (entity.x < WALL_THICKNESS * 2 || entity.x > ARENA_W - WALL_THICKNESS * 2 ||
          entity.y < WALL_THICKNESS * 2 || entity.y > ARENA_H - WALL_THICKNESS * 2) {
          entity.withdrawalTimer += dt;
          if (entity.withdrawalTimer >= 2.0) {
            entity.state = 'WITHDRAWN';
            this.emitLog(`${entity.name} successfully withdrew from combat.`);
          }
        }
        break;

      case 'FIGHTING':
      case 'SHOOTING':
      case 'IDLE':
        // Stationary behavior
        targetVx = 0;
        targetVy = 0;
        break;
    }

    return { x: targetVx, y: targetVy };
  }

  private fireProjectile(attacker: ArenaEntity, target: ArenaEntity) {
    const id = `proj_${this.arenaTime}_${Math.random().toString(36).substr(2, 4)}`;
    const dir = this.normalize({ x: target.x - attacker.x, y: target.y - attacker.y });
    
    // Rotate attacker towards target
    attacker.rotation = Math.atan2(dir.y, dir.x);

    this.projectiles.push({
      id,
      x: attacker.x + dir.x * attacker.radius,
      y: attacker.y + dir.y * attacker.radius,
      vx: dir.x * PROJECTILE_SPEED,
      vy: dir.y * PROJECTILE_SPEED,
      radius: PROJECTILE_RADIUS,
      damage: ENEMY_DAMAGE,
      ownerId: attacker.id,
      isEnemy: attacker.isEnemy,
      color: attacker.color,
      lifeTime: 3.0
    });

    attacker.strikeCooldown = FIRE_RATE;
    this.emitLog(`${attacker.name} fired energy projectile at ${target.name}`);
  }

  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.lifeTime -= dt;

      if (p.lifeTime <= 0) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Wall collision
      if (p.x < WALL_THICKNESS || p.x > ARENA_W - WALL_THICKNESS || 
          p.y < WALL_THICKNESS || p.y > ARENA_H - WALL_THICKNESS) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Obstacle collision
      let hitObstacle = false;
      for (const obs of this.obstacles) {
        if (p.x >= obs.x && p.x <= obs.x + obs.w && p.y >= obs.y && p.y <= obs.y + obs.h) {
          hitObstacle = true;
          break;
        }
      }
      if (hitObstacle) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Entity collision
      if (p.isEnemy) {
        // Check drones
        let hitDrone = false;
        for (const drone of this.drones) {
          if (drone.hp > 0 && drone.state !== 'WITHDRAWN') {
            const dist = Math.sqrt((p.x - drone.x) ** 2 + (p.y - drone.y) ** 2);
            if (dist < drone.radius + p.radius) {
              drone.hp -= p.damage;
              drone.hitFlashTimer = 0.2;
              this.emitLog(`Impact -> ${drone.name} (Hull: -${p.damage}) [REM: ${Math.max(0, Math.ceil(drone.hp))} HP]`);
              
              // Reactive Awareness: Drone becomes aware of the enemy's position
              drone.lastSeenPos = { x: this.enemy.x, y: this.enemy.y };
              drone.searchTimer = 0;
              
              hitDrone = true;
              break;
            }
          }
        }
        if (hitDrone) {
          this.projectiles.splice(i, 1);
          continue;
        }
      } else {
        // Check enemy
        const dist = Math.sqrt((p.x - this.enemy.x) ** 2 + (p.y - this.enemy.y) ** 2);
        if (dist < this.enemy.radius + p.radius) {
          this.enemy.hp -= p.damage;
          this.enemy.hitFlashTimer = 0.2;
          this.emitLog(`${this.enemy.name}: Hull Hit (-${p.damage} H) [REM: ${Math.max(0, Math.ceil(this.enemy.hp))}]`);
          
          // Reactive Awareness: Enemy becomes aware of the attacker's position
          const attacker = this.drones.find(d => d.id === p.ownerId);
          if (attacker) {
            this.enemy.lastSeenPos = { x: attacker.x, y: attacker.y };
            this.enemy.searchTimer = 0;
          }
          
          this.projectiles.splice(i, 1);
          continue;
        }
      }
    }
  }

  private updateEntityPhysics(entity: ArenaEntity, targetV: Vec2, dt: number, avoidanceWeight: number) {
    const avoidance = this.getSteeringAvoidance(entity);

    let finalTargetVx = targetV.x;
    let finalTargetVy = targetV.y;

    if (avoidance.x !== 0 || avoidance.y !== 0) {
      finalTargetVx = (targetV.x * (1 - avoidanceWeight)) + (avoidance.x * avoidanceWeight);
      finalTargetVy = (targetV.y * (1 - avoidanceWeight)) + (avoidance.y * avoidanceWeight);
    }

    const accelStep = entity.acceleration * dt * 10;

    if (entity.vx < finalTargetVx) entity.vx = Math.min(finalTargetVx, entity.vx + accelStep);
    if (entity.vx > finalTargetVx) entity.vx = Math.max(finalTargetVx, entity.vx - accelStep);
    if (entity.vy < finalTargetVy) entity.vy = Math.min(finalTargetVy, entity.vy + accelStep);
    if (entity.vy > finalTargetVy) entity.vy = Math.max(finalTargetVy, entity.vy - accelStep);

    entity.speed = Math.sqrt(entity.vx ** 2 + entity.vy ** 2);

    if (entity.speed > 5) {
      // Smooth rotation interpolation
      const targetRotation = Math.atan2(entity.vy, entity.vx);
      const rotDiff = this.normalizeAngle(targetRotation - entity.rotation);
      entity.rotation += rotDiff * (dt * 10);
    }

    let nextX = entity.x + entity.vx * dt;
    let nextY = entity.y + entity.vy * dt;

    // Hard Boundary Bounce
    if (nextX < WALL_THICKNESS + entity.radius) { nextX = WALL_THICKNESS + entity.radius; entity.vx *= -0.2; }
    if (nextX > ARENA_W - WALL_THICKNESS - entity.radius) { nextX = ARENA_W - WALL_THICKNESS - entity.radius; entity.vx *= -0.2; }
    if (nextY < WALL_THICKNESS + entity.radius) { nextY = WALL_THICKNESS + entity.radius; entity.vy *= -0.2; }
    if (nextY > ARENA_H - WALL_THICKNESS - entity.radius) { nextY = ARENA_H - WALL_THICKNESS - entity.radius; entity.vy *= -0.2; }

    const resolved = this.resolveCollisions(entity, nextX, nextY);
    entity.x = resolved.x;
    entity.y = resolved.y;
  }

  // ═══════════════════════════════════════════════════════════════
  // MATH & SPATIAL QUERIES
  // ═══════════════════════════════════════════════════════════════

  private dist(a: Vec2, b: Vec2): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  private normalize(v: Vec2): Vec2 {
    const len = Math.sqrt(v.x * v.x + v.y * v.y);
    if (len === 0) return { x: 0, y: 0 };
    return { x: v.x / len, y: v.y / len };
  }

  private normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }

  private getSteeringAvoidance(entity: ArenaEntity): Vec2 {
    const feelerDist = 60;
    const fx = entity.x + Math.cos(entity.rotation) * feelerDist;
    const fy = entity.y + Math.sin(entity.rotation) * feelerDist;

    for (const obs of this.obstacles) {
      if (fx >= obs.x && fx <= obs.x + obs.w && fy >= obs.y && fy <= obs.y + obs.h) {
        const cx = obs.x + obs.w / 2;
        const cy = obs.y + obs.h / 2;
        const steer = this.normalize({ x: entity.x - cx, y: entity.y - cy });
        return { x: steer.x * entity.topSpeed, y: steer.y * entity.topSpeed };
      }
    }
    return { x: 0, y: 0 };
  }

  private resolveCollisions(entity: ArenaEntity, x: number, y: number): Vec2 {
    let currentX = x;
    let currentY = y;

    // 2 iterations for stability
    for (let i = 0; i < 2; i++) {
      for (const obs of this.obstacles) {
        const res = this.resolveCircleAABB(currentX, currentY, entity.radius, obs);
        // By NOT dampening vx/vy here, entities will slide beautifully along the walls
        currentX = res.x;
        currentY = res.y;
      }
    }
    return { x: currentX, y: currentY };
  }

  private resolveCircleAABB(cx: number, cy: number, r: number, box: AABB): Vec2 {
    let closestX = Math.max(box.x, Math.min(cx, box.x + box.w));
    let closestY = Math.max(box.y, Math.min(cy, box.y + box.h));

    let dx = cx - closestX;
    let dy = cy - closestY;

    // Fallback: If center is completely inside the box (dx=0, dy=0), force it to the nearest edge
    if (dx === 0 && dy === 0) {
      const distLeft = cx - box.x;
      const distRight = (box.x + box.w) - cx;
      const distTop = cy - box.y;
      const distBottom = (box.y + box.h) - cy;
      const minDist = Math.min(distLeft, distRight, distTop, distBottom);
      if (minDist === distLeft) { dx = -1; dy = 0; closestX = box.x; }
      else if (minDist === distRight) { dx = 1; dy = 0; closestX = box.x + box.w; }
      else if (minDist === distTop) { dx = 0; dy = -1; closestY = box.y; }
      else { dx = 0; dy = 1; closestY = box.y + box.h; }
    }

    const distSq = dx * dx + dy * dy;

    if (distSq < r * r) {
      const dist = Math.sqrt(distSq);
      const overlap = r - dist;
      const nx = dx / dist;
      const ny = dy / dist;
      return { x: cx + nx * overlap, y: cy + ny * overlap };
    }
    return { x: cx, y: cy };
  }

  private isLOSBlocked(origin: Vec2, target: Vec2): boolean {
    for (const obs of this.obstacles) {
      if (this.rayIntersectsAABB(origin.x, origin.y, target.x, target.y, obs)) {
        return true;
      }
    }
    return false;
  }

  private rayIntersectsAABB(x1: number, y1: number, x2: number, y2: number, box: AABB): boolean {
    const minX = box.x;
    const maxX = box.x + box.w;
    const minY = box.y;
    const maxY = box.y + box.h;

    if (Math.max(x1, x2) < minX || Math.min(x1, x2) > maxX ||
      Math.max(y1, y2) < minY || Math.min(y1, y2) > maxY) {
      return false;
    }

    const lineIntersects = (a_x: number, a_y: number, b_x: number, b_y: number, c_x: number, c_y: number, d_x: number, d_y: number) => {
      const denominator = ((b_x - a_x) * (d_y - c_y)) - ((b_y - a_y) * (d_x - c_x));
      if (denominator === 0) return false;
      const numerator1 = ((a_y - c_y) * (d_x - c_x)) - ((a_x - c_x) * (d_y - c_y));
      const numerator2 = ((a_y - c_y) * (b_x - a_x)) - ((a_x - c_x) * (b_y - a_y));
      const r = numerator1 / denominator;
      const s = numerator2 / denominator;
      return (r >= 0 && r <= 1) && (s >= 0 && s <= 1);
    };

    if (lineIntersects(x1, y1, x2, y2, minX, minY, maxX, minY)) return true; // Top
    if (lineIntersects(x1, y1, x2, y2, minX, maxY, maxX, maxY)) return true; // Bottom
    if (lineIntersects(x1, y1, x2, y2, minX, minY, minX, maxY)) return true; // Left
    if (lineIntersects(x1, y1, x2, y2, maxX, minY, maxX, maxY)) return true; // Right

    return false;
  }

  // Uses Liang-Barsky method to find the exact intersection distance (0 to 1 fraction) along the ray
  private getRayIntersectionDist(x1: number, y1: number, x2: number, y2: number, box: AABB): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    let tmin = 0;
    let tmax = 1;

    // X-axis intersections
    if (dx !== 0) {
      const tx1 = (box.x - x1) / dx;
      const tx2 = ((box.x + box.w) - x1) / dx;
      tmin = Math.max(tmin, Math.min(tx1, tx2));
      tmax = Math.min(tmax, Math.max(tx1, tx2));
    } else if (x1 < box.x || x1 > box.x + box.w) {
      return Infinity; // Ray is parallel and outside
    }

    // Y-axis intersections
    if (dy !== 0) {
      const ty1 = (box.y - y1) / dy;
      const ty2 = ((box.y + box.h) - y1) / dy;
      tmin = Math.max(tmin, Math.min(ty1, ty2));
      tmax = Math.min(tmax, Math.max(ty1, ty2));
    } else if (y1 < box.y || y1 > box.y + box.h) {
      return Infinity; // Ray is parallel and outside
    }

    if (tmax >= tmin && tmin >= 0 && tmin <= 1) {
      return tmin; // Returns fraction of distance to intersection
    }
    return Infinity;
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  private render() {
    const ctx = this.ctx;
    if (!ctx) return;

    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, ARENA_W, ARENA_H);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < ARENA_W; x += TILE_SIZE) { ctx.moveTo(x, 0); ctx.lineTo(x, ARENA_H); }
    for (let y = 0; y < ARENA_H; y += TILE_SIZE) { ctx.moveTo(0, y); ctx.lineTo(ARENA_W, y); }
    ctx.stroke();

    ctx.strokeStyle = '#333';
    ctx.lineWidth = WALL_THICKNESS;
    ctx.strokeRect(WALL_THICKNESS / 2, WALL_THICKNESS / 2, ARENA_W - WALL_THICKNESS, ARENA_H - WALL_THICKNESS);

    this.drawObstacles(ctx);

    this.renderList.length = 0;
    for (let i = 0; i < this.drones.length; i++) {
      if (this.drones[i].state !== 'WITHDRAWN') this.renderList.push(this.drones[i]);
    }
    if (this.enemy && this.enemy.state !== 'WITHDRAWN') this.renderList.push(this.enemy);

    this.renderList.sort((a, b) => {
      const sortA = a.y - (a.z * PERSPECTIVE_SCALE_Y);
      const sortB = b.y - (b.z * PERSPECTIVE_SCALE_Y);
      return sortA - sortB;
    });

    for (let i = 0; i < this.renderList.length; i++) {
      const e = this.renderList[i];
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.ellipse(e.x, e.y, e.radius, e.radius * PERSPECTIVE_SCALE_Y, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Enemy Vision Cone
    if (this.enemy && this.enemy.hp > 0 && this.enemy.state !== 'WITHDRAWN') {
      this.drawEnemyFOV(ctx, this.enemy);
    }

    for (let i = 0; i < this.drones.length; i++) {
      const d = this.drones[i];
      if (d.state !== 'WITHDRAWN') {
        this.drawSensorLink(ctx, d);
        this.drawDebugOverlay(ctx, d);
      }
    }

    for (let i = 0; i < this.renderList.length; i++) {
      const e = this.renderList[i];
      if (e.isEnemy) {
        this.drawEnemy(ctx, e);
      } else {
        this.drawDrone(ctx, e);
      }
    }

    // Draw Projectiles
    ctx.lineWidth = 2;
    for (const p of this.projectiles) {
      ctx.strokeStyle = p.color;
      ctx.beginPath();
      // Draw as a small trail
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05);
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawObstacles(ctx: CanvasRenderingContext2D) {
    for (const obs of this.obstacles) {
      ctx.fillStyle = '#111520';
      ctx.fillRect(obs.x, obs.y, obs.w, obs.h);

      ctx.fillStyle = '#1c2333';
      ctx.fillRect(obs.x, obs.y - 15, obs.w, 15);

      ctx.strokeStyle = '#2d3748';
      ctx.lineWidth = 2;
      ctx.strokeRect(obs.x, obs.y - 15, obs.w, obs.h + 15);
    }
  }

  private drawEnemyFOV(ctx: CanvasRenderingContext2D, enemy: ArenaEntity) {
    const drawY = enemy.y - enemy.z * PERSPECTIVE_SCALE_Y;
    const fovRad = Math.PI * 2 / 3; // 120 degrees total
    const halfFov = fovRad / 2;
    const steps = 30; // Resolution of the raycast polygon

    ctx.fillStyle = 'rgba(255, 50, 50, 0.15)';
    ctx.beginPath();
    ctx.moveTo(enemy.x, drawY);

    for (let i = 0; i <= steps; i++) {
      const angle = enemy.rotation - halfFov + (fovRad * i / steps);
      const targetX = enemy.x + Math.cos(angle) * enemy.sensorRange;
      const targetY = enemy.y + Math.sin(angle) * enemy.sensorRange;

      let minT = 1.0; // Max ray distance is 1.0 (sensorRange)
      for (const obs of this.obstacles) {
        const t = this.getRayIntersectionDist(enemy.x, enemy.y, targetX, targetY, obs);
        if (t < minT) minT = t;
      }

      const hitGroundX = enemy.x + Math.cos(angle) * (enemy.sensorRange * minT);
      const hitGroundY = enemy.y + Math.sin(angle) * (enemy.sensorRange * minT);
      const hitDrawY = hitGroundY - enemy.z * PERSPECTIVE_SCALE_Y; // Keep polygon flush with ground level

      ctx.lineTo(hitGroundX, hitDrawY);
    }

    ctx.closePath();
    ctx.fill();

    // Draw the bordering line
    ctx.strokeStyle = 'rgba(255, 50, 50, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private drawDrone(ctx: CanvasRenderingContext2D, drone: ArenaEntity) {
    ctx.save();
    const drawY = drone.y - drone.z * PERSPECTIVE_SCALE_Y;

    ctx.translate(drone.x, drawY);

    if (drone.hitFlashTimer > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, drone.radius * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.rotate(drone.rotation);

    ctx.fillStyle = drone.color;
    ctx.beginPath();
    ctx.moveTo(drone.radius, 0);
    ctx.lineTo(-drone.radius, drone.radius * 0.8);
    ctx.lineTo(-drone.radius * 0.5, 0);
    ctx.lineTo(-drone.radius, -drone.radius * 0.8);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
    this.drawHPBar(ctx, drone.x, drawY - drone.radius - 10, drone.hp, drone.maxHp);
  }

  private drawEnemy(ctx: CanvasRenderingContext2D, enemy: ArenaEntity) {
    ctx.save();
    const drawY = enemy.y - enemy.z * PERSPECTIVE_SCALE_Y;
    ctx.translate(enemy.x, drawY);

    if (enemy.hitFlashTimer > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.rotate(enemy.rotation);

    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const px = Math.cos(angle) * enemy.radius;
      const py = Math.sin(angle) * enemy.radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(enemy.radius * 0.6, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    this.drawHPBar(ctx, enemy.x, drawY - enemy.radius - 15, enemy.hp, enemy.maxHp);
  }

  private drawHPBar(ctx: CanvasRenderingContext2D, x: number, y: number, hp: number, maxHp: number) {
    const w = 30;
    const h = 4;
    ctx.fillStyle = '#333';
    ctx.fillRect(x - w / 2, y, w, h);
    ctx.fillStyle = hp > maxHp * 0.2 ? '#00ffaa' : '#ff3333';
    ctx.fillRect(x - w / 2, y, w * Math.max(0, hp / maxHp), h);
  }

  private drawSensorLink(ctx: CanvasRenderingContext2D, drone: ArenaEntity) {
    if (this.enemy.hp <= 0 || drone.state === 'WITHDRAWN') return;

    const dist = this.dist(drone, this.enemy);
    if (dist > drone.sensorRange) return;

    const blocked = this.isLOSBlocked(drone, this.enemy);

    ctx.beginPath();
    ctx.moveTo(drone.x, drone.y - drone.z * PERSPECTIVE_SCALE_Y);
    ctx.lineTo(this.enemy.x, this.enemy.y - this.enemy.z * PERSPECTIVE_SCALE_Y);

    if (blocked) {
      ctx.strokeStyle = 'rgba(255, 50, 50, 0.4)';
      ctx.setLineDash([4, 4]);
    } else {
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
      ctx.setLineDash([]);
    }

    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawDebugOverlay(ctx: CanvasRenderingContext2D, drone: ArenaEntity) {
    const drawY = drone.y - drone.z * PERSPECTIVE_SCALE_Y;

    ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.ellipse(drone.x, drone.y, drone.sensorRange, drone.sensorRange * PERSPECTIVE_SCALE_Y, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Add a very faint fill to make it more "solid"
    ctx.fillStyle = 'rgba(0, 255, 255, 0.03)';
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    let label = drone.state;
    if (drone.canStrike) label += ' ⚡';
    ctx.fillText(label, drone.x, drawY - drone.radius - 20);

    if (drone.state === 'SEARCHING' && drone.lastSeenPos) {
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
      ctx.beginPath();
      const sX = drone.lastSeenPos.x;
      const sY = drone.lastSeenPos.y;
      ctx.moveTo(sX - 5, sY); ctx.lineTo(sX + 5, sY);
      ctx.moveTo(sX, sY - 5); ctx.lineTo(sX, sY + 5);
      ctx.stroke();

      ctx.beginPath();
      ctx.setLineDash([2, 4]);
      ctx.moveTo(drone.x, drone.y);
      ctx.lineTo(sX, sY);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}