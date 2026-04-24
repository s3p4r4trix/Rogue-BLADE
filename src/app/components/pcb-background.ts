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
  points: Point[];
  length: number;
  segLengths: number[];
}

interface Node {
  x: number;
  y: number;
  r: number;
}

interface Chip {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

interface Electron {
  trace: Trace;
  t: number;
  speed: number;
  active: boolean;
  fireIn: number;
  trail: Point[];
  colorTheme: 'cyan' | 'purple' | 'gold';
}

// ─────────────────────────────────────────────────────────────────────────────
// Geometry Helpers
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

function lineIntersection(p1: Point, p2: Point, p3: Point, p4: Point): Point | null {
  const d = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (Math.abs(d) < 1e-6) return null; // parallel
  
  const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / d;
  return {
    x: p1.x + t * (p2.x - p1.x),
    y: p1.y + t * (p2.y - p1.y)
  };
}

function offsetPolyline(spine: Point[], dist: number): Point[] {
  if (spine.length < 2) return spine;
  if (Math.abs(dist) < 1e-4) return spine;
  
  const offsetSegs = [];
  for (let i = 0; i < spine.length - 1; i++) {
    const p1 = spine[i];
    const p2 = spine[i+1];
    let dx = p2.x - p1.x;
    let dy = p2.y - p1.y;
    const len = Math.sqrt(dx*dx + dy*dy);
    if (len < 1e-3) continue;
    dx /= len; dy /= len;
    const nx = -dy; const ny = dx;
    offsetSegs.push({
      A: { x: p1.x + nx * dist, y: p1.y + ny * dist },
      B: { x: p2.x + nx * dist, y: p2.y + ny * dist }
    });
  }
  
  if (offsetSegs.length === 0) return spine;
  
  const pts: Point[] = [offsetSegs[0].A];
  for (let i = 0; i < offsetSegs.length - 1; i++) {
    const s1 = offsetSegs[i];
    const s2 = offsetSegs[i+1];
    const inter = lineIntersection(s1.A, s1.B, s2.A, s2.B);
    if (inter) pts.push(inter);
    else pts.push(s1.B); // fallback if perfectly parallel
  }
  pts.push(offsetSegs[offsetSegs.length - 1].B);
  
  return pts;
}

// ─────────────────────────────────────────────────────────────────────────────
// PCB Layout Generator (Octilinear & Parallel Bundles)
// ─────────────────────────────────────────────────────────────────────────────

class Pathfinder {
  cols: number;
  rows: number;
  grid: boolean[][];

  constructor(w: number, h: number, chips: Chip[], S: number) {
    this.cols = Math.ceil(w / S) + 4;
    this.rows = Math.ceil(h / S) + 4;
    this.grid = Array(this.cols).fill(0).map(() => Array(this.rows).fill(true));

    const PADDING = 40; // Avoid routing too close to chip edges

    for (const c of chips) {
      const minX = Math.floor((c.x - PADDING) / S);
      const maxX = Math.ceil((c.x + c.w + PADDING) / S);
      const minY = Math.floor((c.y - PADDING) / S);
      const maxY = Math.ceil((c.y + c.h + PADDING) / S);

      for (let x = Math.max(0, minX); x <= Math.min(this.cols - 1, maxX); x++) {
        for (let y = Math.max(0, minY); y <= Math.min(this.rows - 1, maxY); y++) {
          this.grid[x][y] = false;
        }
      }
    }
  }

