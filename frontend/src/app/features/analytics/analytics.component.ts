import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CustomersService } from '../../core/services/customers.service';
import { ExpensesService } from '../../core/services/expenses.service';
import {
  CUSTOMER_STATUS_LABELS, CustomerStatus, ExpenseCategory, EXPENSE_CATEGORY_COLORS, EXPENSE_CATEGORY_LABELS,
  LeadSource, LEAD_SOURCE_LABELS
} from '../../core/models/customer.model';
import { formatMonthLabel, formatWeightChange, todayIso } from '../../shared/status-utils';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LucideReceipt, LucideUsers } from '@lucide/angular';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [EmptyStateComponent, LucideUsers, LucideReceipt],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.scss'
})
export class AnalyticsComponent {
  private customersService = inject(CustomersService);
  private expensesService = inject(ExpensesService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  statusLabels = CUSTOMER_STATUS_LABELS;
  sourceLabels = LEAD_SOURCE_LABELS;
  categoryLabels = EXPENSE_CATEGORY_LABELS;
  categoryColors = EXPENSE_CATEGORY_COLORS;
  formatMonthLabel = formatMonthLabel;

  formatAmount(n: number): string {
    return n.toLocaleString('he-IL', { maximumFractionDigits: 2 });
  }

  /**
   * Fixed per-source, not per-rank, so a given source is always the same color regardless of which
   * others appear that month. Muted, warm-toned hues chosen to harmonize with the app's sage/olive
   * palette rather than the saturated categorical set a default chart library would produce.
   */
  sourceColors: Record<LeadSource, string> = {
    instagram: '#c77b62',
    facebook: '#6e90a8',
    referral: '#6e7d5e',
    website: '#bc9a46',
    other: '#8f7a96'
  };

  private readonly donutRadius = 60;
  private readonly donutCircumference = 2 * Math.PI * this.donutRadius;
  private readonly donutGapPx = 3;

  hoveredSource = signal<LeadSource | null>(null);
  hoveredCategory = signal<ExpenseCategory | null>(null);

  private readonly currentMonth = todayIso().slice(0, 7);

  customers = computed(() => this.customersService.customers());
  payments = computed(() => this.customersService.payments());
  expenses = computed(() => this.expensesService.expenses());

  private rawSelectedMonth = signal(this.route.snapshot.queryParamMap.get('month') ?? this.currentMonth);

  /** Capped at currentMonth only - no forecasting future data. Any past month is fair game, even an empty one. */
  selectedMonth = computed(() => {
    const raw = this.rawSelectedMonth();
    return raw > this.currentMonth ? this.currentMonth : raw;
  });

  isCurrentMonth = computed(() => this.selectedMonth() === this.currentMonth);
  canGoNext = computed(() => this.selectedMonth() < this.currentMonth);
  selectedMonthLabel = computed(() => formatMonthLabel(this.selectedMonth()));

  newCustomersInMonth = computed(() => {
    const month = this.selectedMonth();
    return this.customers().filter(c => c.startDate.slice(0, 7) === month);
  });

  newCustomersCount = computed(() => this.newCustomersInMonth().length);

  monthRevenue = computed(() => {
    const month = this.selectedMonth();
    return this.payments()
      .filter(p => p.status === 'paid' && p.date.slice(0, 7) === month)
      .reduce((sum, p) => sum + p.amount, 0);
  });

  paymentsReceivedCount = computed(() => {
    const month = this.selectedMonth();
    return this.payments().filter(p => p.status === 'paid' && p.date.slice(0, 7) === month).length;
  });

  private monthExpenses = computed(() => {
    const month = this.selectedMonth();
    return this.expenses().filter(e => e.date.slice(0, 7) === month);
  });

  monthExpensesTotal = computed(() => this.monthExpenses().reduce((sum, e) => sum + e.amount, 0));
  monthExpensesCount = computed(() => this.monthExpenses().length);

  /** Revenue minus expenses for the selected month - the single "am I profitable this month" figure. */
  netProfit = computed(() => this.monthRevenue() - this.monthExpensesTotal());

  totalExpenses = computed(() => this.expenses().reduce((sum, e) => sum + e.amount, 0));

  expenseCategoryBreakdown = computed(() => {
    const list = this.monthExpenses();
    const total = list.reduce((sum, e) => sum + e.amount, 0);
    const byCategory = new Map<ExpenseCategory, number>();
    for (const e of list) {
      byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
    }
    // Fixed draw order (order in EXPENSE_CATEGORY_LABELS) so slices don't jump around as data changes.
    return (Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[])
      .filter(c => byCategory.has(c))
      .map(category => {
        const amount = byCategory.get(category)!;
        return { category, amount, percent: total ? Math.round((amount / total) * 100) : 0 };
      });
  });

  expenseDonutSegments = computed(() => {
    const items = this.expenseCategoryBreakdown();
    const total = items.reduce((sum, i) => sum + i.amount, 0);
    let cursor = 0;
    return items.map(item => {
      const fraction = total ? item.amount / total : 0;
      const rawLength = fraction * this.donutCircumference;
      const length = Math.max(rawLength - this.donutGapPx, 0);
      const segment = {
        ...item,
        color: this.categoryColors[item.category],
        dashArray: `${length} ${this.donutCircumference - length}`,
        dashOffset: -cursor
      };
      cursor += rawLength;
      return segment;
    });
  });

  sourceBreakdown = computed(() => {
    const list = this.newCustomersInMonth();
    const bySource = new Map<LeadSource, number>();
    for (const c of list) {
      bySource.set(c.source, (bySource.get(c.source) ?? 0) + 1);
    }
    return Array.from(bySource.entries()).map(([source, count]) => ({
      source,
      count,
      percent: list.length ? Math.round((count / list.length) * 100) : 0
    }));
  });

  /** Ring geometry for sourceBreakdown, in a fixed draw order (order in LEAD_SOURCE_LABELS) so slices don't jump around as data changes. */
  sourceDonutSegments = computed(() => {
    const items = this.sourceBreakdown();
    const total = items.reduce((sum, i) => sum + i.count, 0);
    let cursor = 0;
    return items.map(item => {
      const fraction = total ? item.count / total : 0;
      const rawLength = fraction * this.donutCircumference;
      const length = Math.max(rawLength - this.donutGapPx, 0);
      const segment = {
        ...item,
        color: this.sourceColors[item.source],
        dashArray: `${length} ${this.donutCircumference - length}`,
        dashOffset: -cursor
      };
      cursor += rawLength;
      return segment;
    });
  });

  // "Live" metrics below are intentionally not scoped to selectedMonth - the data model has no
  // historical status-change or per-month weight snapshot, so these always reflect right now.

  averageWeightLoss = computed(() => {
    const list = this.customers();
    if (!list.length) return 0;
    const total = list.reduce((sum, c) => sum + this.customersService.weightLoss(c), 0);
    return Math.round((total / list.length) * 10) / 10;
  });

  averageWeightLossText = computed(() => formatWeightChange(this.averageWeightLoss()));

  totalRevenue = computed(() =>
    this.payments().filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0)
  );

  statusBreakdown = computed(() => {
    const list = this.customers();
    const statuses: CustomerStatus[] = ['active', 'finished'];
    return statuses.map(status => ({
      status,
      count: list.filter(c => c.status === status).length,
      percent: list.length ? Math.round((list.filter(c => c.status === status).length / list.length) * 100) : 0
    }));
  });

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
