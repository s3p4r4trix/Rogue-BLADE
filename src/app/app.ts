import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PlayerStore } from './services/player.store';
import { PcbBackground } from './components/pcb-background';
import { TopBar } from './components/top-bar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, PcbBackground, TopBar],
  template: `
    <!-- PCB animated background: only mounted for the Neuromancer theme -->
    @if (isNeuromancer()) {
      <app-pcb-background />
    }
    <app-top-bar />
    <div class="relative z-10">
      <router-outlet />
    </div>
  `,
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
  /** Centralized player state store. */
  private playerStore = inject(PlayerStore);

  /** 
   * Computed flag that determines if the 'Neuromancer' visual aesthetic should be active.
   * Logic: Checks the player's active theme setting from the store.
   */
  readonly isNeuromancer = computed(() => this.playerStore.theme() === 'neuromancer');
}