  findPath(startX: number, startY: number, endX: number, endY: number): {x: number, y: number}[] | null {
    if (startX < 0 || startX >= this.cols || startY < 0 || startY >= this.rows) return null;
    if (endX < 0 || endX >= this.cols || endY < 0 || endY >= this.rows) return null;

    // Force start/end to be walkable
    this.grid[startX][startY] = true;
    this.grid[endX][endY] = true;

    const openSet = [{ x: startX, y: startY, g: 0, f: 0, parent: null as any }];
    const closedSet = new Set<string>();
    
    const heuristic = (x: number, y: number) => {
      const dx = Math.abs(x - endX);
      const dy = Math.abs(y - endY);
      return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
    };

    openSet[0].f = heuristic(startX, startY);

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;

      if (current.x === endX && current.y === endY) {
        const path = [];
        let curr = current;
        while (curr) {
          path.push({x: curr.x, y: curr.y});
          curr = curr.parent;
        }
        return path.reverse();
      }

      const key = `${current.x},${current.y}`;
      if (closedSet.has(key)) continue;
      closedSet.add(key);

      const dirs = [
        [0, -1], [1, -1], [1, 0], [1, 1],
        [0, 1], [-1, 1], [-1, 0], [-1, -1]
      ];

      for (let i = 0; i < dirs.length; i++) {
        const nx = current.x + dirs[i][0];
        const ny = current.y + dirs[i][1];

        if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) continue;
        if (!this.grid[nx][ny]) continue;

        // Prevent cutting corners through unwalkable diagonals
        if (dirs[i][0] !== 0 && dirs[i][1] !== 0) {
           if (!this.grid[current.x + dirs[i][0]][current.y] || !this.grid[current.x][current.y + dirs[i][1]]) {
              continue;
           }
        }

        const cost = (dirs[i][0] !== 0 && dirs[i][1] !== 0) ? Math.SQRT2 : 1;
        const g = current.g + cost;
        const f = g + heuristic(nx, ny);

        openSet.push({ x: nx, y: ny, g, f, parent: current });
      }
    }
    return null;
  }
}

type Pin = { x: number, y: number, nx: number, ny: number };

function getEdgePoint(c: Chip, S: number): Pin {
  const side = Math.floor(Math.random() * 4);
  const numPinsX = Math.floor((c.w - 40) / S);
  const numPinsY = Math.floor((c.h - 40) / S);
  
  const offsetX = 20 + Math.floor(Math.random() * Math.max(1, numPinsX)) * S;
  const offsetY = 20 + Math.floor(Math.random() * Math.max(1, numPinsY)) * S;
  
  let px, py, nx, ny;
  if (side === 0) { px = c.x + offsetX; py = c.y; nx = 0; ny = -1; }
  else if (side === 1) { px = c.x + c.w; py = c.y + offsetY; nx = 1; ny = 0; }
  else if (side === 2) { px = c.x + offsetX; py = c.y + c.h; nx = 0; ny = 1; }
  else { px = c.x; py = c.y + offsetY; nx = -1; ny = 0; }
  return {x: px, y: py, nx, ny};
}

