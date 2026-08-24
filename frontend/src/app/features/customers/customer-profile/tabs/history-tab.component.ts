import { Component, Input, OnChanges, inject, signal } from '@angular/core';
import {
  LucideCamera, LucideCreditCard, LucideFileText, LucideFlag, LucideMessageCircle,
  LucidePaperclip, LucideRotateCcw, LucideRuler, LucideScale, LucideSparkles, LucideTrash2, LucideUtensils
} from '@lucide/angular';
import { CustomersService } from '../../../../core/services/customers.service';
import { TIMELINE_EVENT_LABELS, TimelineEvent } from '../../../../core/models/customer.model';
import { formatDate } from '../../../../shared/status-utils';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-history-tab',
  standalone: true,
  imports: [
    EmptyStateComponent,
    LucideSparkles, LucideFileText, LucideScale, LucideRuler, LucideTrash2, LucideCamera,
    LucideUtensils, LucidePaperclip, LucideMessageCircle, LucideCreditCard, LucideFlag, LucideRotateCcw
  ],
  template: `
    <section class="card panel timeline-card">
      <h3 class="panel-title">ציר זמן</h3>
      @if (events().length === 0) {
        <app-empty-state heading="אין עדיין אירועים">
          <svg lucideSparkles class="icon" empty-icon></svg>
        </app-empty-state>
      } @else {
        <div class="timeline">
          @for (event of events(); track event.id) {
            <div class="timeline-item">
              <div class="timeline-icon">
                @switch (event.type) {
                  @case ('customer_created') { <svg lucideSparkles class="icon"></svg> }
                  @case ('agreement_signed') { <svg lucideFileText class="icon"></svg> }
                  @case ('weight_update') { <svg lucideScale class="icon"></svg> }
                  @case ('measurement_update') { <svg lucideRuler class="icon"></svg> }
                  @case ('measurement_deleted') { <svg lucideTrash2 class="icon"></svg> }
                  @case ('photo_upload') { <svg lucideCamera class="icon"></svg> }
                  @case ('photo_deleted') { <svg lucideTrash2 class="icon"></svg> }
                  @case ('menu_uploaded') { <svg lucideUtensils class="icon"></svg> }
                  @case ('document_uploaded') { <svg lucidePaperclip class="icon"></svg> }
                  @case ('document_deleted') { <svg lucideTrash2 class="icon"></svg> }
                  @case ('meeting_completed') { <svg lucideMessageCircle class="icon"></svg> }
                  @case ('payment_received') { <svg lucideCreditCard class="icon"></svg> }
                  @case ('customer_finished') { <svg lucideFlag class="icon"></svg> }
                  @case ('customer_reactivated') { <svg lucideRotateCcw class="icon"></svg> }
                }
              </div>
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
    .timeline {
      display: flex;
      flex-direction: column;
    }
    .timeline-item {
      display: flex;
      align-items: flex-start;
      gap: var(--space-4);
      padding: var(--space-4) 0;
      border-bottom: 1px solid var(--color-border);
    }
    .timeline-item:last-child {
      border-bottom: none;
    }
    .timeline-icon {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: var(--color-surface-sunken);
      color: var(--color-text-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .timeline-body {
      flex: 1;
    }
    .timeline-title {
      font-weight: 600;
      font-size: 13.5px;
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
  formatDate = formatDate;

  ngOnChanges() {
    this.customersService.timelineFor$(this.customerId).subscribe(list => this.events.set(list));
  }
}
