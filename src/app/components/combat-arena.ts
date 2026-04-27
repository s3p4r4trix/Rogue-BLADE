import {
  Component, ChangeDetectionStrategy, input, effect,
  ElementRef, viewChild, OnDestroy, output,
  untracked, afterNextRender
} from '@angular/core';
import { Shuriken } from '../models/hardware.model';
import { MissionContract } from '../models/mission.model';
import { Vec2, AABB, ArenaEntity } from '../models/arena.model';

// ─── Arena Constants ───────────────────────────────────────────────
const ARENA_W = 800;
const ARENA_H = 800;
const WALL_THICKNESS = 16;
const TILE_SIZE = 40;
const PERSPECTIVE_SCALE_Y = 0.7;
const MIN_STRIKE_SPEED = 0.4; // Fraction of topSpeed required to attempt a strike
const STRIKE_COOLDOWN = 1.5; // Seconds between strike attempts
const SEARCH_LINGER_TIME = 3; // Seconds to search at last-seen before expanding
const ENEMY_STRIKE_COOLDOWN = 2.0;
const ENEMY_DAMAGE = 15;

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
  
  // Pre-allocated array to prevent Garbage Collection spikes during render
  private renderList: ArenaEntity[] = [];

  constructor() {
    // 1. Setup Canvas natively outside of lifecycle hooks using afterNextRender
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
        // Mock data if running standalone for preview
        const mockDrone = { 
          id: 'mock-1', name: 'Alpha-Blade', 
          engine: { topSpeed: 180, acceleration: 60 } as any, 
          hull: { maxHp: 100 } as any,
          sensor: { range: 200 } as any
        } as Shuriken;
        this.initEntities([mockDrone], null);
      }

      this.lastTime = performance.now();
      
      // In a zoneless app, requestAnimationFrame natively skips change detection
      this.tick(this.lastTime);
    });

    // 2. React to Input changes (Shurikens or Mission)
    effect(() => {
      const m = this.mission();
      const s = this.shurikens();
      
      // We wrap the side-effect in untracked so the effect ONLY fires
      // when `mission` or `shurikens` change, completely isolating it.
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

    // Initialize Drones
    shurikens.forEach((s, idx) => {
      this.drones.push({
        id: s.id,
        name: s.name,
        x: 100 + (idx * 50), y: 700, z: 20, // Elevated
        vx: 0, vy: 0,
        speed: 0,
        topSpeed: s.engine?.topSpeed || 150,
        acceleration: s.engine?.acceleration || 50,
        radius: 12,
        color: '#00f0ff',
        sensorRange: s.sensor?.range || 180,
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

    // Initialize Hostile
    this.enemy = {
      id: 'enemy_1',
      name: 'Zenith Warden',
      x: 400, y: 100, z: 0, // Ground unit
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
      hp: 500,
      maxHp: 500,
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
    // Cap dt at 50ms to prevent massive jumps on tab out
    const dt = Math.max(0, Math.min((now - this.lastTime) / 1000, 0.05));
    this.lastTime = now;
    this.arenaTime += dt;
    
    this.update(dt);
    this.render();
    
    this.animFrameId = requestAnimationFrame(this.tick);
  };

  private emitLog(msg: string) {
    // In zoneless Angular, emit directly. The parent component will handle local change detection natively.
    this.arenaLog.emit(`[${this.arenaTime.toFixed(1)}s] ${msg}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // UPDATE (Physics + AI)
  // ═══════════════════════════════════════════════════════════════
  
  private update(dt: number) {
    if (this.isGameOver) return;

    // --- Update Drones ---
    this.drones.forEach(drone => {
      this.updateEntityAI(drone, this.enemy, dt);
      
      // Calculate Target Velocity based on State
      const targetV = this.getBehaviorVelocity(drone, this.enemy, dt);
      
      // Update physics (apply steering and collision)
      this.updateEntityPhysics(drone, targetV, dt, 0.6);
      
      // Cooldowns
      if (drone.strikeCooldown > 0) drone.strikeCooldown -= dt;
      if (drone.hitFlashTimer > 0) drone.hitFlashTimer -= dt;
      
      // Strike Gating
      drone.canStrike = drone.speed >= (drone.topSpeed * MIN_STRIKE_SPEED);
    });

    // --- Update Enemy ---
    if (this.enemy.hp > 0) {
       // Find closest drone for simple enemy AI
       let closestDrone = null;
       let minDist = Infinity;
       this.drones.forEach(d => {
         const dist = this.dist(this.enemy, d);
         if (dist < minDist) { minDist = dist; closestDrone = d; }
       });

       if (closestDrone) {
          this.updateEntityAI(this.enemy, closestDrone, dt);
          const enemyV = this.getBehaviorVelocity(this.enemy, closestDrone, dt);
          this.updateEntityPhysics(this.enemy, enemyV, dt, 0.4);
       }
       if (this.enemy.strikeCooldown > 0) this.enemy.strikeCooldown -= dt;
       if (this.enemy.hitFlashTimer > 0) this.enemy.hitFlashTimer -= dt;
       this.enemy.canStrike = true; // Enemy can always strike if in range
    }

    // --- Check Win/Loss Condition ---
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
     const hasLOS = !this.isLOSBlocked(entity, target);
     const canSeeTarget = dist <= entity.sensorRange && hasLOS && target.hp > 0;

     // Emergency Flee overrides
     if (entity.hp < entity.maxHp * 0.2 && entity.state !== 'FLEEING') {
        entity.state = 'FLEEING';
        this.emitLog(`${entity.name} sustained critical damage. Initiating Emergency Withdrawal.`);
     }

     if (entity.state === 'FLEEING') return;

     // State Transitions
     if (canSeeTarget) {
       entity.lastSeenPos = { x: target.x, y: target.y };
       entity.searchTimer = 0;
       
       if (dist <= (entity.radius + target.radius) && entity.canStrike && entity.strikeCooldown <= 0) {
          entity.state = 'FIGHTING';
          this.executeStrike(entity, target);
       } else if (entity.strikeCooldown > 0) {
          entity.state = 'ORBITING';
       } else {
          entity.state = 'PURSUING';
       }
     } else {
        // Lost LOS
        if (entity.lastSeenPos) {
           entity.state = 'SEARCHING';
           entity.searchTimer += dt;
           if (entity.searchTimer >= SEARCH_LINGER_TIME) {
              entity.lastSeenPos = null; // Memory expires
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
       this.emitLog(`Hostile struck ${defender.name} for ${ENEMY_DAMAGE} DMG!`);
     } else {
       // Damage scales with speed as per GDD 3.2 (simplified)
       const speedMult = attacker.speed / attacker.topSpeed;
       const damage = Math.max(5, Math.floor(20 * (1 + speedMult)));
       defender.hp -= damage;
       defender.hitFlashTimer = 0.2;
       this.emitLog(`${attacker.name} executed kinetic strike for ${damage} DMG!`);
     }

     attacker.strikeCooldown = attacker.isEnemy ? ENEMY_STRIKE_COOLDOWN : STRIKE_COOLDOWN;
     
     // Post-strike bounce (GDD 6.6)
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
        // Move to orbit radius then circle
        const toTarget = { x: entity.x - target.x, y: entity.y - target.y };
        const dist = Math.max(1, Math.sqrt(toTarget.x**2 + toTarget.y**2));
        const orbitRadius = entity.sensorRange * 0.6;
        
        // Push in/out to maintain radius
        const radialPull = (orbitRadius - dist) * 2; 
        
        // Tangent velocity for circular motion
        const tangentX = -toTarget.y / dist;
        const tangentY = toTarget.x / dist;

        targetVx = (tangentX * entity.topSpeed) + ((toTarget.x/dist) * radialPull);
        targetVy = (tangentY * entity.topSpeed) + ((toTarget.y/dist) * radialPull);
        break;

      case 'SEARCHING':
        if (entity.lastSeenPos) {
           const sDist = this.dist(entity, entity.lastSeenPos);
           if (sDist > 30) {
              const sDir = this.normalize({ x: entity.lastSeenPos.x - entity.x, y: entity.lastSeenPos.y - entity.y });
              targetVx = sDir.x * entity.topSpeed;
              targetVy = sDir.y * entity.topSpeed;
           } else {
              // Expanding spiral search
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
        
        // Disengagement logic
        if (entity.x < WALL_THICKNESS*2 || entity.x > ARENA_W - WALL_THICKNESS*2 ||
            entity.y < WALL_THICKNESS*2 || entity.y > ARENA_H - WALL_THICKNESS*2) {
            entity.withdrawalTimer += dt;
            if (entity.withdrawalTimer >= 2.0) {
                entity.state = 'WITHDRAWN';
                this.emitLog(`${entity.name} successfully withdrew from combat.`);
            }
        }
        break;
      
      case 'FIGHTING':
        // In dash
        break;
    }

    return { x: targetVx, y: targetVy };
  }

  private updateEntityPhysics(entity: ArenaEntity, targetV: Vec2, dt: number, avoidanceWeight: number) {
     // 1. Calculate steering avoidance to steer around AABBs
     const avoidance = this.getSteeringAvoidance(entity);
     
     // 2. Blend desired velocity with avoidance
     let finalTargetVx = targetV.x;
     let finalTargetVy = targetV.y;

     if (avoidance.x !== 0 || avoidance.y !== 0) {
        finalTargetVx = (targetV.x * (1 - avoidanceWeight)) + (avoidance.x * avoidanceWeight);
        finalTargetVy = (targetV.y * (1 - avoidanceWeight)) + (avoidance.y * avoidanceWeight);
     }

     // 3. Smooth Acceleration
     const accelStep = entity.acceleration * dt * 10; 
     
     if (entity.vx < finalTargetVx) entity.vx = Math.min(finalTargetVx, entity.vx + accelStep);
     if (entity.vx > finalTargetVx) entity.vx = Math.max(finalTargetVx, entity.vx - accelStep);
     if (entity.vy < finalTargetVy) entity.vy = Math.min(finalTargetVy, entity.vy + accelStep);
     if (entity.vy > finalTargetVy) entity.vy = Math.max(finalTargetVy, entity.vy - accelStep);

     entity.speed = Math.sqrt(entity.vx**2 + entity.vy**2);

     // 4. Update Rotation
     if (entity.speed > 5) {
       entity.rotation = Math.atan2(entity.vy, entity.vx);
     }

     // 5. Apply Movement
     let nextX = entity.x + entity.vx * dt;
     let nextY = entity.y + entity.vy * dt;

     // 6. Hard Boundary Collisions
     if (nextX < WALL_THICKNESS + entity.radius) { nextX = WALL_THICKNESS + entity.radius; entity.vx *= -0.2; }
     if (nextX > ARENA_W - WALL_THICKNESS - entity.radius) { nextX = ARENA_W - WALL_THICKNESS - entity.radius; entity.vx *= -0.2; }
     if (nextY < WALL_THICKNESS + entity.radius) { nextY = WALL_THICKNESS + entity.radius; entity.vy *= -0.2; }
     if (nextY > ARENA_H - WALL_THICKNESS - entity.radius) { nextY = ARENA_H - WALL_THICKNESS - entity.radius; entity.vy *= -0.2; }

     // 7. Resolve Cover Collisions
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

  private getSteeringAvoidance(entity: ArenaEntity): Vec2 {
    const feelerDist = 60;
    const fx = entity.x + Math.cos(entity.rotation) * feelerDist;
    const fy = entity.y + Math.sin(entity.rotation) * feelerDist;

    for (const obs of this.obstacles) {
      if (fx >= obs.x && fx <= obs.x + obs.w && fy >= obs.y && fy <= obs.y + obs.h) {
         // Feeler inside box. Steer away from center
         const cx = obs.x + obs.w/2;
         const cy = obs.y + obs.h/2;
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
    for(let i=0; i<2; i++) {
        for (const obs of this.obstacles) {
            const res = this.resolveCircleAABB(currentX, currentY, entity.radius, obs);
            if (res.x !== currentX || res.y !== currentY) {
               // Dampen velocity on hit
               if (res.x !== currentX) entity.vx *= -0.2;
               if (res.y !== currentY) entity.vy *= -0.2;
            }
            currentX = res.x;
            currentY = res.y;
        }
    }
    return { x: currentX, y: currentY };
  }

  private resolveCircleAABB(cx: number, cy: number, r: number, box: AABB): Vec2 {
    const closestX = Math.max(box.x, Math.min(cx, box.x + box.w));
    const closestY = Math.max(box.y, Math.min(cy, box.y + box.h));
    
    const dx = cx - closestX;
    const dy = cy - closestY;
    const distSq = dx * dx + dy * dy;

    if (distSq < r * r && distSq > 0) {
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
     // Min/Max X and Y bounds
     const minX = box.x;
     const maxX = box.x + box.w;
     const minY = box.y;
     const maxY = box.y + box.h;

     // Simple AABB vs Segment bounding box check first
     if (Math.max(x1, x2) < minX || Math.min(x1, x2) > maxX ||
         Math.max(y1, y2) < minY || Math.min(y1, y2) > maxY) {
         return false;
     }

     // Cross product line test
     const lineIntersects = (a_x: number, a_y: number, b_x: number, b_y: number, c_x: number, c_y: number, d_x: number, d_y: number) => {
         const denominator = ((b_x - a_x) * (d_y - c_y)) - ((b_y - a_y) * (d_x - c_x));
         if (denominator === 0) return false;
         const numerator1 = ((a_y - c_y) * (d_x - c_x)) - ((a_x - c_x) * (d_y - c_y));
         const numerator2 = ((a_y - c_y) * (b_x - a_x)) - ((a_x - c_x) * (b_y - a_y));
         const r = numerator1 / denominator;
         const s = numerator2 / denominator;
         return (r >= 0 && r <= 1) && (s >= 0 && s <= 1);
     };

     // Check all 4 edges
     if (lineIntersects(x1, y1, x2, y2, minX, minY, maxX, minY)) return true; // Top
     if (lineIntersects(x1, y1, x2, y2, minX, maxY, maxX, maxY)) return true; // Bottom
     if (lineIntersects(x1, y1, x2, y2, minX, minY, minX, maxY)) return true; // Left
     if (lineIntersects(x1, y1, x2, y2, maxX, minY, maxX, maxY)) return true; // Right
     
     return false;
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  
  private render() {
    const ctx = this.ctx;
    if (!ctx) return;
    
    // Clear and draw background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, ARENA_W, ARENA_H);

    // Draw Grid (Floor)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < ARENA_W; x += TILE_SIZE) { ctx.moveTo(x, 0); ctx.lineTo(x, ARENA_H); }
    for (let y = 0; y < ARENA_H; y += TILE_SIZE) { ctx.moveTo(0, y); ctx.lineTo(ARENA_W, y); }
    ctx.stroke();

    // Draw Outer Bounds
    ctx.strokeStyle = '#333';
    ctx.lineWidth = WALL_THICKNESS;
    ctx.strokeRect(WALL_THICKNESS/2, WALL_THICKNESS/2, ARENA_W - WALL_THICKNESS, ARENA_H - WALL_THICKNESS);

    this.drawObstacles(ctx);

    // Depth Sorting: GDD 6.2 (Y-Sort with Z-Axis Elevation)
    // Optimization: Reuse pre-allocated array instead of recreating and filtering it 60 times a second
    this.renderList.length = 0;
    for (let i = 0; i < this.drones.length; i++) {
       if (this.drones[i].state !== 'WITHDRAWN') this.renderList.push(this.drones[i]);
    }
    if (this.enemy.state !== 'WITHDRAWN') this.renderList.push(this.enemy);

    this.renderList.sort((a, b) => {
       const sortA = a.y - (a.z * PERSPECTIVE_SCALE_Y);
       const sortB = b.y - (b.z * PERSPECTIVE_SCALE_Y);
       return sortA - sortB;
    });

    // Render pass 1: Shadows
    for (let i = 0; i < this.renderList.length; i++) {
        const e = this.renderList[i];
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        // Squashed shadow based on perspective
        ctx.ellipse(e.x, e.y, e.radius, e.radius * PERSPECTIVE_SCALE_Y, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Render pass 2: Entity Overlays (Lines/Sensors)
    for (let i = 0; i < this.drones.length; i++) {
       const d = this.drones[i];
       if (d.state !== 'WITHDRAWN') {
           this.drawSensorLink(ctx, d);
           this.drawDebugOverlay(ctx, d);
       }
    }

    // Render pass 3: Entity Bodies
    for (let i = 0; i < this.renderList.length; i++) {
       const e = this.renderList[i];
       if (e.isEnemy) {
          this.drawEnemy(ctx, e);
       } else {
          this.drawDrone(ctx, e);
       }
    }
  }

  private drawObstacles(ctx: CanvasRenderingContext2D) {
    for (const obs of this.obstacles) {
      // Body
      ctx.fillStyle = '#111520';
      ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
      
      // Top face (Perspective 3D illusion)
      ctx.fillStyle = '#1c2333';
      ctx.fillRect(obs.x, obs.y - 15, obs.w, 15);
      
      // Borders
      ctx.strokeStyle = '#2d3748';
      ctx.lineWidth = 2;
      ctx.strokeRect(obs.x, obs.y - 15, obs.w, obs.h + 15);
    }
  }

  private drawDrone(ctx: CanvasRenderingContext2D, drone: ArenaEntity) {
    ctx.save();
    const drawY = drone.y - drone.z * PERSPECTIVE_SCALE_Y; 
    
    ctx.translate(drone.x, drawY);

    // Hit Flash
    if (drone.hitFlashTimer > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, drone.radius * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.rotate(drone.rotation);

    // Core Body
    ctx.fillStyle = drone.color;
    ctx.beginPath();
    ctx.moveTo(drone.radius, 0); // Nose
    ctx.lineTo(-drone.radius, drone.radius * 0.8); // Back Right
    ctx.lineTo(-drone.radius * 0.5, 0); // Engine indent
    ctx.lineTo(-drone.radius, -drone.radius * 0.8); // Back Left
    ctx.closePath();
    ctx.fill();
    
    // Glowing edge
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();

    // HP Bar
    this.drawHPBar(ctx, drone.x, drawY - drone.radius - 10, drone.hp, drone.maxHp);
  }

  private drawEnemy(ctx: CanvasRenderingContext2D, enemy: ArenaEntity) {
    ctx.save();
    const drawY = enemy.y - enemy.z * PERSPECTIVE_SCALE_Y; 
    ctx.translate(enemy.x, drawY);

    // Hit Flash
    if (enemy.hitFlashTimer > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.rotate(enemy.rotation);

    // Alien Hexagon Body
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    for(let i=0; i<6; i++) {
       const angle = (Math.PI / 3) * i;
       const px = Math.cos(angle) * enemy.radius;
       const py = Math.sin(angle) * enemy.radius;
       if (i===0) ctx.moveTo(px, py);
       else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    
    // Front eye/sensor
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(enemy.radius * 0.6, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // HP Bar
    this.drawHPBar(ctx, enemy.x, drawY - enemy.radius - 15, enemy.hp, enemy.maxHp);
  }

  private drawHPBar(ctx: CanvasRenderingContext2D, x: number, y: number, hp: number, maxHp: number) {
     const w = 30;
     const h = 4;
     ctx.fillStyle = '#333';
     ctx.fillRect(x - w/2, y, w, h);
     ctx.fillStyle = hp > maxHp * 0.2 ? '#00ffaa' : '#ff3333';
     ctx.fillRect(x - w/2, y, w * Math.max(0, hp / maxHp), h);
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
    ctx.setLineDash([]); // Reset
  }

  private drawDebugOverlay(ctx: CanvasRenderingContext2D, drone: ArenaEntity) {
    const drawY = drone.y - drone.z * PERSPECTIVE_SCALE_Y;

    // Sensor Wireframe
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.ellipse(drone.x, drone.y, drone.sensorRange, drone.sensorRange * PERSPECTIVE_SCALE_Y, 0, 0, Math.PI*2);
    ctx.stroke();

    // State Label
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    let label = drone.state;
    if (drone.canStrike) label += ' ⚡';
    ctx.fillText(label, drone.x, drawY - drone.radius - 20);

    // Last Seen Marker (Searching)
    if (drone.state === 'SEARCHING' && drone.lastSeenPos) {
       ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
       ctx.beginPath();
       const sX = drone.lastSeenPos.x;
       const sY = drone.lastSeenPos.y;
       ctx.moveTo(sX - 5, sY); ctx.lineTo(sX + 5, sY);
       ctx.moveTo(sX, sY - 5); ctx.lineTo(sX, sY + 5);
       ctx.stroke();

       // Dashed line to search location
       ctx.beginPath();
       ctx.setLineDash([2, 4]);
       ctx.moveTo(drone.x, drone.y);
       ctx.lineTo(sX, sY);
       ctx.stroke();
       ctx.setLineDash([]);
    }
  }
}