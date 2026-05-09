import { initFederation } from '@angular-architects/native-federation';

initFederation({
  mfOrder:         'http://localhost:4201/remoteEntry.json',
  mfPayments:      'http://localhost:4202/remoteEntry.json',
  mfNotifications: 'http://localhost:4203/remoteEntry.json',
})
  .catch((err: unknown) => console.error(err))
  .then(() => import('./bootstrap'))
  .catch((err: unknown) => console.error(err));
