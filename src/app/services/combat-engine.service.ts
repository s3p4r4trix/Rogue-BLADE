import { Injectable, inject } from '@angular/core';
import { CombatStore } from './combat-store';
import { SensorService } from './sensor.service';
import { RoutineService } from './routine.service';
import { BaseAIService } from './base-ai.service';
import { SteeringService } from './steering.service';
import { Vector2D, BehaviorContext } from '../models/combat-model';
import { VectorMath } from '../utils/vector-math.utils';

@Injectable({ providedIn: 'root' })
export class CombatEngineService {
  private readonly store = inject(CombatStore);
  private readonly sensorService = inject(SensorService);
  private readonly routineService = inject(RoutineService);
  private readonly baseAIService = inject(BaseAIService);
  private readonly steeringService = inject(SteeringService);

  private readonly ARENA_SIZE = 800;

  private readonly EFFECTIVENESS_MATRIX: Record<string, Record<string, number>> = {
    'SLASHING': { 'UNARMORED': 1.5, 'HEAVY_ARMOR': 0.4, 'ENERGY_SHIELD': 0.8 },
    'KINETIC': { 'UNARMORED': 1.0, 'HEAVY_ARMOR': 1.5, 'ENERGY_SHIELD': 0.5 },
    'ENERGY': { 'UNARMORED': 1.0, 'HEAVY_ARMOR': 1.0, 'ENERGY_SHIELD': 2.0 },
    'EMP': { 'UNARMORED': 0.0, 'HEAVY_ARMOR': 0.0, 'ENERGY_SHIELD': 1.0 }
  };

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
    const updatedEntities = entities.map(entity => {

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
      const overrideVelocity = overrideResult as unknown as Vector2D | null;

      // Step C: Default AI (BaseAIService)
      // If no override, use default state machine behavior.
      const desiredVelocity = overrideVelocity ?? this.baseAIService.calculateDefaultBehavior(entity, context);

      // Step D: Navigation & Physics (SteeringService)
      // Handles 5-Feeler Wall-Sliding logic and returns finalVelocity.
      const finalVelocity = this.steeringService.calculateFinalVelocity(entity, desiredVelocity, obstacles);

      // Step E: Kinematic Application
      // Formula from core_mechanics.md: currentSpeed = min(topSpeed, currentSpeed + (acceleration * (1 - (baseWeight / 1000))))
      const weightFactor = 1 - (entity.stats.weight / 1000);
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

      let newX = entity.position.x + (finalClampedVelocity.x * deltaTime);
      let newY = entity.position.y + (finalClampedVelocity.y * deltaTime);

      // Clamp to arena boundaries (800x800) respecting entity radius
      newX = Math.max(entity.radius, Math.min(this.ARENA_SIZE - entity.radius, newX));
      newY = Math.max(entity.radius, Math.min(this.ARENA_SIZE - entity.radius, newY));

      // Calculate rotation based on velocity direction; if stopped, face the desired direction
      const rotation = (finalClampedVelocity.x !== 0 || finalClampedVelocity.y !== 0)
        ? Math.atan2(finalClampedVelocity.y, finalClampedVelocity.x)
        : (desiredVelocity.x !== 0 || desiredVelocity.y !== 0
          ? Math.atan2(desiredVelocity.y, desiredVelocity.x)
          : entity.rotation);

      // Return immutable copy of the entity with updated kinematics and timer increments
      return {
        ...entity,
        targetId: currentTarget?.id, // Propagate targetId for combat resolution
        position: { x: newX, y: newY },
        velocity: finalClampedVelocity,
        rotation,
        // Increment stateTimer only for states not handled by BaseAIService to avoid double-speed
        stateTimer: (entity.state === 'ORBITING' || entity.state === 'SEARCHING')
          ? entity.stateTimer
          : entity.stateTimer + deltaTime,
        retaliationTimer: (entity.retaliationTimer || 0) + deltaTime,
        hitFlash: Math.max(0, (entity.hitFlash || 0) - deltaTime)
      };
    });

    // Step E.2: Combat Resolution Phase
    // Iterate through entities to resolve strikes and retaliation
    const resolvedEntities = [...updatedEntities];

    for (let i = 0; i < resolvedEntities.length; i++) {
      let attacker = resolvedEntities[i];

      // 1. Drone Strike Logic (Player Only)
      if (attacker.type === 'PLAYER' && attacker.state === 'STRIKING' && attacker.targetId) {
        const targetIdx = resolvedEntities.findIndex(e => e.id === attacker.targetId);
        if (targetIdx !== -1) {
          const target = resolvedEntities[targetIdx];
          const dist = VectorMath.dist(attacker.position, target.position);

          // Check for hit (Radii + 10px buffer)
          if (dist <= attacker.radius + target.radius + 10) {
            // A. Evasion Check
            if (Math.random() <= target.stats.evasionRate) {
              this.store.addLog(`[COMBAT] ${attacker.name} strike [EVADED] by ${target.name}.`);
            } else {
              // B. Roll for Crit
              const isCrit = Math.random() <= attacker.stats.critChance;
              let grossDamage = attacker.stats.baseDamage * (isCrit ? attacker.stats.critMultiplier : 1.0);

              // C. Matrix Multiplier
              const mult = this.EFFECTIVENESS_MATRIX[attacker.stats.damageType]?.[target.stats.armorType] || 1.0;
              // D. Kinetic Scaling (Formula from core_mechanics.md Section 4.2)
              if (attacker.stats.damageType === 'KINETIC') {
                const currentSpeed = VectorMath.length(attacker.velocity);
                const momentumMultiplier = 1.0 + ((currentSpeed * attacker.stats.weight) / 10000);
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
              this.store.addLog(`[COMBAT] ${critText}${attacker.name} hit ${target.name} for ${finalDamage} DMG (${attacker.stats.damageType}). [Hull: ${newHp}]`);
            }

            // Bounce and State Change for Attacker
            attacker = {
              ...attacker,
              velocity: VectorMath.mul(attacker.velocity, -0.5), // Reverse and halve speed
              state: 'ORBITING',
              stateTimer: 0
            };
            resolvedEntities[i] = attacker;
          }
        }
      }

      // 2. Enemy Retaliation (Basic)
      if (attacker.type === 'ENEMY' && attacker.retaliationTimer >= 1.5) {
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
                const finalDamage = Math.round(attacker.stats.baseDamage * (isCrit ? attacker.stats.critMultiplier : 1.0));
                const newHp = Math.max(0, player.stats.hp - finalDamage);

                // Push player back slightly
                const pushDir = VectorMath.normalize(VectorMath.sub(player.position, attacker.position));
                const pushVel = VectorMath.mul(pushDir, 50);

                resolvedEntities[j] = {
                  ...player,
                  stats: { ...player.stats, hp: newHp },
                  velocity: VectorMath.add(player.velocity, pushVel),
                  hitFlash: 0.15
                };

                this.store.addLog(`[COMBAT] ${attacker.name} retaliated against ${player.name} for ${finalDamage} DMG. [Hull: ${newHp}]`);
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
