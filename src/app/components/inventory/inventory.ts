import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { WorkshopService } from '../../services/workshop.service';

@Component({
  selector: 'app-inventory',
  imports: [CommonModule, CdkDrag, CdkDropList],
  templateUrl: './inventory.html',
  styleUrl: './inventory.scss'
})
export class Inventory {
  workshop = inject(WorkshopService);

  // Provide available lists via the service
  get triggers() { return this.workshop.availableTriggers(); }
  get actions() { return this.workshop.availableActions(); }

  // This predicate prevents dropping back into the inventory from slots
  noReturnPredicate() {
    return false;
  }
}
