import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'hub', pathMatch: 'full' },
  { path: 'hub', loadComponent: () => import('./views/hub').then(m => m.Hub) },
  { path: 'routine', loadComponent: () => import('./views/routine-compiler').then(m => m.RoutineCompiler) },
  { path: 'hardware', loadComponent: () => import('./views/hardware-workshop').then(m => m.HardwareWorkshop) },
  { path: 'genesis', loadComponent: () => import('./views/genesis-chamber').then(m => m.GenesisChamber) },
  { path: 'liberation', loadComponent: () => import('./views/liberation-strike').then(m => m.LiberationStrike) },
  { path: 'settings', loadComponent: () => import('./views/settings').then(m => m.Settings) },
  { path: '**', redirectTo: 'hub' }
];
