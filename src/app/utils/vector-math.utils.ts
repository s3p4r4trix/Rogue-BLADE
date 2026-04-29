import { Vector2D, AABB } from '../models/combat-model';

/**
 * Basic 2D Vector Utility Library
 */
export const VectorMath = {
  /** Adds two vectors together. */
  add: (v1: Vector2D, v2: Vector2D): Vector2D => ({ x: v1.x + v2.x, y: v1.y + v2.y }),

  /** Subtracts the second vector from the first. */
  sub: (v1: Vector2D, v2: Vector2D): Vector2D => ({ x: v1.x - v2.x, y: v1.y - v2.y }),

  /** Multiplies a vector by a scalar value. */
  mul: (v: Vector2D, scalar: number): Vector2D => ({ x: v.x * scalar, y: v.y * scalar }),

  /** Divides a vector by a scalar value. */
  div: (v: Vector2D, scalar: number): Vector2D => ({ x: v.x / scalar, y: v.y / scalar }),

  /** Negates a vector (inverts its direction). */
  neg: (v: Vector2D): Vector2D => ({ x: -v.x, y: -v.y }),

  /** Calculates the dot product of two vectors. */
  dot: (v1: Vector2D, v2: Vector2D): number => v1.x * v2.x + v1.y * v2.y,

  /** Calculates the squared length (magnitude) of a vector. Faster than length(). */
  lengthSq: (v: Vector2D): number => v.x * v.x + v.y * v.y,

  /** Calculates the length (magnitude) of a vector. */
  length: (v: Vector2D): number => Math.sqrt(v.x * v.x + v.y * v.y),

  /** Calculates the squared distance between two points. Faster than dist(). */
  distSq: (v1: Vector2D, v2: Vector2D): number => {
    const dx = v1.x - v2.x;
    const dy = v1.y - v2.y;
    return dx * dx + dy * dy;
  },

  /** Calculates the Euclidean distance between two points. */
  dist: (v1: Vector2D, v2: Vector2D): number => Math.sqrt(VectorMath.distSq(v1, v2)),

  /** Normalizes a vector to have a length of 1. Returns zero vector if input is zero. */
  normalize: (v: Vector2D): Vector2D => {
    const len = VectorMath.length(v);
    return len > 0 ? VectorMath.div(v, len) : { x: 0, y: 0 };
  },

  /** Rotates a vector by a given angle in radians. */
  rotate: (v: Vector2D, angle: number): Vector2D => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x: v.x * cos - v.y * sin,
      y: v.x * sin + v.y * cos
    };
  },

  /** Limits the magnitude of a vector to a maximum value. */
  limit: (v: Vector2D, max: number): Vector2D => {
    const len = VectorMath.length(v);
    if (len > max && len > 0) {
      return VectorMath.mul(VectorMath.div(v, len), max);
    }
    return v;
  },

  /** Clamps a number between a minimum and maximum value. */
  clamp: (val: number, min: number, max: number): number => Math.max(min, Math.min(max, val)),

  /** Linearly interpolates between two numbers by factor t (0.0 to 1.0). */
  lerp: (a: number, b: number, t: number): number => a + (b - a) * t,

  /**
   * Checks if a ray (origin + direction * length) intersects an AABB.
   * Returns hit distance and normal if intersected, otherwise null.
   */
  intersectRayAABB: (
    origin: Vector2D,
    dir: Vector2D,
    length: number,
    aabb: AABB
  ): { hitPoint: Vector2D; normal: Vector2D; distance: number } | null => {
    const invDirX = 1.0 / dir.x;
    const invDirY = 1.0 / dir.y;

    const t1 = (aabb.x - origin.x) * invDirX;
    const t2 = (aabb.x + aabb.width - origin.x) * invDirX;
    const t3 = (aabb.y - origin.y) * invDirY;
    const t4 = (aabb.y + aabb.height - origin.y) * invDirY;

    const tmin = Math.max(Math.min(t1, t2), Math.min(t3, t4));
    const tmax = Math.min(Math.max(t1, t2), Math.max(t3, t4));

    if (tmax < 0 || tmin > tmax || tmin > length) return null;

    const hitPoint = VectorMath.add(origin, VectorMath.mul(dir, tmin));

    // Determine surface normal of the impacted AABB edge
    let normal = { x: 0, y: 0 };
    const epsilon = 0.001;
    if (Math.abs(hitPoint.x - aabb.x) < epsilon) normal = { x: -1, y: 0 };
    else if (Math.abs(hitPoint.x - (aabb.x + aabb.width)) < epsilon) normal = { x: 1, y: 0 };
    else if (Math.abs(hitPoint.y - aabb.y) < epsilon) normal = { x: 0, y: -1 };
    else if (Math.abs(hitPoint.y - (aabb.y + aabb.height)) < epsilon) normal = { x: 0, y: 1 };

    return { hitPoint, normal, distance: tmin };
  },

  /** Checks if a spatial point is inside the boundaries of an AABB. */
  isPointInAABB: (p: Vector2D, aabb: AABB): boolean => {
    return (
      p.x >= aabb.x && p.x <= aabb.x + aabb.width && p.y >= aabb.y && p.y <= aabb.y + aabb.height
    );
  },

  /** Returns an array of the 4 world-space corners of an AABB. */
  getAABBCorners: (aabb: AABB): Vector2D[] => {
    return [
      { x: aabb.x, y: aabb.y },
      { x: aabb.x + aabb.width, y: aabb.y },
      { x: aabb.x, y: aabb.y + aabb.height },
      { x: aabb.x + aabb.width, y: aabb.y + aabb.height }
    ];
  },

  /**
   * Calculates if a target is within a specified FOV cone relative to the source's rotation.
   * @param sourcePos Position of the viewing entity.
   * @param targetPos Position of the target.
   * @param sourceRotation Forward facing direction of the source in radians.
   * @param fovDegrees Total field of view arc in degrees (default 120).
   */
  isTargetInFOV: (
    sourcePos: Vector2D,
    targetPos: Vector2D,
    sourceRotation: number,
    fovDegrees = 120
  ): boolean => {
    const toTarget = VectorMath.sub(targetPos, sourcePos);
    const angleToTarget = Math.atan2(toTarget.y, toTarget.x);
    let diff = angleToTarget - sourceRotation;

    // Normalize angle difference to [-PI, PI]
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;

    const halfFOV = (fovDegrees * Math.PI) / 360;
    return Math.abs(diff) <= halfFOV;
  }
};
