import { Component, ChangeDetectionStrategy, input, model, signal, computed, HostListener, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CyberOption {
  value: string;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-cyber-select',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full font-mono text-sm" [class.theme-neuromancer-select]="true">
      <!-- Select Button -->
      <button type="button" 
              (click)="toggle()" 
              class="w-full flex items-center justify-between px-3 py-2 text-left transition-all duration-300 neuro-border-draw"
              [ngClass]="{
                'bg-[#030014]/90 border border-[#a855f7]/60 text-[#e9d5ff] shadow-[0_0_8px_rgba(168,85,247,0.4)]': isOpen(),
                'bg-black/80 border border-gray-800 text-gray-400 hover:border-[#a855f7]/40 hover:text-[#e9d5ff]': !isOpen()
              }">
        <div class="border-anim"></div><div class="border-anim-v"></div>
        <span class="truncate block pr-4 relative z-10">{{ selectedLabel() || 'Select Option...' }}</span>
        <span class="text-[#a855f7] transition-transform duration-300 flex-shrink-0 relative z-10" 
              [style.transform]="isOpen() ? 'rotate(180deg)' : 'rotate(0)'">
          ▼
        </span>
      </button>

      <!-- Dropdown Menu -->
      @if (isOpen()) {
        <div class="absolute z-[200] w-full mt-1 bg-[#030014]/95 border border-[#a855f7]/50 shadow-[0_4px_20px_rgba(168,85,247,0.3)] neuro-menu-popout max-h-60 overflow-y-auto backdrop-blur-md">
          @for (opt of options(); track opt.value) {
            <button type="button" 
                    (click)="!opt.disabled && selectOption(opt.value)"
                    [disabled]="opt.disabled"
                    class="w-full text-left px-3 py-2 transition-colors border-l-2"
                    [ngClass]="{
                      'border-[#a855f7] bg-[#a855f7]/20 text-white': opt.value === value(),
                      'border-transparent text-gray-400 hover:bg-[#a855f7]/10 hover:text-[#e9d5ff] hover:border-[#a855f7]/50': opt.value !== value() && !opt.disabled,
                      'opacity-30 cursor-not-allowed': opt.disabled
                    }">
              {{ opt.label }}
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    /* Scrollbar for the dropdown menu */
    .neuro-menu-popout::-webkit-scrollbar { width: 6px; }
    .neuro-menu-popout::-webkit-scrollbar-track { background: rgba(0,0,0,0.5); }
    .neuro-menu-popout::-webkit-scrollbar-thumb { background: rgba(168,85,247,0.6); border-radius: 3px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CyberSelect {
  private el = inject(ElementRef);

  options = input<CyberOption[]>([]);
  value = model<string | undefined>();

  isOpen = signal(false);

  selectedLabel = computed(() => {
    const currentVal = this.value();
    const opt = this.options().find(o => o.value === currentVal);
    return opt ? opt.label : '';
  });

  toggle() {
    this.isOpen.update(v => !v);
  }

  selectOption(val: string) {
    this.value.set(val);
    this.isOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.el.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }
}
