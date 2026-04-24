import { Component, input, inject, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkshopService } from '../services/workshop.service';
import { GambitRoutine, Trigger, Action } from '../models/gambit.model';
import { CyberSelect, CyberOption } from './cyber-select';

@Component({
  selector: 'app-gambit-slot',
  standalone: true,
  imports: [CommonModule, CyberSelect],
  template: `
    <div class="bg-[#030014]/95 border p-3 flex flex-col sm:flex-row items-center gap-3 relative group neuro-panel transition-colors duration-500 overflow-visible hover:z-[1000] focus-within:z-[1000]"
         [ngClass]="isInvalid() ? 'border-red-600/50 bg-red-950/10' : 'border-green-900/50'">
      
      <!-- Movement Controls -->
      <div class="flex flex-col gap-1 pr-2 border-r border-green-900/30">
        <button (click)="moveUp()" 
                [disabled]="index() === 0"
                class="text-green-600 hover:text-green-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs">
          ▲
        </button>
        <div class="text-green-500 font-bold text-[10px] text-center uppercase tracking-tighter">P{{ routine().priority }}</div>
        <button (click)="moveDown()" 
                [disabled]="isLast()"
                class="text-green-600 hover:text-green-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs">
          ▼
        </button>
      </div>
      
      <!-- Trigger Selection -->
      <div class="flex-1 flex flex-col gap-1 w-full">
        <div class="flex justify-between items-center px-1">
          <label class="text-[10px] uppercase font-bold tracking-widest"
                 [ngClass]="isInvalid() ? 'text-red-500' : 'text-cyan-600'">IF (Trigger)</label>
          @if (routine().trigger) {
            <button (click)="showTriggerInfo()" class="text-[10px] text-cyan-500 hover:text-cyan-300 underline uppercase cursor-pointer">ⓘ Info</button>
          }
        </div>
        <app-cyber-select 
          [value]="routine().trigger?.value"
          [options]="triggerOptions"
          (valueChange)="onTriggerChange($event)"
          placeholder="-- Select Trigger --"
          class="block w-full">
        </app-cyber-select>
      </div>
      
      <div class="text-green-500 font-bold hidden sm:block" [ngClass]="{'text-red-500': isInvalid()}">➔</div>
      
      <!-- Action Selection -->
      <div class="flex-1 flex flex-col gap-1 w-full">
        <div class="flex justify-between items-center px-1">
          <label class="text-[10px] uppercase font-bold tracking-widest"
                 [ngClass]="isInvalid() ? 'text-red-500' : 'text-orange-600'">THEN (Action)</label>
          @if (routine().action) {
            <button (click)="showActionInfo()" class="text-[10px] text-orange-500 hover:text-orange-300 underline uppercase cursor-pointer">ⓘ Info</button>
          }
        </div>
        <app-cyber-select 
          [value]="routine().action?.value"
          [options]="actionOptions"
          (valueChange)="onActionChange($event)"
          placeholder="-- Select Action --"
          class="block w-full">
        </app-cyber-select>
      </div>
      
      <!-- Slot Actions -->
      <div class="flex flex-row sm:flex-col gap-2 ml-2 sm:border-l sm:border-green-900/30 sm:pl-3 min-w-[60px] items-center">
        @if (isInvalid()) {
          <div class="text-[8px] bg-red-600 text-white font-bold px-1 py-0.5 rounded animate-pulse mb-1 whitespace-nowrap">
            [!] HW FAIL
          </div>
        }
        <div class="flex sm:flex-col gap-2">
          <button class="text-gray-500 hover:text-yellow-500 text-xs font-bold transition-colors cursor-pointer" title="Clear Slot" (click)="clearSlot()">[CLR]</button>
          <button class="text-gray-500 hover:text-red-500 text-xs font-bold transition-colors cursor-pointer" title="Remove Routine" (click)="removeSlot()">[DEL]</button>
        </div>
      </div>
    </div>
  `,
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GambitSlot {
  routine = input.required<GambitRoutine>();
  index = input.required<number>();
  
  workshop = inject(WorkshopService);

  isInvalid = computed(() => !this.workshop.isRoutineValid(this.routine()));

  get triggerOptions(): CyberOption[] {
    return this.workshop.unlockedTriggers().map(t => ({
      value: t.value,
      label: t.name,
      disabled: t.disabled
    }));
  }

  get actionOptions(): CyberOption[] {
    return this.workshop.unlockedActions().map(a => ({
      value: a.value,
      label: a.name
    }));
  }

  isLast() {
    return this.index() === this.workshop.routines().length - 1;
  }

  onTriggerChange(value: string | undefined) {
    if (!value) return;
    const trigger = this.workshop.availableTriggers().find(t => t.value === value);
    if (trigger) this.workshop.setTrigger(this.index(), trigger);
  }

  onActionChange(value: string | undefined) {
    if (!value) return;
    const action = this.workshop.availableActions().find(a => a.value === value);
    if (action) this.workshop.setAction(this.index(), action);
  }

  moveUp() {
    this.workshop.moveRoutineUp(this.index());
  }

  moveDown() {
    this.workshop.moveRoutineDown(this.index());
  }

  showTriggerInfo() {
    this.workshop.setInfoItem(this.routine().trigger);
  }

  showActionInfo() {
    this.workshop.setInfoItem(this.routine().action);
  }

  clearSlot() {
    this.workshop.clearSlot(this.index());
  }

  removeSlot() {
    this.workshop.removeRoutine(this.index());
  }
}
