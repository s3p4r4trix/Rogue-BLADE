import { Component, inject, ElementRef, viewChild, AfterViewChecked, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkshopService } from '../services/workshop.service';

@Component({
  selector: 'app-compiler-console',
  imports: [CommonModule],
  template: `
    <div class="mt-4 pt-4 border-t border-green-800">
      <div class="flex justify-between items-end mb-2">
          <h3 class="text-sm text-green-700">>> SYSTEM_LOG</h3>
          <button (click)="compileCode()" 
                  [disabled]="!workshop.isSystemValid()"
                  class="px-6 py-2 font-bold transition-colors border-2 cursor-pointer relative overflow-hidden"
                  [ngClass]="{
                    'bg-green-600 text-black border-green-400 shadow-[0_0_10px_rgba(0,255,0,0.5)] hover:bg-green-500': workshop.isSystemValid(),
                    'bg-red-900/30 text-red-600 border-red-900 cursor-not-allowed opacity-50': !workshop.isSystemValid()
                  }">
              <div class="border-anim"></div><div class="border-anim-v"></div>
              <span class="relative z-10">{{ workshop.isSystemValid() ? 'UPLOAD TO SHURIKEN' : 'HARDWARE ERROR [FIX REQ]' }}</span>
          </button>
      </div>
      <div #consoleEl class="h-24 bg-[#0a0a0a] border border-green-900 p-2 text-xs overflow-y-auto font-mono flex flex-col">
          @for (log of logs; track $index) {
            <div [innerHTML]="log"></div>
          }
      </div>
    </div>
  `,
  styles: [``],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CompilerConsole implements AfterViewChecked {
  workshop = inject(WorkshopService);
  
  private consoleEl = viewChild.required<ElementRef>('consoleEl');

  /**
   * Gets the live stream of system logs from the WorkshopService.
   */
  get logs() {
    return this.workshop.systemLogs();
  }

  /**
   * Triggers the code compilation and validation process.
   */
  compileCode() {
    this.workshop.compileCode();
  }

  /**
   * Lifecycle hook that fires after the view has been checked.
   * We use this to auto-scroll the console to the newest log entry.
   */
  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      const el = this.consoleEl().nativeElement;
      el.scrollTop = el.scrollHeight;
    } catch(err) { }
  }
}
