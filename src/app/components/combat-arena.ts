import {
  Component, ChangeDetectionStrategy, input, signal, effect,
  ElementRef, viewChild, OnDestroy, AfterViewInit, output
} from '@angular/core';
import { Shuriken } from '../models/hardware.model';
import { MissionContract } from '../models/mission.model';

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

// ─── Data Interfaces ──────────────────────────────────────────────

/** Axis-Aligned Bounding Box for obstacles */
interface AABB { x: number; y: number; w: number; h: number; }

/** A 2D vector helper */
interface Vec2 { x: number; y: number; }

/** AI behavior state machine labels */
type AIState = 'PURSUING' | 'ORBITING' | 'FLEEING' | 'IDLE' | 'REBOOTING' | 'SEARCHING' | 'WITHDRAWN' | 'PATROLLING' | 'FIGHTING';

/** Runtime entity used for both drones and the enemy */
interface ArenaEntity {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;          // Simulated elevation (drones fly)
  vx: number;
  vy: number;
  speed: number;
  topSpeed: number;
  acceleration: number;
  radius: number;     // Collision / visual radius
  color: string;
  sensorRange: number;
  meleeRange: number;
  state: AIState;
  orbitAngle: number; // Current angle when orbiting
  isEnemy: boolean;
  hp: number;
  maxHp: number;
  // Strike gating
  strikeCooldown: number;    // Seconds remaining before next strike
  canStrike: boolean;        // True when speed >= MIN_STRIKE_SPEED * topSpeed
  // Last-seen memory for search behavior
  lastSeenPos: Vec2 | null;  // Where the enemy was last visible
  searchTimer: number;       // Time spent searching at last-seen position
  // Hit flash VFX
  hitFlashTimer: number;     // Remaining flash duration (seconds)
  // Withdrawal mechanics
  withdrawalTimer: number;   // Seconds spent at edge while fleeing
  rotation: number;          // Current facing direction (radians)
  patrolPos: Vec2 | null;    // Destination when patrolling
}

