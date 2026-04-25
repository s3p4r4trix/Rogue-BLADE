import { Component, input, inject, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkshopService } from '../services/workshop.service';
import { GambitRoutine, Trigger, Action } from '../models/gambit.model';

@Component({
  selector: 'app-gambit-slot',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-[#030014]/95 border p-3 flex flex-col sm:flex-row items-center gap-3 group neuro-panel transition-all duration-500 overflow-visible"
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
        <select class="cyber-native-select"
                [value]="routine().trigger?.value || ''"
                (change)="onNativeTriggerChange($event)">
          <option value="" disabled>-- Select Trigger --</option>
          @for (opt of triggerOptions; track opt.value) {
            <option [value]="opt.value" [disabled]="opt.disabled">{{ opt.label }}</option>
          }
        </select>
      </div>
      
      <div class="text-green-500 font-bold hidden sm:block" [ngClass]="{'text-red-500': isInvalid()}">➔</div>
      
      <!-- Action Selection -->
      <div class="flex-1 flex flex-col gap-1 w-full">
        <div class="flex justify-between items-center px-1">
          <label class="text-xs uppercase font-bold tracking-widest"
                 [ngClass]="isInvalid() ? 'text-red-500' : 'text-orange-600'">THEN (Action)</label>
          @if (routine().action) {
            <button (click)="showActionInfo()" class="text-[10px] text-orange-500 hover:text-orange-300 underline uppercase cursor-pointer">ⓘ Info</button>
          }
        </div>
        <select class="cyber-native-select"
                [value]="routine().action?.value || ''"
                (change)="onNativeActionChange($event)">
          <option value="" disabled>-- Select Action --</option>
          @for (opt of actionOptions; track opt.value) {
            <option [value]="opt.value">{{ opt.label }}</option>
          }
        </select>
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
  styles: [`
    .cyber-native-select {
      @apply w-full bg-black border border-green-900/50 text-green-400 px-2 py-1.5 outline-none appearance-none cursor-pointer relative z-10 transition-all duration-300 text-sm font-bold;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2322c55e'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 0.5rem center;
      background-size: 0.8rem;
    }
    .cyber-native-select:hover { @apply border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.1)]; }
    .cyber-native-select:focus { @apply border-green-400 shadow-[0_0_15px_rgba(74,222,128,0.2)]; }
    .cyber-native-select option { @apply bg-[#030014] text-green-300; }
  `],
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

  onNativeTriggerChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    if (!value) return;
    const trigger = this.workshop.availableTriggers().find(t => t.value === value);
    if (trigger) this.workshop.setTrigger(this.index(), trigger);
  }

  onNativeActionChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
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
