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
      { x: 400, y: 400, w: 80, h: 60 },
    ];
  }

  /** Create drone and enemy entities from game data */
  private initEntities(shurikens: Shuriken[], mission: MissionContract | null) {
    this.isGameOver = false;
    this.arenaTime = 0;
    this.telemetryTimer = 0;
    
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
      sensorRange: (s.sensor?.range ?? 200) * 1.5, // Increased default range
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
      state: 'PATROLLING' as AIState,
      orbitAngle: 0,
      isEnemy: true,
      hp: mission?.hull ?? 300,
      maxHp: (mission?.hull ?? 300) + (mission?.shields ?? 0),
      strikeCooldown: 0,
      canStrike: false,
      lastSeenPos: null,
      searchTimer: 0,
      hitFlashTimer: 0,
      withdrawalTimer: 0,
      rotation: Math.PI * 0.75, // Facing towards bottom-left (drone spawn)
      patrolPos: {
        x: WALL_THICKNESS + 100 + Math.random() * (ARENA_W - 200 - WALL_THICKNESS * 2),
        y: WALL_THICKNESS + 100 + Math.random() * (ARENA_H - 200 - WALL_THICKNESS * 2)
      }
    };

    this.arenaTime = 0;
    this.emitLog(`[SYSTEM] STRIKE INITIATED: ${this.enemy.name}`);
    this.emitLog(`[SYSTEM] DEPLOYING ${this.drones.length} UNIT(S) TO ARENA`);

    // Initial Status Logs
    this.emitLog(`${this.enemy.name}: [INITIAL_STATE] ${this.enemy.state}`);
    for (const d of this.drones) {
      this.emitLog(`${d.name}: [INITIAL_STATE] ${d.state}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  GAME LOOP
  // ═══════════════════════════════════════════════════════════════

  private tick = (now: number) => {
    const dt = Math.max(0, Math.min((now - this.lastTime) / 1000, 0.05));
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

    // Enemy Counter-Attack Logic
    if (this.enemy.hp > 0 && this.enemy.strikeCooldown <= 0) {
      const activeDronesInRange = this.drones.filter(d =>
        d.hp > 0 && d.state !== 'WITHDRAWN' && this.dist(this.enemy, d) < this.enemy.meleeRange + d.radius
      );
      if (activeDronesInRange.length > 0) {
        const targetDrone = activeDronesInRange[0];
        targetDrone.hp = Math.max(0, targetDrone.hp - ENEMY_DAMAGE);
        targetDrone.hitFlashTimer = 0.2;
        this.enemy.strikeCooldown = ENEMY_STRIKE_COOLDOWN;
        this.emitLog(`[WARNING] ${this.enemy.name} Counter: ${targetDrone.name} hit! (-${ENEMY_DAMAGE} HP)`);
        if (targetDrone.hp <= 0) this.emitLog(`[CRITICAL] ${targetDrone.name} SIGNAL LOST.`);
      }
    }

    let activeDronesCount = 0;
    let withdrawnDronesCount = 0;
    let destroyedDronesCount = 0;

    for (const drone of this.drones) {
      if (drone.state === 'WITHDRAWN') { withdrawnDronesCount++; continue; }
      if (drone.hp <= 0) { destroyedDronesCount++; continue; }
      activeDronesCount++;

      // Tick cooldowns
      if (drone.strikeCooldown > 0) drone.strikeCooldown -= dt;
      if (drone.hitFlashTimer > 0) drone.hitFlashTimer -= dt;

      // Update AI State
      const prevState = drone.state;
      const distToEnemy = this.dist(drone, this.enemy);
      const hasLOS = !this.isLOSBlocked(drone, this.enemy);
      const canSeeEnemy = this.canSee(drone, this.enemy, drone.sensorRange);

      drone.canStrike = drone.speed >= (drone.topSpeed * MIN_STRIKE_SPEED);

      if (drone.hp < drone.maxHp * 0.2) {
        drone.state = 'FLEEING';
      } else if (distToEnemy < drone.meleeRange + this.enemy.radius && hasLOS && drone.canStrike) {
        drone.state = 'FIGHTING';
      } else if (distToEnemy < drone.meleeRange + this.enemy.radius && (hasLOS || drone.state === 'FIGHTING')) {
        drone.state = 'ORBITING';
      } else if (canSeeEnemy) {
        drone.state = 'PURSUING';
      } else if (drone.lastSeenPos) {
        drone.state = 'SEARCHING';
      } else {
        drone.state = 'PATROLLING';
      }

      if (canSeeEnemy) {
        drone.lastSeenPos = { x: this.enemy.x, y: this.enemy.y };
        drone.searchTimer = 0;
      }

      if (prevState !== drone.state) {
        if ((prevState === 'PATROLLING' || prevState === 'SEARCHING') && (drone.state === 'PURSUING' || drone.state === 'FIGHTING' || drone.state === 'ORBITING')) {
          this.emitLog(`[SENSOR] ${drone.name}: Target Lock Achieved.`);
        } else if (drone.state === 'SEARCHING') {
          this.emitLog(`[SENSOR] ${drone.name}: Signal Lost. Investigating last known pos.`);
        }
        this.emitLog(`${drone.name}: [STATE] ${prevState} → ${drone.state}`);
      }

      // Physics & Movement
      const targetV = this.getBehaviorVelocity(drone, this.enemy, dt);

      if (drone.state === 'FLEEING') {
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
      }

      this.updateEntityPhysics(drone, targetV, dt, 0.6);

      // Drone-to-Enemy Impulse (Pushing each other)
      if (this.enemy.hp > 0) {
        const d = this.dist(drone, this.enemy);
        const minDist = drone.radius + this.enemy.radius;
        if (d < minDist && d > 0) {
          const overlap = minDist - d;
          const dir = this.normalize({ x: drone.x - this.enemy.x, y: drone.y - this.enemy.y });
          drone.x += dir.x * overlap;
          drone.y += dir.y * overlap;
          drone.vx += dir.x * 30; drone.vy += dir.y * 30;
          this.enemy.vx -= dir.x * 10; this.enemy.vy -= dir.y * 10;
        }
      }

      // Strike Detection
      if (drone.state === 'FIGHTING' && drone.strikeCooldown <= 0 && this.enemy.hp > 0) {
        const dmg = Math.floor(10 + drone.speed * 0.15);
        this.enemy.hp = Math.max(0, this.enemy.hp - dmg);
        this.enemy.hitFlashTimer = 0.2;
        drone.strikeCooldown = STRIKE_COOLDOWN;
        this.emitLog(`${drone.name}: Hull Hit (-${dmg} H) [REM: ${Math.ceil(this.enemy.hp)}]`);
        if (this.enemy.hp <= 0) {
          this.isGameOver = true;
          this.emitLog(`[SYSTEM] MISSION OBJECTIVE NEUTRALIZED.`);
          this.missionComplete.emit({ success: true });
        }
        const bounceDir = this.normalize({ x: drone.x - this.enemy.x, y: drone.y - this.enemy.y });
        drone.vx = bounceDir.x * drone.topSpeed * 0.7;
        drone.vy = bounceDir.y * drone.topSpeed * 0.7;
      }

      drone.speed = Math.sqrt(drone.vx * drone.vx + drone.vy * drone.vy);
    }

    // Loss Condition
    if (activeDronesCount === 0 && this.drones.length > 0 && !this.isGameOver) {
      this.isGameOver = true;
      if (withdrawnDronesCount > 0) this.emitLog(`[SYSTEM] SQUAD WITHDRAWN. MISSION ABORTED.`);
      else this.emitLog(`[CRITICAL] SQUAD ELIMINATED. MISSION FAILURE.`);
      this.missionComplete.emit({ success: false });
    }

    // Enemy Movement AI
    if (this.enemy.hp > 0 && !this.isGameOver) {
      const activeDrones = this.drones.filter(d => d.hp > 0 && d.state !== 'WITHDRAWN');
      let bestTarget: ArenaEntity | null = null;
      let closestDist = Infinity;
      for (const d of activeDrones) {
        if (this.canSee(this.enemy, d, this.enemy.sensorRange, 1.2)) {
          const dDist = this.dist(this.enemy, d);
          if (dDist < closestDist) { closestDist = dDist; bestTarget = d; }
        }
      }

      const prevEnemyState = this.enemy.state;
      if (bestTarget) {
        const d = this.dist(this.enemy, bestTarget);
        this.enemy.state = (d < 50) ? 'FIGHTING' : 'PURSUING';
        this.enemy.lastSeenPos = { x: bestTarget.x, y: bestTarget.y };
        this.enemy.searchTimer = 0;
      } else if (this.enemy.lastSeenPos) {
        this.enemy.state = 'SEARCHING';
      } else if (this.enemy.state !== 'PATROLLING' && this.enemy.state !== 'IDLE') {
        this.enemy.state = 'IDLE';
      }

      if (prevEnemyState !== this.enemy.state) {
        if (this.enemy.state === 'PURSUING' || this.enemy.state === 'FIGHTING') this.emitLog(`[WARNING] ${this.enemy.name}: Target Detected. Engaging.`);
        this.emitLog(`${this.enemy.name}: [STATE] ${prevEnemyState} → ${this.enemy.state}`);
      }

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

      if (this.enemy.state === 'IDLE') {
        this.enemy.searchTimer += dt;
        this.enemy.rotation += Math.sin(this.arenaTime * 0.8) * 0.015;
        if (this.enemy.searchTimer > 4) {
          this.enemy.state = 'PATROLLING';
          this.enemy.lastSeenPos = null;
        }
      }

      const targetV = this.getBehaviorVelocity(this.enemy, bestTarget, dt);
      this.updateEntityPhysics(this.enemy, targetV, dt, 0.7);
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
    ctx.save();
    const drawY = drone.y - drone.z * PERSPECTIVE_SCALE_Y; // Z offsets upward

    // ── Drop Shadow at ground level (x, y) ──
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(drone.x, drone.y, drone.radius * 0.8, drone.radius * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ── Sensor Radius (Omnidirectional Pulse) ──
    ctx.save();
    // Cap visual radius to prevent canvas rendering issues with extreme values
    const visualRange = Math.min(drone.sensorRange, 1200);

    // Static boundary ring (very faint)
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(drone.x, drone.y, visualRange, Math.max(0.1, visualRange * PERSPECTIVE_SCALE_Y), 0, 0, Math.PI * 2);
    ctx.stroke();

    // Expanding pulse ring (1s cycle)
    const pulseProgress = Math.max(0, this.arenaTime % 1.0);
    const pulseRadius = Math.max(0.1, visualRange * pulseProgress);
    const pulseAlpha = 0.3 * (1 - pulseProgress);
    
    ctx.strokeStyle = `rgba(34, 197, 94, ${pulseAlpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(drone.x, drone.y, pulseRadius, Math.max(0.1, pulseRadius * PERSPECTIVE_SCALE_Y), 0, 0, Math.PI * 2);
    ctx.stroke();

    // Subtle area glow
    ctx.fillStyle = 'rgba(34, 197, 94, 0.02)';
    ctx.beginPath();
    ctx.ellipse(drone.x, drone.y, visualRange, Math.max(0.1, visualRange * PERSPECTIVE_SCALE_Y), 0, 0, Math.PI * 2);
    ctx.fill();
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
    ctx.restore();
  }

  /** Render the hostile enemy entity */
  private drawEnemy(ctx: CanvasRenderingContext2D, enemy: ArenaEntity) {
    ctx.save();

    // ── FOV Cone (120 degrees, clipped by obstacles) ──
    const fovAngle = 1.05; // ~60 degrees
    const step = 0.05; // Ray frequency

    ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
    ctx.beginPath();
    ctx.moveTo(enemy.x, enemy.y);

    for (let a = enemy.rotation - fovAngle; a <= enemy.rotation + fovAngle; a += step) {
      const tx = enemy.x + Math.cos(a) * enemy.sensorRange;
      const ty = enemy.y + Math.sin(a) * enemy.sensorRange;

      let minT = 1.0;
      for (const obs of this.obstacles) {
        const t = this.getRayIntersectionDist(enemy.x, enemy.y, tx, ty, obs);
        if (t < minT) minT = t;
      }

      ctx.lineTo(enemy.x + Math.cos(a) * enemy.sensorRange * minT, enemy.y + Math.sin(a) * enemy.sensorRange * minT);
    }

    // Final ray at exact boundary
    const finalA = enemy.rotation + fovAngle;
    const ftx = enemy.x + Math.cos(finalA) * enemy.sensorRange;
    const fty = enemy.y + Math.sin(finalA) * enemy.sensorRange;
    let fMinT = 1.0;
    for (const obs of this.obstacles) {
      const t = this.getRayIntersectionDist(enemy.x, enemy.y, ftx, fty, obs);
      if (t < fMinT) fMinT = t;
    }
    ctx.lineTo(enemy.x + Math.cos(finalA) * enemy.sensorRange * fMinT, enemy.y + Math.sin(finalA) * enemy.sensorRange * fMinT);

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
    const pulseAlpha = Math.max(0, 0.5 + Math.sin(performance.now() * 0.005) * 0.3);
    ctx.strokeStyle = `rgba(239, 68, 68, ${pulseAlpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const tr = Math.max(0.1, enemy.radius + 6);
    ctx.ellipse(enemy.x, enemy.y, tr, tr * PERSPECTIVE_SCALE_Y, 0, 0, Math.PI * 2);
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
    ctx.restore();
  }

  /** Draw debug overlays: sensor range, LOS lines */
  private drawDebugOverlay(ctx: CanvasRenderingContext2D, drone: ArenaEntity) {
    const drawY = drone.y - drone.z * PERSPECTIVE_SCALE_Y;

    // ── Sensor Range: Tactical Scanning Ring ──
    ctx.save();
    // Pulsing outer ring
    const outerPulse = 0.1 + Math.sin(performance.now() * 0.002) * 0.05;
    ctx.strokeStyle = `rgba(34, 211, 238, ${outerPulse})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.ellipse(drone.x, drawY, drone.sensorRange, drone.sensorRange * PERSPECTIVE_SCALE_Y, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Scanning sweep effect
    const sweepAngle = (performance.now() * 0.002) % (Math.PI * 2);
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(drone.x, drawY);
    ctx.lineTo(
      drone.x + Math.cos(sweepAngle) * drone.sensorRange,
      drawY + Math.sin(sweepAngle) * drone.sensorRange * PERSPECTIVE_SCALE_Y
    );
    ctx.stroke();

    // Subtle area fill
    ctx.fillStyle = `rgba(34, 211, 238, 0.03)`;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.ellipse(drone.x, drawY, drone.sensorRange, drone.sensorRange * PERSPECTIVE_SCALE_Y, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();


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

  /** Returns true if observer can see target (checks range, LOS, and optional FOV) */
  private canSee(observer: ArenaEntity, target: ArenaEntity, range: number, fovRad: number | null = null): boolean {
    const d = this.dist(observer, target);
    if (d > range) return false;

    if (fovRad !== null) {
      const angleToTarget = Math.atan2(target.y - observer.y, target.x - observer.x);
      let angleDiff = Math.abs(angleToTarget - observer.rotation);
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      angleDiff = Math.abs(angleDiff);
      if (angleDiff > fovRad / 2) return false;
    }

    return !this.isLOSBlocked(observer, target);
  }

  /** Calculates desired velocity based on AI state */
  private getBehaviorVelocity(entity: ArenaEntity, target: ArenaEntity | Vec2 | null, dt: number): Vec2 {
    let targetVx = 0;
    let targetVy = 0;

    switch (entity.state) {
      case 'PURSUING':
      case 'FIGHTING': {
        if (target) {
          const dir = this.normalize({ x: target.x - entity.x, y: target.y - entity.y });
          targetVx = dir.x * entity.topSpeed;
          targetVy = dir.y * entity.topSpeed;
        }
        break;
      }
      case 'ORBITING': {
        if (target) {
          const orbitRadius = 80;
          entity.orbitAngle += (entity.topSpeed / orbitRadius) * dt;
          const goalX = target.x + Math.cos(entity.orbitAngle) * orbitRadius;
          const goalY = target.y + Math.sin(entity.orbitAngle) * orbitRadius;
          const dir = this.normalize({ x: goalX - entity.x, y: goalY - entity.y });
          targetVx = dir.x * entity.topSpeed;
          targetVy = dir.y * entity.topSpeed;
        }
        break;
      }
      case 'FLEEING': {
        if (target) {
          const away = this.normalize({ x: entity.x - target.x, y: entity.y - target.y });
          targetVx = away.x * entity.topSpeed;
          targetVy = away.y * entity.topSpeed;
        }
        break;
      }
      case 'SEARCHING': {
        const lsp = entity.lastSeenPos || { x: ARENA_W / 2, y: ARENA_H / 2 };
        const distToLSP = this.dist(entity, lsp);

        if (distToLSP > 30 && entity.searchTimer < 3) {
          const dir = this.normalize({ x: lsp.x - entity.x, y: lsp.y - entity.y });
          targetVx = dir.x * entity.topSpeed;
          targetVy = dir.y * entity.topSpeed;
        } else {
          entity.searchTimer += dt;
          const searchRadius = Math.min(200, 60 + entity.searchTimer * 15);
          entity.orbitAngle += (entity.topSpeed / searchRadius) * dt;
          const goalX = lsp.x + Math.cos(entity.orbitAngle) * searchRadius;
          const goalY = lsp.y + Math.sin(entity.orbitAngle) * searchRadius;
          const dir = this.normalize({ x: goalX - entity.x, y: goalY - entity.y });
          targetVx = dir.x * entity.topSpeed * 0.6;
          targetVy = dir.y * entity.topSpeed * 0.6;
        }
        break;
      }
      case 'PATROLLING': {
        if (!entity.patrolPos) {
          entity.patrolPos = {
            x: WALL_THICKNESS + 100 + Math.random() * (ARENA_W - 200 - WALL_THICKNESS * 2),
            y: WALL_THICKNESS + 100 + Math.random() * (ARENA_H - 200 - WALL_THICKNESS * 2)
          };
        }
        const distToPatrol = this.dist(entity, entity.patrolPos);
        if (distToPatrol < 40) {
          entity.patrolPos = null;
        } else {
          const dir = this.normalize({ x: entity.patrolPos.x - entity.x, y: entity.patrolPos.y - entity.y });
          targetVx = dir.x * entity.topSpeed * 0.8;
          targetVy = dir.y * entity.topSpeed * 0.8;
        }
        break;
      }
    }

    return { x: targetVx, y: targetVy };
  }

  /** Applies movement, steering avoidance, and collision resolution */
  private updateEntityPhysics(entity: ArenaEntity, targetV: Vec2, dt: number, avoidanceWeight: number) {
    let finalTargetVx = targetV.x;
    let finalTargetVy = targetV.y;

    // Obstacle Avoidance
    const avoid = this.getSteeringAvoidance(entity);
    if (avoid.x !== 0 || avoid.y !== 0) {
      // Very strong avoidance weight to ensure 90-degree turn override
      finalTargetVx = finalTargetVx * 0.2 + avoid.x * 0.8;
      finalTargetVy = finalTargetVy * 0.2 + avoid.y * 0.8;
    }

    // Acceleration
    const accelFactor = entity.acceleration * dt;
    entity.vx += (finalTargetVx - entity.vx) * Math.min(1, accelFactor);
    entity.vy += (finalTargetVy - entity.vy) * Math.min(1, accelFactor);

    // Position & Collisions
    const res = this.resolveCollisions(entity, entity.x + entity.vx * dt, entity.y + entity.vy * dt);
    
    // NaN Guard
    if (!isNaN(res.x) && !isNaN(res.y)) {
      entity.x = res.x;
      entity.y = res.y;
    }
    
    entity.speed = Math.sqrt(entity.vx * entity.vx + entity.vy * entity.vy);

    // Rotation
    if (entity.state === 'PURSUING' || entity.state === 'FIGHTING' || entity.state === 'ORBITING') {
      // Rotate towards movement or target depending on context? 
      // For simplicity, smooth towards current velocity if moving fast enough
      if (entity.speed > 5) {
        const targetRot = Math.atan2(entity.vy, entity.vx);
        entity.rotation = this.lerpAngle(entity.rotation, targetRot, dt * 5);
      }
    } else if (entity.speed > 5) {
      const targetRot = Math.atan2(entity.vy, entity.vx);
      entity.rotation = this.lerpAngle(entity.rotation, targetRot, dt * 4);
    }
  }

  /** Calculates a steering vector to avoid obstacles by rotating 90 degrees */
  private getSteeringAvoidance(entity: ArenaEntity): Vec2 {
    const feelerDist = 80;
    const sideFeelerDist = 50;

    // Define 3 feelers: Central, Left-Whisker, Right-Whisker
    const feelers = [
      { x: entity.x + Math.cos(entity.rotation) * feelerDist, y: entity.y + Math.sin(entity.rotation) * feelerDist },
      { x: entity.x + Math.cos(entity.rotation - 0.5) * sideFeelerDist, y: entity.y + Math.sin(entity.rotation - 0.5) * sideFeelerDist },
      { x: entity.x + Math.cos(entity.rotation + 0.5) * sideFeelerDist, y: entity.y + Math.sin(entity.rotation + 0.5) * sideFeelerDist }
    ];

    for (const obs of this.obstacles) {
      for (const f of feelers) {
        if (f.x > obs.x - 5 && f.x < obs.x + obs.w + 5 &&
          f.y > obs.y - 5 && f.y < obs.y + obs.h + 5) {

          // 90-degree turn relative to current heading
          const leftTurn = { x: Math.cos(entity.rotation - Math.PI / 2), y: Math.sin(entity.rotation - Math.PI / 2) };
          const rightTurn = { x: Math.cos(entity.rotation + Math.PI / 2), y: Math.sin(entity.rotation + Math.PI / 2) };

          const centerX = obs.x + obs.w / 2;
          const centerY = obs.y + obs.h / 2;

          const leftDist = this.dist({ x: entity.x + leftTurn.x * 50, y: entity.y + leftTurn.y * 50 }, { x: centerX, y: centerY });
          const rightDist = this.dist({ x: entity.x + rightTurn.x * 50, y: entity.y + rightTurn.y * 50 }, { x: centerX, y: centerY });

          const chosen = leftDist > rightDist ? leftTurn : rightTurn;
          return { x: chosen.x * entity.topSpeed * 1.2, y: chosen.y * entity.topSpeed * 1.2 };
        }
      }
    }
    return { x: 0, y: 0 };
  }

  /** Resolves boundary and obstacle collisions for any entity */
  private resolveCollisions(entity: ArenaEntity, x: number, y: number): Vec2 {
    let newX = x;
    let newY = y;

    // ── Boundary collision (Arena Walls) ──
    if (newX < WALL_THICKNESS + entity.radius) {
      newX = WALL_THICKNESS + entity.radius;
      entity.vx *= -0.2;
    }
    if (newX > ARENA_W - WALL_THICKNESS - entity.radius) {
      newX = ARENA_W - WALL_THICKNESS - entity.radius;
      entity.vx *= -0.2;
    }
    if (newY < WALL_THICKNESS + entity.radius) {
      newY = WALL_THICKNESS + entity.radius;
      entity.vy *= -0.2;
    }
    if (newY > ARENA_H - WALL_THICKNESS - entity.radius) {
      newY = ARENA_H - WALL_THICKNESS - entity.radius;
      entity.vy *= -0.2;
    }

    // ── Obstacle collision (Multi-pass for stability) ──
    for (let i = 0; i < 2; i++) {
      for (const obs of this.obstacles) {
        const res = this.resolveCircleAABB(newX, newY, entity.radius, obs);
        if (res.x !== newX || res.y !== newY) {
          if (Math.abs(res.x - newX) > 0.01) entity.vx *= -0.2;
          if (Math.abs(res.y - newY) > 0.01) entity.vy *= -0.2;
          newX = res.x;
          newY = res.y;
        }
      }
    }

    return { x: newX, y: newY };
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

  /** Smoothly interpolates between two angles (in radians) */
  private lerpAngle(a: number, b: number, t: number): number {
    const diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    const finalDiff = diff < -Math.PI ? diff + Math.PI * 2 : diff;
    return a + finalDiff * t;
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
