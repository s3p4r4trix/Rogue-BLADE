import { Injectable, inject } from '@angular/core';
import { CombatEntity, Vector2D, BehaviorContext } from '../models/combat-model';
import { VectorMath } from '../utils/vector-math.utils';
import { SensorService } from './sensor.service';
import { COMBAT_CONFIG } from '../constants/combat-config';
import { CombatStore } from './combat-store';

@Injectable({ providedIn: 'root' })
export class BaseAIService {
  private sensorService = inject(SensorService);
  private combatStore = inject(CombatStore);

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
      case 'STUNNED':
        desiredVelocity = this.handleStunned(entity, context.deltaTime);
        break;

      case 'PATROLLING':
        desiredVelocity = this.handlePatrolling(entity);
        if (target) {
          if (entity.type === 'ENEMY') {
            entity.state = 'SHOOTING';
            entity.stateTimer = 0;
          } else {
            entity.state = 'PURSUING';
          }
        }
        break;

      case 'SHOOTING':
        if (!target) {
          entity.state = 'SEARCHING';
          entity.stateTimer = 0;
          break;
        }
        desiredVelocity = this.handleShooting(entity, target, context);
        break;

      case 'ENGAGING':
        if (!target) {
          entity.state = 'SEARCHING';
          entity.stateTimer = 0;
          break;
        }
        desiredVelocity = this.handlePursuing(entity, target, context);
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
          entity.state = entity.type === 'ENEMY' ? 'SHOOTING' : 'PURSUING';
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
        x: Math.random() * (COMBAT_CONFIG.ARENA_SIZE - 100) + 50,
        y: Math.random() * (COMBAT_CONFIG.ARENA_SIZE - 100) + 50
      };
    }

    const dir = VectorMath.normalize(VectorMath.sub(entity.waypoint, entity.position));
    return VectorMath.mul(dir, entity.stats.maxSpeed);
  }

  private handlePursuing(
    entity: CombatEntity,
    target: CombatEntity,
    context: BehaviorContext
  ): Vector2D {
    const dist = VectorMath.dist(entity.position, target.position);
    const currentSpeed = VectorMath.length(entity.velocity);
    const minStrikeSpeed = entity.stats.maxSpeed * COMBAT_CONFIG.PHYSICS.MIN_STRIKE_SPEED_RATIO;

    // Check Line of Sight
    const hasLOS = this.sensorService.checkLineOfSight(entity, target.position, context.obstacles);

    if (!hasLOS) {
      const blocker = this.sensorService.getBlockingObstacle(
        entity,
        target.position,
        context.obstacles
      );
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
    if (dist <= COMBAT_CONFIG.RANGES.MELEE_RANGE_BASE && currentSpeed >= minStrikeSpeed && hasLOS) {
      entity.state = 'STRIKING';
      entity.stateTimer = 0;
    }

    // Force retreat if stuck in melee range without speed (Sticky Pursuit fix) - PLAYER only
    if (entity.type === 'PLAYER' && dist <= COMBAT_CONFIG.RANGES.MELEE_RANGE_BASE && currentSpeed < minStrikeSpeed) {
      entity.state = 'ORBITING';
      entity.stateTimer = 0;
    }

    const dir = VectorMath.normalize(VectorMath.sub(target.position, entity.position));
    return VectorMath.mul(dir, entity.stats.maxSpeed);
  }

  private handleStriking(entity: CombatEntity, target: CombatEntity): Vector2D {
    const dir = VectorMath.normalize(VectorMath.sub(target.position, entity.position));

    // Post-Strike logic: After a hit is registered (handled elsewhere), state switches to ORBITING.
    // Here we just provide the acceleration vector "through" the target.

    // If we've passed the target or hit it, we switch to ORBITING (PLAYER only)
    if (entity.type === 'PLAYER' && VectorMath.dist(entity.position, target.position) < COMBAT_CONFIG.RANGES.STRIKE_HIT_THRESHOLD) {
      entity.state = 'ORBITING';
      entity.stateTimer = 0;
    }

    return VectorMath.mul(dir, entity.stats.maxSpeed * 1.5); // Extra acceleration for strike
  }

  private handleOrbiting(entity: CombatEntity, target: CombatEntity, dt: number): Vector2D {
    entity.stateTimer += dt;
    const toTarget = VectorMath.sub(target.position, entity.position);
    const dist = VectorMath.length(toTarget);

    // Retreat & Regroup Phase:
    // Drones fly away until they are at least RETREAT_DISTANCE away or RETREAT_DURATION has passed.
    if (
      dist >= COMBAT_CONFIG.RANGES.RETREAT_DISTANCE ||
      entity.stateTimer >= COMBAT_CONFIG.AI_TIMINGS.RETREAT_DURATION
    ) {
      entity.state = 'PURSUING';
      entity.stateTimer = 0;
      return { x: 0, y: 0 };
    }

    // Direction is AWAY from target
    const retreatDir = VectorMath.normalize(VectorMath.neg(toTarget));

    // Apply full speed to get away fast
    return VectorMath.mul(retreatDir, entity.stats.maxSpeed);
  }

  private handleShooting(
    entity: CombatEntity,
    target: CombatEntity,
    context: BehaviorContext
  ): Vector2D {
    // 1. Stationary Turret: Halt all movement
    const desiredVelocity: Vector2D = { x: 0, y: 0 };

    // 2. Continuous Tracking: Update rotation to face target
    const toTarget = VectorMath.sub(target.position, entity.position);
    entity.rotation = Math.atan2(toTarget.y, toTarget.x);

    // 3. Firing Mechanism
    const cooldown = entity.archetype === 'EMP_WARDEN' 
      ? (entity.stats.pulseCooldown || 4000) / 1000 
      : COMBAT_CONFIG.AI_TIMINGS.FIRE_RATE;

    if (entity.retaliationTimer >= cooldown) {
      if (entity.archetype === 'EMP_WARDEN') {
        // Trigger AoE Pulse instead of projectile
        entity.pulseTriggered = true;
        entity.retaliationTimer = 0;
        
        this.combatStore.addLog(
          `[COMBAT] [HOSTILE] ${entity.name} initiated EMP_PULSE sequence.`
        );
      } else {
        const direction = VectorMath.normalize(toTarget);
        const velocity = VectorMath.mul(direction, 300); // PROJECTILE_SPEED from docs

        const newProjectile = {
          id: `proj-${crypto.randomUUID()}`,
          position: { ...entity.position },
          velocity,
          damage: entity.stats.baseDamage,
          damageType: entity.stats.damageType,
          sourceId: entity.id,
          targetId: target.id,
          radius: 4
        };

        const currentProjectiles = this.combatStore.projectiles();
        this.combatStore.setProjectiles([...currentProjectiles, newProjectile]);

        // Reset fire cooldown
        entity.retaliationTimer = 0;

        this.combatStore.addLog(
          `[COMBAT] [HOSTILE] ${entity.name} fired ${entity.stats.damageType} projectile at ${target.name}.`
        );
      }
    }

    return desiredVelocity;
  }

  private handleStunned(entity: CombatEntity, dt: number): Vector2D {
    entity.stateTimer += dt;
    
    // STUN duration: 1.5 seconds
    if (entity.stateTimer >= 1.5) {
      entity.state = 'PATROLLING';
      entity.stateTimer = 0;
      entity.empGroundingTimer = COMBAT_CONFIG.PHYSICS.EMP_GROUNDING_DURATION;
      this.combatStore.addLog(`[SYSTEM] ${entity.name} REBOOT_SEQUENCE_COMPLETE. AI restored. EMP_GROUNDING_ACTIVE.`);
    }

    return { x: 0, y: 0 };
  }

  private handleSearching(entity: CombatEntity, dt: number): Vector2D {
    entity.stateTimer += dt;

    if (!entity.lastSeenPos) {
      entity.state = 'PATROLLING';
      return { x: 0, y: 0 };
    }

    const distToLastSeen = VectorMath.dist(entity.position, entity.lastSeenPos);

    // 1. Move to last seen position
    // We face the last-seen-point and move in that direction.
    if (distToLastSeen > 5) {
      // If we haven't timed out (3s total search memory)
      if (entity.stateTimer < COMBAT_CONFIG.AI_TIMINGS.SEARCH_TOTAL_TIME) {
        const dir = VectorMath.normalize(VectorMath.sub(entity.lastSeenPos, entity.position));
        return VectorMath.mul(dir, entity.stats.maxSpeed);
      } else {
        // Search timeout: return to patrolling
        entity.state = 'PATROLLING';
        entity.stateTimer = 0;
        entity.lastSeenPos = undefined;
        return { x: 0, y: 0 };
      }
    }

    // 2. Arrived: Rotate 360 degrees to spot hostiles
    // We stay at the last-seen-point and spin.
    const scanTime = entity.stateTimer - (distToLastSeen <= 5 ? 0 : 0); 
    // Wait, stateTimer is total time. We need to know how long we've been scanning.
    // Let's use the remaining time for scanning until search_total_time.
    
    if (entity.stateTimer < COMBAT_CONFIG.AI_TIMINGS.SEARCH_TOTAL_TIME) {
      // Rotation logic: Spin in place
      entity.rotation +=
        ((Math.PI * 2) / COMBAT_CONFIG.AI_TIMINGS.SEARCH_SCAN_TIME) * dt;
      return { x: 0, y: 0 };
    }

    // 3. Final Timeout
    entity.state = 'PATROLLING';
    entity.stateTimer = 0;
    entity.lastSeenPos = undefined;

    return { x: 0, y: 0 };
  }
}
