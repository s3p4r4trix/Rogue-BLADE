import {
  Component,
  OnDestroy,
  ElementRef,
  viewChild,
  AfterViewInit,
  ChangeDetectionStrategy,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PlayerService } from '../services/player.service';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Point { x: number; y: number; }

interface Trace {
  /** Ordered list of waypoints for this trace segment. */
  points: Point[];
  /** Total arc-length of the trace (computed once). */
  length: number;
  /** Per-segment lengths for fast interpolation. */
  segLengths: number[];
}

/** A junction via or component pad on the PCB. */
interface Node {
  x: number;
  y: number;
  /** Fixed radius, set once at generation time. */
  r: number;
}

interface Electron {
  /** Which trace this electron travels on. */
  trace: Trace;
  /** Current normalised position along the trace [0..1]. */
  t: number;
  /** Travel speed in normalised units per millisecond. */
  speed: number;
  /** Whether the electron is currently visible/active. */
  active: boolean;
  /** Countdown in ms before this electron fires again. */
  fireIn: number;
  /** Trail history: recent canvas positions (oldest first). */
  trail: Point[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: trace geometry
// ─────────────────────────────────────────────────────────────────────────────
function buildTrace(points: Point[]): Trace {
  const segLengths: number[] = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const len = Math.sqrt(dx * dx + dy * dy);
    segLengths.push(len);
    total += len;
  }
  return { points, length: total, segLengths };
}

/** Interpolate a world-space position along a trace at normalised t ∈ [0,1]. */
function tracePos(trace: Trace, t: number): Point {
  const target = Math.max(0, Math.min(trace.length, t * trace.length));
  let acc = 0;
  for (let i = 0; i < trace.segLengths.length; i++) {
    const segLen = trace.segLengths[i];
    if (acc + segLen >= target || i === trace.segLengths.length - 1) {
      const localT = segLen > 0 ? (target - acc) / segLen : 0;
      const p0 = trace.points[i];
      const p1 = trace.points[i + 1];
      return {
        x: p0.x + (p1.x - p0.x) * Math.max(0, Math.min(1, localT)),
        y: p0.y + (p1.y - p0.y) * Math.max(0, Math.min(1, localT)),
      };
    }
    acc += segLen;
  }
  return { ...trace.points[trace.points.length - 1] };
}

// ─────────────────────────────────────────────────────────────────────────────
// PCB layout generator
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Generates a coherent PCB layout filling `w × h` pixels.
 * All randomness is seeded here so the layout is stable (not flickering).
 */
function generatePcbLayout(w: number, h: number): { traces: Trace[]; nodes: Node[]; primaryCount: number } {
  const traces: Trace[] = [];
  const nodes:  Node[]  = [];

  // ── Main bus rails (horizontal) ────────────────────────────────────────────
  const hRails = [0.06, 0.14, 0.22, 0.32, 0.42, 0.52, 0.62, 0.72, 0.82, 0.91, 0.97]
    .map(f => Math.round(h * f));

  // ── Main bus rails (vertical) ─────────────────────────────────────────────
  const vRails = [0.05, 0.12, 0.21, 0.31, 0.42, 0.53, 0.63, 0.73, 0.82, 0.90, 0.97]
    .map(f => Math.round(w * f));

  // Seeded jog values so they don't change on redraw
  const hJogs = hRails.map(y => ({
    midX: Math.round(w * (0.25 + Math.floor(Math.random() * 4) * 0.15)),
    jogY: y + (Math.floor(Math.random() * 2) === 0 ? 10 : -10),
  }));
  const vJogs = vRails.map(x => ({
    midY: Math.round(h * (0.25 + Math.floor(Math.random() * 4) * 0.15)),
    jogX: x + (Math.floor(Math.random() * 2) === 0 ? 10 : -10),
  }));

  // Full horizontal bus lines
  const xStart = Math.round(w * 0.02);
  const xEnd   = Math.round(w * 0.98);
  for (let hi = 0; hi < hRails.length; hi++) {
    const y    = hRails[hi];
    const { midX, jogY } = hJogs[hi];
    traces.push(buildTrace([
      { x: xStart, y },
      { x: midX - 15, y },
      { x: midX, y: jogY },
      { x: midX + 15, y },
      { x: xEnd, y },
    ]));
    nodes.push({ x: xStart, y, r: 2.5 });
    nodes.push({ x: xEnd,   y, r: 2.5 });
    nodes.push({ x: midX, y: jogY, r: 3.5 });
  }

  // Full vertical bus lines
  const yStart = Math.round(h * 0.02);
  const yEnd   = Math.round(h * 0.98);
  for (let vi = 0; vi < vRails.length; vi++) {
    const x = vRails[vi];
    const { midY, jogX } = vJogs[vi];
    traces.push(buildTrace([
      { x, y: yStart },
      { x, y: midY - 15 },
      { x: jogX, y: midY },
      { x, y: midY + 15 },
      { x, y: yEnd },
    ]));
    nodes.push({ x, y: yStart, r: 2.5 });
    nodes.push({ x, y: yEnd,   r: 2.5 });
    nodes.push({ x: jogX, y: midY, r: 3.5 });
  }

  const primaryCount = traces.length; // bus lines are "primary"

  // ── Branch traces connecting adjacent rail intersections ──────────────────
  for (let vi = 0; vi < vRails.length - 1; vi++) {
    for (let hi = 0; hi < hRails.length - 1; hi++) {
      // Use deterministic pseudo-random via hash so layout is stable
      const hash = (vi * 31 + hi * 17) % 100;
      if (hash > 45) continue; // ~45% density

      const x0 = vRails[vi];
      const x1 = vRails[vi + 1];
      const y0 = hRails[hi];
      const y1 = hRails[hi + 1];

      // Alternate between L and Z style traces for variety
      if (hash % 2 === 0) {
        // L: go horizontal then vertical
        const midX = Math.round((x0 + x1) / 2);
        traces.push(buildTrace([{ x: x0, y: y0 }, { x: midX, y: y0 }, { x: midX, y: y1 }]));
      } else {
        // Z: short diagonal hop (two right-angle bends)
        const midX = Math.round(x0 + (x1 - x0) * 0.4);
        const midY = Math.round(y0 + (y1 - y0) * 0.6);
        traces.push(buildTrace([{ x: x0, y: y0 }, { x: midX, y: y0 }, { x: midX, y: midY }, { x: x1, y: midY }, { x: x1, y: y1 }]));
      }
    }
  }

  // ── Short component stubs (resistors, capacitors, etc.) ───────────────────
  // Each stub hangs off a rail intersection
  const stubDensity = Math.floor((w * h) / 60000);
  for (let i = 0; i < stubDensity; i++) {
    const vx  = vRails[(i * 3) % vRails.length];
    const hy  = hRails[(i * 7) % hRails.length];
    const len = 25 + (i % 5) * 12;
    const dir = i % 4; // 0=right, 1=down, 2=left, 3=up
    const ex  = vx + (dir === 0 ? len : dir === 2 ? -len : 0);
    const ey  = hy + (dir === 1 ? len : dir === 3 ? -len : 0);
    traces.push(buildTrace([{ x: vx, y: hy }, { x: ex, y: hy }, { x: ex, y: ey }]));
    nodes.push({ x: ex, y: ey, r: 4 }); // pad at end of stub
  }

  return { traces, nodes, primaryCount };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-pcb-background',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!--
      Two stacked canvases:
      - #pcbCanvas  = static PCB board (drawn once, never cleared)
      - #elCanvas   = electron animation layer (cleared each frame)
    -->
    <canvas #pcbCanvas
      style="position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:-2;">
    </canvas>
    <canvas #elCanvas
      style="position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:-1;">
    </canvas>
  `,
})
export class PcbBackground implements AfterViewInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);

  /** The static PCB board canvas (drawn once). */
  private pcbCanvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('pcbCanvas');
  /** The electron animation canvas (cleared each frame). */
  private elCanvasRef  = viewChild.required<ElementRef<HTMLCanvasElement>>('elCanvas');

  private animFrameId  = 0;
  private lastTs       = 0;

  // PCB state
  private traces:       Trace[]    = [];
  private nodes:        Node[]     = [];
  private primaryCount  = 0;
  private electrons:    Electron[] = [];

  // How many trail samples to keep per electron
  private readonly TRAIL_LENGTH = 32;

  // ── Palette ───────────────────────────────────────────────────────────────
  private readonly BG_COL              = '#030014';
  private readonly TRACE_COL_PRIMARY   = 'rgba(55, 33, 120, 0.95)';
  private readonly TRACE_COL_SECONDARY = 'rgba(32, 28, 80, 0.80)';
  private readonly NODE_FILL           = '#030014';
  private readonly NODE_STROKE         = '#5b21b6';
  private readonly ELECTRON_CORE       = '#f5f0ff';

  // ─────────────────────────────────────────────────────────────────────────
  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.initCanvases();
    window.addEventListener('resize', this.onResize);
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.onResize);
  }

  // ─────────────────────────────────────────────────────────────────────────
  private onResize = () => {
    cancelAnimationFrame(this.animFrameId);
    this.initCanvases();
  };

  private get pcbCanvas(): HTMLCanvasElement {
    return this.pcbCanvasRef().nativeElement;
  }
  private get elCanvas(): HTMLCanvasElement {
    return this.elCanvasRef().nativeElement;
  }

  // ─────────────────────────────────────────────────────────────────────────
  private initCanvases(): void {
    const W = window.innerWidth;
    const H = window.innerHeight;

    // Size both canvases
    this.pcbCanvas.width  = W; this.pcbCanvas.height  = H;
    this.elCanvas.width   = W; this.elCanvas.height   = H;

    // Generate stable PCB layout
    const layout = generatePcbLayout(W, H);
    this.traces       = layout.traces;
    this.nodes        = layout.nodes;
    this.primaryCount = layout.primaryCount;

    // Draw the static PCB onto the bottom canvas (once)
    const pcbCtx = this.pcbCanvas.getContext('2d')!;
    this.drawStaticBoard(pcbCtx, W, H);

    // Spawn electrons — staggered initial delays so they don't all fire together
    const count = Math.min(22, Math.max(8, Math.floor(this.traces.length / 4)));
    this.electrons = [];
    for (let i = 0; i < count; i++) {
      const initialDelay = i * 400 + Math.random() * 600; // 0 – count*400 + 600 ms stagger
      this.electrons.push(this.makeElectron(initialDelay));
    }

    // Start animation loop
    this.lastTs = performance.now();
    this.animFrameId = requestAnimationFrame(this.loop);
  }

  // ─────────────────────────────────────────────────────────────────────────
  /** Creates a new dormant electron. */
  private makeElectron(initialDelay = 0): Electron {
    const trace   = this.traces[Math.floor(Math.random() * this.traces.length)];
    const forward = Math.random() > 0.5;
    return {
      trace,
      t:      forward ? 0 : 1,
      speed:  (forward ? 1 : -1) * (0.00007 + Math.random() * 0.00013),
      active: false,
      fireIn: initialDelay,
      trail:  [],
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  /** Animation loop — only operates on the electron canvas. */
  private loop = (ts: number) => {
    const dt = Math.min(ts - this.lastTs, 50);
    this.lastTs = ts;

    const ctx = this.elCanvas.getContext('2d')!;
    const W   = this.elCanvas.width;
    const H   = this.elCanvas.height;

    // Clear the electron canvas fully each frame — the PCB canvas underneath
    // is untouched, so traces remain perfectly sharp.
    ctx.clearRect(0, 0, W, H);

    for (const e of this.electrons) {
      // ── Dormant: count down then reactivate ──
      if (!e.active) {
        e.fireIn -= dt;
        if (e.fireIn <= 0) {
          const trace   = this.traces[Math.floor(Math.random() * this.traces.length)];
          const forward = Math.random() > 0.5;
          e.trace  = trace;
          e.t      = forward ? 0 : 1;
          e.speed  = (forward ? 1 : -1) * (0.00007 + Math.random() * 0.00013);
          e.active = true;
          e.trail  = [];
        }
        continue;
      }

      // ── Move ──
      e.t += e.speed * dt;

      if (e.t > 1 || e.t < 0) {
        e.active = false;
        // Randomised cool-down: 0.5 – 4.5 s
        e.fireIn = 500 + Math.random() * 4000;
        continue;
      }

      // ── Sample position & update trail ──
      const pos = tracePos(e.trace, e.t);
      e.trail.push({ ...pos });
      if (e.trail.length > this.TRAIL_LENGTH) e.trail.shift();

      // ── Render ──
      this.drawElectron(ctx, e, pos);
    }

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  // ─────────────────────────────────────────────────────────────────────────
  /** Renders the static PCB traces and nodes onto `ctx` exactly once. */
  private drawStaticBoard(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    // Background fill
    ctx.fillStyle = this.BG_COL;
    ctx.fillRect(0, 0, W, H);

    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < this.traces.length; i++) {
      const t = this.traces[i];
      ctx.beginPath();
      ctx.moveTo(t.points[0].x, t.points[0].y);
      for (let j = 1; j < t.points.length; j++) {
        ctx.lineTo(t.points[j].x, t.points[j].y);
      }
      // Primary bus traces are thicker and brighter
      if (i < this.primaryCount) {
        ctx.strokeStyle = this.TRACE_COL_PRIMARY;
        ctx.lineWidth   = 2.0;
      } else {
        ctx.strokeStyle = this.TRACE_COL_SECONDARY;
        ctx.lineWidth   = 1.0;
      }
      ctx.stroke();
    }

    // Via dots and component pads
    for (const n of this.nodes) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle   = this.NODE_FILL;
      ctx.strokeStyle = this.NODE_STROKE;
      ctx.lineWidth   = 1.5;
      ctx.fill();
      ctx.stroke();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Renders a single electron with:
   *  - A fading trail drawn as connected segments (oldest = most transparent)
   *  - A layered radial glow at the head
   *  - A bright core dot
   */
  private drawElectron(ctx: CanvasRenderingContext2D, e: Electron, pos: Point): void {
    const len = e.trail.length;
    if (len < 2) return;

    // ── Fading trail ────────────────────────────────────────────────────────
    // We draw from oldest to newest. ageRatio goes 0→1 (old→new).
    // Opacity and width both increase toward the head for a natural comet look.
    for (let i = 1; i < len; i++) {
      const ageRatio   = i / len;                          // 0=oldest, 1=newest
      const alpha      = Math.pow(ageRatio, 1.8) * 0.75;  // fast fade, bright near head
      const width      = 0.5 + ageRatio * 2.5;

      ctx.beginPath();
      ctx.moveTo(e.trail[i - 1].x, e.trail[i - 1].y);
      ctx.lineTo(e.trail[i].x,     e.trail[i].y);
      ctx.strokeStyle = `rgba(192, 160, 255, ${alpha})`;
      ctx.lineWidth   = width;
      ctx.lineCap     = 'round';
      ctx.stroke();
    }

    // ── Outer bloom (large soft glow) ───────────────────────────────────────
    const bloom = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 16);
    bloom.addColorStop(0, 'rgba(200, 180, 255, 0.30)');
    bloom.addColorStop(1, 'rgba(100,  50, 220, 0.00)');
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 16, 0, Math.PI * 2);
    ctx.fillStyle = bloom;
    ctx.fill();

    // ── Mid glow ────────────────────────────────────────────────────────────
    const mid = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 6);
    mid.addColorStop(0, 'rgba(230, 220, 255, 0.95)');
    mid.addColorStop(1, 'rgba(140,  90, 250, 0.00)');
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = mid;
    ctx.fill();

    // ── Bright core dot ─────────────────────────────────────────────────────
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = this.ELECTRON_CORE;
    ctx.fill();
  }
}
