import { Injectable, inject } from '@angular/core';
import { CombatStore } from './combat-store';
import { SensorService } from './sensor.service';
import { RoutineService } from './routine.service';
import { BaseAIService } from './base-ai.service';
import { SteeringService } from './steering.service';
import { Vector2D, BehaviorContext } from '../models/combat-model';
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
      const nearbyEnemies = this.sensorService.getEnemiesInRadar(entity, entities);
      const currentTarget = nearbyEnemies.length > 0 ? nearbyEnemies[0] : null;

      const context: BehaviorContext = {
        entities,
        obstacles,
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
      const weightFactor = 1 - entity.stats.weight / 1000;
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
        hitFlash: Math.max(0, (entity.hitFlash || 0) - deltaTime)
      };
    });

    // Step E.1: Circle-vs-Circle Collision Resolution (Section 8.4)
    // Drones and enemies resolve physical overlap to prevent stacking.
    const resolvedCollisions = [...updatedEntities];
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
          if (
            (e1.type === 'PLAYER' && e2.type === 'ENEMY') ||
            (e1.type === 'ENEMY' && e2.type === 'PLAYER')
          ) {
            const attacker = e1.type === 'PLAYER' ? resolvedCollisions[i] : resolvedCollisions[j];
            const defender = e1.type === 'PLAYER' ? resolvedCollisions[j] : resolvedCollisions[i];
            const aIdx = e1.type === 'PLAYER' ? i : j;
            const dIdx = e1.type === 'PLAYER' ? j : i;

            if (attacker.state !== 'STRIKING') {
              const effectiveness =
                COMBAT_CONFIG.EFFECTIVENESS_MATRIX[attacker.stats.damageType]?.[
                  defender.stats.armorType
                ] || 1.0;
              const finalDamage = Math.max(
                1,
                Math.round(attacker.stats.baseDamage * effectiveness - defender.stats.armorValue)
              );
              const newHp = Math.max(0, defender.stats.hp - finalDamage);

              resolvedCollisions[dIdx] = {
                ...defender,
                stats: { ...defender.stats, hp: newHp },
                hitFlash: 0.15
              };

              // Force ORBITING state only for PLAYER drones with precise deflection math
              if (attacker.type === 'PLAYER') {
                const outwardNormal = VectorMath.normalize(VectorMath.sub(attacker.position, defender.position));
                const currentSpeed = VectorMath.length(updatedEntities[aIdx].velocity);
                
                // Determine rotation direction (away from target) using the perp-dot product
                // This ensures we rotate "outward" relative to the collision point
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
              }

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
                const momentumMultiplier = 1.0 + (currentSpeed * attacker.stats.weight) / 10000;
                grossDamage *= momentumMultiplier;
              }
              grossDamage *= mult;

              // E. Armor Mitigation
              const finalDamage = Math.max(1, Math.round(grossDamage - target.stats.armorValue));
              const newHp = Math.max(0, target.stats.hp - finalDamage);

              // Apply damage to target (Immutable update)
              resolvedEntities[targetIdx] = {
                ...target,
                stats: { ...target.stats, hp: newHp },
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

      // 2. Enemy Retaliation (Basic)
      if (
        attacker.type === 'ENEMY' &&
        attacker.retaliationTimer >= COMBAT_CONFIG.AI_TIMINGS.RETALIATION_COOLDOWN
      ) {
        for (let j = 0; j < resolvedEntities.length; j++) {
          const player = resolvedEntities[j];
          if (player.type === 'PLAYER') {
            const dist = VectorMath.dist(attacker.position, player.position);

            if (dist <= attacker.radius + player.radius) {
              // Same math for enemy retaliation
              if (Math.random() <= player.stats.evasionRate) {
                this.store.addLog(`[COMBAT] ${attacker.name} retaliation [EVADED] by ${player.name}.`);
              } else {
                const isCrit = Math.random() <= attacker.stats.critChance;
                const finalDamage = Math.round(
                  attacker.stats.baseDamage * (isCrit ? attacker.stats.critMultiplier : 1.0)
                );
                const newHp = Math.max(0, player.stats.hp - finalDamage);

                // Push player back slightly
                const pushDir = VectorMath.normalize(
                  VectorMath.sub(player.position, attacker.position)
                );
                const pushVel = VectorMath.mul(pushDir, 50);

                resolvedEntities[j] = {
                  ...player,
                  stats: { ...player.stats, hp: newHp },
                  velocity: VectorMath.add(player.velocity, pushVel),
                  hitFlash: 0.15
                };

                this.store.addLog(
                  `[COMBAT] ${attacker.name} retaliated against ${player.name} for ${finalDamage} DMG. [Hull: ${newHp}]`
                );
              }

              // Reset enemy retaliation cooldown
              attacker = { ...attacker, retaliationTimer: 0 };
              resolvedEntities[i] = attacker;
              break;
            }
          }
        }
      }
    }

    // Step F: State Patching
    // Trigger reactive UI update with the resolved entities
    this.store.setEntities(resolvedEntities);
  }
}
