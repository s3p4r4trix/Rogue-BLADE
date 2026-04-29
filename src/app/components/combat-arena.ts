import {
  Component,
  ElementRef,
  inject,
  viewChild,
  AfterViewInit,
  OnDestroy,
  ChangeDetectionStrategy,
  input,
  output,
  effect,
  untracked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CombatStore } from '../services/combat-store';
import { CombatEngineService } from '../services/combat-engine.service';
import { CombatEntity, AABB } from '../models/combat-model';
import { MissionContract } from '../models/mission-model';
import { ENEMY_TEMPLATES } from '../constants/enemy-templates';
import { Shuriken } from '../models/hardware-model';
import { COMBAT_CONFIG } from '../constants/combat-config';
import { VectorMath } from '../utils/vector-math.utils';

@Component({
  selector: 'app-combat-arena',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="arena-container flex flex-col items-center justify-center bg-gray-900 p-4 rounded-xl shadow-2xl border border-gray-700">
      <div class="header flex justify-between w-full mb-4 px-2">
        <div class="flex flex-col">
          <h2 class="text-cyan-400 font-bold text-xl tracking-wider uppercase flex items-center gap-2">
            <span class="w-2 h-6 bg-cyan-500 block"></span>
            Tactical Map: {{ mission()?.targetName || 'Simulation' }}
          </h2>
          <span class="text-[10px] text-cyan-800 font-mono">ENCRYPTED_FEED_v2.0 // ISOMETRIC_LITE</span>
        </div>
        <div class="status-badge px-3 py-1 bg-cyan-900/30 border border-cyan-500/50 rounded-full flex items-center gap-2">
          <div class="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></div>
          <span class="text-cyan-300 text-[10px] font-mono tracking-widest uppercase">Live_Feed</span>
        </div>
      </div>
      
      <div class="canvas-wrapper relative bg-[#05050a] rounded-lg overflow-hidden border border-white/10 shadow-2xl">
        <canvas #combatCanvas width="800" height="800" class="block cursor-crosshair"></canvas>
        
        <!-- Scanline Overlay -->
        <div class="absolute inset-0 pointer-events-none opacity-[0.03] scanline"></div>
        
        <!-- Tactical Grid -->
        <div class="absolute inset-0 pointer-events-none opacity-[0.05]" 
             [style.background-image]="'radial-gradient(circle, #22d3ee 1px, transparent 1px)'" 
             [style.background-size]="'40px 28px'">
        </div>
      </div>
      
      <div class="footer mt-4 w-full flex justify-between text-[10px] font-mono text-gray-500 uppercase tracking-tighter">
        <span>Res: 800x800 | Scale: {{ PERSPECTIVE_SCALE_Y }}Y</span>
        <span>Depth: Y-Sort + Z-Elevation</span>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    .canvas-wrapper {
      background: radial-gradient(circle at center, #0a0a1a 0%, #05050a 100%);
    }
    .scanline {
      background: linear-gradient(to bottom, rgba(34, 211, 238, 0) 50%, rgba(34, 211, 238, 0.2) 50%);
      background-size: 100% 4px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CombatArenaComponent implements AfterViewInit, OnDestroy {
  // ─── Dependencies ───────────────────────────────────────────────
  private readonly store = inject(CombatStore);
  private readonly gameEngineService = inject(CombatEngineService);

  // ─── Inputs & Outputs (Compatibility with StrikeReport) ─────────
  mission = input<MissionContract | null>(null);
  shurikens = input<Shuriken[]>([]);
  arenaLog = output<string>();
  missionComplete = output<{ success: boolean }>();

  // ─── Canvas Reference ───────────────────────────────────────────
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('combatCanvas');
  private ctx: CanvasRenderingContext2D | null = null;

  // ─── Game Loop State ────────────────────────────────────────────
  private animationFrameId: number | null = null;
  private lastTimestamp: number = 0;

  // ─── 3/4 Perspective Constants ──────────────────────────────────
  protected readonly PERSPECTIVE_SCALE_Y = 0.7;
  protected readonly ARENA_WIDTH = 800;
  protected readonly ARENA_HEIGHT = 800;

  constructor() {
    /**
     * React to mission/shuriken changes to re-initialize the store if needed.
     * In a fully decoupled ECS, this might happen elsewhere, but for compatibility
     * we handle the bridge here.
     */
    effect(() => {
      const missionData = this.mission();
      const shurikenList = this.shurikens();

      if (missionData && shurikenList.length > 0) {
        untracked(() => this.initializeCombatState(shurikenList, missionData));
      }
    });
  }

  ngAfterViewInit(): void {
    const canvasEl = this.canvas()?.nativeElement;
    if (canvasEl) {
      this.ctx = canvasEl.getContext('2d');
      this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));
    }
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  /**
   * The main game loop (requestAnimationFrame).
   * @param timestamp High-resolution timestamp from the browser.
   */
  private gameLoop(timestamp: number): void {
    if (!this.lastTimestamp) this.lastTimestamp = timestamp;

    // Calculate deltaTime in seconds
    const deltaTime = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    // 1. Execute: this.gameEngineService.updateTick(deltaTime)
    this.gameEngineService.updateTick(deltaTime);

    // 2. Check Mission Status
    this.checkMissionStatus();

    // 3. Execute: this.draw()
    this.draw();

    // Schedule next frame if not finished
    if (!this.store.isFinished()) {
      this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));
    }
  }

  /**
   * Evaluates if the mission objectives have been met or if the squad has failed.
   */
  private checkMissionStatus(): void {
    if (this.store.isFinished()) return;

    const entities = this.store.entities();
    const drones = entities.filter(e => e.type === 'PLAYER');
    const enemy = entities.find(e => e.type === 'ENEMY');

    // Win: Enemy HP is 0
    if (enemy && enemy.stats.hp <= 0) {
      this.store.setFinished(true);
      this.store.addLog('CRITICAL: TARGET_ENTITY_NEUTRALIZED. EXTRACTION_PROTOCOL_INITIATED.');
      this.missionComplete.emit({ success: true });
      return;
    }

    // Loss: All drones are destroyed
    const activeDrones = drones.filter(d => d.stats.hp > 0);
    if (activeDrones.length === 0) {
      this.store.setFinished(false);
      this.store.addLog('CRITICAL: SQUAD_SIGNAL_LOST. MISSION_TERMINATED.');
      this.missionComplete.emit({ success: false });
      return;
    }

    // Loss: Time out (if duration exceeded)
    const mission = this.mission();
    if (mission && this.store.timeElapsed() >= mission.durationSeconds) {
      this.store.setFinished(false);
      this.store.addLog('CRITICAL: MISSION_TIME_EXPIRED. RECALLING_REMAINING_UNITS.');
      this.missionComplete.emit({ success: false });
    }
  }

  /**
   * Orchestrates the 3/4 perspective rendering pipeline.
   */
  private draw(): void {
    const ctx = this.ctx;
    if (!ctx) return;

    // A. Clear & Draw Background
    ctx.clearRect(0, 0, this.ARENA_WIDTH, this.ARENA_HEIGHT);

    // Draw arena boundary (scaled by PERSPECTIVE_SCALE_Y)
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, this.ARENA_WIDTH, this.ARENA_HEIGHT * this.PERSPECTIVE_SCALE_Y);

    // Draw obstacles (AABBs) from the CombatStore
    this.drawObstacles(ctx);

    // B. Depth Sorting (Y-Sort with Z-Axis)
    const entities = this.store.entities();
    const sortedEntities = [...entities].sort((a, b) => {
      const sortA = a.position.y - (a.z * this.PERSPECTIVE_SCALE_Y);
      const sortB = b.position.y - (b.z * this.PERSPECTIVE_SCALE_Y);
      return sortA - sortB;
    });

    // C. Render Entities
    for (const entity of sortedEntities) {
      this.drawEntity(ctx, entity);
    }

    // D. Tactical Visual Feedback (Overlays)
    this.drawTacticalOverlays(ctx);

    // E. Projectiles
    this.drawProjectiles(ctx);
  }

  /**
   * Renders obstacles as solid blocks with a simulated height.
   */
  private drawObstacles(ctx: CanvasRenderingContext2D): void {
    const obstacles = this.store.obstacles();

    for (const obs of obstacles) {
      const renderY = obs.y * this.PERSPECTIVE_SCALE_Y;
      const renderHeight = obs.height * this.PERSPECTIVE_SCALE_Y;
      const zOffset = (obs.zHeight || 0) * this.PERSPECTIVE_SCALE_Y;

      // 1. Draw the vertical faces (Sides/Front)
      ctx.fillStyle = '#1e293b'; // slate-800
      ctx.fillRect(obs.x, renderY - zOffset, obs.width, renderHeight + zOffset);

      // 2. Draw the top face
      ctx.fillStyle = '#334155'; // slate-700
      ctx.fillRect(obs.x, renderY - zOffset, obs.width, renderHeight);

      // 3. Highlight edges
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(obs.x, renderY - zOffset, obs.width, renderHeight);
      ctx.strokeRect(obs.x, renderY - zOffset, obs.width, renderHeight + zOffset);
    }
  }

  /**
   * Renders a single combat entity with 3/4 perspective logic.
   */
  private drawEntity(ctx: CanvasRenderingContext2D, entity: CombatEntity): void {
    const x = entity.position.x;
    const groundY = entity.position.y * this.PERSPECTIVE_SCALE_Y;
    const bodyY = (entity.position.y - entity.z) * this.PERSPECTIVE_SCALE_Y;
    const radius = entity.radius;

    // 1. Shadow: Semi-transparent black ellipse at ground position
    ctx.beginPath();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.ellipse(x, groundY, radius, radius * this.PERSPECTIVE_SCALE_Y, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Sprite / Body: Circle/Ellipse offset by elevation (Z-axis)
    ctx.beginPath();

    // Hit Flash logic: If hitFlash > 0, draw white overlay
    if (entity.hitFlash > 0) {
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#FFFFFF';
    } else {
      ctx.fillStyle = entity.type === 'PLAYER' ? '#06b6d4' : '#ef4444'; // Cyan vs Red
      ctx.shadowBlur = 0;
    }

    ctx.ellipse(x, bodyY, radius, radius * this.PERSPECTIVE_SCALE_Y, 0, 0, Math.PI * 2);
    ctx.fill();

    // Reset shadow for subsequent draws
    ctx.shadowBlur = 0;

    // Aesthetic Glow
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // (Strike Ready indicator moved to drawTacticalOverlays for depth sorting)

    // 3. HP Bar: Small bar above the sprite
    const hpPercent = Math.max(0, entity.stats.hp / entity.stats.maxHp);
    const barWidth = 30;
    const barHeight = 4;
    const barX = x - barWidth / 2;
    const barY = bodyY - 28;

    // Background
    ctx.fillStyle = 'rgba(50, 50, 50, 0.8)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Foreground
    ctx.fillStyle = hpPercent > 0.5 ? '#22c55e' : (hpPercent > 0.2 ? '#eab308' : '#ef4444'); // Green, Yellow, Red
    ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);

    // 4. State Label: Small text string above the sprite
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = 'bold 9px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(entity.state, x, bodyY - 18);
  }

  /**
   * Renders tactical overlays for LOS, Search, and Ranges.
   */
  private drawTacticalOverlays(ctx: CanvasRenderingContext2D): void {
    const entities = this.store.entities();

    for (const entity of entities) {
      const x = entity.position.x;
      const y = entity.position.y * this.PERSPECTIVE_SCALE_Y;

      // Range Wireframes
      ctx.setLineDash([4, 4]);

      const radarRadius = COMBAT_CONFIG.RANGES.RADAR_RANGE;
      const meleeRadius = COMBAT_CONFIG.RANGES.MELEE_RANGE_BASE + COMBAT_CONFIG.RANGES.MELEE_RANGE_BUFFER;
      const obstacles = this.store.obstacles();

      // Draw Vision/Radar Area with Dynamic Clipping (Section 8.5)
      if (entity.type === 'ENEMY') {
        // Enemies have a 120-degree FOV cone
        const fovDegrees = 120;
        const halfFovRad = (fovDegrees * Math.PI) / 360;
        const startAngle = entity.rotation - halfFovRad;
        const endAngle = entity.rotation + halfFovRad;

        ctx.beginPath();
        ctx.moveTo(x, y);
        
        // Raycast across the FOV arc to calculate the visibility polygon
        const segments = 64;
        for (let i = 0; i <= segments; i++) {
          const angle = startAngle + (endAngle - startAngle) * (i / segments);
          const dir = { x: Math.cos(angle), y: Math.sin(angle) };
          let actualDist: number = radarRadius;

          for (const obs of obstacles) {
            // Vision is only blocked if the entity is not flying higher than the obstacle
            if (entity.z >= (obs.zHeight ?? 0)) continue;

            const hit = VectorMath.intersectRayAABB(entity.position, dir, radarRadius, obs);
            if (hit && hit.distance < actualDist) {
              actualDist = hit.distance;
            }
          }

          const px = x + dir.x * actualDist;
          const py = y + dir.y * actualDist * this.PERSPECTIVE_SCALE_Y;
          ctx.lineTo(px, py);
        }
        ctx.closePath();
        
        ctx.fillStyle = 'rgba(239, 68, 68, 0.03)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.15)';
        ctx.stroke();
      } else {
        // Player drones have 360-degree vision with dynamic clipping
        ctx.beginPath();
        
        const segments = 72; // 5-degree steps
        for (let i = 0; i <= segments; i++) {
          const angle = (i / segments) * Math.PI * 2;
          const dir = { x: Math.cos(angle), y: Math.sin(angle) };
          let actualDist: number = radarRadius;

          for (const obs of obstacles) {
            if (entity.z >= (obs.zHeight ?? 0)) continue;
            const hit = VectorMath.intersectRayAABB(entity.position, dir, radarRadius, obs);
            if (hit && hit.distance < actualDist) {
              actualDist = hit.distance;
            }
          }

          const px = x + dir.x * actualDist;
          const py = y + dir.y * actualDist * this.PERSPECTIVE_SCALE_Y;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.stroke();
      }

      // Melee Range Indicator
      ctx.beginPath();
      ctx.strokeStyle = entity.type === 'PLAYER' ? 'rgba(34, 211, 238, 0.15)' : 'rgba(239, 68, 68, 0.15)';
      ctx.ellipse(x, y, meleeRadius, meleeRadius * this.PERSPECTIVE_SCALE_Y, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.setLineDash([]);

      // LOS for PURSUING or STRIKING
      if ((entity.state === 'PURSUING' || entity.state === 'STRIKING') && entity.targetId) {
        const target = entities.find(e => e.id === entity.targetId);
        if (target) {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(6, 182, 212, 0.1)';
          ctx.lineWidth = 1;
          ctx.moveTo(entity.position.x, (entity.position.y - entity.z) * this.PERSPECTIVE_SCALE_Y);
          ctx.lineTo(target.position.x, (target.position.y - target.z) * this.PERSPECTIVE_SCALE_Y);
          ctx.stroke();
        }
      }

      // Search Indicator for SEARCHING
      if (entity.state === 'SEARCHING' && entity.lastSeenPos) {
        const lx = entity.lastSeenPos.x;
        const ly = entity.lastSeenPos.y * this.PERSPECTIVE_SCALE_Y;

        // Dashed connection
        ctx.beginPath();
        ctx.setLineDash([2, 2]);
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.3)';
        ctx.moveTo(entity.position.x, (entity.position.y - entity.z) * this.PERSPECTIVE_SCALE_Y);
        ctx.lineTo(lx, ly);
        ctx.stroke();
        ctx.setLineDash([]);

        // Yellow Crosshair
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(lx - 5, ly); ctx.lineTo(lx + 5, ly);
        ctx.moveTo(lx, ly - 5); ctx.lineTo(lx, ly + 5);
        ctx.stroke();
      }

      // ⚡ Strike Ready Indicator (Overlay Layer)
      const currentSpeed = Math.sqrt(entity.velocity.x ** 2 + entity.velocity.y ** 2);
      const minStrikeSpeed = entity.stats.maxSpeed * 0.4;

      if (entity.type === 'PLAYER' && currentSpeed >= minStrikeSpeed && entity.state !== 'STRIKING') {
        const bodyY = (entity.position.y - entity.z) * this.PERSPECTIVE_SCALE_Y;
        const pulse = Math.sin(Date.now() / 100) * 0.5 + 0.5;

        ctx.save();
        ctx.shadowBlur = 10 + pulse * 10;
        ctx.shadowColor = '#FBED21';
        ctx.fillStyle = '#FBED21';

        // Procedural Lightning Bolt
        const bx = x;
        const by = bodyY - entity.radius - 15;
        ctx.beginPath();
        ctx.moveTo(bx + 4, by - 8);
        ctx.lineTo(bx - 4, by);
        ctx.lineTo(bx + 1, by);
        ctx.lineTo(bx - 3, by + 10);
        ctx.lineTo(bx + 5, by + 1);
        ctx.lineTo(bx, by + 1);
        ctx.closePath();
        ctx.fill();

        // Strike Aura
        ctx.beginPath();
        ctx.strokeStyle = `rgba(34, 211, 238, ${0.3 + pulse * 0.4})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 2]);
        ctx.ellipse(x, bodyY, entity.radius + 6, (entity.radius + 6) * this.PERSPECTIVE_SCALE_Y, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  /**
   * Bridges the UI data to the ECS-lite store.
   * Maps workshop shurikens and mission parameters to combat entities.
   */
  private initializeCombatState(shurikens: Shuriken[], mission: MissionContract): void {
    // 0. Reset Store
    this.store.reset();

    // 1. Initialize Obstacles
    const obstacles: AABB[] = [
      { id: 'wall-1', x: 300, y: 300, width: 200, height: 60, zHeight: 50 },
      { id: 'wall-2', x: 150, y: 500, width: 80, height: 120, zHeight: 50 },
      { id: 'wall-3', x: 550, y: 150, width: 80, height: 120, zHeight: 50 },
      { id: 'wall-4', x: 400, y: 600, width: 120, height: 60, zHeight: 50 }
    ];
    this.store.setObstacles(obstacles);

    // 2. Initialize Entities
    const combatEntities: CombatEntity[] = [];

    // Player Drones
    shurikens.forEach((shuriken, index) => {
      combatEntities.push({
        id: shuriken.id,
        name: shuriken.name,
        type: 'PLAYER',
        position: { x: 100 + (index * 60), y: 700 },
        z: 25,
        velocity: { x: 0, y: 0 },
        rotation: -Math.PI / 2,
        stats: {
          hp: shuriken.hull?.maxHp || 100,
          maxHp: shuriken.hull?.maxHp || 100,
          armorValue: shuriken.hull?.armorValue || 5,
          armorType: 'UNARMORED', // Drones are usually unarmored or specific to hull
          evasionRate: shuriken.engine?.evasionRate || 0.05,
          energy: shuriken.energyCell?.maxEnergy || 100,
          maxEnergy: shuriken.energyCell?.maxEnergy || 100,
          energyRegen: shuriken.reactor?.energyRegen || 5,
          energyDrain: shuriken.engine?.energyDrain || 5,
          speed: 0,
          maxSpeed: shuriken.engine?.topSpeed || 150,
          acceleration: shuriken.engine?.acceleration || 50,
          weight: [
            shuriken.engine, shuriken.hull, shuriken.energyCell,
            shuriken.sensor, shuriken.blade, shuriken.formDesign,
            shuriken.processor, shuriken.shield, shuriken.reactor, shuriken.semiAI
          ].reduce((acc, comp) => acc + (comp?.weight || 0), 0) || 100,
          baseDamage: (shuriken.blade?.baseDamage || 15),
          damageType: shuriken.blade?.damageType || 'KINETIC',
          critChance: shuriken.blade?.critChance || 0.1,
          critMultiplier: 1.5,
        },
        state: 'PATROLLING',
        gambits: [], // Logic handled by RoutineService elsewhere
        radius: 12,
        color: '#06b6d4',
        stateTimer: 0,
        retaliationTimer: 0,
        hitFlash: 0
      });
    });

    // Enemy Target (Zenith Hostile)
    const template = ENEMY_TEMPLATES[mission.enemyTypeId] || ENEMY_TEMPLATES['GUARDIAN_UNIT'];
    const enemyId = `enemy-${crypto.randomUUID()}`;

    combatEntities.push({
      id: enemyId,
      name: template.name,
      type: 'ENEMY',
      position: { x: 400, y: 100 },
      z: 0,
      velocity: { x: 0, y: 0 },
      rotation: Math.PI / 2,
      stats: {
        hp: template.stats.maxHp,
        maxHp: template.stats.maxHp,
        armorValue: template.stats.armorValue,
        armorType: template.stats.armorType,
        evasionRate: template.stats.evasionRate,
        energy: template.stats.energy,
        maxEnergy: template.stats.maxEnergy,
        energyRegen: template.stats.energyRegen,
        energyDrain: template.stats.energyDrain,
        speed: 0,
        maxSpeed: template.stats.maxSpeed,
        acceleration: template.stats.acceleration,
        weight: template.stats.weight,
        baseDamage: template.stats.baseDamage,
        damageType: template.stats.damageType,
        critChance: template.stats.critChance,
        critMultiplier: template.stats.critMultiplier
      },
      state: 'PATROLLING',
      gambits: [],
      radius: template.radius,
      color: template.color,
      stateTimer: 0,
      retaliationTimer: 0,
      hitFlash: 0
    });

    this.store.setEntities(combatEntities);
    this.store.addLog('SYSTEM: Combat simulation initialized. Entities deployed.');
    this.arenaLog.emit(`[SYSTEM] Combat simulation initialized. Entities deployed.`);
  }

  /**
   * Renders active projectiles from the CombatStore.
   */
  private drawProjectiles(ctx: CanvasRenderingContext2D): void {
    const projectiles = this.store.projectiles();

    for (const p of projectiles) {
      const x = p.position.x;
      const y = p.position.y * this.PERSPECTIVE_SCALE_Y;
      const radius = p.radius || 3;

      ctx.save();
      ctx.beginPath();

      switch (p.damageType) {
        case 'ENERGY':
          // Short yellow-reddish beams with afterglow
          const dir = VectorMath.normalize(p.velocity);
          const length = 12;
          
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.strokeStyle = '#facc15'; // Yellow core
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#ef4444'; // Reddish afterglow
          
          ctx.moveTo(x - dir.x * length, y - dir.y * length * this.PERSPECTIVE_SCALE_Y);
          ctx.lineTo(x, y);
          ctx.stroke();
          
          // Inner core for intensity
          ctx.lineWidth = 1;
          ctx.strokeStyle = '#ffffff';
          ctx.shadowBlur = 0;
          ctx.stroke();
          break;

        case 'KINETIC':
          // Grey Streaks
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 2;
          const kDir = VectorMath.normalize(p.velocity);
          ctx.moveTo(x - kDir.x * 6, y - kDir.y * 6 * this.PERSPECTIVE_SCALE_Y);
          ctx.lineTo(x + kDir.x * 2, y + kDir.y * 2 * this.PERSPECTIVE_SCALE_Y);
          ctx.stroke();
          break;

        case 'SLASHING':
          // Yellow Tracers
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 1.5;
          const sDir = VectorMath.normalize(p.velocity);
          ctx.moveTo(x - sDir.x * 10, y - sDir.y * 10 * this.PERSPECTIVE_SCALE_Y);
          ctx.lineTo(x, y);
          ctx.stroke();
          break;

        case 'EMP':
          // Pulsing Purple Rings
          const pulse = Math.sin(Date.now() / 50) * 0.5 + 0.5;
          ctx.strokeStyle = '#a855f7';
          ctx.lineWidth = 2;
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#a855f7';
          ctx.arc(x, y, radius + pulse * 4, 0, Math.PI * 2);
          ctx.stroke();
          break;
        
        default:
          ctx.fillStyle = '#ffffff';
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
      }

      ctx.restore();
    }
  }
}
