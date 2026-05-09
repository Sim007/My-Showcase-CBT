import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

interface OrderResponse {
  orderId: string;
  amount: number;
  paymentStatus: string;
  approved: boolean;
}

@Component({
  selector: 'app-order-lookup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './order-lookup.component.html',
  styleUrls: ['./order-lookup.component.css'],
})
export class OrderLookupComponent {
  form = this.fb.group({ orderId: ['', Validators.required] });
  result: OrderResponse | null = null;
  notFound = false;
  errorMessage: string | null = null;
  isLoading = false;

  constructor(private fb: FormBuilder, private http: HttpClient, private cdr: ChangeDetectorRef) {}

  search(): void {
    if (this.form.invalid) return;
    this.result = null; this.notFound = false; this.errorMessage = null;
    this.isLoading = true;

    this.http.get<OrderResponse>(`/api/orders/${this.form.value.orderId}`).subscribe({
      next: r => { this.result = r; this.isLoading = false; this.cdr.detectChanges(); },
      error: (e: HttpErrorResponse) => {
        this.isLoading = false;
        if (e.status === 404) this.notFound = true;
        else this.errorMessage = e.error?.message ?? 'Er is een fout opgetreden';
        this.cdr.detectChanges();
      },
    });
  }
}
