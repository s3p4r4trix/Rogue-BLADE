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

// ─── Data Interfaces ──────────────────────────────────────────────

/** Axis-Aligned Bounding Box for obstacles */
interface AABB { x: number; y: number; w: number; h: number; }

/** A 2D vector helper */
interface Vec2 { x: number; y: number; }

/** AI behavior state machine labels */
type AIState = 'SEEKING' | 'ORBITING' | 'FLEEING' | 'IDLE' | 'REBOOTING' | 'SEARCHING';

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

  // ─── Canvas ref ────────────────────────────────────────────────
  private canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('arenaCanvas');
  private ctx!: CanvasRenderingContext2D;
  private animFrameId = 0;
  private lastTime = 0;

  // ─── Arena State ───────────────────────────────────────────────
  private obstacles: AABB[] = [];
  private drones: ArenaEntity[] = [];
  private enemy!: ArenaEntity;
  private arenaTime = 0; // Total elapsed arena time in seconds

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
      state: 'SEEKING' as AIState,
      orbitAngle: (Math.PI * 2 / Math.max(1, shurikens.length)) * i,
      isEnemy: false,
      hp: s.hull?.maxHp ?? 100,
      maxHp: s.hull?.maxHp ?? 100,
      strikeCooldown: 0,
      canStrike: false,
      lastSeenPos: null as Vec2 | null,
      searchTimer: 0,
      hitFlashTimer: 0,
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
      sensorRange: 0,
      meleeRange: 0,
      state: 'IDLE' as AIState,
      orbitAngle: 0,
      isEnemy: true,
      hp: mission?.hull ?? 300,
      maxHp: (mission?.hull ?? 300) + (mission?.shields ?? 0),
      strikeCooldown: 0,
      canStrike: false,
      lastSeenPos: null,
      searchTimer: 0,
      hitFlashTimer: 0,
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
    // Tick down enemy hit flash
    if (this.enemy.hitFlashTimer > 0) this.enemy.hitFlashTimer -= dt;

    for (const drone of this.drones) {
      if (drone.hp <= 0) continue;

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
        // Close enough + fast enough + clear LOS = attempt strike
        drone.state = 'SEEKING';
      } else if (distToEnemy < drone.meleeRange) {
        // Close but too slow or no LOS → orbit for another pass
        drone.state = 'ORBITING';
      } else if (distToEnemy < drone.sensorRange && hasLOS) {
        drone.state = 'SEEKING';
      } else if (distToEnemy < drone.sensorRange && !hasLOS) {
        // In range but blocked → search using last-seen position
        drone.state = 'SEARCHING';
      } else if (drone.lastSeenPos) {
        // Out of range but have memory → search
        drone.state = 'SEARCHING';
      } else {
        drone.state = 'SEEKING'; // Default: move toward enemy
      }

      // Log state transitions
      if (prevState !== drone.state) {
        this.emitLog(`${drone.name}: [STATE] ${prevState} → ${drone.state}`);
      }

      // ── Execute Movement Behavior ──
      let targetVx = 0;
      let targetVy = 0;

      switch (drone.state) {
        case 'SEEKING': {
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

      // Obstacle collision
      for (const obs of this.obstacles) {
        const resolved = this.resolveCircleAABB(newX, newY, drone.radius, obs);
        newX = resolved.x;
        newY = resolved.y;
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
          this.emitLog(`[SYSTEM] MISSION OBJECTIVE NEUTRALIZED.`);
        }

        // Bounce away after strike (adds fly-by variation)
        const bounceDir = this.normalize({ x: drone.x - this.enemy.x, y: drone.y - this.enemy.y });
        drone.vx = bounceDir.x * drone.topSpeed * 0.7;
        drone.vy = bounceDir.y * drone.topSpeed * 0.7;
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
      SEEKING: '#22d3ee', ORBITING: '#a78bfa', FLEEING: '#f97316',
      IDLE: '#6b7280', REBOOTING: '#ef4444', SEARCHING: '#facc15'
    };
    ctx.fillStyle = stateColors[drone.state] || '#fff';
    ctx.font = 'bold 8px monospace';
    const stateLabel = drone.canStrike ? `${drone.state} ⚡` : drone.state;
    ctx.fillText(stateLabel, drone.x, drawY - drone.radius - 8);
  }

  /** Render the hostile enemy entity */
  private drawEnemy(ctx: CanvasRenderingContext2D, enemy: ArenaEntity) {
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
    ctx.fillText(enemy.name, enemy.x, enemy.y - enemy.radius - 12);

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

    // ── Sensor Range circle ──
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.15)';
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

    // ── LOS Raycast Line ──
    const losBlocked = this.isLOSBlocked(drone, this.enemy);
    ctx.strokeStyle = losBlocked ? 'rgba(239, 68, 68, 0.6)' : 'rgba(34, 197, 94, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash(losBlocked ? [6, 4] : []);
    ctx.beginPath();
    ctx.moveTo(drone.x, drawY);
    ctx.lineTo(this.enemy.x, this.enemy.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // LOS status marker at midpoint
    const mx = (drone.x + this.enemy.x) / 2;
    const my = (drawY + this.enemy.y) / 2;
    ctx.fillStyle = losBlocked ? '#ef4444' : '#22c55e';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(losBlocked ? '✕ BLOCKED' : '✓ CLEAR', mx, my - 6);

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

  /**
   * Parametric ray vs AABB intersection test.
   * Returns true if the line segment from (x1,y1) to (x2,y2) intersects the box.
   */
  private rayIntersectsAABB(x1: number, y1: number, x2: number, y2: number, box: AABB): boolean {
    const dx = x2 - x1;
    const dy = y2 - y1;

    let tmin = 0;
    let tmax = 1;

    // X slab
    if (Math.abs(dx) < 1e-8) {
      if (x1 < box.x || x1 > box.x + box.w) return false;
    } else {
      let t1 = (box.x - x1) / dx;
      let t2 = (box.x + box.w - x1) / dx;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return false;
    }

    // Y slab
    if (Math.abs(dy) < 1e-8) {
      if (y1 < box.y || y1 > box.y + box.h) return false;
    } else {
      let t1 = (box.y - y1) / dy;
      let t2 = (box.y + box.h - y1) / dy;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return false;
    }

    return true;
  }

  /**
   * Circle-vs-AABB collision resolution.
   * Pushes the circle out of the rectangle if overlapping.
   */
  private resolveCircleAABB(cx: number, cy: number, r: number, box: AABB): Vec2 {
    // Closest point on AABB to circle center
    const closestX = Math.max(box.x, Math.min(cx, box.x + box.w));
    const closestY = Math.max(box.y, Math.min(cy, box.y + box.h));

    const distX = cx - closestX;
    const distY = cy - closestY;
    const distSq = distX * distX + distY * distY;

    if (distSq < r * r && distSq > 0) {
      const dist = Math.sqrt(distSq);
      const overlap = r - dist;
      const nx = distX / dist;
      const ny = distY / dist;
      return { x: cx + nx * overlap, y: cy + ny * overlap };
    }

    // Edge case: center is inside the box
    if (distSq === 0) {
      return { x: cx, y: cy - r }; // Push upward
    }

    return { x: cx, y: cy };
  }
}
