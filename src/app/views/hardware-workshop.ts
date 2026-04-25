import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { WorkshopService, HARDWARE_INVENTORY } from '../services/workshop.service';
import { CommonModule } from '@angular/common';
import { HardwareComponent, Shuriken } from '../models/hardware.model';
import { CyberSelect, CyberOption } from '../components/cyber-select';

@Component({
  selector: 'app-hardware-workshop',
  standalone: true,
  imports: [CommonModule, RouterLink, CyberSelect],
  template: `
    <div class="min-h-screen text-blue-300 p-4 md:p-8 font-mono relative">
      <header class="mb-6 flex justify-between items-end border-b-2 border-blue-800 pb-2">
        <div class="flex items-center gap-4">
          <a routerLink="/hub" class="text-blue-500 border border-blue-800 hover:bg-blue-900/50 px-3 py-1 font-mono text-sm uppercase transition-colors">
              < Back to Hub
          </a>
          <div>
            <h1 class="text-2xl font-bold tracking-widest text-blue-400 drop-shadow-[0_0_5px_rgba(96,165,250,0.5)]">
                HARDWARE // TUNING
            </h1>
            <p class="text-sm text-blue-700">NPC: OFFLINE</p>
          </div>
        </div>
      </header>
      
      <div class="flex flex-col md:flex-row gap-6 h-[75vh]">
        <!-- Sidebar -->
        <div class="w-full md:w-1/3 lg:w-1/4 flex flex-col gap-6 z-10 relative">
           
           <!-- Shuriken List -->
           <div class="bg-[#030014]/95 border border-blue-900/50 flex flex-col flex-1 neuro-panel min-h-0">
               <div class="bg-blue-900/30 p-3 border-b border-blue-800 shrink-0">
                   <h2 class="text-blue-400 font-bold uppercase tracking-wider">// SWARM FLEET</h2>
               </div>
               <div class="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
                 @for (s of shurikens(); track s.id) {
                   <button class="text-left p-3 border transition-colors flex flex-col gap-1 neuro-border-draw"
                           [ngClass]="{
                              'bg-blue-900/40 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]': activeShuriken().id === s.id,
                              'bg-black border-blue-900 hover:border-blue-700': activeShuriken().id !== s.id
                           }"
                           (click)="selectShuriken(s.id)">
                       <div class="border-anim"></div>
                       <div class="border-anim-v"></div>
                       <div class="font-bold text-blue-300 relative z-10">{{ s.name }}</div>
                       <div class="text-xs text-blue-600 relative z-10">Cap: {{ s.processor?.routineCapacity }} | Hull: {{ s.hull?.name }}</div>
                   </button>
                 }
               </div>
           </div>

           <!-- NPC Recruits -->
           <div class="bg-[#030014]/95 border border-blue-900/50 flex flex-col shrink-0 neuro-panel">
               <div class="bg-blue-900/30 p-3 border-b border-blue-800 shrink-0">
                   <h2 class="text-blue-400 font-bold uppercase tracking-wider">// CONTACTS</h2>
               </div>
               <div class="p-2 flex flex-col gap-2">
                  <div class="p-3 border border-blue-900/50 bg-black flex justify-between items-center transition-colors hover:border-blue-700">
                     <span class="text-blue-300 font-bold">RIPPERDOC_01</span>
                     <span class="text-red-500 text-xs font-bold uppercase">Offline</span>
                  </div>
                  <div class="p-3 border border-blue-900/50 bg-black flex justify-between items-center opacity-50">
                     <span class="text-blue-300 font-bold">???</span>
                     <span class="text-gray-500 text-xs font-bold uppercase">Unknown</span>
                  </div>
               </div>
           </div>
        </div>
        
        <!-- Main Panel: Shuriken Details -->
        <div class="flex-1 bg-[#030014]/95 border border-blue-900/50 flex flex-col overflow-hidden z-10 relative neuro-panel">
           @if (activeShuriken(); as shuriken) {
             <!-- Detail Header -->
             <div class="p-4 border-b border-blue-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-blue-900/20">
               <div class="flex items-center gap-2 w-full max-w-sm">
                 <input type="text" [value]="shuriken.name" #nameInput (keyup.enter)="rename(shuriken.id, nameInput.value)" class="bg-black border border-blue-700 text-blue-300 px-2 py-1 flex-1 outline-none focus:border-blue-400 transition-colors">
                 <button (click)="rename(shuriken.id, nameInput.value)" class="bg-blue-900/50 border border-blue-600 text-blue-400 hover:bg-blue-800 px-3 py-1 uppercase text-sm transition-colors neuro-border-draw">
                   <div class="border-anim"></div><div class="border-anim-v"></div>
                   <span class="relative z-10">Rename</span>
                 </button>
               </div>
               
               <button (click)="programInRogueOS()" class="bg-green-900/30 border border-green-600 text-green-400 hover:bg-green-800/50 px-4 py-2 uppercase font-bold tracking-wider transition-colors shadow-[0_0_10px_rgba(74,222,128,0.2)] neuro-border-draw">
                  <div class="border-anim before:bg-green-500 after:bg-green-500"></div><div class="border-anim-v before:bg-green-500 after:bg-green-500"></div>
                  <span class="relative z-10">[>] PROGRAM IN ROGUE OS</span>
               </button>
             </div>
             
             <!-- Components Grid -->
             <div class="p-4 md:p-6 overflow-y-auto flex-1">
                <h3 class="text-blue-500 font-bold mb-4 uppercase border-b border-blue-900/50 pb-2">// HARDWARE LOADOUT</h3>
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                   <!-- Engine -->
                   <div class="bg-black border border-blue-900/50 p-3 transition-colors hover:border-blue-700 neuro-border-draw">
                     <div class="border-anim"></div><div class="border-anim-v"></div>
                     <div class="text-xs text-blue-600 uppercase mb-1 relative z-10">Anti-Grav Engine</div>
                     <app-cyber-select class="relative z-10 block"
                                       [value]="shuriken.engine?.id" 
                                       (valueChange)="swap(shuriken.id, 'engine', $event, inventory.engines)"
                                       [options]="getEngineOptions()">
                     </app-cyber-select>
                   </div>
                   
                   <!-- Hull -->
                   <div class="bg-black border border-blue-900/50 p-3 transition-colors hover:border-blue-700 neuro-border-draw">
                     <div class="border-anim"></div><div class="border-anim-v"></div>
                     <div class="text-xs text-blue-600 uppercase mb-1 relative z-10">Hull Material</div>
                     <app-cyber-select class="relative z-10 block"
                                       [value]="shuriken.hull?.id" 
                                       (valueChange)="swap(shuriken.id, 'hull', $event, inventory.hulls)"
                                       [options]="getHullOptions()">
                     </app-cyber-select>
                   </div>
                   
                   <!-- Energy Cell -->
                   <div class="bg-black border border-blue-900/50 p-3 transition-colors hover:border-blue-700 neuro-border-draw">
                     <div class="border-anim"></div><div class="border-anim-v"></div>
                     <div class="text-xs text-blue-600 uppercase mb-1 relative z-10">Energy Cell</div>
                     <app-cyber-select class="relative z-10 block"
                                       [value]="shuriken.energyCell?.id" 
                                       (valueChange)="swap(shuriken.id, 'energyCell', $event, inventory.energyCells)"
                                       [options]="getEnergyCellOptions()">
                     </app-cyber-select>
                   </div>

                   <!-- Processor -->
                   <div class="bg-black border border-blue-900/50 p-3 transition-colors hover:border-blue-700 neuro-border-draw">
                     <div class="border-anim"></div><div class="border-anim-v"></div>
                     <div class="text-xs text-blue-600 uppercase mb-1 relative z-10">Processor (Compute)</div>
                     <app-cyber-select class="relative z-10 block"
                                       [value]="shuriken.processor?.id" 
                                       (valueChange)="swap(shuriken.id, 'processor', $event, inventory.processors)"
                                       [options]="getProcessorOptions()">
                     </app-cyber-select>
                   </div>

                   <!-- Semi-AI -->
                   <div class="bg-black border border-blue-900/50 p-3 transition-colors hover:border-blue-700 neuro-border-draw">
                     <div class="border-anim"></div><div class="border-anim-v"></div>
                     <div class="text-xs text-blue-600 uppercase mb-1 relative z-10">Semi-AI (Brain)</div>
                     <app-cyber-select class="relative z-10 block"
                                       [value]="shuriken.semiAI?.id" 
                                       (valueChange)="swap(shuriken.id, 'semiAI', $event, inventory.semiAIs)"
                                       [options]="getSemiAIOptions()">
                     </app-cyber-select>
                   </div>

                   <!-- Blade -->
                   <div class="bg-black border border-blue-900/50 p-3 transition-colors hover:border-blue-700 neuro-border-draw">
                     <div class="border-anim"></div><div class="border-anim-v"></div>
                     <div class="text-xs text-blue-600 uppercase mb-1 relative z-10">Blade Edge</div>
                     <app-cyber-select class="relative z-10 block"
                                       [value]="shuriken.blade?.id" 
                                       (valueChange)="swap(shuriken.id, 'blade', $event, inventory.blades)"
                                       [options]="getBladeOptions()">
                     </app-cyber-select>
                   </div>

                   <!-- Sensor -->
                   <div class="bg-black border border-blue-900/50 p-3 transition-colors hover:border-blue-700 neuro-border-draw">
                     <div class="border-anim"></div><div class="border-anim-v"></div>
                     <div class="text-xs text-blue-600 uppercase mb-1 relative z-10">Sensor Array</div>
                     <app-cyber-select class="relative z-10 block"
                                       [value]="shuriken.sensor?.id" 
                                       (valueChange)="swap(shuriken.id, 'sensor', $event, inventory.sensors)"
                                       [options]="getSensorOptions()">
                     </app-cyber-select>
                   </div>
                   
                   <!-- Form Design -->
                   <div class="bg-black border border-blue-900/50 p-3 lg:col-span-2 transition-colors hover:border-blue-700 neuro-border-draw">
                     <div class="border-anim"></div><div class="border-anim-v"></div>
                     <div class="text-xs text-blue-600 uppercase mb-1 relative z-10">Form Design</div>
                     <app-cyber-select class="relative z-10 block"
                                       [value]="shuriken.formDesign?.id" 
                                       (valueChange)="swap(shuriken.id, 'formDesign', $event, inventory.formDesigns)"
                                       [options]="getFormDesignOptions()">
                     </app-cyber-select>
                   </div>
                </div>

                  <!-- Statistics Block -->
                  <div class="mt-8 border-t border-blue-900/50 pt-6">
                    <h3 class="text-lg font-bold text-blue-500 mb-4 flex items-center gap-2">
                      <span class="text-blue-700">|</span> COMBAT STATISTICS
                    </h3>
                    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-sm">
                      <div class="bg-black border border-blue-900/30 p-3">
                        <div class="text-blue-600 text-xs uppercase mb-1">Joined Swarm</div>
                        <div class="text-blue-300 font-bold">{{ shuriken.creationDate | date:'mediumDate' }}</div>
                      </div>
                     <div class="bg-black border border-blue-900/30 p-3">
                       <div class="text-blue-600 text-xs uppercase mb-1">Time Online</div>
                       <div class="text-blue-300 font-bold">{{ formatTime(shuriken.stats.timeOnline) }}</div>
                     </div>
                     <div class="bg-black border border-blue-900/30 p-3">
                       <div class="text-blue-600 text-xs uppercase mb-1">Enemies Terminated</div>
                       <div class="text-red-400 font-bold">{{ shuriken.stats.enemiesKilled | number }}</div>
                     </div>
                     <div class="bg-black border border-blue-900/30 p-3">
                       <div class="text-blue-600 text-xs uppercase mb-1">Structural Damage</div>
                       <div class="text-orange-400 font-bold">{{ shuriken.stats.lostHealth | number }} HP</div>
                     </div>
                     <div class="bg-black border border-blue-900/30 p-3">
                       <div class="text-blue-600 text-xs uppercase mb-1">Repair Time</div>
                       <div class="text-yellow-400 font-bold">{{ formatTime(shuriken.stats.timeRepairing) }}</div>
                     </div>
                   </div>
                 </div>

             </div>
           }
        </div>
      </div>
    </div>
  `,
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HardwareWorkshop {
  workshop = inject(WorkshopService);
  router = inject(Router);
  
  inventory = HARDWARE_INVENTORY;
  shurikens = this.workshop.availableShurikens;
  activeShuriken = this.workshop.activeShuriken;
  unlocked = this.workshop.unlockedComponentIds;

  selectShuriken(id: string) {
    this.workshop.setActiveShuriken(id);
  }

  rename(id: string, newName: string) {
    if (newName.trim()) {
      this.workshop.renameShuriken(id, newName.trim());
    }
  }

  programInRogueOS() {
    this.router.navigate(['/routine']);
  }

  getUnlocked<T extends { id: string }>(items: T[]): T[] {
    return items.filter(item => this.workshop.unlockedComponentIds().includes(item.id));
  }

  formatTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m ${seconds % 60}s`;
  }

  swap(shurikenId: string, slot: keyof Shuriken, componentId: string | undefined, category: any[]) {
    if (!componentId) return;
    const comp = category.find(c => c.id === componentId);
    if (comp) {
      this.workshop.equipComponent(shurikenId, slot, comp);
    }
  }

  // --- Map Options for CyberSelect ---
  getEngineOptions(): CyberOption[] {
    return this.getUnlocked(this.inventory.engines).map((c: any) => ({ value: c.id, label: c.name }));
  }
  getHullOptions(): CyberOption[] {
    return this.getUnlocked(this.inventory.hulls).map((c: any) => ({ value: c.id, label: `${c.name} (Tier ${c.tier})` }));
  }
  getEnergyCellOptions(): CyberOption[] {
    return this.getUnlocked(this.inventory.energyCells).map((c: any) => ({ value: c.id, label: c.name }));
  }
  getProcessorOptions(): CyberOption[] {
    return this.getUnlocked(this.inventory.processors).map((c: any) => ({ value: c.id, label: `${c.name} (Cap: ${c.routineCapacity} | Lat: ${c.latency}s)` }));
  }
  getSemiAIOptions(): CyberOption[] {
    return this.getUnlocked(this.inventory.semiAIs).map((c: any) => ({ value: c.id, label: c.name }));
  }
  getBladeOptions(): CyberOption[] {
    return this.getUnlocked(this.inventory.blades).map((c: any) => ({ value: c.id, label: c.name }));
  }
  getSensorOptions(): CyberOption[] {
    return this.getUnlocked(this.inventory.sensors).map((c: any) => ({ value: c.id, label: c.name }));
  }
  getFormDesignOptions(): CyberOption[] {
    return this.getUnlocked(this.inventory.formDesigns).map((c: any) => ({ value: c.id, label: `${c.name} (${c.shape})` }));
  }
}
