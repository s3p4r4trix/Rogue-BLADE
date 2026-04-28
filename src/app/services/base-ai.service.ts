import { Injectable, inject } from '@angular/core';
import { CombatEntity, Vector2D, BehaviorContext } from '../models/combat-model';
import { VectorMath } from '../utils/vector-math.utils';
import { SensorService } from './sensor.service';

@Injectable({ providedIn: 'root' })
export class BaseAIService {
  private sensorService = inject(SensorService);
  private readonly MELEE_RANGE = 30; // Slightly larger for better strike detection
  private readonly MIN_STRIKE_SPEED_RATIO = 0.4;
  private readonly ARENA_BOUNDS = 800;
  private readonly SEARCH_SCAN_TIME = 2; // seconds
  private readonly SEARCH_TOTAL_TIME = 3; // seconds

  /**
   * Calculates the default behavior (desired velocity) based on the state machine.
   * Executed only if RoutineService returns no override action.
   * @param entity The entity processing its AI.
   * @param context Contextual data for decision making.
   * @returns A vector representing the desired direction and magnitude of movement.
   */
  calculateDefaultBehavior(entity: CombatEntity, context: BehaviorContext): Vector2D {
    let desiredVelocity: Vector2D = { x: 0, y: 0 };
    const target = context.currentTarget;

    switch (entity.state) {
      case 'PATROLLING':
        desiredVelocity = this.handlePatrolling(entity);
        if (target) {
          entity.state = 'PURSUING';
        }
        break;

      case 'PURSUING':
        if (!target) {
          entity.state = 'SEARCHING';
          break;
        }
        desiredVelocity = this.handlePursuing(entity, target, context);
        break;

      case 'STRIKING':
        if (!target) {
          entity.state = 'SEARCHING';
          break;
        }
        desiredVelocity = this.handleStriking(entity, target);
        break;

      case 'ORBITING':
        if (!target) {
          entity.state = 'SEARCHING';
          break;
        }
        desiredVelocity = this.handleOrbiting(entity, target, context.deltaTime);
        break;

      case 'SEARCHING':
        desiredVelocity = this.handleSearching(entity, context.deltaTime);
        if (target) {
          entity.state = 'PURSUING';
          entity.stateTimer = 0;
        }
        break;
    }

    return desiredVelocity;
  }

  private handlePatrolling(entity: CombatEntity): Vector2D {
    // If no waypoint or reached waypoint, pick a new one
    if (!entity.waypoint || VectorMath.dist(entity.position, entity.waypoint) < 10) {
      entity.waypoint = {
        x: Math.random() * (this.ARENA_BOUNDS - 100) + 50,
        y: Math.random() * (this.ARENA_BOUNDS - 100) + 50
      };
    }

    const dir = VectorMath.normalize(VectorMath.sub(entity.waypoint, entity.position));
    return VectorMath.mul(dir, entity.stats.maxSpeed);
  }

  private handlePursuing(entity: CombatEntity, target: CombatEntity, context: BehaviorContext): Vector2D {
    const dist = VectorMath.dist(entity.position, target.position);
    const currentSpeed = VectorMath.length(entity.velocity);
    const minStrikeSpeed = entity.stats.maxSpeed * this.MIN_STRIKE_SPEED_RATIO;

    // Check Line of Sight
    const hasLOS = this.sensorService.checkLineOfSight(entity, target.position, context.obstacles);
    
    if (!hasLOS) {
      const blocker = this.sensorService.getBlockingObstacle(entity, target.position, context.obstacles);
      if (blocker) {
        const corners = VectorMath.getAABBCorners(blocker);
        const safetyMargin = entity.radius + 15;
        
        // Find the best corner to navigate around
        let bestCorner: Vector2D | null = null;
        let minTotalDist = Infinity;

        for (const corner of corners) {
          // Offset corner away from center of AABB for safety
          const centerX = blocker.x + blocker.width / 2;
          const centerY = blocker.y + blocker.height / 2;
          const offsetDir = VectorMath.normalize({ x: corner.x - centerX, y: corner.y - centerY });
          const safePoint = VectorMath.add(corner, VectorMath.mul(offsetDir, safetyMargin));

          // Check if corner is reachable (LOS from current pos to safePoint)
          if (this.sensorService.checkLineOfSight(entity, safePoint, context.obstacles)) {
            const d1 = VectorMath.dist(entity.position, safePoint);
            const d2 = VectorMath.dist(safePoint, target.position);
            if (d1 + d2 < minTotalDist) {
              minTotalDist = d1 + d2;
              bestCorner = safePoint;
            }
          }
        }

        if (bestCorner) {
          const dir = VectorMath.normalize(VectorMath.sub(bestCorner, entity.position));
          return VectorMath.mul(dir, entity.stats.maxSpeed);
        }
      }
    }

    // Transition to STRIKING if in range and moving fast enough
    if (dist <= this.MELEE_RANGE && currentSpeed >= minStrikeSpeed && hasLOS) {
      entity.state = 'STRIKING';
      entity.stateTimer = 0;
    }

    const dir = VectorMath.normalize(VectorMath.sub(target.position, entity.position));
    return VectorMath.mul(dir, entity.stats.maxSpeed);
  }

