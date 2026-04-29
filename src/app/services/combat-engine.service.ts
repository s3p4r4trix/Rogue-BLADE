import { Injectable, inject } from '@angular/core';
import { CombatStore } from './combat-store';
import { SensorService } from './sensor.service';
import { RoutineService } from './routine.service';
import { BaseAIService } from './base-ai.service';
import { SteeringService } from './steering.service';
import { Vector2D, BehaviorContext, Projectile, CombatEntity } from '../models/combat-model';
import { VectorMath } from '../utils/vector-math.utils';
import { COMBAT_CONFIG } from '../constants/combat-config';

@Injectable({ providedIn: 'root' })
export class CombatEngineService {
  private readonly store = inject(CombatStore);
  private readonly sensorService = inject(SensorService);
  private readonly routineService = inject(RoutineService);
  private readonly baseAIService = inject(BaseAIService);
  private readonly steeringService = inject(SteeringService);

  /**
   * The core game loop tick.
   * Orchestrates the synchronous pipeline for all entities.
   * @param deltaTime Time elapsed since last frame in seconds.
   */
  public updateTick(deltaTime: number): void {
    if (this.store.isPaused()) return;

    // Update store with latest deltaTime and timeElapsed (internal to setDeltaTime)
    this.store.setDeltaTime(deltaTime);

    const entities = this.store.entities();
    const obstacles = this.store.obstacles();

    // Process every entity through the pipeline to create a new state array
    const updatedEntities = entities.map((entity) => {
      // Step A: Perception (SensorService)
      // Determine context: nearest enemy, line of sight, etc.
      const nearbyEnemies = this.sensorService.getEnemiesInRadar(entity, entities, obstacles);
      const currentTarget = nearbyEnemies.length > 0 ? nearbyEnemies[0] : null;

      const context: BehaviorContext = {
        entities,
        obstacles,
        projectiles: this.store.projectiles(),
        pulses: this.store.pulses(),
        deltaTime,
        timeElapsed: this.store.timeElapsed(),
        isFinished: this.store.isFinished(),
        success: this.store.success(),
        logs: this.store.logs(),
        isPaused: this.store.isPaused(),
        activePlayerId: this.store.activePlayerId(),
        nearbyEnemies,
        currentTarget
      };

      // Step B: Tactical Override (RoutineService)
      // Evaluates player IF/THEN slots. Returns desiredVelocity or null.
      const overrideResult = this.routineService.evaluateGambits(entity, context);
      const overrideVelocity = (overrideResult as unknown) as Vector2D | null;

      // Step C: Default AI (BaseAIService)
      // If no override, use default state machine behavior.
      const desiredVelocity =
        overrideVelocity ?? this.baseAIService.calculateDefaultBehavior(entity, context);

      // Step D: Navigation & Physics (SteeringService)
      // Handles 5-Feeler Wall-Sliding logic and returns finalVelocity.
      const finalVelocity = this.steeringService.calculateFinalVelocity(
        entity,
        desiredVelocity,
        obstacles
      );

      // Step E: Kinematic Application
      // Formula from core_mechanics.md: currentSpeed = min(topSpeed, currentSpeed + (acceleration * (1 - (baseWeight / 1000))))
      const weightFactor = Math.max(0, 1 - entity.stats.weight / COMBAT_CONFIG.PHYSICS.MAX_DEPLOYABLE_WEIGHT);
      const effectiveAcceleration = entity.stats.acceleration * weightFactor;

      // Calculate direction to desired velocity
      const velocityDiff = VectorMath.sub(finalVelocity, entity.velocity);
      const diffLen = VectorMath.length(velocityDiff);

      let acceleratedVelocity = { ...entity.velocity };

      if (diffLen > 0) {
        const accelStep = effectiveAcceleration * deltaTime;
        const accelDir = VectorMath.normalize(velocityDiff);

        // Add acceleration in the direction of the desired velocity
        const addedVel = VectorMath.mul(accelDir, Math.min(diffLen, accelStep));
        acceleratedVelocity = VectorMath.add(entity.velocity, addedVel);
      }

      // Limit to top speed
      const finalClampedVelocity = VectorMath.limit(acceleratedVelocity, entity.stats.maxSpeed);

      let newX = entity.position.x + finalClampedVelocity.x * deltaTime;
      let newY = entity.position.y + finalClampedVelocity.y * deltaTime;

      // Clamp to arena boundaries respecting entity radius
      newX = Math.max(
        entity.radius,
        Math.min(COMBAT_CONFIG.ARENA_SIZE - entity.radius, newX)
      );
      newY = Math.max(
        entity.radius,
        Math.min(COMBAT_CONFIG.ARENA_SIZE - entity.radius, newY)
      );

      // Calculate rotation based on velocity direction; if stopped, face the desired direction
      const rotation =
        finalClampedVelocity.x !== 0 || finalClampedVelocity.y !== 0
          ? Math.atan2(finalClampedVelocity.y, finalClampedVelocity.x)
          : desiredVelocity.x !== 0 || desiredVelocity.y !== 0
            ? Math.atan2(desiredVelocity.y, desiredVelocity.x)
            : entity.rotation;

      // Return immutable copy of the entity with updated kinematics and timer increments
      return {
        ...entity,
        targetId: currentTarget?.id, // Propagate targetId for combat resolution
        position: { x: newX, y: newY },
        velocity: finalClampedVelocity,
        rotation,
        // Increment stateTimer only for states not handled by BaseAIService to avoid double-speed
        stateTimer:
          entity.state === 'ORBITING' || entity.state === 'SEARCHING'
            ? entity.stateTimer
            : entity.stateTimer + deltaTime,
        retaliationTimer: (entity.retaliationTimer || 0) + deltaTime,
        hitFlash: Math.max(0, (entity.hitFlash || 0) - deltaTime),
        empGroundingTimer: Math.max(0, (entity.empGroundingTimer || 0) - deltaTime)
        // pulseTriggered is preserved and handled in processedEntities loop
      };
    });

    // Handle EMP Pulses and other AoE effects
    const processedEntities = updatedEntities.map(entity => {
      if (entity.pulseTriggered) {
        const radius = entity.stats.aoeRadius || 150;
        this.executeAoEPulse(entity, radius, updatedEntities);
        return { ...entity, pulseTriggered: false };
      }
      return entity;
    });

    // Update visual pulses
    this.updateVisualPulses(deltaTime);

    // Step E.1: Circle-vs-Circle Collision Resolution (Section 8.4)
    // Drones and enemies resolve physical overlap to prevent stacking.
    const resolvedCollisions = [...processedEntities];
    for (let i = 0; i < resolvedCollisions.length; i++) {
      for (let j = i + 1; j < resolvedCollisions.length; j++) {
        const e1 = resolvedCollisions[i];
        const e2 = resolvedCollisions[j];

        const dist = VectorMath.dist(e1.position, e2.position);
        const minDist = e1.radius + e2.radius;

        if (dist < minDist && dist > 0) {
          const overlap = minDist - dist;
          const normal = VectorMath.normalize(VectorMath.sub(e1.position, e2.position));
          const push = VectorMath.mul(normal, overlap / 2);

          // Separation: Push apart by overlap / 2
          resolvedCollisions[i] = { ...e1, position: VectorMath.add(e1.position, push) };
          resolvedCollisions[j] = { ...e2, position: VectorMath.sub(e2.position, push) };

          // Mutual Impulse: Trigger a small velocity boost away
          const impulseStrength = 30;
          resolvedCollisions[i].velocity = VectorMath.add(
            resolvedCollisions[i].velocity,
            VectorMath.mul(normal, impulseStrength)
          );
          resolvedCollisions[j].velocity = VectorMath.sub(
            resolvedCollisions[j].velocity,
            VectorMath.mul(normal, impulseStrength)
          );

          // Glancing Blow Logic: Low-speed collision damage (Player vs Enemy)
          // Only PLAYER drones deal collision damage; enemies use ranged projectiles.
          if (
            (e1.type === 'PLAYER' && e2.type === 'ENEMY') ||
            (e1.type === 'ENEMY' && e2.type === 'PLAYER')
          ) {
            const attacker = e1.type === 'PLAYER' ? resolvedCollisions[i] : resolvedCollisions[j];
            const defender = e1.type === 'PLAYER' ? resolvedCollisions[j] : resolvedCollisions[i];
            const aIdx = e1.type === 'PLAYER' ? i : j;
            const dIdx = e1.type === 'PLAYER' ? j : i;

            if (attacker.type === 'PLAYER' && attacker.state !== 'STRIKING') {
              const effectiveness =
                COMBAT_CONFIG.EFFECTIVENESS_MATRIX[attacker.stats.damageType]?.[
                defender.stats.armorType
                ] || 1.0;
              const finalDamage = Math.max(
                1,
                Math.round(attacker.stats.baseDamage * effectiveness - defender.stats.armorValue)
              );
              const newHp = Math.max(0, defender.stats.hp - finalDamage);

              // Snap rotation if the defender is a hostile (Section 8.12)
              let newRotation = defender.rotation;
              if (defender.type === 'ENEMY') {
                newRotation = Math.atan2(
                  attacker.position.y - defender.position.y,
                  attacker.position.x - defender.position.x
                );
              }

              resolvedCollisions[dIdx] = {
                ...defender,
                stats: { ...defender.stats, hp: newHp },
                rotation: newRotation,
                hitFlash: 0.15
              };

              // Force ORBITING state only for PLAYER drones with precise deflection math
              const outwardNormal = VectorMath.normalize(VectorMath.sub(attacker.position, defender.position));
              const currentSpeed = VectorMath.length(updatedEntities[aIdx].velocity);

              // Determine rotation direction (away from target) using the perp-dot product
              const perpDot = attacker.velocity.x * outwardNormal.y - attacker.velocity.y * outwardNormal.x;
              const side = perpDot > 0 ? 1 : -1;

              const deflectedVelocity = VectorMath.rotate(
                attacker.velocity,
                COMBAT_CONFIG.PHYSICS.POST_STRIKE_DEFLECTION_ANGLE * side
              );

              resolvedCollisions[aIdx] = {
                ...attacker,
                state: 'ORBITING',
                stateTimer: 0,
                velocity: VectorMath.mul(deflectedVelocity, COMBAT_CONFIG.PHYSICS.POST_STRIKE_FRICTION_MULT)
              };

              this.store.addLog(
                `[COMBAT] ${attacker.name} glancing blow on ${defender.name} for ${finalDamage} DMG.`
              );
            }
          }
        }
      }
    }

    // Step E.2: Combat Resolution Phase
    // Iterate through entities to resolve strikes and retaliation
    const resolvedEntities = [...resolvedCollisions];

    for (let i = 0; i < resolvedEntities.length; i++) {
      let attacker = resolvedEntities[i];

      // 1. Drone Strike Logic (Player Only)
      if (attacker.type === 'PLAYER' && attacker.state === 'STRIKING' && attacker.targetId) {
        const targetIdx = resolvedEntities.findIndex((e) => e.id === attacker.targetId);
        if (targetIdx !== -1) {
          const target = resolvedEntities[targetIdx];
          const dist = VectorMath.dist(attacker.position, target.position);

          // Check for hit (Radii + buffer)
          if (dist <= attacker.radius + target.radius + COMBAT_CONFIG.RANGES.MELEE_RANGE_BUFFER) {
            // A. Evasion Check
            if (Math.random() <= target.stats.evasionRate) {
              this.store.addLog(`[COMBAT] ${attacker.name} strike [EVADED] by ${target.name}.`);
            } else {
              // B. Roll for Crit
              const isCrit = Math.random() <= attacker.stats.critChance;
              let grossDamage =
                attacker.stats.baseDamage * (isCrit ? attacker.stats.critMultiplier : 1.0);

              // C. Matrix Multiplier
              const mult =
                COMBAT_CONFIG.EFFECTIVENESS_MATRIX[attacker.stats.damageType]?.[
                target.stats.armorType
                ] || 1.0;
              // D. Kinetic Scaling (Formula from core_mechanics.md Section 4.2)
              if (attacker.stats.damageType === 'KINETIC') {
                const currentSpeed = VectorMath.length(attacker.velocity);
                const momentumMultiplier = Math.min(
                  COMBAT_CONFIG.PHYSICS.MAX_MOMENTUM_MULTIPLIER,
                  1.0 + (currentSpeed * attacker.stats.weight) / 10000
                );
                grossDamage *= momentumMultiplier;
              }
              grossDamage *= mult;

              // E. Armor Mitigation
              const finalDamage = Math.max(1, Math.round(grossDamage - target.stats.armorValue));
              const newHp = Math.max(0, target.stats.hp - finalDamage);

              // Snap rotation if the target is a hostile (Section 8.12)
              let newRotation = target.rotation;
              if (target.type === 'ENEMY') {
                newRotation = Math.atan2(
                  attacker.position.y - target.position.y,
                  attacker.position.x - target.position.x
                );
              }

              // Apply damage to target (Immutable update)
              resolvedEntities[targetIdx] = {
                ...target,
                stats: { ...target.stats, hp: newHp },
                rotation: newRotation,
                hitFlash: 0.15 // 150ms flash
              };

              const critText = isCrit ? '[CRITICAL] ' : '';
              this.store.addLog(
                `[COMBAT] ${critText}${attacker.name} hit ${target.name} for ${finalDamage} DMG (${attacker.stats.damageType}). [Hull: ${newHp}]`
              );
            }

            // Tangential Deflection and State Change for Attacker (PLAYER only)
            // 1. Calculate the vector from the target's center to the attacker's position (the outward normal)
            const outwardNormal = VectorMath.normalize(VectorMath.sub(attacker.position, target.position));

            // 2. Normalize the attacker's current velocity and get pre-impulse speed
            const currentSpeed = VectorMath.length(updatedEntities[i].velocity);
            const normalizedVel = VectorMath.normalize(attacker.velocity);

            // 3. Determine rotation direction: ensure it rotates "outward" (away from target)
            // Use perp-dot product to find which side of the velocity vector the outward normal lies on
            const perpDot = normalizedVel.x * outwardNormal.y - normalizedVel.y * outwardNormal.x;
            const side = perpDot >= 0 ? 1 : -1;

            // 4. Deflect the velocity away from the target by the configured angle
            const deflectedDir = VectorMath.rotate(
              normalizedVel,
              COMBAT_CONFIG.PHYSICS.POST_STRIKE_DEFLECTION_ANGLE * side
            );

            // 5. Multiply by current speed and friction multiplier to retain momentum
            resolvedEntities[i] = {
              ...attacker,
              velocity: VectorMath.mul(deflectedDir, currentSpeed * COMBAT_CONFIG.PHYSICS.POST_STRIKE_FRICTION_MULT),
              state: 'ORBITING',
              stateTimer: 0
            };
          }
        }
      }
    }

    // Step E.3: Projectile Update & Collision
    const finalizedEntities = this.updateProjectiles(deltaTime, resolvedEntities);

    // Step F: State Patching
    // Trigger reactive UI update with the resolved entities
    this.store.setEntities(finalizedEntities);
  }

