import { Routes } from '@angular/router';
import { loadRemoteModule } from '@angular-architects/native-federation';
import { WelcomeComponent } from './welcome/welcome.component';

export const routes: Routes = [
  { path: '', component: WelcomeComponent },
  {
    path: 'payments',
    loadChildren: () =>
      loadRemoteModule('mfPayments', './routes').then((m: { routes: Routes }) => m.routes),
  },
  {
    path: 'orders',
    loadChildren: () =>
      loadRemoteModule('mfOrder', './routes').then((m: { routes: Routes }) => m.routes),
  },
  {
    path: 'orders/lookup',
    loadChildren: () =>
      loadRemoteModule('mfOrder', './routes').then((m: { routes: Routes }) => m.routes),
  },
  {
    path: 'notifications',
    loadChildren: () =>
      loadRemoteModule('mfNotifications', './routes').then((m: { routes: Routes }) => m.routes),
  },
];
