import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { PaymentService } from '../../core/services/payment.service';
import { Payment } from '../../core/models/Payment.model';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './payments.html',
})
export class Payments implements OnInit {
  private paymentService = inject(PaymentService);
  private fb = inject(FormBuilder);

  payments: Payment[] = [];
  isLoading = false;
  isModalOpen = false;
  isDetailsModalOpen = false;
  selectedPayment: Payment | null = null;

  paymentForm: FormGroup = this.fb.group({
    companyId: ['', Validators.required],
    planId: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    currency: ['GNF', Validators.required],
    paymentMethod: ['', Validators.required],
  });

  confirmForm: FormGroup = this.fb.group({
    transactionReference: ['', Validators.required],
    status: ['success', Validators.required],
  });

  companies: any[] = [];
  plans: any[] = [];

  ngOnInit(): void {
    this.loadPayments();
  }

  loadPayments(): void {
    this.isLoading = true;
    this.paymentService.getAll().subscribe({
      next: (data) => {
        this.payments = data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }
  get pendingPaymentsCount(): number {
    return this.payments ? this.payments.filter((p) => p.status === 'pending').length : 0;
  }
  get completedPaymentsCount(): number {
    return this.payments ? this.payments.filter((p) => p.status === 'completed').length : 0;
  }
  get totalCompletedAmount(): number {
    if (!this.payments) return 0;

    return this.payments.reduce((sum, p) => {
      return sum + (p.status === 'completed' ? p.amount || 0 : 0);
    }, 0);
  }
  openCreateModal(): void {
    this.selectedPayment = null;
    this.paymentForm.reset({
      companyId: '',
      planId: '',
      amount: 0,
      currency: 'GNF',
      paymentMethod: '',
    });
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.paymentForm.reset();
  }

  openDetailsModal(payment: Payment): void {
    this.selectedPayment = payment;
    this.isDetailsModalOpen = true;
  }

  closeDetailsModal(): void {
    this.isDetailsModalOpen = false;
    this.selectedPayment = null;
  }

  createPayment(): void {
    if (this.paymentForm.invalid) {
      Object.keys(this.paymentForm.controls).forEach((key) => {
        const control = this.paymentForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.isLoading = true;
    this.paymentService.createPayment(this.paymentForm.value).subscribe({
      next: () => {
        this.loadPayments();
        this.closeModal();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  openConfirmModal(payment: Payment): void {
    this.selectedPayment = payment;
    this.confirmForm.reset({
      transactionReference: payment.transactionReference || '',
      status: 'success',
    });
    // Ouvrir un modal de confirmation simple
    const transactionRef = prompt(
      'Entrez la référence de transaction:',
      payment.transactionReference || '',
    );
    if (transactionRef) {
      const status = confirm('Le paiement a-t-il été effectué avec succès ?')
        ? 'success'
        : 'failed';
      this.confirmPayment(transactionRef, status);
    }
  }

  confirmPayment(transactionReference: string, status: string): void {
    this.isLoading = true;
    this.paymentService.confirmPayment({ transactionReference, status }).subscribe({
      next: () => {
        this.loadPayments();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700 border-amber-200',
      processing: 'bg-blue-100 text-blue-700 border-blue-200',
      completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      failed: 'bg-rose-100 text-rose-700 border-rose-200',
      refunded: 'bg-slate-100 text-slate-600 border-slate-200',
    };

    return colors[status] || colors['pending'];
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'En attente',
      processing: 'En cours',
      completed: 'Complété',
      failed: 'Échoué',
      refunded: 'Remboursé',
    };
    return labels[status] || status;
  }

  getPaymentMethodLabel(method: string): string {
    const labels: Record<string, string> = {
      orange_money: 'Orange Money',
      mtn_money: 'MTN Money',
      bank_transfer: 'Virement bancaire',
      cash: 'Espèces',
      card: 'Carte bancaire',
    };
    return labels[method] || method;
  }

  getPaymentMethodIcon(method: string): string {
    const icons: Record<string, string> = {
      orange_money: 'fa-phone',
      mtn_money: 'fa-phone',
      bank_transfer: 'fa-building-columns',
      cash: 'fa-money-bill',
      card: 'fa-credit-card',
    };
    return icons[method] || 'fa-receipt';
  }

  formatAmount(amount: number, currency: string): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency || 'GNF',
    }).format(amount);
  }

  formatDate(date?: Date): string {
    if (!date) return 'Non défini';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