  /**
   * Moves active projectiles and resolves collisions with obstacles and entities.
   * @param deltaTime Time elapsed in seconds.
   * @param entities The current list of combat entities for collision checks.
   * @returns Updated entity list after projectile damage is applied.
   */
  private updateProjectiles(deltaTime: number, entities: CombatEntity[]): CombatEntity[] {
    const projectiles = this.store.projectiles();
    const obstacles = this.store.obstacles();
    const updatedProjectiles: Projectile[] = [];
    const updatedEntities = [...entities];

    for (const p of projectiles) {
      // 1. Kinetic Movement
      const newPos = VectorMath.add(p.position, VectorMath.mul(p.velocity, deltaTime));

      // 2. Arena Boundary Check
      if (
        newPos.x < 0 ||
        newPos.x > COMBAT_CONFIG.ARENA_SIZE ||
        newPos.y < 0 ||
        newPos.y > COMBAT_CONFIG.ARENA_SIZE
      ) {
        continue; // De-spawn projectile
      }

      // 3. Obstacle Collision (AABB)
      let hitObstacle = false;
      for (const obs of obstacles) {
        if (VectorMath.isPointInAABB(newPos, obs)) {
          hitObstacle = true;
          break;
        }
      }
      if (hitObstacle) continue; // De-spawn projectile

      // 4. Entity Collision (Circle vs Point)
      let hitEntity = false;
      for (let i = 0; i < updatedEntities.length; i++) {
        const target = updatedEntities[i];

        // Prevent friendly fire/self-damage from the source
        if (target.id === p.sourceId) continue;

        const dist = VectorMath.dist(newPos, target.position);
        if (dist <= target.radius + p.radius) {
          hitEntity = true;

          // Damage Resolution (Section 5.1 & 8.10)
          const effectiveness = COMBAT_CONFIG.EFFECTIVENESS_MATRIX[p.damageType]?.[target.stats.armorType] || 1.0;
          const finalDamage = Math.max(1, Math.round(p.damage * effectiveness - target.stats.armorValue));
          const newHp = Math.max(0, target.stats.hp - finalDamage);

          // Apply Damage & Hit Flash
          updatedEntities[i] = {
            ...target,
            stats: { ...target.stats, hp: newHp },
            hitFlash: 0.15, // 150ms impact flash
            // Projectiles also trigger immediate reactive awareness (Section 8.12)
            lastSeenPos: { ...p.position },
            stateTimer: 0
          };

          // If the target was idle/patrolling, shift to pursuit
          if (updatedEntities[i].state === 'PATROLLING' || updatedEntities[i].state === 'SEARCHING') {
            updatedEntities[i].state = 'PURSUING';
          }

          const isHostile = entities.find(e => e.id === p.sourceId)?.type === 'ENEMY';
          const hostileTag = isHostile ? '[HOSTILE] ' : '';
          this.store.addLog(`[COMBAT] ${hostileTag}Projectile hit ${target.name} for ${finalDamage} DMG (${p.damageType}).`);
          break; // Projectile destroyed on impact
        }
      }

      if (!hitEntity) {
        updatedProjectiles.push({ ...p, position: newPos });
      }
    }

    this.store.setProjectiles(updatedProjectiles);
    return updatedEntities;
  }

