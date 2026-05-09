import { Component } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import { APP_VERSION } from '../version';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [MatDividerModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css'],
})
export class FooterComponent {
  readonly year = new Date().getFullYear();
  readonly version = APP_VERSION;
}
