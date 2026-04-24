import { Component, input, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, CdkDropList, CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { WorkshopService } from '../services/workshop.service';
import { GambitRoutine, Trigger, Action } from '../models/gambit.model';

@Component({
  selector: 'app-gambit-slot',
  standalone: true,
  imports: [CommonModule, CdkDropList, CdkDrag, CdkDragHandle],
  template: `
    <div cdkDrag class="bg-gray-900 border border-gray-700 p-3 flex flex-col sm:flex-row items-center gap-3 relative group">
      
      <!-- Drag Handle -->
      <div cdkDragHandle class="cursor-grab text-gray-600 hover:text-gray-400 px-1 select-none active:cursor-grabbing">
        ≡
      </div>

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
          @if (!routine().trigger) {
            <span>Drop IF condition here</span>
          } @else {
            <span>{{ routine().trigger?.value }}</span>
          }
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
          @if (!routine().action) {
            <span>Drop THEN action here</span>
          } @else {
            <span>{{ routine().action?.value }}</span>
          }
      </div>
      
      <div class="flex flex-col gap-1 ml-2">
        <button class="text-gray-500 hover:text-yellow-500 text-xs font-bold" title="Clear Slot" (click)="clearSlot()">[C]</button>
        <button class="text-gray-500 hover:text-red-500 text-xs font-bold" title="Remove Routine" (click)="removeSlot()">[X]</button>
      </div>
    </div>
  `,
  styles: [``],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GambitSlot {
  routine = input.required<GambitRoutine>();
  index = input.required<number>();
  
  workshop = inject(WorkshopService);

  triggerPredicate(drag: CdkDrag<any>) {
    return drag.data && drag.data.type === 'trigger';
  }

  actionPredicate(drag: CdkDrag<any>) {
    return drag.data && drag.data.type === 'action';
  }

  onTriggerDrop(event: CdkDragDrop<any>) {
    if (event.item.data && event.item.data.type === 'trigger') {
      this.workshop.setTrigger(this.index(), event.item.data as Trigger);
    }
  }

  onActionDrop(event: CdkDragDrop<any>) {
    if (event.item.data && event.item.data.type === 'action') {
      this.workshop.setAction(this.index(), event.item.data as Action);
    }
  }

  clearSlot() {
    this.workshop.clearSlot(this.index());
  }

  removeSlot() {
    this.workshop.removeRoutine(this.index());
  }
}
