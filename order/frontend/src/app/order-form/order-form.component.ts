import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

interface OrderResponse {
  orderId: string;
  amount: number;
  paymentStatus: string;
  approved: boolean;
}

@Component({
  selector: 'app-order-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './order-form.component.html',
  styleUrls: ['./order-form.component.css'],
})
export class OrderFormComponent {
  form = this.fb.group({ amount: [null as number | null, [Validators.required, Validators.min(0.01)]] });
  result: OrderResponse | null = null;
  errorMessage: string | null = null;
  isLoading = false;

  constructor(private fb: FormBuilder, private http: HttpClient) {}

  submit(): void {
    if (this.form.invalid) return;
    this.result = null;
    this.errorMessage = null;
    this.isLoading = true;

    this.http.post<OrderResponse>('/api/orders', { amount: this.form.value.amount }).subscribe({
      next: r => { this.result = r; this.isLoading = false; },
      error: e => { this.errorMessage = e.error?.message ?? 'Er is een fout opgetreden'; this.isLoading = false; },
    });
  }
}
