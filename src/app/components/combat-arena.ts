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
import { Shuriken } from '../models/hardware-model';

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
  }

  /**
   * Renders obstacles as solid rectangular blocks.
   */
  private drawObstacles(ctx: CanvasRenderingContext2D): void {
    const obstacles = this.store.obstacles();
    ctx.fillStyle = '#1e293b'; // slate-800
    ctx.strokeStyle = '#334155'; // slate-700
    ctx.lineWidth = 1;

    for (const obs of obstacles) {
      const renderY = obs.y * this.PERSPECTIVE_SCALE_Y;
      const renderHeight = obs.height * this.PERSPECTIVE_SCALE_Y;
      
      ctx.fillRect(obs.x, renderY, obs.width, renderHeight);
      ctx.strokeRect(obs.x, renderY, obs.width, renderHeight);
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
    ctx.fillStyle = entity.type === 'PLAYER' ? '#06b6d4' : '#ef4444'; // Cyan vs Red
    ctx.ellipse(x, bodyY, radius, radius * this.PERSPECTIVE_SCALE_Y, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Aesthetic Glow
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 3. State Label: Small text string above the sprite
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
      
      // Sensor Range (e.g., 120)
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.ellipse(x, y, 120, 120 * this.PERSPECTIVE_SCALE_Y, 0, 0, Math.PI * 2);
      ctx.stroke();
      
      // Melee Range (20)
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.ellipse(x, y, 20, 20 * this.PERSPECTIVE_SCALE_Y, 0, 0, Math.PI * 2);
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
      { id: 'wall-1', x: 300, y: 300, width: 200, height: 60 },
      { id: 'wall-2', x: 150, y: 500, width: 80, height: 120 },
      { id: 'wall-3', x: 550, y: 150, width: 80, height: 120 },
      { id: 'wall-4', x: 400, y: 600, width: 120, height: 60 }
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
          energy: shuriken.energyCell?.maxEnergy || 100,
          maxEnergy: shuriken.energyCell?.maxEnergy || 100,
          speed: 0,
          maxSpeed: shuriken.engine?.topSpeed || 150,
          acceleration: shuriken.engine?.acceleration || 50,
        },
        state: 'PATROLLING',
        gambits: [], // Logic handled by RoutineService elsewhere
        radius: 12,
        color: '#06b6d4',
        stateTimer: 0
      });
    });

    // Enemy Target
    combatEntities.push({
      id: 'enemy-1',
      name: mission.targetName,
      type: 'ENEMY',
      position: { x: 400, y: 100 },
      z: 0,
      velocity: { x: 0, y: 0 },
      rotation: Math.PI / 2,
      stats: {
        hp: mission.hull,
        maxHp: mission.hull,
        energy: 1000,
        maxEnergy: 1000,
        speed: 0,
        maxSpeed: 80,
        acceleration: 30,
      },
      state: 'PATROLLING',
      gambits: [],
      radius: 20,
      color: '#ef4444',
      stateTimer: 0
    });

    this.store.setEntities(combatEntities);
    this.store.addLog('SYSTEM: Combat simulation initialized. Entities deployed.');
    this.arenaLog.emit(`[SYSTEM] Combat simulation initialized. Entities deployed.`);
  }
}