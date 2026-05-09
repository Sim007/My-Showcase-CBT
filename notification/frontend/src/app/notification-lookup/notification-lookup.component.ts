import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';

interface Notification {
  notificationId: string;
  orderId: string;
  type: string;
  message: string;
  timestamp: string;
}

@Component({
  selector: 'app-notification-lookup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatListModule, MatChipsModule],
  templateUrl: './notification-lookup.component.html',
  styleUrls: ['./notification-lookup.component.css'],
})
export class NotificationLookupComponent {
  form = this.fb.group({ orderId: ['', Validators.required] });
  notifications: Notification[] = [];
  searched = false;
  errorMessage: string | null = null;
  isLoading = false;

  constructor(private fb: FormBuilder, private http: HttpClient) {}

  search(): void {
    if (this.form.invalid) return;
    this.notifications = []; this.searched = false; this.errorMessage = null;
    this.isLoading = true;

    this.http.get<Notification[]>(`/api/notifications?orderId=${this.form.value.orderId}`).subscribe({
      next: r => { this.notifications = r; this.searched = true; this.isLoading = false; },
      error: e => { this.errorMessage = e.error?.message ?? 'Er is een fout opgetreden'; this.isLoading = false; },
    });
  }
}
