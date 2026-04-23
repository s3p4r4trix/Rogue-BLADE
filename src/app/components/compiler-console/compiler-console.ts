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

  get logs() {
    return this.workshop.systemLogs();
  }

  compileCode() {
    this.workshop.compileCode();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      this.consoleEl.nativeElement.scrollTop = this.consoleEl.nativeElement.scrollHeight;
    } catch(err) { }
  }
}
