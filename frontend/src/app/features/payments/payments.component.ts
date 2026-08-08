import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CustomersService } from '../../core/services/customers.service';
import { Payment, PAYMENT_STATUS_LABELS, PaymentStatus } from '../../core/models/customer.model';
import { formatDate, paymentStatusBadgeClass, todayIso } from '../../shared/status-utils';

type StatusFilter = PaymentStatus | 'all';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './payments.component.html',
  styleUrl: './payments.component.scss'
})
export class PaymentsComponent {
  private customersService = inject(CustomersService);

  statusFilter = signal<StatusFilter>('all');
  statusOptions: StatusFilter[] = ['all', 'overdue', 'pending', 'paid', 'cancelled'];
  statusLabels = PAYMENT_STATUS_LABELS;
  paymentStatusBadgeClass = paymentStatusBadgeClass;
  formatDate = formatDate;

  allPayments = computed(() => this.customersService.payments()
    .map(p => ({ ...p, customerName: this.customersService.getCustomer(p.customerId)?.name ?? '' }))
    .sort((a, b) => b.date.localeCompare(a.date)));

  filteredPayments = computed(() => {
    const status = this.statusFilter();
    return this.allPayments().filter(p => status === 'all' || p.status === status);
  });

  totalThisMonth = computed(() => {
    const month = todayIso().slice(0, 7);
    return this.allPayments()
      .filter(p => p.status === 'paid' && p.date.slice(0, 7) === month)
      .reduce((sum, p) => sum + p.amount, 0);
  });

  setStatus(status: StatusFilter) {
    this.statusFilter.set(status);
  }

  markPaid(p: Payment, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.customersService.updatePayment(p.customerId, p.id, {
      amount: p.amount,
      date: p.date,
      status: 'paid'
    }).subscribe();
  }
}
