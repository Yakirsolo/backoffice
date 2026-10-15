import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LucidePaperclip, LucidePlus, LucideReceipt, LucideTrash2 } from '@lucide/angular';
import { ExpensesService } from '../../core/services/expenses.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { ToastService } from '../../core/services/toast.service';
import { Expense, EXPENSE_CATEGORY_COLORS, EXPENSE_CATEGORY_LABELS } from '../../core/models/customer.model';
import { formatDate, formatMonthLabel, todayIso } from '../../shared/status-utils';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ExpenseDialogComponent } from '../../shared/components/expense-dialog/expense-dialog.component';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [EmptyStateComponent, ExpenseDialogComponent, LucidePlus, LucideReceipt, LucidePaperclip, LucideTrash2],
  templateUrl: './expenses.component.html',
  styleUrl: './expenses.component.scss'
})
export class ExpensesComponent {
  private expensesService = inject(ExpensesService);
  private confirmDialog = inject(ConfirmDialogService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  categoryLabels = EXPENSE_CATEGORY_LABELS;
  categoryColors = EXPENSE_CATEGORY_COLORS;
  formatDate = formatDate;

  dialogOpen = signal(false);
  editingExpense = signal<Expense | null>(null);

  private readonly currentMonth = todayIso().slice(0, 7);
  private rawSelectedMonth = signal(this.route.snapshot.queryParamMap.get('month') ?? this.currentMonth);

  /** Capped at currentMonth - no future months. Any past month is fair game, even an empty one. */
  selectedMonth = computed(() => {
    const raw = this.rawSelectedMonth();
    return raw > this.currentMonth ? this.currentMonth : raw;
  });

  isCurrentMonth = computed(() => this.selectedMonth() === this.currentMonth);
  canGoNext = computed(() => this.selectedMonth() < this.currentMonth);
  selectedMonthLabel = computed(() => formatMonthLabel(this.selectedMonth()));

  expensesInMonth = computed(() => {
    const month = this.selectedMonth();
    return this.expensesService.expenses().filter(e => e.date.slice(0, 7) === month);
  });

  monthTotal = computed(() => this.expensesInMonth().reduce((sum, e) => sum + e.amount, 0));
  monthCount = computed(() => this.expensesInMonth().length);

  formatAmount(n: number): string {
    return n.toLocaleString('he-IL', { maximumFractionDigits: 2 });
  }

  openAdd() {
    this.editingExpense.set(null);
    this.dialogOpen.set(true);
  }

  openEdit(expense: Expense) {
    this.editingExpense.set(expense);
    this.dialogOpen.set(true);
  }

  closeDialog() {
    this.dialogOpen.set(false);
    this.editingExpense.set(null);
  }

  async deleteExpense(expense: Expense, event: Event) {
    event.stopPropagation();
    const confirmed = await this.confirmDialog.confirm({
      title: 'מחיקת הוצאה',
      message: `למחוק את "${expense.description}"?`,
      confirmLabel: 'מחיקה',
      danger: true
    });
    if (!confirmed) return;
    this.expensesService.remove(expense.id).subscribe({
      next: () => this.toast.success('ההוצאה נמחקה'),
      error: () => this.toast.error('מחיקת ההוצאה נכשלה')
    });
  }

  openReceipt(expense: Expense, event: Event) {
    event.stopPropagation();
    if (expense.receiptUrl) window.open(expense.receiptUrl, '_blank', 'noopener');
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
