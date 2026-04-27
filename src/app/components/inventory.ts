import { Component, inject, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkshopService } from '../services/workshop.service';
import { Trigger, Action } from '../models/gambit.model';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-full flex flex-col">
      <h2 class="text-lg font-bold border-b border-green-800 pb-2 mb-4 uppercase tracking-widest text-green-500 flex justify-between items-center">
        <span>// SYSTEM_REFERENCE</span>
        <span class="text-[10px] text-green-900 font-mono">DB_V.2.0.4</span>
      </h2>

      <!-- Search Bar -->
      <div class="mb-4 relative group">
        <div class="absolute inset-y-0 left-3 flex items-center pointer-events-none text-green-700 group-focus-within:text-green-400 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7-0 11-14 0 7 7-0 0114 0z"></path></svg>
        </div>
        <input type="text" 
               [value]="searchQuery()" 
               (input)="onSearch($event)"
               placeholder="SEARCH_TACTICAL_LIBRARY..." 
               class="w-full bg-black/60 border border-green-900/30 text-green-400 py-2 pl-10 pr-4 text-xs font-mono focus:outline-none focus:border-green-500/50 transition-all placeholder:text-green-900 uppercase tracking-widest">
      </div>
      
      <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
        
        <!-- SELECTED ITEM VIEW -->
        @if (selectedItem(); as item) {
          <div class="animate-in fade-in slide-in-from-left-4 duration-300 pb-6 border-b border-green-900/20">
            <div class="flex items-center gap-3 mb-6">
              <div class="w-1.5 h-8 bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.6)]"></div>
              <h3 class="text-2xl font-black uppercase tracking-tighter"
                  [ngClass]="item.type === 'trigger' ? 'text-cyan-400' : 'text-orange-400'">
                {{ item.name }}
              </h3>
            </div>
            
            <div class="space-y-6">
              <section class="bg-white/5 p-4 border-l-2 border-green-500 shadow-inner">
                <h4 class="text-[9px] text-green-400 uppercase font-black mb-2 tracking-[0.2em]">FUNCTIONAL_LOGIC</h4>
                <p class="text-sm text-white leading-relaxed font-semibold">
                  {{ item.description || 'No diagnostic data available.' }}
                </p>
              </section>

              @if (item.type === 'action') {
                <div class="grid grid-cols-2 gap-2">
                   <div class="bg-orange-500/5 border border-orange-500/20 p-3 rounded">
                      <h4 class="text-[8px] text-orange-400 uppercase font-bold mb-1">REACTION TIME</h4>
                      <div class="text-xl font-mono font-black text-orange-400">{{ $any(item).baseLatency || 0 }}<span class="text-[10px] ml-0.5">MS</span></div>
                   </div>
                   <div class="bg-orange-500/5 border border-orange-500/20 p-3 rounded">
                      <h4 class="text-[8px] text-orange-400 uppercase font-bold mb-1">ENERGY</h4>
                      <div class="text-xl font-mono font-black text-orange-400">{{ $any(item).energyCost || 0 }}<span class="text-[10px] ml-0.5">EU</span></div>
                   </div>
                </div>
              }

              @if (item.type === 'trigger' && $any(item).requiredSensor) {
                <section class="bg-cyan-500/5 border border-cyan-500/20 p-3 rounded"
                         [ngClass]="{'border-red-500/40 bg-red-500/5': !hasRequiredSensor(item)}">
                   <h4 class="text-[8px] uppercase font-bold mb-2" [ngClass]="hasRequiredSensor(item) ? 'text-cyan-400' : 'text-red-400'">
                     {{ hasRequiredSensor(item) ? 'HARDWARE_REQ: OK' : 'HARDWARE_MISSING' }}
                   </h4>
                   <div class="text-sm font-mono font-black flex items-center gap-2" [ngClass]="hasRequiredSensor(item) ? 'text-cyan-400' : 'text-red-600'">
                      <span class="w-2 h-2 animate-pulse" [ngClass]="hasRequiredSensor(item) ? 'bg-cyan-400' : 'bg-red-600'"></span>
                      {{ $any(item).requiredSensor }}
                   </div>
                   @if (!hasRequiredSensor(item)) {
                     <p class="text-[9px] text-red-900 mt-2 font-bold uppercase tracking-tight italic">
                       ! ROUTINE UNUSABLE WITHOUT THIS COMPONENT !
                     </p>
                   }
                </section>
              }
              
              <button (click)="workshop.setInfoItem(null)" class="text-[9px] text-green-900 hover:text-green-500 uppercase font-bold transition-colors">
                [X] CLOSE_DIAGNOSTICS
              </button>
            </div>
          </div>
        }

        <!-- WIKI LIBRARY -->
        <div class="space-y-6 pt-2">
          <!-- TRIGGERS SECTION -->
          @if (filteredTriggers().length > 0) {
            <section>
              <h4 class="text-[10px] text-cyan-800 uppercase font-black mb-3 tracking-[0.3em] flex items-center gap-2">
                <span class="w-1 h-3 bg-cyan-900"></span> IF_CONDITIONS ({{ filteredTriggers().length }})
              </h4>
              <div class="grid grid-cols-1 gap-1">
                @for (trig of filteredTriggers(); track trig.id) {
                  <button (click)="workshop.setInfoItem(trig)"
                          [ngClass]="{
                            'bg-cyan-500/20 border-cyan-500/50 text-cyan-200': selectedItem()?.id === trig.id,
                            'bg-black/40 border-cyan-900/20 text-cyan-700 hover:border-cyan-500/30 hover:text-cyan-500': selectedItem()?.id !== trig.id && hasRequiredSensor(trig),
                            'opacity-40 border-red-900/20 text-red-900 grayscale': !hasRequiredSensor(trig)
                          }"
                          class="text-left px-3 py-2 border transition-all duration-200 text-xs font-bold uppercase tracking-wider flex justify-between items-center group relative overflow-hidden">
                    <div class="flex items-center gap-2">
                      @if (isTriggerUsed(trig)) {
                        <span class="text-[8px] bg-cyan-900/40 text-cyan-400 px-1 rounded border border-cyan-500/30">USED</span>
                      }
                      <span>{{ trig.name }}</span>
                    </div>
                    @if (!hasRequiredSensor(trig)) {
                      <span class="text-[8px] font-black text-red-900 flex items-center gap-1">
                        <svg class="w-2 h-2" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"></path></svg>
                        LOCKED
                      </span>
                    } @else {
                      <span class="text-[9px] opacity-0 group-hover:opacity-100 transition-opacity">READ_DATA >></span>
                    }
                  </button>
                }
              </div>
            </section>
          }

          <!-- ACTIONS SECTION -->
          @if (filteredActions().length > 0) {
            <section>
              <h4 class="text-[10px] text-orange-800 uppercase font-black mb-3 tracking-[0.3em] flex items-center gap-2">
                <span class="w-1 h-3 bg-orange-900"></span> THEN_EXECUTIONS ({{ filteredActions().length }})
              </h4>
              <div class="grid grid-cols-1 gap-1">
                @for (act of filteredActions(); track act.id) {
                  <button (click)="workshop.setInfoItem(act)"
                          [ngClass]="selectedItem()?.id === act.id ? 'bg-orange-500/20 border-orange-500/50 text-orange-200' : 'bg-black/40 border-orange-900/20 text-orange-700 hover:border-orange-500/30 hover:text-orange-500'"
                          class="text-left px-3 py-2 border transition-all duration-200 text-xs font-bold uppercase tracking-wider flex justify-between items-center group">
                    <span>{{ act.name }}</span>
                    <span class="text-[9px] opacity-0 group-hover:opacity-100 transition-opacity">READ_DATA >></span>
                  </button>
                }
              </div>
            </section>
          }

          @if (filteredTriggers().length === 0 && filteredActions().length === 0) {
            <div class="py-10 text-center opacity-30">
              <div class="text-3xl mb-2 text-red-500">?</div>
              <p class="text-[10px] uppercase tracking-widest text-red-400">No matching tactical data found.</p>
            </div>
          }
        </div>
      </div>

      <div class="mt-4 pt-4 border-t border-green-900/20 flex justify-between items-center text-[9px] text-green-900 font-mono">
        <span>ENCRYPTION_ACTIVE</span>
        <span class="animate-pulse">● SIGNAL_STABLE</span>
      </div>
    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0, 255, 0, 0.02); }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 255, 0, 0.1); border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0, 255, 0, 0.3); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Inventory {
  workshop = inject(WorkshopService);
  selectedItem = this.workshop.selectedInfoItem;
  
  searchQuery = signal('');

  filteredTriggers = computed(() => {
    const query = this.searchQuery().toLowerCase();
    return this.workshop.availableTriggers().filter(t => 
      t.name.toLowerCase().includes(query) || 
      t.description?.toLowerCase().includes(query)
    );
  });

  filteredActions = computed(() => {
    const query = this.searchQuery().toLowerCase();
    return this.workshop.availableActions().filter(a => 
      a.name.toLowerCase().includes(query) || 
      a.description?.toLowerCase().includes(query)
    );
  });

  onSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  hasRequiredSensor(trigger: Trigger): boolean {
    const sensor = this.workshop.activeShuriken().sensor;
    return !trigger.requiredSensor || sensor?.name === trigger.requiredSensor;
  }

  isTriggerUsed(trigger: Trigger): boolean {
    return this.workshop.routines().some(r => r.trigger?.id === trigger.id);
  }
}
