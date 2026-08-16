import { Component, Input, OnChanges, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CustomersService } from '../../../../core/services/customers.service';
import {
  BILLING_INTERVAL_UNIT_LABELS, BillingIntervalUnit, Customer, LEAD_SOURCE_LABELS, LeadSource
} from '../../../../core/models/customer.model';
import { defaultProgramName, formatDate } from '../../../../shared/status-utils';

type Section = 'personal' | 'business' | 'track';

@Component({
  selector: 'app-overview-tab',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="overview-grid">
      <section class="card section">
        <div class="section-header">
          <h3 class="section-title">פרטים אישיים</h3>
          @if (editingSection() !== 'personal') {
            <button class="btn btn-secondary btn-small" (click)="startEdit('personal')">✎ עריכה</button>
          }
        </div>
        @if (editingSection() === 'personal') {
          <div class="edit-form">
            <div class="field-group">
              <label class="field-label">שם *</label>
              <input class="input-field" [(ngModel)]="editName" />
            </div>
            <div class="field-group">
              <label class="field-label">גיל</label>
              <input class="input-field" type="number" [(ngModel)]="editAge" />
            </div>
            <div class="field-group">
              <label class="field-label">טלפון</label>
              <input class="input-field" [(ngModel)]="editPhone" />
            </div>
            <div class="field-group">
              <label class="field-label">Instagram</label>
              <input class="input-field" [(ngModel)]="editInstagram" />
            </div>
            <div class="field-group">
              <label class="field-label">Facebook</label>
              <input class="input-field" [(ngModel)]="editFacebook" />
            </div>
            <div class="field-group">
              <label class="field-label">תיאור קצר</label>
              <textarea class="input-field" rows="3" [(ngModel)]="editDescription"></textarea>
            </div>
            <div class="edit-actions">
              <button class="btn btn-primary" (click)="saveSection('personal')" [disabled]="!editName.trim() || saving()">
                {{ saving() ? 'שומרת...' : '✓ שמירה' }}
              </button>
              <button class="btn btn-secondary" (click)="cancelEdit()">ביטול</button>
            </div>
          </div>
        } @else {
          <div class="detail-row"><span class="detail-label">שם</span><span>{{ customer.name }}</span></div>
          <div class="detail-row"><span class="detail-label">גיל</span><span>{{ customer.age }}</span></div>
          <div class="detail-row"><span class="detail-label">טלפון</span><span>{{ customer.phone }}</span></div>
          @if (customer.instagram) {
            <div class="detail-row"><span class="detail-label">Instagram</span><span>{{ customer.instagram }}</span></div>
          }
          @if (customer.facebook) {
            <div class="detail-row"><span class="detail-label">Facebook</span><span>{{ customer.facebook }}</span></div>
          }
          <div class="detail-row description">
            <span class="detail-label">תיאור קצר</span>
            <p>{{ customer.description || '—' }}</p>
          </div>
        }
      </section>

      <section class="card section">
        <div class="section-header">
          <h3 class="section-title">פרטי עסק</h3>
          @if (editingSection() !== 'business') {
            <button class="btn btn-secondary btn-small" (click)="startEdit('business')">✎ עריכה</button>
          }
        </div>
        @if (editingSection() === 'business') {
          <div class="edit-form">
            <div class="field-group">
              <label class="field-label">מקור הגעה</label>
              <select class="input-field" [(ngModel)]="editSource">
                @for (s of sourceOptions; track s) {
                  <option [value]="s">{{ sourceLabels[s] }}</option>
                }
              </select>
            </div>
            <div class="edit-actions">
              <button class="btn btn-primary" (click)="saveSection('business')" [disabled]="saving()">
                {{ saving() ? 'שומרת...' : '✓ שמירה' }}
              </button>
              <button class="btn btn-secondary" (click)="cancelEdit()">ביטול</button>
            </div>
          </div>
        } @else {
          <div class="detail-row"><span class="detail-label">מקור הגעה</span><span>{{ sourceLabels[customer.source] }}</span></div>
        }
      </section>

      <section class="card section">
        <div class="section-header">
          <h3 class="section-title">מסלול</h3>
          @if (editingSection() !== 'track') {
            <button class="btn btn-secondary btn-small" (click)="startEdit('track')">✎ עריכה</button>
          }
        </div>
        @if (editingSection() === 'track') {
          <div class="edit-form">
            <div class="field-group">
              <label class="field-label">תדירות תשלום *</label>
              <div class="billing-cadence">
                <span>כל</span>
                <input class="input-field" type="number" min="1" [(ngModel)]="editBillingIntervalValue" />
                <select class="input-field" [(ngModel)]="editBillingIntervalUnit">
                  @for (u of billingUnitOptions; track u) {
                    <option [value]="u">{{ billingUnitLabels[u] }}</option>
                  }
                </select>
              </div>
            </div>
            <div class="field-group">
              <label class="field-label">מסלול</label>
              <input class="input-field" type="text" [value]="editProgramName" disabled />
            </div>
            <div class="field-group">
              <label class="field-label">משקל יעד (ק"ג)</label>
              <input class="input-field" type="number" step="0.1" [(ngModel)]="editTargetWeight" />
            </div>
            <div class="detail-row"><span class="detail-label">תאריך תחילת תהליך</span><span>{{ formatDate(customer.startDate) }}</span></div>
            <div class="detail-row"><span class="detail-label">משקל התחלתי</span><span>{{ customer.startWeight }} ק"ג</span></div>
            <p class="hint">לעדכון משקל/תאריך התחלה, ערכו את המדידה הראשונה בלשונית התקדמות</p>
            <div class="edit-actions">
              <button class="btn btn-primary" (click)="saveSection('track')" [disabled]="!editBillingIntervalValue || !editTargetWeight || saving()">
                {{ saving() ? 'שומרת...' : '✓ שמירה' }}
              </button>
              <button class="btn btn-secondary" (click)="cancelEdit()">ביטול</button>
            </div>
          </div>
        } @else {
          <div class="detail-row"><span class="detail-label">מסלול</span><span>{{ customer.program }}</span></div>
          <div class="detail-row"><span class="detail-label">תדירות תשלום</span><span>כל {{ customer.billingIntervalValue }} {{ billingUnitLabels[customer.billingIntervalUnit] }}</span></div>
          <div class="detail-row"><span class="detail-label">תאריך תחילת תהליך</span><span>{{ formatDate(customer.startDate) }}</span></div>
          <div class="detail-row"><span class="detail-label">משקל התחלתי</span><span>{{ customer.startWeight }} ק"ג</span></div>
          <div class="detail-row"><span class="detail-label">משקל יעד</span><span>{{ customer.targetWeight }} ק"ג</span></div>
        }
      </section>
    </div>
  `,
  styles: [`
    .overview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
    }
    .section {
      padding: 20px;
    }
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }
    .section-title {
      font-size: 14px;
      margin-bottom: 0;
    }
    .btn-small {
      padding: 5px 10px;
      font-size: 13px;
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
    .detail-row.description {
      flex-direction: column;
      gap: 6px;
    }
    .detail-row.description p {
      color: var(--color-text-muted);
    }
    .detail-label {
      color: var(--color-text-muted);
      font-weight: 600;
      flex-shrink: 0;
    }
    .edit-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .hint {
      font-size: 12px;
      color: var(--color-text-faint);
      margin: 0;
    }
    .billing-cadence {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .billing-cadence input {
      width: 70px;
    }
    .billing-cadence select {
      flex: 1;
    }
    .edit-actions {
      display: flex;
      gap: 10px;
      margin-top: 4px;
    }
  `]
})
export class OverviewTabComponent implements OnChanges {
  @Input({ required: true }) customer!: Customer;
  private customersService = inject(CustomersService);

  sourceLabels = LEAD_SOURCE_LABELS;
  sourceOptions: LeadSource[] = ['instagram', 'facebook', 'referral', 'website', 'other'];
  billingUnitLabels = BILLING_INTERVAL_UNIT_LABELS;
  billingUnitOptions: BillingIntervalUnit[] = ['day', 'week', 'month'];
  formatDate = formatDate;

  editingSection = signal<Section | null>(null);
  saving = signal(false);

  editName = '';
  editAge: number | null = null;
  editPhone = '';
  editInstagram = '';
  editFacebook = '';
  editDescription = '';
  editSource: LeadSource = 'other';
  editBillingIntervalValue: number | null = null;
  editBillingIntervalUnit: BillingIntervalUnit = 'month';
  editTargetWeight: number | null = null;

  /** The plan name is derived from its billing cadence - kept consistent with customer-wizard's step 1. */
  get editProgramName(): string {
    return defaultProgramName(this.editBillingIntervalValue ?? 0, this.editBillingIntervalUnit);
  }

  ngOnChanges() {
    if (this.editingSection()) this.cancelEdit();
  }

  startEdit(section: Section) {
    this.editName = this.customer.name;
    this.editAge = this.customer.age;
    this.editPhone = this.customer.phone;
    this.editInstagram = this.customer.instagram ?? '';
    this.editFacebook = this.customer.facebook ?? '';
    this.editDescription = this.customer.description ?? '';
    this.editSource = this.customer.source;
    this.editBillingIntervalValue = this.customer.billingIntervalValue;
    this.editBillingIntervalUnit = this.customer.billingIntervalUnit;
    this.editTargetWeight = this.customer.targetWeight;
    this.editingSection.set(section);
  }

  cancelEdit() {
    this.editingSection.set(null);
  }

  saveSection(section: Section) {
    this.saving.set(true);
    const data =
      section === 'personal'
        ? {
            name: this.editName.trim(),
            age: this.editAge ?? undefined,
            phone: this.editPhone,
            instagram: this.editInstagram,
            facebook: this.editFacebook,
            description: this.editDescription
          }
        : section === 'business'
          ? { source: this.editSource }
          : {
              program: this.editProgramName,
              targetWeight: this.editTargetWeight ?? undefined,
              billingIntervalValue: this.editBillingIntervalValue ?? undefined,
              billingIntervalUnit: this.editBillingIntervalUnit
            };

    this.customersService.updateCustomer(this.customer.id, data).subscribe({
      next: () => {
        this.saving.set(false);
        this.editingSection.set(null);
      },
      error: () => this.saving.set(false)
    });
  }
}
