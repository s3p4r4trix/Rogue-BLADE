import { Injectable, inject } from '@angular/core';
import { CombatStore } from './combat-store';
import { SensorService } from './sensor.service';
import { RoutineService } from './routine.service';
import { BaseAIService } from './base-ai.service';
import { SteeringService } from './steering.service';
import { CombatEntity, Vector2D, CombatState, BehaviorContext } from '../models/combat-model';

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
    // Update store with latest deltaTime
    this.store.setDeltaTime(deltaTime);

    const state: CombatState = {
      entities: this.store.entities(),
      obstacles: this.store.obstacles(),
      deltaTime: deltaTime,
      timeElapsed: this.store.timeElapsed(),
      isFinished: this.store.isFinished(),
      success: this.store.success(),
      logs: this.store.logs(),
      isPaused: this.store.isPaused(),
      activePlayerId: this.store.activePlayerId(),
    };

    if (state.isPaused) return;

    // Process every entity in the store
    const updatedEntities = state.entities.map(entity => {
      return this.processEntity(entity, state);
    });

    // Batch update state
    this.store.setEntities(updatedEntities);
  }

  /**
   * The Execution Pipeline for a single entity per tick.
   * Following the strict sequence: Perception -> Decision (Override) -> Decision (Default) -> Execution -> Physics.
   */
  private processEntity(entity: CombatEntity, state: CombatState): CombatEntity {
    // 1. Perception: Gather environmental data
    const nearbyEnemies = this.sensorService.getEnemiesInRadar(entity, state.entities);
    
    // Update target if needed (simplified logic for demo)
    const currentTarget = nearbyEnemies.length > 0 ? nearbyEnemies[0] : null;

    // Construct the full behavior context
    const context: BehaviorContext = {
      ...state,
      nearbyEnemies,
      currentTarget
    };

    // Log engagement events (Basic proximity check for telemetry feedback)
    if (currentTarget) {
      const dx = entity.position.x - currentTarget.position.x;
      const dy = entity.position.y - currentTarget.position.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if (dist < entity.radius + currentTarget.radius + 20) {
        // Simple throttle using deltaTime/timeElapsed or a probability check
        if (Math.random() < 0.01) { 
           this.store.addLog(`TACTICAL: ${entity.name} engaging ${currentTarget.name}`);
        }
      }
    }

    // 2. Decision (Override): RoutineService checks Gambit IF/THEN slots
    const overrideAction = this.routineService.evaluateGambits(entity, context);

    let desiredVelocity: Vector2D;

    if (overrideAction) {
      // If a Gambit triggers, it determines the behavior
      // TODO: Translate action to desired velocity (e.g., 'KINETIC_RAM' -> dash towards target)
      desiredVelocity = { x: 0, y: 0 }; 
    } else {
      // 3. Decision (Default): BaseAIService determines the target vector based on AI state
      desiredVelocity = this.baseAIService.calculateDefaultBehavior(entity, context);
    }

    // 4. Execution & Evasion: SteeringService calculates safe movement (Feeler system + Wall-sliding)
    const finalVelocity = this.steeringService.calculateFinalVelocity(entity, desiredVelocity, state.obstacles);

    // 5. Physics & State Update: Update position based on finalVelocity * deltaTime
    const newPosition: Vector2D = {
      x: entity.position.x + finalVelocity.x * state.deltaTime,
      y: entity.position.y + finalVelocity.y * state.deltaTime
    };

    // Return the updated entity object to be patched into the store
    return {
      ...entity,
      position: newPosition,
      velocity: finalVelocity,
      // Rotation follows velocity direction if moving
      rotation: (finalVelocity.x !== 0 || finalVelocity.y !== 0) 
        ? Math.atan2(finalVelocity.y, finalVelocity.x) 
        : entity.rotation
    };
  }
}
