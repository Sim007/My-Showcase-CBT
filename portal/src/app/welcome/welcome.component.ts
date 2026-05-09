import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [MatCardModule],
  template: `
    <div class="welcome-container">
      <mat-card appearance="outlined">
        <mat-card-content>
          <h1>Welkom</h1>
          <p>Selecteer een deelsysteem via de navigatie.</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .welcome-container {
      display: flex;
      justify-content: center;
      padding: 3rem 1rem;
    }
    mat-card { max-width: 480px; width: 100%; text-align: center; }
    h1 { margin: 0 0 .5rem; font-size: 2rem; }
    p  { margin: 0; color: #666; }
  `],
})
export class WelcomeComponent {}
