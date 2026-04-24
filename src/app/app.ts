import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PlayerService } from './services/player.service';
import { PcbBackground } from './components/pcb-background';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, PcbBackground],
  template: `
    <!-- PCB animated background: only mounted for the Neuromancer theme -->
    @if (isNeuromancer()) {
      <app-pcb-background />
    }
    <div class="relative z-10">
      <router-outlet />
    </div>
  `,
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
  private player = inject(PlayerService);

  /** True when the active theme is the Neuromancer Deck. */
  readonly isNeuromancer = computed(() => this.player.theme() === 'neuromancer');
}
