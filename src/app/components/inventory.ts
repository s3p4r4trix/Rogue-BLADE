import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { WorkshopService } from '../services/workshop.service';

@Component({
  selector: 'app-inventory',
  imports: [CommonModule, CdkDrag, CdkDropList],
  template: `
    <div class="h-full flex flex-col">
      <h2 class="text-lg font-bold border-b border-green-800 pb-2 mb-4">// COMPONENT INVENTORY</h2>
      
      <div class="overflow-y-auto flex-1 pr-2">
          <!-- WENN (Triggers) -->
          <div class="mb-6">
              <h3 class="text-cyan-500 text-sm mb-3 uppercase tracking-wide border-l-2 border-cyan-500 pl-2">Triggers (IF)</h3>
              <div cdkDropList
                  [cdkDropListData]="triggers"
                  [cdkDropListEnterPredicate]="noReturnPredicate"
                  cdkDropListSortingDisabled
                  id="inventory-triggers"
                  class="flex flex-col gap-2">
                  @for (trigger of triggers; track trigger.name) {
                    <div cdkDrag
                        [cdkDragData]="trigger"
                        [cdkDragDisabled]="trigger.disabled || false"
                        class="draggable bg-cyan-900/30 border border-cyan-500 text-cyan-300 p-2 hover:bg-cyan-900/50 transition-colors"
                        [ngClass]="{'opacity-50 cursor-not-allowed': trigger.disabled}">
                        {{ trigger.name }}
                        @if (trigger.disabled) {
                          <span class="text-xs text-red-500 ml-1">(Missing: {{trigger.requiredSensor}})</span>
                        }
                    </div>
                  }
              </div>
          </div>

          <!-- DANN (Actions) -->
          <div>
              <h3 class="text-orange-500 text-sm mb-3 uppercase tracking-wide border-l-2 border-orange-500 pl-2">Actions (THEN)</h3>
              <div cdkDropList
                  [cdkDropListData]="actions"
                  [cdkDropListEnterPredicate]="noReturnPredicate"
                  cdkDropListSortingDisabled
                  id="inventory-actions"
                  class="flex flex-col gap-2">
                  @for (action of actions; track action.name) {
                    <div cdkDrag
                        [cdkDragData]="action"
                        class="draggable bg-orange-900/30 border border-orange-500 text-orange-300 p-2 hover:bg-orange-900/50 transition-colors">
                        {{ action.name }}
                    </div>
                  }
              </div>
          </div>
      </div>
    </div>
  `,
  styles: [``],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Inventory {
  workshop = inject(WorkshopService);

  /**
   * Getter for available triggers from the central WorkshopService state.
   */
  get triggers() { return this.workshop.availableTriggers(); }
  
  /**
   * Getter for available actions from the central WorkshopService state.
   */
  get actions() { return this.workshop.availableActions(); }

  /**
   * This predicate disables dropping items BACK into the inventory from the routine slots.
   * Ensures a unidirectional flow (Inventory -> Slots). Items are "copied" rather than moved,
   * or replaced when a slot is cleared.
   */
  noReturnPredicate() {
    return false;
  }
}
