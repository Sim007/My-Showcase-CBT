import { Component } from '@angular/core';
import { RouterOutlet, Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, MatProgressBarModule, HeaderComponent, FooterComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  isLoading = false;

  constructor(router: Router) {
    router.events.subscribe(event => {
      if (event instanceof NavigationStart)  this.isLoading = true;
      if (event instanceof NavigationEnd
       || event instanceof NavigationCancel
       || event instanceof NavigationError) this.isLoading = false;
    });
  }
}
