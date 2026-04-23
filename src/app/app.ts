import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Inventory } from './components/inventory/inventory';
import { GambitSlot } from './components/gambit-slot/gambit-slot';
import { CompilerConsole } from './components/compiler-console/compiler-console';
import { WorkshopService } from './services/workshop.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, Inventory, GambitSlot, CompilerConsole],
  templateUrl: './app.html',
  styleUrl: './app.scss',
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