  /**
   * Executes an Area-of-Effect pulse from a source entity.
   * Strips shields from targets; if no shields, applies STUNNED state.
   */
  private executeAoEPulse(source: CombatEntity, radius: number, entities: CombatEntity[]): void {
    const targets = entities.filter(e => e.type === 'PLAYER');
    let hitCount = 0;

    for (const target of targets) {
      const dist = VectorMath.dist(source.position, target.position);
      if (dist <= radius) {
        hitCount++;

        if (target.stats.shields > 0) {
          // Strip shields
          target.stats.shields = 0;
          this.store.addLog(`[COMBAT] ${target.name} SHIELD_COLLAPSE. Pulse neutralized.`);
        } else if (!target.empGroundingTimer) {
          // Apply Stun (Check for immunity)
          target.state = 'STUNNED';
          target.stateTimer = 0;
          target.velocity = { x: 0, y: 0 };
          this.store.addLog(`[COMBAT] ${target.name} STUNNED by EMP pulse.`);
        } else {
          this.store.addLog(`[COMBAT] ${target.name} EMP_GROUNDED. Stun resisted.`);
        }
        target.hitFlash = 0.3; // Longer flash for EMP
      }
    }

    // Add visual effect
    this.store.addPulse({
      id: `pulse-${crypto.randomUUID()}`,
      x: source.position.x,
      y: source.position.y,
      radius: 0,
      maxRadius: radius,
      timer: 0,
      duration: 0.3 // 300ms visual duration
    });
  }

  /**
   * Updates visual pulse effects, expanding and fading them out.
   */
  private updateVisualPulses(dt: number): void {
    const pulses = this.store.pulses();
    if (pulses.length === 0) return;

    const updatedPulses = pulses
      .map(p => {
        const newTimer = p.timer + dt;
        const progress = Math.min(1, newTimer / p.duration);
        return {
          ...p,
          timer: newTimer,
          radius: p.maxRadius * progress
        };
      })
      .filter(p => p.timer < p.duration);

    this.store.setPulses(updatedPulses);
  }
}