@Component({
  selector: 'app-combat-arena',
  standalone: true,
  template: `
    <div class="relative w-full flex flex-col items-center gap-2">
      <!-- Arena legend -->
      <div class="flex gap-4 text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">
        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-cyan-500 inline-block"></span> Drone</span>
        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-red-500 inline-block"></span> Hostile</span>
        <span class="flex items-center gap-1"><span class="w-2 h-2 bg-gray-600 inline-block"></span> Cover</span>
        <span class="flex items-center gap-1"><span class="w-1 h-3 bg-green-500 inline-block"></span> LOS Clear</span>
        <span class="flex items-center gap-1"><span class="w-1 h-3 bg-red-500 inline-block"></span> LOS Blocked</span>
      </div>
      <canvas #arenaCanvas class="border border-white/10 bg-black" style="image-rendering: pixelated;"></canvas>
    </div>
  `,
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CombatArena implements AfterViewInit, OnDestroy {
  // ─── Inputs from parent (signal-based) ─────────────────────────
  mission = input<MissionContract | null>(null);
  shurikens = input<Shuriken[]>([]);

  /** Emits log strings for the Live Feed to consume */
  arenaLog = output<string>();
  /** Emits when the mission ends */
  missionComplete = output<{ success: boolean }>();

  // ─── Canvas ref ────────────────────────────────────────────────
  private canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('arenaCanvas');
  private ctx!: CanvasRenderingContext2D;
  private animFrameId = 0;
  private lastTime = 0;

  // ─── Arena State ───────────────────────────────────────────────
  private obstacles: AABB[] = [];
  private drones: ArenaEntity[] = [];
  private enemy!: ArenaEntity;
  private arenaTime = 0;
  private telemetryTimer = 0;
  private isGameOver = false;

  /** Tracks whether the arena has been initialized */
  private initialized = false;

  constructor() {
    // React to input changes and reinitialize entities
    effect(() => {
      const m = this.mission();
      const s = this.shurikens();
      if (m && s.length > 0 && this.initialized) {
        this.initEntities(s, m);
      }
    });
  }

  ngAfterViewInit() {
    const el = this.canvas().nativeElement;
    // Scale canvas to arena size (CSS will handle responsive display)
    el.width = ARENA_W;
    el.height = ARENA_H;
    this.ctx = el.getContext('2d')!;
    this.initialized = true;
    this.initObstacles();
    const m = this.mission();
    const s = this.shurikens();
    if (m && s.length > 0) {
      this.initEntities(s, m);
    } else {
      this.initEntities([], null);
    }
    this.lastTime = performance.now();
    this.tick(this.lastTime);
  }

  ngOnDestroy() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
  }

  // ═══════════════════════════════════════════════════════════════
  //  INITIALIZATION
  // ═══════════════════════════════════════════════════════════════

  /** Place 4 rectangular cover obstacles in the arena interior */
  private initObstacles() {
    this.obstacles = [
      { x: 200, y: 200, w: 80, h: 60 },
      { x: 520, y: 180, w: 60, h: 100 },
      { x: 180, y: 520, w: 100, h: 60 },
      { x: 500, y: 500, w: 80, h: 80 },
    ];
  }

  /** Create drone and enemy entities from game data */
  private initEntities(shurikens: Shuriken[], mission: MissionContract | null) {
    // Spawn drones along bottom-left quadrant
    this.drones = shurikens.map((s, i) => ({
      id: s.id,
      name: s.name || `Drone-${i}`,
      x: 100 + i * 80,
      y: ARENA_H - 120,
      z: 30,
      vx: 0, vy: 0,
      speed: 0,
      topSpeed: s.engine?.topSpeed ?? 80,
      acceleration: s.engine?.acceleration ?? 15,
      radius: 14,
      color: `hsl(${180 + i * 40}, 80%, 55%)`,
      sensorRange: s.sensor?.range ?? 120,
      meleeRange: 20,
      state: 'PATROLLING' as AIState,
      orbitAngle: (Math.PI * 2 / Math.max(1, shurikens.length)) * i,
      isEnemy: false,
      hp: s.hull?.maxHp ?? 100,
      maxHp: s.hull?.maxHp ?? 100,
      strikeCooldown: 0,
      canStrike: false,
      lastSeenPos: null as Vec2 | null,
      searchTimer: 0,
      hitFlashTimer: 0,
      withdrawalTimer: 0,
      rotation: Math.PI * 1.25, // Facing center from bottom-left
      patrolPos: {
        x: WALL_THICKNESS + 100 + Math.random() * (ARENA_W - 200 - WALL_THICKNESS * 2),
        y: WALL_THICKNESS + 100 + Math.random() * (ARENA_H - 200 - WALL_THICKNESS * 2)
      }
    }));

    // Spawn enemy in upper-right area
    this.enemy = {
      id: 'enemy-target',
      name: mission?.targetName ?? 'Hostile',
      x: ARENA_W - 150,
      y: 150,
      z: 0,
      vx: 0, vy: 0,
      speed: 0,
      topSpeed: 20,
      acceleration: 5,
      radius: 22,
      color: '#ef4444',
      sensorRange: 200,
      meleeRange: 40,
      state: 'PURSUING' as AIState,
      orbitAngle: 0,
      isEnemy: true,
      hp: mission?.hull ?? 300,
      maxHp: (mission?.hull ?? 300) + (mission?.shields ?? 0),
      strikeCooldown: 0,
      canStrike: false,
      lastSeenPos: {
        x: WALL_THICKNESS + 100 + Math.random() * (ARENA_W - 200 - WALL_THICKNESS * 2),
        y: WALL_THICKNESS + 100 + Math.random() * (ARENA_H - 200 - WALL_THICKNESS * 2)
      },
      searchTimer: 0,
      hitFlashTimer: 0,
      withdrawalTimer: 0,
      rotation: Math.PI * 0.75, // Facing towards bottom-left (drone spawn)
      patrolPos: null
    };

    this.arenaTime = 0;
    this.emitLog(`[SYSTEM] STRIKE INITIATED: ${this.enemy.name}`);
    this.emitLog(`[SYSTEM] DEPLOYING ${this.drones.length} UNIT(S) TO ARENA`);
  }

  // ═══════════════════════════════════════════════════════════════
  //  GAME LOOP
  // ═══════════════════════════════════════════════════════════════

  private tick = (now: number) => {
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    this.arenaTime += dt;
    this.update(dt);
    this.render();
    this.animFrameId = requestAnimationFrame(this.tick);
  };

  /** Emit a log line to the parent Live Feed */
  private emitLog(msg: string) {
    this.arenaLog.emit(msg);
  }

  // ═══════════════════════════════════════════════════════════════
  //  UPDATE (Physics + AI)
  // ═══════════════════════════════════════════════════════════════

  private update(dt: number) {
    if (this.isGameOver) return;

    // Tick down enemy hit flash & cooldown
    if (this.enemy.hitFlashTimer > 0) this.enemy.hitFlashTimer -= dt;
    if (this.enemy.strikeCooldown > 0) this.enemy.strikeCooldown -= dt;

    // Periodic Telemetry Logs
    this.telemetryTimer += dt;
    if (this.telemetryTimer >= 1.0) {
      this.telemetryTimer = 0;
      for (const d of this.drones) {
        if (d.hp > 0) {
          // Format expected by StrikeReport: "[TELEMETRY] Name: H:hp/maxHp S:s/maxS E:e/maxE R:reboot"
          this.emitLog(`[TELEMETRY] ${d.name}: H:${Math.ceil(d.hp)}/${d.maxHp} S:0/0 E:100/100 R:0`);
        }
      }
    }

    // Enemy Counter-Attack Logic
    if (this.enemy.strikeCooldown <= 0 && this.enemy.hp > 0) {
      // Find nearest drone in engagement range
      const targetDrone = this.drones.find(d => d.hp > 0 && this.dist(d, this.enemy) < this.enemy.radius + d.radius + 15);
      if (targetDrone) {
        targetDrone.hp = Math.max(0, targetDrone.hp - ENEMY_DAMAGE);
        targetDrone.hitFlashTimer = 0.2;
        this.enemy.strikeCooldown = ENEMY_STRIKE_COOLDOWN;
        this.emitLog(`[WARNING] ${this.enemy.name} Counter: ${targetDrone.name} hit! (-${ENEMY_DAMAGE} HP)`);
        
        if (targetDrone.hp <= 0) {
          this.emitLog(`[CRITICAL] ${targetDrone.name} SIGNAL LOST.`);
        }
      }
    }

    let activeDronesCount = 0;
    let withdrawnDronesCount = 0;
    let destroyedDronesCount = 0;

    for (const drone of this.drones) {
      if (drone.state === 'WITHDRAWN') {
        withdrawnDronesCount++;
        continue;
      }
      if (drone.hp <= 0) {
        destroyedDronesCount++;
        continue;
      }

      activeDronesCount++;

      // Tick cooldowns
      if (drone.strikeCooldown > 0) drone.strikeCooldown -= dt;
      if (drone.hitFlashTimer > 0) drone.hitFlashTimer -= dt;

      const distToEnemy = this.dist(drone, this.enemy);
      const hasLOS = !this.isLOSBlocked(drone, this.enemy);

      // Update strike readiness: drone must reach minimum velocity
      drone.canStrike = drone.speed >= (drone.topSpeed * MIN_STRIKE_SPEED);

      // ── Update last-seen memory ──
      if (hasLOS && distToEnemy < drone.sensorRange) {
        drone.lastSeenPos = { x: this.enemy.x, y: this.enemy.y };
        drone.searchTimer = 0;
      }

      // ── Determine AI State ──
      const prevState = drone.state;

      if (drone.hp < drone.maxHp * 0.2) {
        drone.state = 'FLEEING';
      } else if (distToEnemy < drone.meleeRange && hasLOS && drone.canStrike) {
        // CLOSE COMBAT: Ready to hit
        drone.state = 'FIGHTING';
      } else if (distToEnemy < drone.meleeRange && (hasLOS || drone.state === 'FIGHTING')) {
        // CLOSE COMBAT: Repositioning for next strike
        drone.state = 'ORBITING';
      } else if (distToEnemy < drone.sensorRange && hasLOS) {
        // PURSUIT: Target visible and in range
        drone.state = 'PURSUING';
      } else if (drone.lastSeenPos) {
        // SEARCH: Target lost, investigating last known location
        drone.state = 'SEARCHING';
      } else {
        // PATROL: No target knowledge
        drone.state = 'PATROLLING';
      }

      // Log state transitions
      if (prevState !== drone.state) {
        this.emitLog(`${drone.name}: [STATE] ${prevState} → ${drone.state}`);
      }

      // ── Execute Movement Behavior ──
      let targetVx = 0;
      let targetVy = 0;

      switch (drone.state) {
        case 'PURSUING':
        case 'FIGHTING': {
          const dir = this.normalize({ x: this.enemy.x - drone.x, y: this.enemy.y - drone.y });
          targetVx = dir.x * drone.topSpeed;
          targetVy = dir.y * drone.topSpeed;
          break;
        }
        case 'ORBITING': {
          const orbitRadius = 80;
          drone.orbitAngle += (drone.topSpeed / orbitRadius) * dt;
          const goalX = this.enemy.x + Math.cos(drone.orbitAngle) * orbitRadius;
          const goalY = this.enemy.y + Math.sin(drone.orbitAngle) * orbitRadius;
          const dir = this.normalize({ x: goalX - drone.x, y: goalY - drone.y });
          targetVx = dir.x * drone.topSpeed;
          targetVy = dir.y * drone.topSpeed;
          break;
        }
        case 'FLEEING': {
          const away = this.normalize({ x: drone.x - this.enemy.x, y: drone.y - this.enemy.y });
          targetVx = away.x * drone.topSpeed;
          targetVy = away.y * drone.topSpeed;

          // Check for edge disengagement
          const atEdge = drone.x <= WALL_THICKNESS + drone.radius + 2 ||
                         drone.x >= ARENA_W - WALL_THICKNESS - drone.radius - 2 ||
                         drone.y <= WALL_THICKNESS + drone.radius + 2 ||
                         drone.y >= ARENA_H - WALL_THICKNESS - drone.radius - 2;

          if (atEdge) {
            drone.withdrawalTimer += dt;
            if (drone.withdrawalTimer >= 2.0) {
              drone.state = 'WITHDRAWN';
              this.emitLog(`[SYSTEM] ${drone.name}: Emergency Withdrawal Complete. Unit Secured.`);
            }
          } else {
            drone.withdrawalTimer = 0;
          }
          break;
        }
        case 'SEARCHING': {
          // Navigate to last-seen position; if arrived, expand search pattern
          const target = drone.lastSeenPos || { x: ARENA_W / 2, y: ARENA_H / 2 };
          const distToLastSeen = this.dist(drone, target);

          if (distToLastSeen < 30) {
            // Arrived at last-seen → linger & orbit to scan area
            drone.searchTimer += dt;
            const searchRadius = 60 + drone.searchTimer * 15; // Expanding spiral
            drone.orbitAngle += (drone.topSpeed / searchRadius) * dt;
            const goalX = target.x + Math.cos(drone.orbitAngle) * Math.min(searchRadius, 200);
            const goalY = target.y + Math.sin(drone.orbitAngle) * Math.min(searchRadius, 200);
            const dir = this.normalize({ x: goalX - drone.x, y: goalY - drone.y });
            targetVx = dir.x * drone.topSpeed * 0.6;
            targetVy = dir.y * drone.topSpeed * 0.6;

            // After lingering too long, forget and seek directly
            if (drone.searchTimer > SEARCH_LINGER_TIME) {
              drone.lastSeenPos = null;
              drone.searchTimer = 0;
              this.emitLog(`${drone.name}: [SEARCH] Last contact lost. Expanding sweep.`);
            }
          } else {
            // Move toward last-seen position
            const dir = this.normalize({ x: target.x - drone.x, y: target.y - drone.y });
            targetVx = dir.x * drone.topSpeed;
            targetVy = dir.y * drone.topSpeed;
          }
          break;
        }
        case 'PATROLLING': {
          // Move to random waypoints until something is found
          if (!drone.patrolPos) {
            drone.patrolPos = {
              x: WALL_THICKNESS + 100 + Math.random() * (ARENA_W - 200 - WALL_THICKNESS * 2),
              y: WALL_THICKNESS + 100 + Math.random() * (ARENA_H - 200 - WALL_THICKNESS * 2)
            };
          }
          const distToPatrol = this.dist(drone, drone.patrolPos);
          if (distToPatrol < 40) {
            drone.patrolPos = null; // Pick new point next frame
          } else {
            const dir = this.normalize({ x: drone.patrolPos.x - drone.x, y: drone.patrolPos.y - drone.y });
            targetVx = dir.x * drone.topSpeed * 0.8;
            targetVy = dir.y * drone.topSpeed * 0.8;
          }
          break;
        }
      }

      // ── Obstacle Avoidance (Feeler) ──
      const avoid = this.getSteeringAvoidance(drone);
      if (avoid.x !== 0 || avoid.y !== 0) {
        targetVx = targetVx * 0.4 + avoid.x * 0.6;
        targetVy = targetVy * 0.4 + avoid.y * 0.6;
      }

      // Smooth acceleration
      const accelFactor = drone.acceleration * dt;
      drone.vx += (targetVx - drone.vx) * Math.min(1, accelFactor * 0.1);
      drone.vy += (targetVy - drone.vy) * Math.min(1, accelFactor * 0.1);

      // Apply velocity
      let newX = drone.x + drone.vx * dt;
      let newY = drone.y + drone.vy * dt;

      // Clamp to arena walls
      newX = Math.max(WALL_THICKNESS + drone.radius, Math.min(ARENA_W - WALL_THICKNESS - drone.radius, newX));
      newY = Math.max(WALL_THICKNESS + drone.radius, Math.min(ARENA_H - WALL_THICKNESS - drone.radius, newY));

      // Obstacle collision (Multi-pass for stability)
      for (let i = 0; i < 2; i++) {
        for (const obs of this.obstacles) {
          const res = this.resolveCircleAABB(newX, newY, drone.radius, obs);
          if (res.x !== newX || res.y !== newY) {
            // Dampen velocity component that hit the wall
            if (Math.abs(res.x - newX) > 0.01) drone.vx *= -0.2;
            if (Math.abs(res.y - newY) > 0.01) drone.vy *= -0.2;
            newX = res.x;
            newY = res.y;
          }
        }
      }

      // Drone-to-Enemy Collision
      if (this.enemy.hp > 0) {
        const distToEnemy = this.dist({ x: newX, y: newY }, this.enemy);
        const minDist = drone.radius + this.enemy.radius;
        if (distToEnemy < minDist && distToEnemy > 0) {
          const overlap = minDist - distToEnemy;
          const dir = this.normalize({ x: newX - this.enemy.x, y: newY - this.enemy.y });
          newX += dir.x * overlap;
          newY += dir.y * overlap;
          // Apply mutual impulse
          drone.vx += dir.x * 30;
          drone.vy += dir.y * 30;
          this.enemy.vx -= dir.x * 10;
          this.enemy.vy -= dir.y * 10;
        }
      }

      drone.x = newX;
      drone.y = newY;
      drone.speed = Math.sqrt(drone.vx * drone.vx + drone.vy * drone.vy);

      // ── Strike Detection ──
      // Drone hits enemy when: in melee range, LOS clear, speed threshold met, cooldown ready
      if (distToEnemy < drone.meleeRange + this.enemy.radius
          && hasLOS && drone.canStrike && drone.strikeCooldown <= 0
          && this.enemy.hp > 0) {
        const dmg = Math.floor(10 + drone.speed * 0.15);
        this.enemy.hp = Math.max(0, this.enemy.hp - dmg);
        this.enemy.hitFlashTimer = 0.2; // 200ms white flash
        drone.strikeCooldown = STRIKE_COOLDOWN;

        this.emitLog(`${drone.name}: Hull Hit (-${dmg} H) [REM: ${Math.ceil(this.enemy.hp)}]`);

        if (this.enemy.hp <= 0) {
          this.isGameOver = true;
          this.emitLog(`[SYSTEM] MISSION OBJECTIVE NEUTRALIZED.`);
          this.missionComplete.emit({ success: true });
        }

        // Bounce away after strike (adds fly-by variation)
        const bounceDir = this.normalize({ x: drone.x - this.enemy.x, y: drone.y - this.enemy.y });
        drone.vx = bounceDir.x * drone.topSpeed * 0.7;
        drone.vy = bounceDir.y * drone.topSpeed * 0.7;
      }

      // Update drone rotation based on velocity (if moving)
      if (drone.speed > 5) {
        const targetRot = Math.atan2(drone.vy, drone.vx);
        drone.rotation = this.lerpAngle(drone.rotation, targetRot, dt * 4);
      }
    }

    // Check Loss Condition: No active drones left (all either withdrawn or destroyed)
    if (activeDronesCount === 0 && this.drones.length > 0 && !this.isGameOver) {
      this.isGameOver = true;
      if (withdrawnDronesCount > 0) {
        this.emitLog(`[SYSTEM] SQUAD WITHDRAWN. MISSION ABORTED.`);
      } else {
        this.emitLog(`[CRITICAL] SQUAD ELIMINATED. MISSION FAILURE.`);
      }
      this.missionComplete.emit({ success: false });
    }

    // ── Enemy Movement AI ──
    if (this.enemy.hp > 0 && !this.isGameOver) {
      const activeDrones = this.drones.filter(d => d.hp > 0 && d.state !== 'WITHDRAWN');
      
      // 1. Vision Check: Can enemy see any drone?
      let bestTarget: ArenaEntity | null = null;
      let closestDist = Infinity;

      for (const d of activeDrones) {
        const dDist = this.dist(this.enemy, d);
        if (dDist < 250) { // 25m sensor range
          const angleToDrone = Math.atan2(d.y - this.enemy.y, d.x - this.enemy.x);
          let angleDiff = Math.abs(angleToDrone - this.enemy.rotation);
          // Normalize angle diff
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          angleDiff = Math.abs(angleDiff);

          // 120 degree cone = 60 degrees either side (~1.04 radians)
          if (angleDiff < 1.05 && !this.isLOSBlocked(this.enemy, d)) {
            if (dDist < closestDist) {
              closestDist = dDist;
              bestTarget = d;
            }
          }
        }
      }

      if (bestTarget) {
        const d = this.dist(this.enemy, bestTarget);
        this.enemy.state = (d < 50) ? 'FIGHTING' : 'PURSUING';
        this.enemy.lastSeenPos = { x: bestTarget.x, y: bestTarget.y };
        this.enemy.searchTimer = 0;
      } else if (this.enemy.lastSeenPos) {
        this.enemy.state = 'SEARCHING';
      } else if (this.enemy.state !== 'PATROLLING') {
        this.enemy.state = 'IDLE';
      }

      // 2. State-based Movement
      let targetVx = 0;
      let targetVy = 0;

      switch (this.enemy.state) {
        case 'PURSUING':
        case 'FIGHTING': {
          if (bestTarget) {
            const dir = this.normalize({ x: bestTarget.x - this.enemy.x, y: bestTarget.y - this.enemy.y });
            targetVx = dir.x * this.enemy.topSpeed;
            targetVy = dir.y * this.enemy.topSpeed;
            
            const targetRotation = Math.atan2(dir.y, dir.x);
            this.enemy.rotation = this.lerpAngle(this.enemy.rotation, targetRotation, dt * 5);
          }
          break;
        }
        case 'SEARCHING': {
          if (this.enemy.lastSeenPos) {
            const lsp = this.enemy.lastSeenPos;
            const distToLSP = this.dist(this.enemy, lsp);
            
            if (distToLSP > 30 && this.enemy.searchTimer < 3) {
              const dir = this.normalize({ x: lsp.x - this.enemy.x, y: lsp.y - this.enemy.y });
              targetVx = dir.x * this.enemy.topSpeed;
              targetVy = dir.y * this.enemy.topSpeed;
              
              const targetRotation = Math.atan2(dir.y, dir.x);
              this.enemy.rotation = this.lerpAngle(this.enemy.rotation, targetRotation, dt * 5);
            } else {
              this.enemy.searchTimer += dt;
              // Spiral search + Scanning rotation
              const searchRadius = Math.min(200, 60 + this.enemy.searchTimer * 20);
              const orbitAngle = this.arenaTime * 1.5;
              const goalX = lsp.x + Math.cos(orbitAngle) * searchRadius;
              const goalY = lsp.y + Math.sin(orbitAngle) * searchRadius;
              const dir = this.normalize({ x: goalX - this.enemy.x, y: goalY - this.enemy.y });
              targetVx = dir.x * this.enemy.topSpeed;
              targetVy = dir.y * this.enemy.topSpeed;
              
              // Rotate along movement + extra scan wiggle
              this.enemy.rotation = Math.atan2(dir.y, dir.x) + Math.sin(this.arenaTime * 3) * 0.2;
              
              if (this.enemy.searchTimer > 10) {
                this.enemy.lastSeenPos = null;
                this.enemy.state = 'IDLE';
              }
            }
          }
          break;
        }
        case 'PATROLLING': {
          if (this.enemy.lastSeenPos) {
            const distToPoint = this.dist(this.enemy, this.enemy.lastSeenPos);
            if (distToPoint < 20) {
              this.enemy.state = 'IDLE';
              this.enemy.searchTimer = 0;
            } else {
              const dir = this.normalize({ x: this.enemy.lastSeenPos.x - this.enemy.x, y: this.enemy.lastSeenPos.y - this.enemy.y });
              targetVx = dir.x * (this.enemy.topSpeed * 0.8); // Move faster while patrolling
              targetVy = dir.y * (this.enemy.topSpeed * 0.8);
              
              const targetRotation = Math.atan2(dir.y, dir.x);
              this.enemy.rotation = this.lerpAngle(this.enemy.rotation, targetRotation, dt * 3);
            }
          } else {
            this.enemy.state = 'IDLE';
          }
          break;
        }
        case 'IDLE':
          this.enemy.vx *= 0.95;
          this.enemy.vy *= 0.95;
          this.enemy.searchTimer += dt;
          // Scanning behavior
          this.enemy.rotation += Math.sin(this.arenaTime * 0.8) * 0.015;
          
          // After 4 seconds of idle scanning, pick a new patrol point
          if (this.enemy.searchTimer > 4) {
            this.enemy.state = 'PATROLLING';
            this.enemy.lastSeenPos = {
              x: WALL_THICKNESS + 100 + Math.random() * (ARENA_W - 200 - WALL_THICKNESS * 2),
              y: WALL_THICKNESS + 100 + Math.random() * (ARENA_H - 200 - WALL_THICKNESS * 2)
            };
          }
          break;
      }

      if (this.enemy.state !== 'IDLE') {
        // ── Obstacle Avoidance (Feeler) ──
        const avoid = this.getSteeringAvoidance(this.enemy);
        if (avoid.x !== 0 || avoid.y !== 0) {
          targetVx = targetVx * 0.3 + avoid.x * 0.7;
          targetVy = targetVy * 0.3 + avoid.y * 0.7;
        }

        const accelFactor = this.enemy.acceleration * dt;
        this.enemy.vx += (targetVx - this.enemy.vx) * Math.min(1, accelFactor * 0.1);
        this.enemy.vy += (targetVy - this.enemy.vy) * Math.min(1, accelFactor * 0.1);

        let newX = this.enemy.x + this.enemy.vx * dt;
        let newY = this.enemy.y + this.enemy.vy * dt;

        newX = Math.max(WALL_THICKNESS + this.enemy.radius, Math.min(ARENA_W - WALL_THICKNESS - this.enemy.radius, newX));
        newY = Math.max(WALL_THICKNESS + this.enemy.radius, Math.min(ARENA_H - WALL_THICKNESS - this.enemy.radius, newY));

        // Obstacle collision (Multi-pass)
        for (let i = 0; i < 2; i++) {
          for (const obs of this.obstacles) {
            const res = this.resolveCircleAABB(newX, newY, this.enemy.radius, obs);
            if (res.x !== newX || res.y !== newY) {
              if (Math.abs(res.x - newX) > 0.01) this.enemy.vx *= -0.2;
              if (Math.abs(res.y - newY) > 0.01) this.enemy.vy *= -0.2;
              newX = res.x;
              newY = res.y;
            }
          }
        }

        this.enemy.x = newX;
        this.enemy.y = newY;
        this.enemy.speed = Math.sqrt(this.enemy.vx * this.enemy.vx + this.enemy.vy * this.enemy.vy);
      }
    }

    // ── Drone-to-Drone Collision ──
    for (let i = 0; i < this.drones.length; i++) {
      for (let j = i + 1; j < this.drones.length; j++) {
        const a = this.drones[i];
        const b = this.drones[j];
        if (a.hp <= 0 || b.hp <= 0 || a.state === 'WITHDRAWN' || b.state === 'WITHDRAWN') continue;

        const d = this.dist(a, b);
        const minDist = a.radius + b.radius;
        if (d < minDist && d > 0) {
          const overlap = (minDist - d) / 2;
          const dir = this.normalize({ x: a.x - b.x, y: a.y - b.y });
          a.x += dir.x * overlap;
          a.y += dir.y * overlap;
          b.x -= dir.x * overlap;
          b.y -= dir.y * overlap;
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════

  private render() {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, ARENA_W, ARENA_H);

    this.drawFloor(ctx);
    this.drawObstacles(ctx);

    // ── Collect all entities and Y+Z sort ──
    // Sort by (y + z): entities with LOWER y+z draw first (further back)
    // Z-axis affects depth: higher Z = entity is elevated = should appear
    // "in front" vertically since it's rendered higher on screen
    const allEntities: ArenaEntity[] = [...this.drones.filter(d => d.hp > 0), this.enemy];
    allEntities.sort((a, b) => (a.y - a.z) - (b.y - b.z));

    for (const entity of allEntities) {
      if (entity.isEnemy) {
        this.drawEnemy(ctx, entity);
      } else {
        this.drawDrone(ctx, entity);
      }
    }

    // ── Global Sensor Links (Drones to Enemy) ──
    for (const drone of this.drones) {
      if (drone.hp > 0 && drone.state !== 'WITHDRAWN') {
        this.drawSensorLink(ctx, drone);
      }
    }

    // Debug overlays (drawn on top of everything)
    for (const drone of this.drones) {
      if (drone.hp <= 0) continue;
      this.drawDebugOverlay(ctx, drone);
    }
  }

  /** Draw the isometric-style floor grid */
  private drawFloor(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, ARENA_W, ARENA_H);

    // Grid lines
    ctx.strokeStyle = 'rgba(100, 100, 200, 0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= ARENA_W; x += TILE_SIZE) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ARENA_H); ctx.stroke();
    }
    for (let y = 0; y <= ARENA_H; y += TILE_SIZE) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(ARENA_W, y); ctx.stroke();
    }

    // Arena walls
    ctx.fillStyle = '#1a1a3a';
    ctx.fillRect(0, 0, ARENA_W, WALL_THICKNESS);                    // Top
    ctx.fillRect(0, ARENA_H - WALL_THICKNESS, ARENA_W, WALL_THICKNESS); // Bottom
    ctx.fillRect(0, 0, WALL_THICKNESS, ARENA_H);                    // Left
    ctx.fillRect(ARENA_W - WALL_THICKNESS, 0, WALL_THICKNESS, ARENA_H); // Right

    // Glow edge on walls
    ctx.strokeStyle = 'rgba(100, 130, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(WALL_THICKNESS, WALL_THICKNESS, ARENA_W - WALL_THICKNESS * 2, ARENA_H - WALL_THICKNESS * 2);
  }

  /** Draw solid rectangular obstacles (cover) */
  private drawObstacles(ctx: CanvasRenderingContext2D) {
    for (const obs of this.obstacles) {
      // Shadow (3/4 perspective offset)
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(obs.x + 4, obs.y + 6, obs.w, obs.h);

      // Main body
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(obs.x, obs.y, obs.w, obs.h);

      // Top face highlight (3/4 perspective illusion)
      ctx.fillStyle = '#334155';
      ctx.fillRect(obs.x, obs.y, obs.w, 8);

      // Border
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);

      // "COVER" label
      ctx.fillStyle = 'rgba(148, 163, 184, 0.2)';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('COVER', obs.x + obs.w / 2, obs.y + obs.h / 2 + 3);
    }
  }

  /** Render a drone entity with drop shadow and elevation offset */
  private drawDrone(ctx: CanvasRenderingContext2D, drone: ArenaEntity) {
    const drawY = drone.y - drone.z * PERSPECTIVE_SCALE_Y; // Z offsets upward

    // ── Drop Shadow at ground level (x, y) ──
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(drone.x, drone.y, drone.radius * 0.8, drone.radius * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ── Sensor Radius (Faint Pulse) ──
    ctx.save();
    const sensorPulse = 0.03 + Math.sin(this.arenaTime * 2) * 0.02;
    ctx.fillStyle = `rgba(34, 197, 94, ${sensorPulse})`;
    ctx.beginPath();
    ctx.ellipse(drone.x, drone.y, drone.sensorRange, drone.sensorRange * PERSPECTIVE_SCALE_Y, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // ── Elevation connector line (shadow to drone) ──
    if (drone.z > 0) {
      ctx.strokeStyle = 'rgba(100, 200, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.moveTo(drone.x, drone.y); ctx.lineTo(drone.x, drawY); ctx.stroke();
      ctx.setLineDash([]);
    }

    // ── Drone body (3/4 squashed ellipse) ──
    ctx.fillStyle = drone.color;
    ctx.beginPath();
    ctx.ellipse(drone.x, drawY, drone.radius, drone.radius * PERSPECTIVE_SCALE_Y, 0, 0, Math.PI * 2);
    ctx.fill();

    // Inner highlight
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.ellipse(drone.x, drawY - 2, drone.radius * 0.5, drone.radius * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Outer glow
    ctx.strokeStyle = drone.color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.ellipse(drone.x, drawY, drone.radius + 3, (drone.radius + 3) * PERSPECTIVE_SCALE_Y, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // ── Name label ──
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(drone.name, drone.x, drawY - drone.radius - 18);

    // ── State label ──
    const stateColors: Record<AIState, string> = {
      PURSUING: '#22d3ee', ORBITING: '#a78bfa', FLEEING: '#f97316',
      IDLE: '#6b7280', REBOOTING: '#ef4444', SEARCHING: '#facc15', 
      WITHDRAWN: '#4ade80', PATROLLING: '#94a3b8', FIGHTING: '#ef4444'
    };
    ctx.fillStyle = stateColors[drone.state] || '#fff';
    ctx.font = 'bold 8px monospace';
    const stateLabel = drone.canStrike ? `${drone.state} ⚡` : drone.state;
    ctx.fillText(stateLabel, drone.x, drawY - drone.radius - 8);
  }

  /** Render the hostile enemy entity */
  private drawEnemy(ctx: CanvasRenderingContext2D, enemy: ArenaEntity) {
    ctx.save();
    
    // ── FOV Cone (120 degrees, clipped by obstacles) ──
    const sensorRange = 250;
    const fovAngle = 1.05; // ~60 degrees
    const step = 0.05; // Ray frequency
    
    ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
    ctx.beginPath();
    ctx.moveTo(enemy.x, enemy.y);
    
    for (let a = enemy.rotation - fovAngle; a <= enemy.rotation + fovAngle; a += step) {
      const tx = enemy.x + Math.cos(a) * sensorRange;
      const ty = enemy.y + Math.sin(a) * sensorRange;
      
      let minT = 1.0;
      for (const obs of this.obstacles) {
        const t = this.getRayIntersectionDist(enemy.x, enemy.y, tx, ty, obs);
        if (t < minT) minT = t;
      }
      
      ctx.lineTo(enemy.x + Math.cos(a) * sensorRange * minT, enemy.y + Math.sin(a) * sensorRange * minT);
    }
    
    // Final ray at exact boundary
    const finalA = enemy.rotation + fovAngle;
    const ftx = enemy.x + Math.cos(finalA) * sensorRange;
    const fty = enemy.y + Math.sin(finalA) * sensorRange;
    let fMinT = 1.0;
    for (const obs of this.obstacles) {
      const t = this.getRayIntersectionDist(enemy.x, enemy.y, ftx, fty, obs);
      if (t < fMinT) fMinT = t;
    }
    ctx.lineTo(enemy.x + Math.cos(finalA) * sensorRange * fMinT, enemy.y + Math.sin(finalA) * sensorRange * fMinT);
    
    ctx.closePath();
    ctx.fill();

    // ── Hit Flash VFX: white expand ring on impact ──
    if (enemy.hitFlashTimer > 0) {
      const flashProgress = 1 - (enemy.hitFlashTimer / 0.2);
      const flashRadius = enemy.radius + 15 * flashProgress;
      ctx.save();
      ctx.globalAlpha = 1 - flashProgress;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(enemy.x, enemy.y, flashRadius, flashRadius * PERSPECTIVE_SCALE_Y, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Inner flash fill
      ctx.fillStyle = `rgba(255, 255, 255, ${0.4 * (1 - flashProgress)})`;
      ctx.beginPath();
      ctx.ellipse(enemy.x, enemy.y, enemy.radius, enemy.radius * PERSPECTIVE_SCALE_Y, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Enemy body — flash white briefly on hit
    ctx.fillStyle = enemy.hitFlashTimer > 0.1 ? '#ffffff' : enemy.color;
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y, enemy.radius, enemy.radius * PERSPECTIVE_SCALE_Y, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pulsing threat ring
    const pulse = 0.5 + Math.sin(performance.now() * 0.005) * 0.3;
    ctx.strokeStyle = `rgba(239, 68, 68, ${pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y, enemy.radius + 6, (enemy.radius + 6) * PERSPECTIVE_SCALE_Y, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Name
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(enemy.name, enemy.x, enemy.y - enemy.radius - 18);

    // State Label
    const stateColors: Record<AIState, string> = {
      PURSUING: '#ef4444', ORBITING: '#f87171', FLEEING: '#f97316',
      IDLE: '#6b7280', REBOOTING: '#ef4444', SEARCHING: '#facc15', 
      WITHDRAWN: '#4ade80', PATROLLING: '#94a3b8', FIGHTING: '#ffffff'
    };
    ctx.fillStyle = stateColors[enemy.state] || '#fff';
    ctx.font = '8px monospace';
    ctx.fillText(enemy.state, enemy.x, enemy.y - enemy.radius - 8);

    // HP bar
    const barW = 50;
    const barH = 4;
    const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(enemy.x - barW / 2, enemy.y - enemy.radius - 8, barW, barH);
    ctx.fillStyle = hpPct > 0.5 ? '#ef4444' : '#f97316';
    ctx.fillRect(enemy.x - barW / 2, enemy.y - enemy.radius - 8, barW * hpPct, barH);
  }

  /** Draw debug overlays: sensor range, LOS lines */
  private drawDebugOverlay(ctx: CanvasRenderingContext2D, drone: ArenaEntity) {
    const drawY = drone.y - drone.z * PERSPECTIVE_SCALE_Y;

    // ── Sensor Range pulsing circle ──
    const pulse = 0.08 + Math.sin(performance.now() * 0.003) * 0.04;
    ctx.fillStyle = `rgba(34, 211, 238, ${pulse})`;
    ctx.beginPath();
    ctx.ellipse(drone.x, drawY, drone.sensorRange, drone.sensorRange * PERSPECTIVE_SCALE_Y, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.ellipse(drone.x, drawY, drone.sensorRange, drone.sensorRange * PERSPECTIVE_SCALE_Y, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // ── Melee Range circle ──
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(drone.x, drawY, drone.meleeRange, drone.meleeRange * PERSPECTIVE_SCALE_Y, 0, 0, Math.PI * 2);
    ctx.stroke();

    // ── LOS Raycast Line (Only if detected) ──
    const distToEnemy = this.dist(drone, this.enemy);
    const losBlocked = this.isLOSBlocked(drone, this.enemy);
    const isDetected = distToEnemy < drone.sensorRange && !losBlocked;

    if (isDetected && this.enemy.hp > 0) {
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(drone.x, drawY);
      ctx.lineTo(this.enemy.x, this.enemy.y);
      ctx.stroke();

      // LOS status marker at midpoint
      const mx = (drone.x + this.enemy.x) / 2;
      const my = (drawY + this.enemy.y) / 2;
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('✓ CLEAR', mx, my - 6);
    } else if (drone.lastSeenPos && drone.state !== 'PATROLLING' && this.enemy.hp > 0) {
      // Show blocked line only if we have a reason to know they are there (lastSeenPos)
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(drone.x, drawY);
      ctx.lineTo(this.enemy.x, this.enemy.y);
      ctx.stroke();
      ctx.setLineDash([]);

      const mx = (drone.x + this.enemy.x) / 2;
      const my = (drawY + this.enemy.y) / 2;
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('✕ BLOCKED', mx, my - 6);
    }

    // ── Last-Seen Position marker (when searching) ──
    if (drone.state === 'SEARCHING' && drone.lastSeenPos) {
      const lsp = drone.lastSeenPos;
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      // Crosshair at last-seen
      ctx.beginPath(); ctx.moveTo(lsp.x - 10, lsp.y); ctx.lineTo(lsp.x + 10, lsp.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(lsp.x, lsp.y - 10); ctx.lineTo(lsp.x, lsp.y + 10); ctx.stroke();
      // Line from drone to last-seen
      ctx.beginPath(); ctx.moveTo(drone.x, drawY); ctx.lineTo(lsp.x, lsp.y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#facc15';
      ctx.font = '7px monospace';
      ctx.fillText('LAST CONTACT', lsp.x, lsp.y - 14);
    }
  }

  /** Draw a tactical link line between a drone and the enemy */
  private drawSensorLink(ctx: CanvasRenderingContext2D, drone: ArenaEntity) {
    const dist = this.dist(drone, this.enemy);
    if (dist > drone.sensorRange || this.enemy.hp <= 0) return;

    const drawY = drone.y - drone.z * PERSPECTIVE_SCALE_Y;
    const isBlocked = this.isLOSBlocked(drone, this.enemy);

    ctx.save();
    if (isBlocked) {
      // Weak/Interrupted signal - only show if we have a reason to track (lastSeenPos)
      if (!drone.lastSeenPos || drone.state === 'PATROLLING') return;
      
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.setLineDash([2, 6]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(drone.x, drawY);
      ctx.lineTo(this.enemy.x, this.enemy.y);
      ctx.stroke();
    } else {
      // Strong lock
      const alpha = 0.2 + Math.sin(this.arenaTime * 5) * 0.1;
      ctx.strokeStyle = `rgba(34, 211, 238, ${alpha})`;
      ctx.lineWidth = 1.5;
      
      ctx.beginPath();
      ctx.moveTo(drone.x, drawY);
      ctx.lineTo(this.enemy.x, this.enemy.y);
      ctx.stroke();

      // Add a subtle scan point moving along the line
      const progress = (this.arenaTime % 1.0);
      const scanX = drone.x + (this.enemy.x - drone.x) * progress;
      const scanY = drawY + (this.enemy.y - drawY) * progress;
      
      ctx.fillStyle = 'rgba(34, 211, 238, 0.6)';
      ctx.beginPath();
      ctx.arc(scanX, scanY, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ═══════════════════════════════════════════════════════════════
  //  SPATIAL MATH & SENSORS
  // ═══════════════════════════════════════════════════════════════

  /** Euclidean distance between two entities (2D ground plane) */
  private dist(a: Vec2, b: Vec2): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  /** Normalize a 2D vector to unit length */
  private normalize(v: Vec2): Vec2 {
    const len = Math.sqrt(v.x * v.x + v.y * v.y);
    if (len === 0) return { x: 0, y: 0 };
    return { x: v.x / len, y: v.y / len };
  }

  /**
   * Radius Check: Returns true if target is within the given radius.
   * Used for both Radar (sensorRange) and Melee (meleeRange) checks.
   */
  private isInRadius(entity: ArenaEntity, target: Vec2, radius: number): boolean {
    return this.dist(entity, target) <= radius;
  }

  /**
   * Line-of-Sight Raycast:
   * Casts a ray from `origin` to `target` and checks if it intersects
   * any obstacle AABB. Returns TRUE if the line is BLOCKED.
   *
   * Uses parametric line-AABB intersection (slab method).
   */
  private isLOSBlocked(origin: Vec2, target: Vec2): boolean {
    for (const obs of this.obstacles) {
      if (this.rayIntersectsAABB(origin.x, origin.y, target.x, target.y, obs)) {
        return true;
      }
    }
    return false;
  }

  /** Smoothly interpolates between two angles (in radians) */
  private lerpAngle(a: number, b: number, t: number): number {
    const diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    const finalDiff = diff < -Math.PI ? diff + Math.PI * 2 : diff;
    return a + finalDiff * t;
  }

  /** Calculates a steering vector to avoid obstacles based on a feeler point */
  private getSteeringAvoidance(entity: ArenaEntity): Vec2 {
    const feelerDist = 50;
    const feelerX = entity.x + Math.cos(entity.rotation) * feelerDist;
    const feelerY = entity.y + Math.sin(entity.rotation) * feelerDist;
    
    for (const obs of this.obstacles) {
      if (feelerX > obs.x - 5 && feelerX < obs.x + obs.w + 5 && 
          feelerY > obs.y - 5 && feelerY < obs.y + obs.h + 5) {
        // Steer away from obstacle center
        const centerX = obs.x + obs.w / 2;
        const centerY = obs.y + obs.h / 2;
        const steer = this.normalize({ x: entity.x - centerX, y: entity.y - centerY });
        return { x: steer.x * entity.topSpeed, y: steer.y * entity.topSpeed };
      }
    }
    return { x: 0, y: 0 };
  }

  /**
   * Parametric ray vs AABB intersection test.
   * Returns true if the line segment from (x1,y1) to (x2,y2) intersects the box.
   */
  private rayIntersectsAABB(x1: number, y1: number, x2: number, y2: number, box: AABB): boolean {
    const dx = x2 - x1;
    const dy = y2 - y1;

    let tmin = -Infinity;
    let tmax = Infinity;

    // X axis slab check
    if (Math.abs(dx) > 1e-9) {
      const t1 = (box.x - x1) / dx;
      const t2 = (box.x + box.w - x1) / dx;
      tmin = Math.max(tmin, Math.min(t1, t2));
      tmax = Math.min(tmax, Math.max(t1, t2));
    } else {
      // Ray is vertical; check if X is within box bounds
      if (x1 < box.x || x1 > box.x + box.w) return false;
    }

    // Y axis slab check
    if (Math.abs(dy) > 1e-9) {
      const t1 = (box.y - y1) / dy;
      const t2 = (box.y + box.h - y1) / dy;
      tmin = Math.max(tmin, Math.min(t1, t2));
      tmax = Math.min(tmax, Math.max(t1, t2));
    } else {
      // Ray is horizontal; check if Y is within box bounds
      if (y1 < box.y || y1 > box.y + box.h) return false;
    }

    // Intersection occurs if the overlap interval [tmin, tmax] is valid
    // AND it overlaps with the ray segment interval [0, 1]
    return tmax >= tmin && tmax >= 0 && tmin <= 1;
  }

  /**
   * Helper for visibility raycasting. 
   * Returns the intersection factor t [0, 1] for a ray vs a box.
   */
  private getRayIntersectionDist(x1: number, y1: number, x2: number, y2: number, box: AABB): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    let tmin = -Infinity;
    let tmax = Infinity;

    if (Math.abs(dx) > 1e-9) {
      const t1 = (box.x - x1) / dx;
      const t2 = (box.x + box.w - x1) / dx;
      tmin = Math.max(tmin, Math.min(t1, t2));
      tmax = Math.min(tmax, Math.max(t1, t2));
    } else if (x1 < box.x || x1 > box.x + box.w) return 1.0;

    if (Math.abs(dy) > 1e-9) {
      const t1 = (box.y - y1) / dy;
      const t2 = (box.y + box.h - y1) / dy;
      tmin = Math.max(tmin, Math.min(t1, t2));
      tmax = Math.min(tmax, Math.max(t1, t2));
    } else if (y1 < box.y || y1 > box.y + box.h) return 1.0;

    if (tmax >= tmin && tmax >= 0 && tmin <= 1) return Math.max(0, tmin);
    return 1.0;
  }

  /**
   * Circle-vs-AABB collision resolution.
   * Pushes the circle out of the rectangle if overlapping.
   */
  private resolveCircleAABB(cx: number, cy: number, r: number, box: AABB): Vec2 {
    const closestX = Math.max(box.x, Math.min(cx, box.x + box.w));
    const closestY = Math.max(box.y, Math.min(cy, box.y + box.h));

    const distX = cx - closestX;
    const distY = cy - closestY;
    const distSq = distX * distX + distY * distY;

    if (distSq < r * r) {
      if (distSq > 1e-6) {
        const dist = Math.sqrt(distSq);
        const overlap = r - dist;
        return { x: cx + (distX / dist) * overlap, y: cy + (distY / dist) * overlap };
      } else {
        // Center is inside or exactly on the edge - push to nearest edge
        const dl = cx - box.x;
        const dr = (box.x + box.w) - cx;
        const dt = cy - box.y;
        const db = (box.y + box.h) - cy;
        const minDist = Math.min(dl, dr, dt, db);
        if (minDist === dl) return { x: box.x - r, y: cy };
        if (minDist === dr) return { x: box.x + box.w + r, y: cy };
        if (minDist === dt) return { x: cx, y: box.y - r };
        return { x: cx, y: box.y + box.h + r };
      }
    }
    return { x: cx, y: cy };
  }
}
