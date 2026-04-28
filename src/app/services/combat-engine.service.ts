import { Injectable, inject } from '@angular/core';
import { CombatStore } from './combat-store';
import { SensorService } from './sensor.service';
import { RoutineService } from './routine.service';
import { BaseAIService } from './base-ai.service';
import { SteeringService } from './steering.service';
import { CombatEntity, Vector2D, BehaviorContext } from '../models/combat-model';

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
      // We handle the Action | null to Vector2D conversion if needed, 
      // but following the pipeline description where B returns desiredVelocity or null.
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

      // Return immutable copy of the entity with updated kinematics
      return {
        ...entity,
        position: { x: newX, y: newY },
        velocity: finalVelocity,
        rotation
      };
    });

    // Step F: State Patching
    // Trigger reactive UI update with the new entities array
    this.store.setEntities(updatedEntities);
  }
}
