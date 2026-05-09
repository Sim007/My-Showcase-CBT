import { initFederation } from '@angular-architects/native-federation';

initFederation()
  .catch((err: unknown) => console.error(err))
  .then(() => import('./bootstrap'))
  .catch((err: unknown) => console.error(err));
