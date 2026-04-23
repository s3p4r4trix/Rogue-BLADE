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

  // Predicate: Only allow dropping if it's a trigger
  triggerPredicate(drag: CdkDrag<any>) {
    return drag.data && drag.data.type === 'trigger';
  }

  // Predicate: Only allow dropping if it's an action
  actionPredicate(drag: CdkDrag<any>) {
    return drag.data && drag.data.type === 'action';
  }

  onTriggerDrop(event: CdkDragDrop<any>) {
    if (event.item.data && event.item.data.type === 'trigger') {
      this.workshop.setTrigger(this.routine.priority, event.item.data as Trigger);
    }
  }

  onActionDrop(event: CdkDragDrop<any>) {
    if (event.item.data && event.item.data.type === 'action') {
      this.workshop.setAction(this.routine.priority, event.item.data as Action);
    }
  }

  clearSlot() {
    this.workshop.clearSlot(this.routine.priority);
  }
}
