import { describe, it, expect } from 'vitest';
import { VectorMath } from './vector-math.utils';
import { Vector2D, AABB } from '../models/combat-model';

describe('VectorMath Utility', () => {
  const v1: Vector2D = { x: 10, y: 20 };
  const v2: Vector2D = { x: 5, y: -5 };
  const zero: Vector2D = { x: 0, y: 0 };

  describe('Basic Arithmetic', () => {
    /**
     * WHY: Foundation for all movement and steering forces. If vector addition is inaccurate, 
     * multiple stacked forces (e.g., separation + pursuit) will result in jittery movement.
     */
    it('should add two vectors correctly', () => {
      expect(VectorMath.add(v1, v2)).toEqual({ x: 15, y: 15 });
      expect(VectorMath.add(v1, zero)).toEqual(v1);
    });

    /**
     * WHY: Critical for calculating relative vectors (e.g., target - self).
     * Used in every tick to determine direction toward a target.
     */
    it('should subtract two vectors correctly', () => {
      expect(VectorMath.sub(v1, v2)).toEqual({ x: 5, y: 25 });
      expect(VectorMath.sub(v1, zero)).toEqual(v1);
    });

    /**
     * WHY: Used for scaling normalized directions by speed or acceleration magnitude.
     */
    it('should multiply by a scalar', () => {
      expect(VectorMath.mul(v1, 2)).toEqual({ x: 20, y: 40 });
      expect(VectorMath.mul(v1, 0)).toEqual(zero);
      expect(VectorMath.mul(v1, -1)).toEqual({ x: -10, y: -20 });
    });

    /**
     * WHY: Required for averaging vectors or distributing forces across multiple entities.
     */
    it('should divide by a scalar', () => {
      expect(VectorMath.div(v1, 2)).toEqual({ x: 5, y: 10 });
    });

    /**
     * WHY: Prevents application crashes if a variable (like mass or count) accidentally becomes 0.
     * Game engine must handle Infinity gracefully in steering calculations.
     */
    it('should handle division by zero (returning Infinity)', () => {
      const result = VectorMath.div(v1, 0);
      expect(result.x).toBe(Infinity);
      expect(result.y).toBe(Infinity);
    });

    /**
     * WHY: Inverting vectors is a common operation for retreat behaviors or "bounce" physics.
     * Explicit check for negative zero is required for cross-platform math stability.
     */
    it('should negate a vector', () => {
      expect(VectorMath.neg(v1)).toEqual({ x: -10, y: -20 });
      const negZero = VectorMath.neg(zero);
      expect(negZero.x === 0).toBe(true);
      expect(negZero.y === 0).toBe(true);
    });
  });

  describe('Magnitude and Distance', () => {
    /**
     * WHY: Squared length is used for performance-critical comparisons (e.g., is within range?)
     * to avoid the expensive Math.sqrt() operation in every frame.
     */
    it('should calculate length squared', () => {
      expect(VectorMath.lengthSq({ x: 3, y: 4 })).toBe(25);
      expect(VectorMath.lengthSq(zero)).toBe(0);
    });

    /**
     * WHY: Absolute length is required for UI display, progress bars, and physics capping.
     */
    it('should calculate length', () => {
      expect(VectorMath.length({ x: 3, y: 4 })).toBe(5);
    });

    /**
     * WHY: Essential for range-based triggers (Melee, Radar) and collision pruning.
     */
    it('should calculate distance', () => {
      expect(VectorMath.dist({ x: 0, y: 0 }, { x: 0, y: 10 })).toBe(10);
      expect(VectorMath.dist(v1, v1)).toBe(0);
    });

    /**
     * WHY: Aggressive outlier check for extreme distances across the arena.
     */
    it('should handle extremely large distances', () => {
      const p1 = { x: -1000000, y: -1000000 };
      const p2 = { x: 1000000, y: 1000000 };
      expect(VectorMath.dist(p1, p2)).toBeCloseTo(2828427.12, 1);
    });
  });

  describe('Vector Operations', () => {
    /**
     * WHY: Dot product is the primary mathematical tool for FOV checks, flank detection,
     * and calculating projection of one vector onto another.
     */
    it('should calculate dot product', () => {
      expect(VectorMath.dot({ x: 1, y: 0 }, { x: 0, y: 1 })).toBe(0);
      expect(VectorMath.dot({ x: 2, y: 3 }, { x: 4, y: 5 })).toBe(23);
    });

    /**
     * WHY: Normalization is used to convert vectors to directions. 
     * If this fails on small vectors, movement vectors will "explode" due to division by tiny numbers.
     */
    it('should normalize vectors and handle tiny magnitudes', () => {
      const n = VectorMath.normalize({ x: 10, y: 0 });
      expect(n).toEqual({ x: 1, y: 0 });
      
      const tiny = { x: 1e-15, y: 0 };
      expect(VectorMath.normalize(tiny).x).toBe(1);
      
      expect(VectorMath.normalize(zero)).toEqual(zero);
    });

    /**
     * WHY: Rotation is required for AI "searching" behavior (spinning) and projectile spread logic.
     */
    it('should rotate a vector', () => {
      const v = { x: 1, y: 0 };
      const rotated = VectorMath.rotate(v, Math.PI / 2);
      expect(rotated.x).toBeCloseTo(0);
      expect(rotated.y).toBeCloseTo(1);
    });

    /**
     * WHY: Enforcing speed limits is mandatory for game balance. Without a robust limit function, 
     * physics forces would eventually accelerate drones to infinite speeds.
     */
    it('should limit vector magnitude', () => {
      const v = { x: 10, y: 0 };
      expect(VectorMath.limit(v, 5)).toEqual({ x: 5, y: 0 });
      expect(VectorMath.limit(v, 15)).toEqual(v);
      // Outlier: Negative limit
      expect(VectorMath.limit(v, -5)).toEqual({ x: 0, y: 0 });
    });
  });

  describe('AABB Operations', () => {
    const aabb: AABB = { id: 'box', x: 0, y: 0, width: 100, height: 100, zHeight: 50 };

    /**
     * WHY: Core logic for obstacle collision. Must be accurate to the pixel to prevent 
     * drones from passing through walls.
     */
    it('should detect if point is in AABB', () => {
      expect(VectorMath.isPointInAABB({ x: 50, y: 50 }, aabb)).toBe(true);
      expect(VectorMath.isPointInAABB({ x: 0, y: 0 }, aabb)).toBe(true);
      expect(VectorMath.isPointInAABB({ x: 101, y: 50 }, aabb)).toBe(false);
    });

    describe('intersectRayAABB', () => {
      /**
       * WHY: Line-of-sight (LOS) checks are performed hundreds of times per second. 
       * This test ensures hits are detected from the outside for combat targeting.
       */
      it('should detect a hit from the outside', () => {
        const origin = { x: -50, y: 50 };
        const dir = { x: 1, y: 0 };
        const result = VectorMath.intersectRayAABB(origin, dir, 200, aabb);
        expect(result).not.toBeNull();
        expect(result?.distance).toBe(50);
      });

      /**
       * WHY: If a drone is pushed into an obstacle by a strike, it must be able to "see" the edge 
       * to resolve the collision. A failure here would trap the drone inside the box permanently.
       */
      it('should handle origin inside the AABB', () => {
        const origin = { x: 50, y: 50 };
        const dir = { x: 1, y: 0 };
        const result = VectorMath.intersectRayAABB(origin, dir, 100, aabb);
        expect(result).not.toBeNull();
        expect(result?.distance).toBe(-50);
      });

      /**
       * WHY: Critical for ray-casting performance. If an entity is stationary (dir = 0), 
       * the ray-box test must immediately fail rather than calculating NaNs.
       */
      it('should handle zero direction rays gracefully', () => {
        const origin = { x: -50, y: 50 };
        const dir = { x: 0, y: 0 };
        const result = VectorMath.intersectRayAABB(origin, dir, 100, aabb);
        expect(result).toBeNull();
      });

      /**
       * WHY: Floating point stability check. Rays parallel to edges often cause "NaN leaks" 
       * in naive AABB implementations.
       */
      it('should handle grazing hits parallel to edges', () => {
        const origin = { x: -50, y: 0 };
        const dir = { x: 1, y: 0 };
        const result = VectorMath.intersectRayAABB(origin, dir, 100, aabb);
        expect(result).not.toBeNull();
        expect(result?.distance).toBe(50);
      });
    });
  });

  describe('FOV Operations', () => {
    /**
     * WHY: Restricts enemy vision to a realistic cone. This is the primary mechanic 
     * allowing for stealth and flanking maneuvers.
     */
    it('should detect target in FOV', () => {
      const source = { x: 0, y: 0 };
      const target = { x: 10, y: 0 };
      const rotation = 0;
      expect(VectorMath.isTargetInFOV(source, target, rotation, 120)).toBe(true);
    });

    /**
     * WHY: Entities in the exact same spatial position must be detected by each other 
     * to trigger immediate collision resolution or melee strikes.
     */
    it('should handle target at same position', () => {
      const source = { x: 50, y: 50 };
      const target = { x: 50, y: 50 };
      expect(VectorMath.isTargetInFOV(source, target, 0)).toBe(true);
    });

    /**
     * WHY: Angles in 2D space wrap from PI to -PI. If logic doesn't handle this wrap, 
     * drones will "go blind" when facing West (towards the negative X axis).
     */
    it('should handle angle wrapping at West-facing boundaries', () => {
      const source = { x: 0, y: 0 };
      const target = { x: 0, y: -10 }; // North (-PI/2)
      const rotation = Math.PI; // Facing West (PI)
      expect(VectorMath.isTargetInFOV(source, target, rotation, 200)).toBe(true);
    });
  });
});
