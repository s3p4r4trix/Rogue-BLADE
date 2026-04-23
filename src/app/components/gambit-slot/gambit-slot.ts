import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, CdkDropList, CdkDrag } from '@angular/cdk/drag-drop';
import { WorkshopService } from '../../services/workshop.service';
import { GambitRoutine, Trigger, Action } from '../../models/gambit.model';

@Component({
  selector: 'app-gambit-slot',
  imports: [CommonModule, CdkDropList],
  templateUrl: './gambit-slot.html',
  styleUrl: './gambit-slot.scss'
})
export class GambitSlot {
  @Input({ required: true }) routine!: GambitRoutine;
  
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
      this.workshop.setTrigger(this.routine.priority, event.item.data as Trigger);
    }
  }

  /**
   * Handles the drop event for the THEN action.
   * Updates the global WorkshopService state.
   */
  onActionDrop(event: CdkDragDrop<any>) {
    if (event.item.data && event.item.data.type === 'action') {
      this.workshop.setAction(this.routine.priority, event.item.data as Action);
    }
  }

  /**
   * Clears the current slot via the WorkshopService.
   */
  clearSlot() {
    this.workshop.clearSlot(this.routine.priority);
  }
}
