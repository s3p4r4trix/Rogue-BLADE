import { Vector2D, AABB } from '../models/combat-model';

/**
 * Basic 2D Vector Utility Library
 */
export const VectorMath = {
  add: (v1: Vector2D, v2: Vector2D): Vector2D => ({ x: v1.x + v2.x, y: v1.y + v2.y }),
  sub: (v1: Vector2D, v2: Vector2D): Vector2D => ({ x: v1.x - v2.x, y: v1.y - v2.y }),
  mul: (v: Vector2D, scalar: number): Vector2D => ({ x: v.x * scalar, y: v.y * scalar }),
  div: (v: Vector2D, scalar: number): Vector2D => ({ x: v.x / scalar, y: v.y / scalar }),
  
  dot: (v1: Vector2D, v2: Vector2D): number => v1.x * v2.x + v1.y * v2.y,
  
  lengthSq: (v: Vector2D): number => v.x * v.x + v.y * v.y,
  length: (v: Vector2D): number => Math.sqrt(v.x * v.x + v.y * v.y),
  
  distSq: (v1: Vector2D, v2: Vector2D): number => {
    const dx = v1.x - v2.x;
    const dy = v1.y - v2.y;
    return dx * dx + dy * dy;
  },
  dist: (v1: Vector2D, v2: Vector2D): number => Math.sqrt(VectorMath.distSq(v1, v2)),
  
  normalize: (v: Vector2D): Vector2D => {
    const len = VectorMath.length(v);
    return len > 0 ? VectorMath.div(v, len) : { x: 0, y: 0 };
  },
  
  rotate: (v: Vector2D, angle: number): Vector2D => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x: v.x * cos - v.y * sin,
      y: v.x * sin + v.y * cos
    };
  },
  
  limit: (v: Vector2D, max: number): Vector2D => {
    const len = VectorMath.length(v);
    if (len > max && len > 0) {
      return VectorMath.mul(VectorMath.div(v, len), max);
    }
    return v;
  },

  clamp: (val: number, min: number, max: number): number => Math.max(min, Math.min(max, val)),
  
  lerp: (a: number, b: number, t: number): number => a + (b - a) * t,

  /**
   * Checks if a ray (origin + direction * length) intersects an AABB.
   * Returns hit distance and normal if intersected, otherwise null.
   */
  intersectRayAABB: (origin: Vector2D, dir: Vector2D, length: number, aabb: AABB): { hitPoint: Vector2D, normal: Vector2D, distance: number } | null => {
    const invDirX = 1.0 / dir.x;
    const invDirY = 1.0 / dir.y;

    const t1 = (aabb.x - origin.x) * invDirX;
    const t2 = (aabb.x + aabb.width - origin.x) * invDirX;
    const t3 = (aabb.y - origin.y) * invDirY;
    const t4 = (aabb.y + aabb.height - origin.y) * invDirY;

    const tmin = Math.max(Math.min(t1, t2), Math.min(t3, t4));
    const tmax = Math.min(Math.max(t1, t2), Math.max(t3, t4));

    // If tmax < 0, ray is pointing away from AABB
    if (tmax < 0) return null;

    // If tmin > tmax, ray doesn't intersect AABB
    if (tmin > tmax) return null;

    // If tmin > length, intersection is further than the ray length
    if (tmin > length) return null;

    const hitPoint = VectorMath.add(origin, VectorMath.mul(dir, tmin));
    
    // Determine normal
    let normal = { x: 0, y: 0 };
    const epsilon = 0.001;
    if (Math.abs(hitPoint.x - aabb.x) < epsilon) normal = { x: -1, y: 0 };
    else if (Math.abs(hitPoint.x - (aabb.x + aabb.width)) < epsilon) normal = { x: 1, y: 0 };
    else if (Math.abs(hitPoint.y - aabb.y) < epsilon) normal = { x: 0, y: -1 };
    else if (Math.abs(hitPoint.y - (aabb.y + aabb.height)) < epsilon) normal = { x: 0, y: 1 };

    return { hitPoint, normal, distance: tmin };
  }
};
