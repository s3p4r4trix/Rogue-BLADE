import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkshopService } from '../services/workshop.service';
import { Trigger, Action } from '../models/gambit.model';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-full flex flex-col">
      <h2 class="text-lg font-bold border-b border-green-800 pb-2 mb-4 uppercase tracking-widest text-green-500">
        // SYSTEM_REFERENCE
      </h2>
      
      <div class="flex-1 overflow-y-auto pr-2">
        @if (selectedItem(); as item) {
          <div class="animate-in fade-in slide-in-from-left-4 duration-300">
            <div class="flex items-center gap-3 mb-8">
              <div class="w-2 h-10 bg-green-400 shadow-[0_0_15px_rgba(74,222,128,0.8)]"></div>
              <h3 class="text-3xl font-black uppercase tracking-tighter"
                  [ngClass]="item.type === 'trigger' ? 'text-cyan-400' : 'text-orange-400'">
                {{ item.name }}
              </h3>
            </div>
            
            <div class="space-y-10">
              <!-- DESCRIPTION SECTION -->
              <section class="bg-white/5 p-5 border-l-4 border-green-500 shadow-inner">
                <h4 class="text-[11px] text-green-400 uppercase font-black mb-3 tracking-[0.2em]">FUNCTIONAL_LOGIC</h4>
                <p class="text-lg text-white leading-relaxed font-semibold drop-shadow-sm">
                  {{ item.description || 'No diagnostic data available.' }}
                </p>
              </section>

              <!-- LORE SECTION -->
              <section class="px-5 border-l border-green-900/30">
                <h4 class="text-[11px] text-green-700 uppercase font-bold mb-3 tracking-[0.2em]">TACTICAL_ARCHIVES</h4>
                <div class="text-sm text-gray-300 leading-relaxed italic opacity-90">
                  <span class="text-green-900 text-lg font-serif">"</span>
                  {{ item.lore || 'Standard corporate-issue routine.' }}
                  <span class="text-green-900 text-lg font-serif">"</span>
                </div>
              </section>

              <!-- PERFORMANCE DATA -->
              @if (item.type === 'action') {
                <section class="bg-orange-500/10 border-2 border-orange-500/30 p-5 rounded-md shadow-lg">
                   <h4 class="text-[11px] text-orange-400 uppercase font-black mb-4 tracking-[0.2em]">PERFORMANCE_METRICS</h4>
                   <div class="flex justify-between items-center">
                     <span class="text-orange-100 font-black text-base uppercase">EXECUTION_LATENCY</span>
                     <div class="flex items-center gap-2">
                        <span class="text-3xl font-mono font-black text-orange-400">{{ $any(item).baseLatency }}</span>
                        <span class="text-orange-900 font-bold text-xs">ms</span>
                     </div>
                   </div>
                   <div class="mt-4 h-1 w-full bg-orange-900/30 overflow-hidden">
                      <div class="h-full bg-orange-500 w-1/3 animate-pulse"></div>
                   </div>
                </section>
              }

              <!-- HARDWARE DATA -->
              @if (item.type === 'trigger' && $any(item).requiredSensor) {
                <section class="bg-cyan-500/10 border-2 border-cyan-500/30 p-5 rounded-md shadow-lg">
                   <h4 class="text-[11px] text-cyan-400 uppercase font-black mb-4 tracking-[0.2em]">HARDWARE_REQUIREMENTS</h4>
                   <div class="flex justify-between items-center">
                     <span class="text-cyan-100 font-black text-base uppercase">REQUIRED_SENSOR</span>
                     <span class="text-xl font-mono font-black text-cyan-400 bg-black/60 px-3 py-1 border border-cyan-500/50">
                        {{ $any(item).requiredSensor }}
                     </span>
                   </div>
                </section>
              }
            </div>
          </div>
        } @else {
          <div class="h-full flex flex-col items-center justify-center text-center opacity-20 px-8">
            <div class="text-6xl mb-8 text-green-500 animate-pulse drop-shadow-[0_0_20px_rgba(34,197,94,0.4)]">ⓘ</div>
            <p class="text-sm uppercase tracking-[0.4em] font-black leading-loose text-green-400">
              SYSTEM_IDLE<br>
              <span class="text-[10px] opacity-50 font-normal">Select component to decrypt data</span>
            </p>
          </div>
        }
      </div>

      <div class="mt-6 pt-4 border-t border-green-900/20 flex justify-between items-center text-[11px] text-green-900 font-mono font-bold">
        <span>V.2.0.4-LOCKED</span>
        <span>ROGUE_OS_REF</span>
      </div>
    </div>
  `,
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Inventory {
  workshop = inject(WorkshopService);
  selectedItem = this.workshop.selectedInfoItem;
}
