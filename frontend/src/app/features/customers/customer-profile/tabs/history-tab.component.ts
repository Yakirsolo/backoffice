import { Component, Input, OnChanges, inject, signal } from '@angular/core';
import { CustomersService } from '../../../../core/services/customers.service';
import { TIMELINE_EVENT_LABELS, TimelineEvent, TimelineEventType } from '../../../../core/models/customer.model';
import { formatDate } from '../../../../shared/status-utils';

const EVENT_ICONS: Record<TimelineEventType, string> = {
  customer_created: '✨',
  agreement_signed: '📝',
  weight_update: '⚖️',
  measurement_update: '📏',
  measurement_deleted: '🗑️',
  photo_upload: '📷',
  menu_uploaded: '🍽️',
  meeting_completed: '💬',
  payment_received: '💳',
  customer_finished: '🏁',
  customer_reactivated: '🔄'
};

@Component({
  selector: 'app-history-tab',
  standalone: true,
  template: `
    <section class="card timeline-card">
      <h3 class="section-title">ציר זמן</h3>
      @if (events().length === 0) {
        <div class="empty-state">אין עדיין אירועים</div>
      } @else {
        <div class="timeline">
          @for (event of events(); track event.id) {
            <div class="timeline-item">
              <div class="timeline-icon">{{ icons[event.type] }}</div>
              <div class="timeline-body">
                <div class="timeline-title">{{ labels[event.type] }}</div>
                @if (event.description) {
                  <div class="timeline-desc">{{ event.description }}</div>
                }
              </div>
              <div class="timeline-date">{{ formatDate(event.date) }}</div>
            </div>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    .timeline-card {
      padding: 20px;
    }
    .section-title {
      font-size: 14px;
      margin-bottom: 16px;
    }
    .timeline {
      display: flex;
      flex-direction: column;
    }
    .timeline-item {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 14px 0;
      border-bottom: 1px solid var(--color-border);
      position: relative;
    }
    .timeline-item:last-child {
      border-bottom: none;
    }
    .timeline-icon {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: var(--color-surface);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 15px;
    }
    .timeline-body {
      flex: 1;
    }
    .timeline-title {
      font-weight: 600;
      font-size: 14px;
    }
    .timeline-desc {
      color: var(--color-text-muted);
      font-size: 13px;
      margin-top: 2px;
    }
    .timeline-date {
      color: var(--color-text-muted);
      font-size: 12px;
      flex-shrink: 0;
      padding-top: 8px;
    }
  `]
})
export class HistoryTabComponent implements OnChanges {
  @Input({ required: true }) customerId!: string;
  private customersService = inject(CustomersService);

  events = signal<TimelineEvent[]>([]);
  labels = TIMELINE_EVENT_LABELS;
  icons = EVENT_ICONS;
  formatDate = formatDate;

  ngOnChanges() {
    this.customersService.timelineFor$(this.customerId).subscribe(list => this.events.set(list));
  }
}
