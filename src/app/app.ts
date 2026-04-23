import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDropListGroup } from '@angular/cdk/drag-drop';
import { Inventory } from './components/inventory/inventory';
import { GambitSlot } from './components/gambit-slot/gambit-slot';
import { CompilerConsole } from './components/compiler-console/compiler-console';
import { WorkshopService } from './services/workshop.service';

/**
 * The root component of the application.
 * Composes the layout by instantiating the Inventory, Gambit Slots, and Compiler Console.
 */
@Component({
  selector: 'app-root',
  imports: [CommonModule, CdkDropListGroup, Inventory, GambitSlot, CompilerConsole],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
  workshop = inject(WorkshopService);
  
  get routines() {
    return this.workshop.routines();
  }

  get fallbackAction() {
    return this.workshop.fallbackAction();
  }
}
