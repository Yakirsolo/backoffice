import { Component, Input } from '@angular/core';
import { Customer, LEAD_SOURCE_LABELS } from '../../../../core/models/customer.model';
import { formatDate } from '../../../../shared/status-utils';

@Component({
  selector: 'app-overview-tab',
  standalone: true,
  template: `
    <div class="overview-grid">
      <section class="card section">
        <h3 class="section-title">פרטים אישיים</h3>
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
      </section>

      <section class="card section">
        <h3 class="section-title">פרטי עסק</h3>
        <div class="detail-row"><span class="detail-label">מקור הגעה</span><span>{{ sourceLabels[customer.source] }}</span></div>
      </section>

      <section class="card section">
        <h3 class="section-title">מסלול</h3>
        <div class="detail-row"><span class="detail-label">מסלול</span><span>{{ customer.program }}</span></div>
        <div class="detail-row"><span class="detail-label">תאריך תחילת תהליך</span><span>{{ formatDate(customer.startDate) }}</span></div>
        <div class="detail-row"><span class="detail-label">משקל התחלתי</span><span>{{ customer.startWeight }} ק"ג</span></div>
        <div class="detail-row"><span class="detail-label">משקל יעד</span><span>{{ customer.targetWeight }} ק"ג</span></div>
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
    .section-title {
      font-size: 14px;
      margin-bottom: 14px;
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
  `]
})
export class OverviewTabComponent {
  @Input({ required: true }) customer!: Customer;
  sourceLabels = LEAD_SOURCE_LABELS;
  formatDate = formatDate;
}
