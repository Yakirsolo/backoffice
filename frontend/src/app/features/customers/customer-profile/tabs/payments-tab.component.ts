import { Component, Input, OnChanges, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CustomersService } from '../../../../core/services/customers.service';
import {
  BILLING_INTERVAL_UNIT_LABELS, Customer, PAYMENT_STATUS_LABELS, PaymentStatus
} from '../../../../core/models/customer.model';
import { formatDate, paymentStatusBadgeClass } from '../../../../shared/status-utils';

@Component({
  selector: 'app-payments-tab',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="payments-layout">
      <section class="card subscription-card">
        <h3 class="section-title">מנוי נוכחי</h3>
        <div class="detail-row"><span class="detail-label">מסלול</span><span>{{ customer.program }}</span></div>
        <div class="detail-row"><span class="detail-label">סכום ששולם</span><span>{{ lastAmount() }} ₪</span></div>
        <div class="detail-row">
          <span class="detail-label">תדירות תשלום</span>
          <span>כל {{ customer.billingIntervalValue }} {{ unitLabels[customer.billingIntervalUnit] }}</span>
        </div>
        <div class="detail-row"><span class="detail-label">תאריך התחלה</span><span>{{ formatDate(customer.startDate) }}</span></div>
        @if (customer.status === 'active') {
          <div class="detail-row">
            <span class="detail-label">תאריך תשלום הבא</span>
            <span>{{ customer.nextPaymentDate ? formatDate(customer.nextPaymentDate) : '—' }}</span>
          </div>
        }
        <div class="detail-row">
          <span class="detail-label">סטטוס תשלום אחרון</span>
          <span [class]="paymentStatusBadgeClass(latestStatus())">{{ statusLabels[latestStatus()] }}</span>
        </div>
      </section>

      <section class="history">
        <div class="history-header">
          <h3 class="section-title">היסטוריית תשלומים</h3>
          <button class="btn btn-secondary" (click)="showForm.set(!showForm())">
            {{ showForm() ? '✕ ביטול' : '➕ רישום תשלום' }}
          </button>
        </div>

        @if (showForm()) {
          <div class="card new-payment-card">
            <div class="three-col">
              <div class="field-group">
                <label class="field-label">סכום (₪) *</label>
                <input class="input-field" type="number" [(ngModel)]="newAmount" />
              </div>
              <div class="field-group">
                <label class="field-label">תאריך *</label>
                <input class="input-field" type="date" [(ngModel)]="newDate" />
              </div>
              <div class="field-group">
                <label class="field-label">סטטוס</label>
                <select class="input-field" [(ngModel)]="newStatus">
                  @for (s of statusOptions; track s) {
                    <option [value]="s">{{ statusLabels[s] }}</option>
                  }
                </select>
              </div>
            </div>
            <button class="btn btn-primary" (click)="addPayment()" [disabled]="!newAmount || !newDate || saving()">
              {{ saving() ? 'שומרת...' : '✓ שמירת תשלום' }}
            </button>
          </div>
        }

        @if (payments().length === 0) {
          <div class="card empty-state">אין עדיין תשלומים</div>
        } @else {
          <div class="payment-list">
            @for (p of payments(); track p.id) {
              <div class="card payment-row">
                <div class="payment-date">{{ formatDate(p.date) }}</div>
                <div class="payment-amount">{{ p.amount }} ₪</div>
                <span [class]="paymentStatusBadgeClass(p.status)">{{ statusLabels[p.status] }}</span>
              </div>
            }
          </div>
        }
      </section>
    </div>
  `,
  styles: [`
    .payments-layout {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .section-title {
      font-size: 14px;
      margin-bottom: 14px;
    }
    .subscription-card {
      padding: 20px;
      max-width: 420px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 9px 0;
      border-bottom: 1px solid var(--color-border);
      font-size: 14px;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      color: var(--color-text-muted);
      font-weight: 600;
    }
    .history-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }
    .new-payment-card {
      padding: 18px;
      margin-bottom: 14px;
    }
    .three-col {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
    }
    .payment-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .payment-row {
      padding: 14px 18px;
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .payment-date {
      font-weight: 600;
      width: 90px;
    }
    .payment-amount {
      font-weight: 700;
      flex: 1;
    }
    @media (max-width: 720px) {
      .three-col {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class PaymentsTabComponent implements OnChanges {
  @Input({ required: true }) customer!: Customer;
  private customersService = inject(CustomersService);
  private idSignal = signal<string>('');

  payments = computed(() => this.customersService.paymentsFor(this.idSignal()));
  statusLabels = PAYMENT_STATUS_LABELS;
  unitLabels = BILLING_INTERVAL_UNIT_LABELS;
  statusOptions: PaymentStatus[] = ['paid', 'pending', 'overdue', 'cancelled'];
  formatDate = formatDate;
  paymentStatusBadgeClass = paymentStatusBadgeClass;

  lastAmount = computed(() => this.payments()[0]?.amount ?? 0);
  latestStatus = computed(() => this.payments()[0]?.status ?? 'pending');

  showForm = signal(false);
  saving = signal(false);
  newAmount: number | null = null;
  newDate = '';
  newStatus: PaymentStatus = 'paid';

  ngOnChanges() {
    this.idSignal.set(this.customer.id);
    this.newAmount = this.lastAmount() || this.newAmount;
    this.newDate = this.customer.nextPaymentDate ?? '';
  }

  addPayment() {
    if (!this.newAmount || !this.newDate) return;
    this.saving.set(true);
    this.customersService.addPayment(this.customer.id, {
      amount: this.newAmount,
      date: this.newDate,
      status: this.newStatus
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
      },
      error: () => this.saving.set(false)
    });
  }
}
