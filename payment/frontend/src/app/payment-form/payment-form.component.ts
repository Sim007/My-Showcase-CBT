import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

interface PaymentResponse {
  paymentId: string;
  orderId: string;
  status: 'APPROVED' | 'REJECTED';
  approved: boolean;
}

@Component({
  selector: 'app-payment-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './payment-form.component.html',
  styleUrls: ['./payment-form.component.css'],
})
export class PaymentFormComponent {
  form = this.fb.group({
    orderId: ['', Validators.required],
    amount:  [null as number | null, [Validators.required, Validators.min(0.01)]],
  });
  paymentStatus: string | null = null;
  errorMessage: string | null = null;
  isLoading = false;

  constructor(private fb: FormBuilder, private http: HttpClient) {}

  submit(): void {
    if (this.form.invalid) return;
    this.paymentStatus = null; this.errorMessage = null; this.isLoading = true;

    this.http.post<PaymentResponse>('/api/payments', {
      orderId: this.form.value.orderId,
      amount:  this.form.value.amount,
    }).subscribe({
      next: r => { this.paymentStatus = r.status; this.isLoading = false; },
      error: e => { this.errorMessage = e.error?.message ?? 'Er is een fout opgetreden'; this.isLoading = false; },
    });
  }
}
