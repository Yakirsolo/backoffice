import { Component, Input, OnChanges, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideCheck, LucidePencil, LucidePlus, LucideX } from '@lucide/angular';
import { CustomersService } from '../../../../core/services/customers.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  BILLING_INTERVAL_UNIT_LABELS, Customer, PAYMENT_STATUS_LABELS, Payment, PaymentStatus
} from '../../../../core/models/customer.model';
import { formatDate, paymentStatusBadgeClass } from '../../../../shared/status-utils';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-payments-tab',
  standalone: true,
  imports: [FormsModule, EmptyStateComponent, LucidePlus, LucideX, LucideCheck, LucidePencil],
  template: `
    <div class="payments-layout">
      <section class="card panel subscription-card">
        <h3 class="panel-title">מנוי נוכחי</h3>
        <div class="detail-row"><span class="detail-label">מסלול</span><span>{{ customer.program }}</span></div>
        <div class="detail-row"><span class="detail-label">סכום ששולם</span><span class="tabular-nums">{{ lastAmount() }} ₪</span></div>
        <div class="detail-row">
          <span class="detail-label">תדירות תשלום</span>
          <span>כל {{ customer.billingIntervalValue }} {{ unitLabels[customer.billingIntervalUnit] }}</span>
        </div>
        <div class="detail-row"><span class="detail-label">תאריך התחלה</span><span class="tabular-nums">{{ formatDate(customer.startDate) }}</span></div>
        @if (customer.status === 'active') {
          <div class="detail-row">
            <span class="detail-label">תאריך תשלום הבא</span>
            <span class="tabular-nums">{{ customer.nextPaymentDate ? formatDate(customer.nextPaymentDate) : '—' }}</span>
          </div>
        }
        <div class="detail-row">
          <span class="detail-label">סטטוס תשלום אחרון</span>
          @if (latestStatus(); as status) {
            <span [class]="paymentStatusBadgeClass(status)">{{ statusLabels[status] }}</span>
          } @else {
            <span class="no-payments-hint">טרם נרשם תשלום</span>
          }
        </div>
      </section>

      <section>
        <div class="section-head">
          <h3 class="panel-title" style="margin-bottom: 0">היסטוריית תשלומים</h3>
          <button class="btn btn-secondary" (click)="showForm.set(!showForm())">
            @if (showForm()) { <svg lucideX class="icon"></svg> ביטול } @else { <svg lucidePlus class="icon"></svg> רישום תשלום }
          </button>
        </div>

        @if (showForm()) {
          <div class="card inline-form-card">
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
              <svg lucideCheck class="icon"></svg> {{ saving() ? 'שומרת...' : 'שמירת תשלום' }}
            </button>
          </div>
        }

        @if (payments().length === 0) {
          <app-empty-state heading="אין עדיין תשלומים">
            <svg lucidePlus class="icon" empty-icon></svg>
          </app-empty-state>
        } @else {
          <div class="payment-list">
            @for (p of payments(); track p.id) {
              @if (editingId() === p.id) {
                <div class="card inline-form-card">
                  <div class="three-col">
                    <div class="field-group">
                      <label class="field-label">סכום (₪) *</label>
                      <input class="input-field" type="number" [(ngModel)]="editAmount" />
                    </div>
                    <div class="field-group">
                      <label class="field-label">תאריך *</label>
                      <input class="input-field" type="date" [(ngModel)]="editDate" />
                    </div>
                    <div class="field-group">
                      <label class="field-label">סטטוס</label>
                      <select class="input-field" [(ngModel)]="editStatus">
                        @for (s of statusOptions; track s) {
                          <option [value]="s">{{ statusLabels[s] }}</option>
                        }
                      </select>
                    </div>
                  </div>
                  <div class="form-actions">
                    <button class="btn btn-primary" (click)="saveEdit(p.id)" [disabled]="!editAmount || !editDate || saving()">
                      <svg lucideCheck class="icon"></svg> {{ saving() ? 'שומרת...' : 'שמירה' }}
                    </button>
                    <button class="btn btn-secondary" (click)="cancelEdit()">ביטול</button>
                  </div>
                </div>
              } @else {
                <div class="card item-card payment-row">
                  <div class="payment-date tabular-nums">{{ formatDate(p.date) }}</div>
                  <div class="payment-amount tabular-nums">{{ p.amount }} ₪</div>
                  <span [class]="paymentStatusBadgeClass(p.status)">{{ statusLabels[p.status] }}</span>
                  <div class="payment-actions">
                    @if (p.status !== 'paid') {
                      <button class="btn btn-secondary btn-sm" (click)="markPaid(p)"><svg lucideCheck class="icon"></svg> סמן כשולם</button>
                    }
                    <button class="btn btn-secondary btn-sm" (click)="startEdit(p)"><svg lucidePencil class="icon"></svg> עריכה</button>
                  </div>
                </div>
              }
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
      gap: var(--space-6);
    }
    .no-payments-hint {
      color: var(--color-text-muted);
      font-size: 13px;
    }
    .subscription-card {
      max-width: 420px;
    }
    .inline-form-card {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      align-items: flex-start;
    }
    .payment-list {
      display: flex;
      flex-direction: column;
    }
    .payment-row {
      align-items: center;
      gap: var(--space-5);
    }
    .payment-date {
      font-weight: 600;
      width: 90px;
    }
    .payment-amount {
      font-weight: 700;
      flex: 1;
    }
    .payment-actions {
      display: flex;
      gap: var(--space-2);
    }
  `]
})
export class PaymentsTabComponent implements OnChanges {
  @Input({ required: true }) customer!: Customer;
  private customersService = inject(CustomersService);
  private toast = inject(ToastService);
  private idSignal = signal<string>('');

  payments = computed(() => this.customersService.paymentsFor(this.idSignal()));
  statusLabels = PAYMENT_STATUS_LABELS;
  unitLabels = BILLING_INTERVAL_UNIT_LABELS;
  statusOptions: PaymentStatus[] = ['paid', 'pending', 'overdue', 'cancelled'];
  formatDate = formatDate;
  paymentStatusBadgeClass = paymentStatusBadgeClass;

  lastAmount = computed(() => this.payments()[0]?.amount ?? 0);
  latestStatus = computed(() => this.payments()[0]?.status ?? null);

  showForm = signal(false);
  saving = signal(false);
  newAmount: number | null = null;
  newDate = '';
  newStatus: PaymentStatus = 'paid';

  editingId = signal<string | null>(null);
  editAmount: number | null = null;
  editDate = '';
  editStatus: PaymentStatus = 'paid';

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
        this.toast.success('התשלום נרשם בהצלחה');
      },
      error: () => this.saving.set(false)
    });
  }

  startEdit(p: Payment) {
    this.editingId.set(p.id);
    this.editAmount = p.amount;
    this.editDate = p.date;
    this.editStatus = p.status;
  }

  cancelEdit() {
    this.editingId.set(null);
  }

  saveEdit(paymentId: string) {
    if (!this.editAmount || !this.editDate) return;
    this.saving.set(true);
    this.customersService.updatePayment(this.customer.id, paymentId, {
      amount: this.editAmount,
      date: this.editDate,
      status: this.editStatus
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.editingId.set(null);
        this.toast.success('התשלום עודכן בהצלחה');
      },
      error: () => this.saving.set(false)
    });
  }

  markPaid(p: Payment) {
    this.customersService.updatePayment(this.customer.id, p.id, {
      amount: p.amount,
      date: p.date,
      status: 'paid'
    }).subscribe(() => this.toast.success('התשלום סומן כשולם'));
  }
}
