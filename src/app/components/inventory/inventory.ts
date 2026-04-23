import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { WorkshopService } from '../../services/workshop.service';

@Component({
  selector: 'app-inventory',
  imports: [CommonModule, CdkDrag, CdkDropList],
  templateUrl: './inventory.html',
  styleUrl: './inventory.scss',
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