  private handleStriking(entity: CombatEntity, target: CombatEntity): Vector2D {
    const dir = VectorMath.normalize(VectorMath.sub(target.position, entity.position));
    
    // Post-Strike logic: After a hit is registered (handled elsewhere), state switches to ORBITING.
    // Here we just provide the acceleration vector "through" the target.
    // We'll simulate the "hit" detection by checking distance in the main engine, 
    // but for the move vector, we just keep going.
    
    // If we've passed the target or hit it, we switch to ORBITING
    // For this simulation, let's assume if we are very close, we've "hit"
    if (VectorMath.dist(entity.position, target.position) < 10) {
      entity.state = 'ORBITING';
      entity.stateTimer = 0;
    }

    return VectorMath.mul(dir, entity.stats.maxSpeed * 1.5); // Extra acceleration for strike
  }

  private handleOrbiting(entity: CombatEntity, target: CombatEntity, dt: number): Vector2D {
    entity.stateTimer += dt;
    
    // Orbit for 1 second before pursuing again
    if (entity.stateTimer > 1.0) {
      entity.state = 'PURSUING';
      entity.stateTimer = 0;
    }

    const toTarget = VectorMath.sub(target.position, entity.position);
    const dist = VectorMath.length(toTarget);
    
    // Calculate tangent vector (perpendicular)
    // Rotate toTarget by 90 degrees
    const tangent = { x: -toTarget.y, y: toTarget.x };
    const tangentDir = VectorMath.normalize(tangent);
    
    // Blend with a slight pull towards/push away from the orbit radius (e.g. 100 units)
    const orbitRadius = 120;
    const radialPull = (dist - orbitRadius) * 0.01;
    const radialDir = VectorMath.normalize(toTarget);
    
    const combinedDir = VectorMath.normalize(VectorMath.add(tangentDir, VectorMath.mul(radialDir, radialPull)));
    return VectorMath.mul(combinedDir, entity.stats.maxSpeed);
  }

  private handleSearching(entity: CombatEntity, dt: number): Vector2D {
    entity.stateTimer += dt;

    if (!entity.lastSeenPos) {
      entity.state = 'PATROLLING';
      return { x: 0, y: 0 };
    }

    const distToLastSeen = VectorMath.dist(entity.position, entity.lastSeenPos);

    // 1. Move to last seen position
    if (distToLastSeen > 5 && entity.stateTimer < this.SEARCH_TOTAL_TIME) {
      const dir = VectorMath.normalize(VectorMath.sub(entity.lastSeenPos, entity.position));
      return VectorMath.mul(dir, entity.stats.maxSpeed);
    }

    // 2. Arrived: Rotate 360 degrees
    if (entity.stateTimer < this.SEARCH_SCAN_TIME) {
      // Rotation logic would be applied to the entity.rotation property,
      // here we return 0 velocity to stay in place.
      entity.rotation += (Math.PI * 2 / this.SEARCH_SCAN_TIME) * dt;
      return { x: 0, y: 0 };
    }

    // 3. Timeout
    if (entity.stateTimer >= this.SEARCH_TOTAL_TIME) {
      entity.state = 'PATROLLING';
      entity.stateTimer = 0;
      entity.lastSeenPos = undefined;
    }

    return { x: 0, y: 0 };
  }
}
