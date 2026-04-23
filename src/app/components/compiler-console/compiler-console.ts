import { Component, inject, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkshopService } from '../../services/workshop.service';

@Component({
  selector: 'app-compiler-console',
  imports: [CommonModule],
  templateUrl: './compiler-console.html',
  styleUrl: './compiler-console.scss'
})
export class CompilerConsole implements AfterViewChecked {
  workshop = inject(WorkshopService);
  
  @ViewChild('consoleEl') private consoleEl!: ElementRef;

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
      this.consoleEl.nativeElement.scrollTop = this.consoleEl.nativeElement.scrollHeight;
    } catch(err) { }
  }
}
