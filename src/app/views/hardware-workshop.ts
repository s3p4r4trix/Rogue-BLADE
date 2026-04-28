import { Component, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { WorkshopStore } from '../services/workshop.store';
import { HARDWARE_INVENTORY } from '../data/hardware-inventory.data';
import { CommonModule } from '@angular/common';
import { Shuriken, CyberOption } from '../models/hardware-model';

@Component({
  selector: 'app-hardware-workshop',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen text-blue-300 p-4 md:p-8 font-mono relative">
      <header class="mb-6 flex justify-between items-end border-b-2 border-blue-800 pb-2">
        <div class="flex items-center gap-4">
           <a routerLink="/hub" class="text-blue-500 border border-blue-800 hover:bg-blue-900/50 px-3 py-1 font-mono text-sm uppercase transition-colors">
               < BACK_TO_HUB
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
               
               <div class="flex gap-2">
                  <button (click)="programInRogueOS()" class="bg-green-900/30 border border-green-600 text-green-400 hover:bg-green-800/50 px-4 py-2 uppercase font-bold tracking-wider transition-colors shadow-[0_0_10px_rgba(74,222,128,0.2)] neuro-border-draw">
                     <div class="border-anim before:bg-green-500 after:bg-green-500"></div><div class="border-anim-v before:bg-green-500 after:bg-green-500"></div>
                     <span class="relative z-10">[>] ROGUE OS</span>
                  </button>

                  <button (click)="deploy()" 
                          [disabled]="!workshopStore.isFleetValid()"
                          class="bg-red-900/30 border border-red-600 text-red-500 hover:bg-red-800/50 px-4 py-2 uppercase font-bold tracking-wider transition-colors shadow-[0_0_10px_rgba(239,68,68,0.2)] neuro-border-draw"
                          [ngClass]="{'opacity-30 cursor-not-allowed grayscale': !workshopStore.isFleetValid()}">
                     <div class="border-anim before:bg-red-500 after:bg-red-500"></div><div class="border-anim-v before:bg-red-500 after:bg-red-500"></div>
                     <span class="relative z-10">{{ workshopStore.isFleetValid() ? '[>] COMBAT DEPLOY' : '[!] HW_INCOMPLETE' }}</span>
                  </button>
                </div>
             </div>

             @if (!workshopStore.isFleetValid()) {
               <div class="bg-red-900/20 border border-red-900/50 p-2 text-[10px] text-red-500 uppercase tracking-widest animate-pulse text-center">
                 Critical Error: Mandatory hardware slots detected as NULL. Deployment inhibited.
               </div>
             }
             
             <!-- Components Grid -->
             <div class="p-4 md:p-6 overflow-y-auto flex-1">
                <h3 class="text-blue-500 font-bold mb-4 uppercase border-b border-blue-900/50 pb-2">// HARDWARE LOADOUT</h3>
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                   <!-- Form Design -->
                   <div class="bg-blue-900/10 border border-blue-600/50 p-4 lg:col-span-2 transition-colors hover:border-blue-400 focus-within:border-blue-400 neuro-panel">
                     <div class="text-xs text-blue-400 uppercase mb-2 font-bold tracking-widest flex justify-between">
                       <span>// PRIMARY_CHASSIS_DESIGN</span>
                       <span class="text-[10px] text-blue-700">CORE_GEOMETRY</span>
                     </div>
                     <select class="cyber-native-select !border-blue-600/50 !text-blue-200 text-lg py-3"
                             [value]="shuriken.formDesign?.id" 
                             (change)="onNativeSwap(shuriken.id, 'formDesign', $event, inventory.formDesigns)">
                        @for (opt of getFormDesignOptions(); track opt.value) {
                          <option [value]="opt.value" [selected]="opt.value === shuriken.formDesign?.id">{{ opt.label }}</option>
                        }
                     </select>
                     <p class="text-[10px] text-blue-800 mt-2 italic">Global geometric profile determines base multipliers for all physical and kinetic attributes.</p>
                   </div>
                   <!-- Engine -->
                   <div class="bg-black/50 border border-blue-900/30 p-3 transition-colors hover:border-blue-600 focus-within:border-blue-500">
                     <div class="text-xs text-blue-600 uppercase mb-1 font-bold tracking-tighter">// ENGINE_UNIT</div>
                     <select class="cyber-native-select"
                             [value]="shuriken.engine?.id" 
                             (change)="onNativeSwap(shuriken.id, 'engine', $event, inventory.engines)">
                        @for (opt of getEngineOptions(); track opt.value) {
                          <option [value]="opt.value" [selected]="opt.value === shuriken.engine?.id">{{ opt.label }}</option>
                        }
                     </select>
                   </div>
                   
                   <!-- Hull -->
                   <div class="bg-black/50 border border-blue-900/30 p-3 transition-colors hover:border-blue-600 focus-within:border-blue-500">
                     <div class="text-xs text-blue-600 uppercase mb-1 font-bold tracking-tighter">// HULL_PLATE</div>
                     <select class="cyber-native-select"
                             [value]="shuriken.hull?.id" 
                             (change)="onNativeSwap(shuriken.id, 'hull', $event, inventory.hulls)">
                        @for (opt of getHullOptions(); track opt.value) {
                          <option [value]="opt.value" [selected]="opt.value === shuriken.hull?.id">{{ opt.label }}</option>
                        }
                     </select>
                   </div>
                   
                   <!-- Energy Cell -->
                   <div class="bg-black/50 border border-blue-900/30 p-3 transition-colors hover:border-blue-600 focus-within:border-blue-500">
                     <div class="text-xs text-blue-600 uppercase mb-1 font-bold tracking-tighter">// ENERGY_CELL</div>
                     <select class="cyber-native-select"
                             [value]="shuriken.energyCell?.id" 
                             (change)="onNativeSwap(shuriken.id, 'energyCell', $event, inventory.energyCells)">
                        @for (opt of getEnergyCellOptions(); track opt.value) {
                          <option [value]="opt.value" [selected]="opt.value === shuriken.energyCell?.id">{{ opt.label }}</option>
                        }
                     </select>
                   </div>

                   <!-- Reactor -->
                   <div class="bg-black/50 border border-blue-900/30 p-3 transition-colors hover:border-blue-600 focus-within:border-blue-500">
                     <div class="text-xs text-blue-600 uppercase mb-1 font-bold tracking-tighter">// ENERGY_REACTOR</div>
                     <select class="cyber-native-select"
                             [value]="shuriken.reactor?.id" 
                             (change)="onNativeSwap(shuriken.id, 'reactor', $event, inventory.reactors)">
                        @for (opt of getReactorOptions(); track opt.value) {
                          <option [value]="opt.value" [selected]="opt.value === shuriken.reactor?.id">{{ opt.label }}</option>
                        }
                     </select>
                   </div>

                   <!-- Processor -->
                   <div class="bg-black/50 border border-blue-900/30 p-3 transition-colors hover:border-blue-600 focus-within:border-blue-500">
                     <div class="text-xs text-blue-600 uppercase mb-1 font-bold tracking-tighter">// COMPUTE_LOGIC</div>
                     <select class="cyber-native-select"
                             [value]="shuriken.processor?.id" 
                             (change)="onNativeSwap(shuriken.id, 'processor', $event, inventory.processors)">
                        @for (opt of getProcessorOptions(); track opt.value) {
                          <option [value]="opt.value" [selected]="opt.value === shuriken.processor?.id">{{ opt.label }}</option>
                        }
                     </select>
                   </div>

                   <!-- Shield Generator -->
                   <div class="bg-black/50 border border-blue-900/30 p-3 transition-colors hover:border-blue-600 focus-within:border-blue-500">
                     <div class="text-xs text-blue-600 uppercase mb-1 font-bold tracking-tighter">// SHIELD_GENERATOR</div>
                     <select class="cyber-native-select"
                             [value]="shuriken.shield?.id" 
                             (change)="onNativeSwap(shuriken.id, 'shield', $event, inventory.shields)">
                        @for (opt of getShieldOptions(); track opt.value) {
                          <option [value]="opt.value" [selected]="opt.value === shuriken.shield?.id">{{ opt.label }}</option>
                        }
                     </select>
                   </div>

                   <!-- Semi-AI -->
                   <div class="bg-black/50 border border-blue-900/30 p-3 transition-colors hover:border-blue-600 focus-within:border-blue-500">
                     <div class="text-xs text-blue-600 uppercase mb-1 font-bold tracking-tighter">// SEMI_AI</div>
                     <select class="cyber-native-select"
                             [value]="shuriken.semiAI?.id || ''" 
                             (change)="onNativeSwap(shuriken.id, 'semiAI', $event, inventory.semiAIs)">
                        @for (opt of getSemiAIOptions(); track opt.value) {
                          <option [value]="opt.value" [selected]="opt.value === (shuriken.semiAI?.id || '')">{{ opt.label }}</option>
                        }
                     </select>
                   </div>

                   <!-- Blade -->
                   <div class="bg-black/50 border border-blue-900/30 p-3 transition-colors hover:border-blue-600 focus-within:border-blue-500">
                     <div class="text-xs text-blue-600 uppercase mb-1 font-bold tracking-tighter">// BLADE_EDGE</div>
                     <select class="cyber-native-select"
                             [value]="shuriken.blade?.id" 
                             (change)="onNativeSwap(shuriken.id, 'blade', $event, inventory.blades)">
                        @for (opt of getBladeOptions(); track opt.value) {
                          <option [value]="opt.value" [selected]="opt.value === shuriken.blade?.id">{{ opt.label }}</option>
                        }
                     </select>
                   </div>

                   <!-- Sensor -->
                   <div class="bg-black/50 border border-blue-900/30 p-3 transition-colors hover:border-blue-600 focus-within:border-blue-500">
                     <div class="text-xs text-blue-600 uppercase mb-1 font-bold tracking-tighter">// SENSOR_ARRAY</div>
                     <select class="cyber-native-select"
                             [value]="shuriken.sensor?.id" 
                             (change)="onNativeSwap(shuriken.id, 'sensor', $event, inventory.sensors)">
                        @for (opt of getSensorOptions(); track opt.value) {
                          <option [value]="opt.value" [selected]="opt.value === shuriken.sensor?.id">{{ opt.label }}</option>
                        }
                     </select>
                   </div>
                   

                </div>

                <!-- Performance Telemetry -->
                <div class="mt-8 bg-black/60 border border-blue-900/30 p-6 neuro-panel relative overflow-hidden group/telemetry">
                   <!-- Decorative scanning line -->
                   <div class="absolute inset-x-0 top-0 h-[1px] bg-blue-500/20 animate-[scan_4s_linear_infinite] pointer-events-none"></div>

                   <h3 class="text-blue-400 font-black mb-6 uppercase tracking-[0.3em] flex justify-between items-center border-b border-blue-900/30 pb-3">
                       <span class="flex items-center gap-2">
                         <span class="w-1.5 h-4 bg-blue-500 shadow-[0_0_10px_#3b82f6]"></span>
                         SYSTEM_DIAGNOSTICS
                       </span>
                       <span class="text-[9px] text-blue-600 font-mono animate-pulse">TERMINAL_LINK: STABLE</span>
                   </h3>
                   
                   @if (activeShurikenStats(); as stats) {
                     <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                       
                       <!-- Survival Analysis -->
                       <div class="space-y-4">
                          <h4 class="text-[10px] text-blue-700 font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span class="w-1 h-1 bg-blue-700"></span> SURVIVABILITY
                          </h4>
                          <div class="space-y-3">
                            <div class="flex flex-col gap-1">
                               <div class="flex justify-between text-[10px] uppercase font-bold">
                                 <span class="text-blue-500/60">Hull Integrity</span>
                                 <span class="text-blue-300 font-mono">{{ stats.hp }} HP</span>
                               </div>
                               <div class="h-1 bg-blue-950/30 rounded-full overflow-hidden">
                                 <div class="h-full bg-blue-500/40 shadow-[0_0_5px_rgba(59,130,246,0.3)]" [style.width.%]="Math.min(100, (stats.hp / 500) * 100)"></div>
                               </div>
                            </div>
                            <div class="flex flex-col gap-1">
                               <div class="flex justify-between text-[10px] uppercase font-bold">
                                 <span class="text-blue-500/60">Armor Plating</span>
                                 <span class="text-blue-300 font-mono">{{ stats.armor | number:'1.0-1' }}</span>
                               </div>
                               <div class="h-1 bg-blue-950/30 rounded-full overflow-hidden">
                                 <div class="h-full bg-cyan-500/40 shadow-[0_0_5px_rgba(6,182,212,0.3)]" [style.width.%]="Math.min(100, (stats.armor / 50) * 100)"></div>
                               </div>
                            </div>
                            <div class="flex flex-col gap-1">
                               <div class="flex justify-between text-[10px] uppercase font-bold">
                                 <span class="text-blue-500/60">Shield Capacity</span>
                                 <span class="text-blue-300 font-mono">{{ stats.shields }}</span>
                               </div>
                               <div class="h-1 bg-blue-950/30 rounded-full overflow-hidden">
                                 <div class="h-full bg-indigo-500/40 shadow-[0_0_5px_rgba(99,102,241,0.3)]" [style.width.%]="Math.min(100, (stats.shields / 500) * 100)"></div>
                               </div>
                            </div>
                            <div class="flex justify-between text-[10px] uppercase font-bold pt-1 border-t border-blue-900/20">
                               <span class="text-blue-500/60">Evasion Rate</span>
                               <span class="text-green-400 font-mono">{{ stats.evasion | number:'1.1-1' }}%</span>
                            </div>
                          </div>
                       </div>

                       <!-- Mobility Metrics -->
                       <div class="space-y-4">
                          <h4 class="text-[10px] text-blue-700 font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span class="w-1 h-1 bg-blue-700"></span> MOBILITY
                          </h4>
                          <div class="space-y-3">
                            <div class="flex flex-col gap-1">
                               <div class="flex justify-between text-[10px] uppercase font-bold">
                                 <span class="text-blue-500/60">Top Velocity</span>
                                 <span class="text-blue-300 font-mono">{{ stats.speed | number:'1.0-0' }} px/s</span>
                               </div>
                               <div class="h-1 bg-blue-950/30 rounded-full overflow-hidden">
                                 <div class="h-full bg-blue-400/40" [style.width.%]="Math.min(100, (stats.speed / 600) * 100)"></div>
                               </div>
                            </div>
                            <div class="flex justify-between text-[10px] uppercase font-bold">
                               <span class="text-blue-500/60">Acceleration</span>
                               <span class="text-blue-300 font-mono">{{ stats.acceleration }}</span>
                            </div>
                            <div class="flex flex-col gap-1">
                               <div class="flex justify-between text-[10px] uppercase font-bold">
                                 <span class="text-blue-500/60">Gross Weight</span>
                                 <span class="text-orange-400 font-mono font-black">{{ stats.weight | number:'1.0-0' }} kg</span>
                               </div>
                               <div class="h-1 bg-blue-950/30 rounded-full overflow-hidden">
                                 <div class="h-full bg-orange-500/40" [style.width.%]="Math.min(100, (stats.weight / 400) * 100)"></div>
                               </div>
                            </div>
                          </div>
                       </div>

                       <!-- Combat Efficiency -->
                       <div class="space-y-4">
                          <h4 class="text-[10px] text-blue-700 font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span class="w-1 h-1 bg-blue-700"></span> OFFENSE
                          </h4>
                          <div class="space-y-3">
                            <div class="flex flex-col gap-1">
                               <div class="flex justify-between text-[10px] uppercase font-bold">
                                 <span class="text-blue-500/60">Base Damage</span>
                                 <span class="text-red-400 font-mono font-black">{{ stats.baseDamage | number:'1.0-1' }}</span>
                               </div>
                               <div class="h-1 bg-blue-950/30 rounded-full overflow-hidden">
                                 <div class="h-full bg-red-500/40 shadow-[0_0_5px_rgba(239,68,68,0.3)]" [style.width.%]="Math.min(100, (stats.baseDamage / 150) * 100)"></div>
                               </div>
                            </div>
                            <div class="flex justify-between text-[10px] uppercase font-bold">
                               <span class="text-blue-500/60">Damage Type</span>
                               <span class="text-blue-300 px-2 py-0.5 bg-blue-900/30 border border-blue-800 rounded">{{ stats.damageType }}</span>
                            </div>
                            <div class="flex flex-col gap-1 pt-1">
                               <div class="flex justify-between text-[10px] uppercase font-bold">
                                 <span class="text-blue-500/60">Crit Probability</span>
                                 <span class="text-yellow-400 font-mono">{{ stats.critChance | number:'1.1-1' }}%</span>
                               </div>
                               <div class="h-1 bg-blue-950/30 rounded-full overflow-hidden">
                                 <div class="h-full bg-yellow-500/40" [style.width.%]="Math.min(100, (stats.critChance / 30) * 100)"></div>
                               </div>
                            </div>
                          </div>
                       </div>

                       <!-- Neural Engine -->
                       <div class="space-y-4">
                          <h4 class="text-[10px] text-blue-700 font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span class="w-1 h-1 bg-blue-700"></span> ENERGY & AI
                          </h4>
                          <div class="space-y-3">
                            <div class="flex flex-col gap-1">
                               <div class="flex justify-between text-[10px] uppercase font-bold">
                                 <span class="text-blue-500/60">Core Capacitor</span>
                                 <span class="text-blue-300 font-mono">{{ stats.maxEnergy }} EU</span>
                               </div>
                               <div class="h-1 bg-blue-950/30 rounded-full overflow-hidden">
                                 <div class="h-full bg-blue-500/40" [style.width.%]="Math.min(100, (stats.maxEnergy / 500) * 100)"></div>
                               </div>
                            </div>
                            <div class="flex justify-between text-[10px] uppercase font-bold">
                               <span class="text-blue-500/60">Regen Rate</span>
                               <span class="text-green-500 font-mono">+{{ stats.energyRegen }}/s</span>
                            </div>
                            <div class="flex justify-between text-[10px] uppercase font-bold">
                               <span class="text-blue-500/60">System Drain</span>
                               <span class="text-red-500 font-mono">-{{ stats.passiveDrain }}/s</span>
                            </div>
                            <div class="flex flex-col gap-1 pt-2 border-t border-blue-900/20">
                               <div class="flex justify-between text-[10px] uppercase font-bold">
                                 <span class="text-blue-400 font-black">Reaction Time</span>
                                 <span class="text-purple-400 font-black font-mono">{{ stats.effectiveRX | number:'1.2-3' }}s</span>
                               </div>
                               <div class="h-1.5 bg-purple-950/30 rounded-full overflow-hidden">
                                 <div class="h-full bg-purple-500/40 shadow-[0_0_8px_rgba(168,85,247,0.4)]" [style.width.%]="Math.max(10, 100 - (stats.effectiveRX / 0.5) * 100)"></div>
                               </div>
                            </div>
                          </div>
                       </div>
                     </div>
                   }
                </div>

                <!-- Swarm Coordination -->
                <div class="mt-8 bg-[#030014]/95 border border-blue-900/50 p-4 neuro-panel">
                   <h3 class="text-blue-500 font-bold mb-4 uppercase border-b border-blue-900/50 pb-2">// SWARM COORDINATION</h3>
                   
                   @if (shuriken.semiAI) {
                     <div class="flex items-center gap-4 text-sm bg-blue-900/10 p-3 border border-blue-800">
                       <div class="w-4 h-4 bg-blue-500 shadow-[0_0_10px_#3b82f6] animate-pulse rounded-full"></div>
                       <div class="flex-1">
                         <span class="text-blue-400 font-bold uppercase tracking-widest">Master Node Active</span>
                         <p class="text-[10px] text-blue-700">Equipped AI provides coordination to all slaved units in the swarm.</p>
                       </div>
                     </div>
                   } @else {
                     <div class="flex flex-col gap-4">
                       <div class="flex items-center justify-between">
                         <span class="text-xs text-blue-600 uppercase font-mono">Coordination Mode:</span>
                         <div class="flex gap-2">
                           <button (click)="setCoordMode('SOLO')" 
                                   class="px-3 py-1 text-[10px] border transition-all duration-300 font-bold"
                                   [ngClass]="shuriken.coordinationMode === 'SOLO' ? 'bg-blue-600 text-black border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'bg-black border-blue-900 text-blue-900'">
                             SOLO
                           </button>
                           <button (click)="setCoordMode('SLAVE')" 
                                   [disabled]="!hasAvailableMasters()"
                                   class="px-3 py-1 text-[10px] border transition-all duration-300 font-bold"
                                   [ngClass]="{
                                     'bg-blue-600 text-black border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]': shuriken.coordinationMode === 'SLAVE',
                                     'bg-black border-blue-900 text-blue-900': shuriken.coordinationMode !== 'SLAVE',
                                     'opacity-30 cursor-not-allowed': !hasAvailableMasters()
                                   }">
                             SLAVE
                           </button>
                         </div>
                       </div>
                       
                       @if (shuriken.coordinationMode === 'SLAVE') {
                         <div class="animate-in slide-in-from-top-2 duration-300">
                            <div class="text-[9px] text-blue-800 uppercase mb-1 font-bold tracking-tighter">Select Master Unit (Active AI Required):</div>
                            <select class="cyber-native-select"
                                    [value]="shuriken.masterId"
                                    (change)="onNativeMaster($event)">
                                @for (opt of getMasterOptions(); track opt.value) {
                                  <option [value]="opt.value">{{ opt.label }}</option>
                                }
                            </select>
                         </div>
                       }
                     </div>
                   }
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
  styles: [`
    .cyber-native-select {
      @apply w-full bg-black border border-blue-900/50 text-blue-400 px-3 py-2 outline-none appearance-none cursor-pointer transition-all duration-300;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233b82f6'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 0.75rem center;
      background-size: 1rem;
    }
    .cyber-native-select:hover { @apply border-blue-600 shadow-[0_0_10px_rgba(59,130,246,0.1)]; }
    .cyber-native-select:focus { @apply border-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.2)]; }
    .cyber-native-select option { @apply bg-[#030014] text-blue-300; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HardwareWorkshop {
  workshopStore = inject(WorkshopStore);
  router = inject(Router);
  Math = Math;

  constructor() {
    effect(() => {
      console.log('[HardwareWorkshop] Active Shuriken:', this.workshopStore.activeShuriken());
    });
  }

  inventory = HARDWARE_INVENTORY;
  shurikens = this.workshopStore.availableShurikens;
  activeShuriken = this.workshopStore.activeShuriken;
  unlocked = this.workshopStore.unlockedComponentIds;

  activeShurikenStats = computed(() => {
    const s = this.activeShuriken();
    if (!s) return null;

    const f = s.formDesign;
    const h = s.hull;
    const e = s.engine;
    const b = s.blade;
    const p = s.processor;

    // Base Calculations
    const hp = h?.maxHp || 0;
    const armor = (h?.armorValue || 0) * (f?.armorMult || 1.0);
    const shields = (s.shield?.shieldCapacity || 0) + (h?.shieldCapacity || 0);
    const evasion = (e?.evasionRate || 0) * 100; // Display as percentage
    const stealth = e?.stealthValue || 0;

    // Total Weight Calculation: (Hull * Form Mult) + Sum of all other component weights
    const hullWeight = (h?.weight || 0) * (f?.weightMult || 1.0);
    const otherWeight = (e?.weight || 0) + (s.energyCell?.weight || 0) + (s.sensor?.weight || 0) + 
                        (b?.weight || 0) + (p?.weight || 0) + (s.semiAI?.weight || 0) + 
                        (s.shield?.weight || 0) + (s.reactor?.weight || 0);
    const weight = hullWeight + otherWeight;
    
    const speed = (e?.topSpeed || 0) * (f?.speedMult || 1.0);
    const acceleration = e?.acceleration || 0;

    const maxEnergy = s.energyCell?.maxEnergy || 0;
    const energyRegen = s.reactor?.energyRegen || 0;
    const passiveDrain = (e?.energyDrain || 0) + (b?.energyDrain || 0);

    const baseDamage = (b?.baseDamage || 0) * (f?.damageMult || 1.0);
    const critChance = (b?.critChance || 0) * (f?.critChanceMult || 1.0) * 100; // Display as percentage

    // Effective Reaction Time Formula from Section 4.2
    // effectiveReactionTime = baseReactionTime * (1.0 + (baseWeight / 250) - (acceleration / 25) - (processorSpeed / 25))
    const baseRX = p?.reactionTime || 0.2;
    const procSpeed = p?.processorSpeed || 5;
    const aiMult = s.semiAI?.reactionTimeMult || 1.0;
    
    let rxMult = 1.0 + (weight / 250) - (acceleration / 25) - (procSpeed / 25);
    rxMult = Math.max(0.2, rxMult);
    const effectiveRX = baseRX * rxMult * aiMult;

    return {
      hp, armor, shields, evasion, stealth,
      weight, speed, acceleration,
      maxEnergy, energyRegen, passiveDrain,
      baseDamage, critChance,
      effectiveRX,
      damageType: b?.damageType || 'N/A'
    };
  });

  selectShuriken(id: string) {
    this.workshopStore.setActiveShuriken(id);
  }

  rename(id: string, newName: string) {
    if (newName.trim()) {
      this.workshopStore.renameShuriken(id, newName.trim());
    }
  }

  programInRogueOS() {
    this.router.navigate(['/routine']);
  }

  deploy() {
    this.router.navigate(['/liberation']);
  }

  getUnlocked<T extends { id: string }>(items: T[], currentId?: string): T[] {
    return items.filter(item => 
      this.workshopStore.unlockedComponentIds().includes(item.id) || (currentId && item.id === currentId)
    );
  }

  formatTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m ${seconds % 60}s`;
  }

  onNativeSwap(shurikenId: string, slot: keyof Shuriken, event: Event, category: any[]) {
    const componentId = (event.target as HTMLSelectElement).value;
    if (componentId === '') {
      this.workshopStore.equipComponent(shurikenId, slot, null);
      return;
    }
    const comp = category.find(c => c.id === componentId);
    if (comp) {
      this.workshopStore.equipComponent(shurikenId, slot, comp);
    }
  }

  onNativeMaster(event: Event) {
    const masterId = (event.target as HTMLSelectElement).value;
    if (masterId) {
      this.workshopStore.setCoordination(this.activeShuriken().id, 'SLAVE', masterId);
    }
  }

  // --- Map Options for Native Selects ---
  getEngineOptions(): CyberOption[] {
    const s = this.activeShuriken();
    if (!s) return [];
    return this.getUnlocked(this.inventory.engines, s.engine?.id).map((c: any) => ({ value: c.id, label: c.name }));
  }
  getHullOptions(): CyberOption[] {
    const s = this.activeShuriken();
    if (!s) return [];
    return this.getUnlocked(this.inventory.hulls, s.hull?.id).map((c: any) => ({ value: c.id, label: `${c.name}` }));
  }
  getEnergyCellOptions(): CyberOption[] {
    const s = this.activeShuriken();
    if (!s) return [];
    return this.getUnlocked(this.inventory.energyCells, s.energyCell?.id).map((c: any) => ({ value: c.id, label: c.name }));
  }
  getReactorOptions(): CyberOption[] {
    const s = this.activeShuriken();
    if (!s) return [];
    return this.getUnlocked(this.inventory.reactors, s.reactor?.id).map((c: any) => ({ value: c.id, label: c.name }));
  }
  getProcessorOptions(): CyberOption[] {
    const s = this.activeShuriken();
    if (!s) return [];
    return this.getUnlocked(this.inventory.processors, s.processor?.id).map((c: any) => ({ value: c.id, label: `${c.name} (Cap: ${c.routineCapacity} | RX: ${c.reactionTime}s)` }));
  }
  getSemiAIOptions(): CyberOption[] {
    const s = this.activeShuriken();
    if (!s) return [];
    const options = this.getUnlocked(this.inventory.semiAIs, s.semiAI?.id).map((c: any) => ({ value: c.id, label: c.name }));
    return [{ value: '', label: 'NONE [SOLO_MODE]' }, ...options];
  }
  getShieldOptions(): CyberOption[] {
    const s = this.activeShuriken();
    if (!s) return [];
    const options = this.getUnlocked(this.inventory.shields, s.shield?.id).map((c: any) => ({ value: c.id, label: `${c.name} (Cap: ${c.shieldCapacity})` }));
    return [{ value: '', label: 'NONE [OFFLINE]' }, ...options];
  }
  getBladeOptions(): CyberOption[] {
    const s = this.activeShuriken();
    if (!s) return [];
    return this.getUnlocked(this.inventory.blades, s.blade?.id).map((c: any) => ({ value: c.id, label: c.name }));
  }
  getSensorOptions(): CyberOption[] {
    const s = this.activeShuriken();
    if (!s) return [];
    return this.getUnlocked(this.inventory.sensors, s.sensor?.id).map((c: any) => ({ value: c.id, label: c.name }));
  }
  getFormDesignOptions(): CyberOption[] {
    const s = this.activeShuriken();
    if (!s) return [];
    return this.getUnlocked(this.inventory.formDesigns, s.formDesign?.id).map((c: any) => ({ value: c.id, label: `${c.name}` }));
  }

  hasAvailableMasters(): boolean {
    return this.workshopStore.availableShurikens().some(s => s.semiAI && s.id !== this.activeShuriken().id);
  }

  getMasterOptions(): CyberOption[] {
    return this.workshopStore.availableShurikens()
      .filter(s => s.semiAI && s.id !== this.activeShuriken().id)
      .map(s => ({ value: s.id, label: `${s.name} [MASTER]` }));
  }

  setCoordMode(mode: 'SOLO' | 'MASTER' | 'SLAVE') {
    this.workshopStore.setCoordination(this.activeShuriken().id, mode);
  }

  setMaster(masterId: string | undefined) {
    if (masterId) {
      this.workshopStore.setCoordination(this.activeShuriken().id, 'SLAVE', masterId);
    }
  }
}
