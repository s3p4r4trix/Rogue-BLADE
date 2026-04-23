import { Component, inject, ElementRef, viewChild, AfterViewChecked, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkshopService } from '../../services/workshop.service';

@Component({
  selector: 'app-compiler-console',
  imports: [CommonModule],
  templateUrl: './compiler-console.html',
  styleUrl: './compiler-console.scss',
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