function generatePcbLayout(w: number, h: number): { traces: Trace[]; nodes: Node[]; chips: Chip[]; primaryCount: number } {
  const traces: Trace[] = [];
  const nodes: Node[] = [];
  const chips: Chip[] = [];
  const S = 20; // 20px grid cell size

  const targetChips = 3 + Math.floor(Math.random() * 5);
  const minSpacing = 120;
  
  for (let i = 0; i < targetChips * 5; i++) {
    if (chips.length >= targetChips) break;
    
    // Snap chip placement to grid
    let cw = 80 + Math.random() * 100;
    let ch = 80 + Math.random() * 100;
    let cx = w * 0.1 + Math.random() * (w * 0.8 - cw);
    let cy = h * 0.1 + Math.random() * (h * 0.8 - ch);
    
    cw = Math.round(cw / S) * S;
    ch = Math.round(ch / S) * S;
    cx = Math.round(cx / S) * S;
    cy = Math.round(cy / S) * S;
    
    let tooClose = false;
    for (const c of chips) {
       const dist = Math.hypot((cx + cw/2) - (c.x + c.w/2), (cy + ch/2) - (c.y + c.h/2));
       if (dist < minSpacing + Math.max(cw, c.w)) {
          tooClose = true;
          break;
       }
    }
    
    if (!tooClose) {
       chips.push({ x: cx, y: cy, w: cw, h: ch, label: `QUANTUM_CELL_ARRAY_${Math.floor(Math.random()*900)+100}` });
    }
  }

  const pf = new Pathfinder(w, h, chips, S);

  function connectChips(p1: Pin, p2: Pin): Point[] {
    const cx = p1.x + p1.nx * 40;
    const cy = p1.y + p1.ny * 40;
    const tx = p2.x + p2.nx * 40;
    const ty = p2.y + p2.ny * 40;

    const startCellX = Math.round(cx / S);
    const startCellY = Math.round(cy / S);
    const endCellX = Math.round(tx / S);
    const endCellY = Math.round(ty / S);

    const cellPath = pf.findPath(startCellX, startCellY, endCellX, endCellY);
    if (!cellPath) return []; // skip if no route found

    const pts: Point[] = [];
    pts.push({x: p1.x, y: p1.y});
    
    // Smooth cell path
    let lastDirX = 0, lastDirY = 0;
    for (let i = 0; i < cellPath.length; i++) {
       const cp = cellPath[i];
       const px = cp.x * S;
       const py = cp.y * S;
       
       if (i > 0 && i < cellPath.length - 1) {
          const np = cellPath[i+1];
          const dirX = np.x - cp.x;
          const dirY = np.y - cp.y;
          if (dirX === lastDirX && dirY === lastDirY) continue;
          lastDirX = dirX;
          lastDirY = dirY;
       } else if (i === 1) {
          lastDirX = cellPath[1].x - cellPath[0].x;
          lastDirY = cellPath[1].y - cellPath[0].y;
       }
       
       pts.push({x: px, y: py});
    }

    pts.push({x: p2.x, y: p2.y});
    return pts;
  }

  function addBundle(spine: Point[], numTraces: number, gap: number) {
    if (spine.length < 2) return;
    for (let t = 0; t < numTraces; t++) {
      const offsetDist = (t - (numTraces - 1) / 2) * gap;
      const tracePts = offsetPolyline(spine, offsetDist);
      if (tracePts.length > 1) {
         traces.push(buildTrace(tracePts));
         nodes.push({ x: tracePts[0].x, y: tracePts[0].y, r: 2.5 });
         nodes.push({ x: tracePts[tracePts.length-1].x, y: tracePts[tracePts.length-1].y, r: 2.5 });
      }
    }
  }

  // Inter-chip connections
  for (let i = 0; i < chips.length; i++) {
    for (let j = i + 1; j < chips.length; j++) {
      if (chips.length > 4 && Math.random() > 0.6) continue;
      
      const p1 = getEdgePoint(chips[i], S);
      const p2 = getEdgePoint(chips[j], S);
      
      const spine = connectChips(p1, p2);
      addBundle(spine, 4 + Math.floor(Math.random() * 4), 8 + Math.random() * 3);
    }
  }

  // Peripheral connections
  const numEdgeBuses = 4 + Math.floor((w * h) / 100000);
  for (let b = 0; b < numEdgeBuses; b++) {
    const c = chips[Math.floor(Math.random() * chips.length)];
    const p1 = getEdgePoint(c, S);
    
    const edgeSide = Math.floor(Math.random() * 4);
    let edgeX = 0, edgeY = 0, nx = 0, ny = 0;
    
    if (edgeSide === 0) { edgeX = Math.round((Math.random() * w) / S) * S; edgeY = 0; nx = 0; ny = 1; }
    else if (edgeSide === 1) { edgeX = Math.round(w / S) * S; edgeY = Math.round((Math.random() * h) / S) * S; nx = -1; ny = 0; }
    else if (edgeSide === 2) { edgeX = Math.round((Math.random() * w) / S) * S; edgeY = Math.round(h / S) * S; nx = 0; ny = -1; }
    else { edgeX = 0; edgeY = Math.round((Math.random() * h) / S) * S; nx = 1; ny = 0; }
    
    const p2: Pin = { x: edgeX, y: edgeY, nx, ny };
    
    const spine = connectChips(p1, p2);
    addBundle(spine, 3 + Math.floor(Math.random() * 4), 8 + Math.random() * 4);
  }

  return { traces, nodes, chips, primaryCount: Math.floor(traces.length * 0.4) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-pcb-background',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
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

  private pcbCanvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('pcbCanvas');
  private elCanvasRef  = viewChild.required<ElementRef<HTMLCanvasElement>>('elCanvas');

  private animFrameId  = 0;
  private lastTs       = 0;

  private traces:       Trace[]    = [];
  private nodes:        Node[]     = [];
  private chips:        Chip[]     = [];
  private primaryCount  = 0;
  private electrons:    Electron[] = [];

  private readonly TRAIL_LENGTH = 32;
  private readonly BG_COL = '#020617'; // slate-950

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

  private onResize = () => {
    cancelAnimationFrame(this.animFrameId);
    this.initCanvases();
  };

  private get pcbCanvas(): HTMLCanvasElement { return this.pcbCanvasRef().nativeElement; }
  private get elCanvas(): HTMLCanvasElement { return this.elCanvasRef().nativeElement; }

  private initCanvases(): void {
    const W = window.innerWidth;
    const H = window.innerHeight;

    this.pcbCanvas.width  = W; this.pcbCanvas.height  = H;
    this.elCanvas.width   = W; this.elCanvas.height   = H;

    const layout = generatePcbLayout(W, H);
    this.traces       = layout.traces;
    this.nodes        = layout.nodes;
    this.chips        = layout.chips;
    this.primaryCount = layout.primaryCount;

    const pcbCtx = this.pcbCanvas.getContext('2d')!;
    this.drawStaticBoard(pcbCtx, W, H);

    const count = Math.min(35, Math.max(15, Math.floor(this.traces.length / 3)));
    this.electrons = [];
    for (let i = 0; i < count; i++) {
      this.electrons.push(this.makeElectron(i * 300 + Math.random() * 500));
    }

    this.lastTs = performance.now();
    this.animFrameId = requestAnimationFrame(this.loop);
  }

  private makeElectron(initialDelay = 0): Electron {
    const trace   = this.traces[Math.floor(Math.random() * this.traces.length)];
    const forward = Math.random() > 0.5;
    
    // Normal or Fast speeds
    const isFast = Math.random() > 0.5;
    const baseSpeed = 0.00025; // Normal speed (was previously the max speed)
    const speedMultiplier = isFast ? 1.5 : 1.0;
    const colorTheme = isFast ? 'cyan' : 'purple';

    return {
      trace,
      t:      forward ? 0 : 1,
      speed:  (forward ? 1 : -1) * (baseSpeed * speedMultiplier),
      active: false,
      fireIn: initialDelay,
      trail:  [],
      colorTheme
    };
  }

  private loop = (ts: number) => {
    const dt = Math.min(ts - this.lastTs, 50);
    this.lastTs = ts;

    const ctx = this.elCanvas.getContext('2d')!;
    const W   = this.elCanvas.width;
    const H   = this.elCanvas.height;

    ctx.clearRect(0, 0, W, H);

    for (const e of this.electrons) {
      if (!e.active) {
        e.fireIn -= dt;
        if (e.fireIn <= 0) {
          const trace   = this.traces[Math.floor(Math.random() * this.traces.length)];
          const forward = Math.random() > 0.5;
          const isFast = Math.random() > 0.5;
          const baseSpeed = 0.00025;
          const speedMultiplier = isFast ? 1.5 : 1.0;
          e.trace  = trace;
          e.t      = forward ? 0 : 1;
          e.speed  = (forward ? 1 : -1) * (baseSpeed * speedMultiplier);
          e.colorTheme = isFast ? 'cyan' : 'purple';
          e.active = true;
          e.trail  = [];
        }
        continue;
      }

      e.t += e.speed * dt;

      if (e.t > 1 || e.t < 0) {
        e.active = false;
        e.fireIn = 300 + Math.random() * 3000;
        continue;
      }

      const pos = tracePos(e.trace, e.t);
      e.trail.push({ ...pos });
      if (e.trail.length > this.TRAIL_LENGTH) e.trail.shift();

      this.drawElectron(ctx, e, pos);
    }

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private drawStaticBoard(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.fillStyle = this.BG_COL;
    ctx.fillRect(0, 0, W, H);

    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';

    // Draw Traces
    for (let i = 0; i < this.traces.length; i++) {
      const t = this.traces[i];
      if (t.points.length < 2) continue;
      
      ctx.beginPath();
      ctx.moveTo(t.points[0].x, t.points[0].y);
      for (let j = 1; j < t.points.length; j++) {
        ctx.lineTo(t.points[j].x, t.points[j].y);
      }
      
      if (i < this.primaryCount) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)'; // Cyan
        ctx.lineWidth   = 2.0;
      } else {
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.3)'; // Purple
        ctx.lineWidth   = 1.2;
      }
      ctx.stroke();
    }

    // Draw Chips
    for (const c of this.chips) {
      // Glow
      ctx.shadowColor = 'rgba(56, 189, 248, 0.3)';
      ctx.shadowBlur = 25;
      
      // Core rect
      ctx.fillStyle = '#061124';
      ctx.fillRect(c.x, c.y, c.w, c.h);
      
      // Border
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#1e3a8a';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(c.x, c.y, c.w, c.h);
      
      // Inner circuitry grid (decorative)
      ctx.strokeStyle = 'rgba(30, 58, 138, 0.4)';
      ctx.lineWidth = 1;
      for (let i=10; i<c.w; i+=15) { ctx.beginPath(); ctx.moveTo(c.x+i, c.y); ctx.lineTo(c.x+i, c.y+c.h); ctx.stroke(); }
      for (let i=10; i<c.h; i+=15) { ctx.beginPath(); ctx.moveTo(c.x, c.y+i); ctx.lineTo(c.x+c.w, c.y+i); ctx.stroke(); }
      
      // Label
      ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.font = '10px monospace';
      ctx.fillText(c.label, c.x + 8, c.y + 18);
    }

    // Nodes (vias)
    for (const n of this.nodes) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle   = '#020617';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth   = 1.0;
      ctx.fill();
      ctx.stroke();
    }
  }

  private drawElectron(ctx: CanvasRenderingContext2D, e: Electron, pos: Point): void {
    const len = e.trail.length;
    if (len < 2) return;

    let r, g, b, coreColor;
    if (e.colorTheme === 'cyan') { r=56; g=189; b=248; coreColor='#e0f2fe'; }
    else if (e.colorTheme === 'purple') { r=168; g=85; b=247; coreColor='#faf5ff'; }
    else { r=250; g=204; b=21; coreColor='#fefce8'; }

    // Fading trail
    for (let i = 1; i < len; i++) {
      const ageRatio = i / len;
      const alpha    = Math.pow(ageRatio, 1.8) * 0.9;
      const width    = 0.5 + ageRatio * 2.5;

      ctx.beginPath();
      ctx.moveTo(e.trail[i - 1].x, e.trail[i - 1].y);
      ctx.lineTo(e.trail[i].x,     e.trail[i].y);
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.lineWidth   = width;
      ctx.lineCap     = 'round';
      ctx.stroke();
    }

    // Outer bloom
    const bloom = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 18);
    bloom.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.35)`);
    bloom.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.00)`);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 18, 0, Math.PI * 2);
    ctx.fillStyle = bloom;
    ctx.fill();

    // Mid glow
    const mid = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 7);
    mid.addColorStop(0, `rgba(${r+50}, ${g+50}, ${b+50}, 0.95)`);
    mid.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.00)`);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = mid;
    ctx.fill();

    // Core dot
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 2.0, 0, Math.PI * 2);
    ctx.fillStyle = coreColor;
    ctx.fill();
  }
}
