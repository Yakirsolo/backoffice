import { Component, Input, OnChanges, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideCalendar, LucideVideo } from '@lucide/angular';
import { CustomersService } from '../../../../core/services/customers.service';
import { ToastService } from '../../../../core/services/toast.service';
import { formatDate, formatTime } from '../../../../shared/status-utils';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-meetings-tab',
  standalone: true,
  imports: [FormsModule, EmptyStateComponent, LucideCalendar, LucideVideo],
  template: `
    <div class="meetings-layout">
      <section class="card panel inline-form-card">
        <h3 class="panel-title">קביעת פגישה חדשה</h3>
        <div class="three-col">
          <div class="field-group">
            <label class="field-label">תאריך</label>
            <input class="input-field" type="date" [(ngModel)]="newDate" />
          </div>
          <div class="field-group">
            <label class="field-label">שעה</label>
            <input class="input-field" type="time" [(ngModel)]="newTime" />
          </div>
          <div class="field-group">
            <label class="field-label">סוג פגישה</label>
            <input class="input-field" type="text" placeholder="שיחת זום, מעקב שבועי..." [(ngModel)]="newType" />
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">קישור Zoom <span class="optional-hint">(אופציונלי)</span></label>
          <input class="input-field" type="text" placeholder="https://zoom.us/j/..." [(ngModel)]="newZoomLink" />
        </div>
        <label class="reminder-check">
          <input type="checkbox" [(ngModel)]="newReminder" /> שלח תזכורת ללקוחה
        </label>
        <button class="btn btn-primary" (click)="addMeeting()" [disabled]="!newDate() || !newTime() || !newType()">
          <svg lucideCalendar class="icon"></svg> שמירת פגישה
        </button>
      </section>

      <section>
        <h3 class="panel-title">היסטוריית פגישות</h3>
        @if (meetings().length === 0) {
          <app-empty-state heading="אין עדיין פגישות">
            <svg lucideCalendar class="icon" empty-icon></svg>
          </app-empty-state>
        } @else {
          <div class="meeting-list">
            @for (m of meetings(); track m.id) {
              <div class="card item-card meeting-card">
                <div class="meeting-when">
                  <div class="meeting-date tabular-nums">{{ formatDate(m.date) }}</div>
                  <div class="meeting-time tabular-nums">{{ formatTime(m.time) }}</div>
                </div>
                <div class="meeting-body">
                  <div class="meeting-type-row">
                    <span class="meeting-type">{{ m.type }}</span>
                    @if (m.durationMinutes) {
                      <span class="meeting-duration">{{ m.durationMinutes }} דקות</span>
                    }
                    <span class="badge" [class.badge-success]="m.completed" [class.badge-primary]="!m.completed">
                      {{ m.completed ? 'התקיימה' : 'מתוכננת' }}
                    </span>
                  </div>
                  @if (m.notes) {
                    <div class="meeting-notes">{{ m.notes }}</div>
                  }
                  @if (m.zoomLink) {
                    <a class="meeting-zoom" [href]="m.zoomLink" target="_blank" rel="noopener">
                      <svg lucideVideo style="width: 12px; height: 12px"></svg> קישור Zoom
                    </a>
                  }
                </div>
              </div>
            }
          </div>
        }
      </section>
    </div>
  `,
  styles: [`
    .meetings-layout {
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
    }
    .inline-form-card {
      align-items: flex-start;
      margin-bottom: 0;
    }
    .inline-form-card > .three-col,
    .inline-form-card > .field-group {
      width: 100%;
    }
    .reminder-check {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: 13px;
      color: var(--color-text-muted);
      margin-bottom: var(--space-4);
    }
    .meeting-list {
      display: flex;
      flex-direction: column;
    }
    .meeting-card {
      align-items: flex-start;
      gap: var(--space-5);
    }
    .meeting-when {
      width: 80px;
      flex-shrink: 0;
      text-align: center;
    }
    .meeting-date {
      font-weight: 700;
      font-size: 13px;
    }
    .meeting-time {
      color: var(--color-text-muted);
      font-size: 12px;
      margin-top: 2px;
    }
    .meeting-body {
      flex: 1;
    }
    .meeting-type-row {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }
    .meeting-type {
      font-weight: 600;
      font-size: 13.5px;
    }
    .meeting-duration {
      color: var(--color-text-muted);
      font-size: 12px;
    }
    .meeting-notes {
      color: var(--color-text-muted);
      font-size: 13px;
      margin-top: 6px;
    }
    .meeting-zoom {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--color-primary);
      font-size: 12px;
      margin-top: 6px;
      font-weight: 600;
    }
  `]
})
export class MeetingsTabComponent implements OnChanges {
  @Input({ required: true }) customerId!: string;
  private customersService = inject(CustomersService);
  private toast = inject(ToastService);
  private idSignal = signal<string>('');

  meetings = computed(() => this.customersService.meetingsFor(this.idSignal()));
  formatDate = formatDate;
  formatTime = formatTime;

  newDate = signal('');
  newTime = signal('');
  newType = signal('');
  newZoomLink = signal('');
  newReminder = signal(true);

  addMeeting() {
    this.customersService.addMeeting(this.customerId, {
      date: this.newDate(),
      time: this.newTime(),
      type: this.newType(),
      zoomLink: this.newZoomLink() || undefined
    }).subscribe(() => {
      this.newDate.set('');
      this.newTime.set('');
      this.newType.set('');
      this.newZoomLink.set('');
      this.toast.success('הפגישה נקבעה בהצלחה');
    });
  }

  ngOnChanges() {
    this.idSignal.set(this.customerId);
  }
}
