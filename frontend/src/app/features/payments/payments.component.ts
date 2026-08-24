import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideCheck, LucideCreditCard } from '@lucide/angular';
import { CustomersService } from '../../core/services/customers.service';
import { ToastService } from '../../core/services/toast.service';
import { Payment, PAYMENT_STATUS_LABELS, PaymentStatus } from '../../core/models/customer.model';
import { formatDate, formatMonthLabel, paymentStatusBadgeClass, todayIso } from '../../shared/status-utils';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

type StatusFilter = PaymentStatus | 'all';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [RouterLink, EmptyStateComponent, LucideCheck, LucideCreditCard],
  templateUrl: './payments.component.html',
  styleUrl: './payments.component.scss'
})
export class PaymentsComponent {
  private customersService = inject(CustomersService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  statusFilter = signal<StatusFilter>('all');
  statusOptions: StatusFilter[] = ['all', 'overdue', 'pending', 'paid', 'cancelled'];
  statusLabels = PAYMENT_STATUS_LABELS;
  paymentStatusBadgeClass = paymentStatusBadgeClass;
  formatDate = formatDate;
  formatMonthLabel = formatMonthLabel;

  private readonly currentMonth = todayIso().slice(0, 7);

  private rawSelectedMonth = signal(this.route.snapshot.queryParamMap.get('month') ?? this.currentMonth);

  /** Capped at currentMonth only - no forecasting future data. Any past month is fair game, even an empty one. */
  selectedMonth = computed(() => {
    const raw = this.rawSelectedMonth();
    return raw > this.currentMonth ? this.currentMonth : raw;
  });

  isCurrentMonth = computed(() => this.selectedMonth() === this.currentMonth);
  canGoNext = computed(() => this.selectedMonth() < this.currentMonth);
  selectedMonthLabel = computed(() => formatMonthLabel(this.selectedMonth()));

  allPayments = computed(() => this.customersService.payments()
    .map(p => ({ ...p, customerName: this.customersService.getCustomer(p.customerId)?.name ?? '' }))
    .sort((a, b) => b.date.localeCompare(a.date)));

  paymentsInMonth = computed(() => {
    const month = this.selectedMonth();
    return this.allPayments().filter(p => p.date.slice(0, 7) === month);
  });

  filteredPayments = computed(() => {
    const status = this.statusFilter();
    return this.paymentsInMonth().filter(p => status === 'all' || p.status === status);
  });

  totalSelectedMonth = computed(() =>
    this.paymentsInMonth()
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0)
  );

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
    }).subscribe(() => this.toast.success('התשלום סומן כשולם'));
  }

  goPrev() {
    this.goToMonth(this.shiftMonth(this.selectedMonth(), -1));
  }

  goNext() {
    if (this.canGoNext()) this.goToMonth(this.shiftMonth(this.selectedMonth(), 1));
  }

  goToCurrentMonth() {
    this.goToMonth(this.currentMonth);
  }

  constructor() {
    // Keeps the URL truthful once clamping corrects an out-of-range ?month (e.g. a stale bookmark).
    // Guarded against the value goToMonth() just wrote itself, so a normal switcher click doesn't
    // double-navigate.
    effect(() => {
      const month = this.selectedMonth();
      if (this.route.snapshot.queryParamMap.get('month') !== month) {
        this.router.navigate([], { relativeTo: this.route, queryParams: { month }, queryParamsHandling: 'merge', replaceUrl: true });
      }
    });
  }

  private goToMonth(month: string) {
    this.rawSelectedMonth.set(month);
  }

  private shiftMonth(month: string, delta: number): string {
    const [y, m] = month.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1 + delta, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }
}
