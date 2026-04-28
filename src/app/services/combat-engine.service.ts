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
      // Apply velocity to position: newPos = oldPos + (vel * dt)
      let newX = entity.position.x + (finalVelocity.x * deltaTime);
      let newY = entity.position.y + (finalVelocity.y * deltaTime);

      // Clamp to arena boundaries (800x800) respecting entity radius
      newX = Math.max(entity.radius, Math.min(this.ARENA_SIZE - entity.radius, newX));
      newY = Math.max(entity.radius, Math.min(this.ARENA_SIZE - entity.radius, newY));

      // Calculate rotation based on velocity direction if moving
      const rotation = (finalVelocity.x !== 0 || finalVelocity.y !== 0)
        ? Math.atan2(finalVelocity.y, finalVelocity.x)
        : entity.rotation;

      // Return immutable copy of the entity with updated kinematics and timer increments
      return {
        ...entity,
        targetId: currentTarget?.id, // Propagate targetId for combat resolution
        position: { x: newX, y: newY },
        velocity: finalVelocity,
        rotation,
        // Increment stateTimer only for states not handled by BaseAIService to avoid double-speed
        stateTimer: (entity.state === 'ORBITING' || entity.state === 'SEARCHING') 
          ? entity.stateTimer 
          : entity.stateTimer + deltaTime,
        retaliationTimer: (entity.retaliationTimer || 0) + deltaTime
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
            // Kinetic Damage Scaling
            const currentSpeed = VectorMath.length(attacker.velocity);
            const momentumMultiplier = 1.0 + ((currentSpeed * attacker.stats.weight) / 10000);
            const finalDamage = Math.round(attacker.stats.baseDamage * Math.max(1, momentumMultiplier));

            const newHp = Math.max(0, target.stats.hp - finalDamage);

            // Apply damage to target (Immutable update)
            resolvedEntities[targetIdx] = {
              ...target,
              stats: { ...target.stats, hp: newHp }
            };

            // Bounce and State Change for Attacker
            attacker = {
              ...attacker,
              velocity: VectorMath.mul(attacker.velocity, -0.5), // Reverse and halve speed
              state: 'ORBITING',
              stateTimer: 0
            };
            resolvedEntities[i] = attacker;

            this.store.addLog(`[COMBAT] ${attacker.name} hit ${target.name} for ${finalDamage} DMG. [Hull: ${newHp}]`);
          }
        }
      }

      // 2. Enemy Retaliation (Basic)
      // Use dedicated retaliationTimer to avoid conflicts with AI state machine resets
      if (attacker.type === 'ENEMY' && attacker.retaliationTimer >= 1.5) {
        for (let j = 0; j < resolvedEntities.length; j++) {
          const player = resolvedEntities[j];
          if (player.type === 'PLAYER') {
            const dist = VectorMath.dist(attacker.position, player.position);

            // Check for overlap
            if (dist <= attacker.radius + player.radius) {
              const newHp = Math.max(0, player.stats.hp - 15);

              // Push player back slightly
              const pushDir = VectorMath.normalize(VectorMath.sub(player.position, attacker.position));
              const pushVel = VectorMath.mul(pushDir, 50);

              resolvedEntities[j] = {
                ...player,
                stats: { ...player.stats, hp: newHp },
                velocity: VectorMath.add(player.velocity, pushVel)
              };

              // Reset enemy retaliation cooldown
              attacker = { ...attacker, retaliationTimer: 0 };
              resolvedEntities[i] = attacker;

              this.store.addLog(`[COMBAT] ${attacker.name} retaliated against ${player.name} for 15 DMG. [Hull: ${newHp}]`);
              break; // One retaliation per cooldown cycle
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
