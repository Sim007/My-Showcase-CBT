import { Routes } from '@angular/router';
import { OrderFormComponent } from './order-form/order-form.component';
import { OrderLookupComponent } from './order-lookup/order-lookup.component';

export const routes: Routes = [
  { path: '', component: OrderFormComponent },
  { path: 'lookup', component: OrderLookupComponent },
];
