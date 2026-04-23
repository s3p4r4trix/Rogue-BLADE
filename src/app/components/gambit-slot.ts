import { Component, input, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, CdkDropList, CdkDrag } from '@angular/cdk/drag-drop';
import { WorkshopService } from '../services/workshop.service';
import { GambitRoutine, Trigger, Action } from '../models/gambit.model';

@Component({
  selector: 'app-gambit-slot',
  imports: [CommonModule, CdkDropList],
  template: `
    <div class="bg-gray-900 border border-gray-700 p-3 flex flex-col sm:flex-row items-center gap-3">
      <div class="text-gray-500 font-bold w-16 text-center">PRIO {{ routine().priority }}</div>
      
      <!-- Trigger Drop Zone -->
      <div cdkDropList
          [cdkDropListEnterPredicate]="triggerPredicate"
          (cdkDropListDropped)="onTriggerDrop($event)"
          class="flex-1 h-12 flex items-center justify-center w-full transition-colors dropzone"
          [ngClass]="{
              'border-2 border-dashed border-cyan-800 text-cyan-800': !routine().trigger,
              'bg-cyan-900/40 border border-solid border-cyan-500 text-cyan-300': routine().trigger
          }">
          <span *ngIf="!routine().trigger">Drop IF condition here</span>
          <span *ngIf="routine().trigger">{{ routine().trigger?.value }}</span>
      </div>
      
      <div class="text-green-500 font-bold w-8 text-center">-></div>
      
      <!-- Action Drop Zone -->
      <div cdkDropList
          [cdkDropListEnterPredicate]="actionPredicate"
          (cdkDropListDropped)="onActionDrop($event)"
          class="flex-1 h-12 flex items-center justify-center w-full transition-colors dropzone"
          [ngClass]="{
              'border-2 border-dashed border-orange-800 text-orange-800': !routine().action,
              'bg-orange-900/40 border border-solid border-orange-500 text-orange-300': routine().action
          }">
          <span *ngIf="!routine().action">Drop THEN action here</span>
          <span *ngIf="routine().action">{{ routine().action?.value }}</span>
      </div>
      
      <button class="text-red-500 hover:text-red-400 font-bold px-2" (click)="clearSlot()">[X]</button>
    </div>
  `,
  styles: [``],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GambitSlot {
  routine = input.required<GambitRoutine>();
  
  workshop = inject(WorkshopService);

  /**
   * Predicate for the IF drop zone.
   * Ensures that only items with data.type === 'trigger' can be dropped here.
   */
  triggerPredicate(drag: CdkDrag<any>) {
    return drag.data && drag.data.type === 'trigger';
  }

  /**
   * Predicate for the THEN drop zone.
   * Ensures that only items with data.type === 'action' can be dropped here.
   */
  actionPredicate(drag: CdkDrag<any>) {
    return drag.data && drag.data.type === 'action';
  }

  /**
   * Handles the drop event for the IF condition.
   * Updates the global WorkshopService state.
   */
  onTriggerDrop(event: CdkDragDrop<any>) {
    if (event.item.data && event.item.data.type === 'trigger') {
      this.workshop.setTrigger(this.routine().priority, event.item.data as Trigger);
    }
  }

  /**
   * Handles the drop event for the THEN action.
   * Updates the global WorkshopService state.
   */
  onActionDrop(event: CdkDragDrop<any>) {
    if (event.item.data && event.item.data.type === 'action') {
      this.workshop.setAction(this.routine().priority, event.item.data as Action);
    }
  }

  /**
   * Clears the current slot via the WorkshopService.
   */
  clearSlot() {
    this.workshop.clearSlot(this.routine().priority);
  }
}
