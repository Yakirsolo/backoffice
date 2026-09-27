import { Component, Input, OnChanges, computed, inject, signal } from '@angular/core';
import { LucideCalendar, LucideCheck, LucidePencil, LucidePlus, LucideTrash2, LucideVideo } from '@lucide/angular';
import { CustomersService } from '../../../../core/services/customers.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Meeting } from '../../../../core/models/customer.model';
import { formatDate, formatTime } from '../../../../shared/status-utils';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { MeetingDialogComponent } from '../../../../shared/components/meeting-dialog/meeting-dialog.component';

@Component({
  selector: 'app-meetings-tab',
  standalone: true,
  imports: [EmptyStateComponent, MeetingDialogComponent, LucideCalendar, LucidePlus, LucideVideo, LucidePencil, LucideTrash2, LucideCheck],
  template: `
    <section>
      <div class="section-head">
        <h3 class="panel-title">פגישות</h3>
        <button class="btn btn-primary btn-sm" (click)="openCreate()">
          <svg lucidePlus class="icon"></svg> פגישה חדשה
        </button>
      </div>

      @if (meetings().length === 0) {
        <app-empty-state heading="אין עדיין פגישות" message="קבעו פגישה כדי להתחיל לעקוב אחרי המפגשים">
          <svg lucideCalendar class="icon" empty-icon></svg>
          <button empty-action class="btn btn-primary empty-cta" (click)="openCreate()">
            <svg lucidePlus class="icon"></svg> קביעת פגישה
          </button>
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
                @if (!m.completed) {
                  <div class="meeting-actions">
                    <button type="button" class="btn btn-secondary btn-sm" (click)="markCompleted(m)">
                      <svg lucideCheck class="icon"></svg> סימון כהתקיימה
                    </button>
                    <button type="button" class="btn btn-ghost btn-sm icon-only" title="עריכה" (click)="openEdit(m)">
                      <svg lucidePencil class="icon"></svg>
                    </button>
                    <button type="button" class="btn btn-ghost btn-sm icon-only" title="מחיקה" (click)="deleteMeeting(m)">
                      <svg lucideTrash2 class="icon"></svg>
                    </button>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }
    </section>

    @if (dialogOpen()) {
      <app-meeting-dialog [customerId]="customerId" [meeting]="editingMeeting()" (closed)="dialogOpen.set(false)" />
    }
  `,
  styles: [`
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
    .meeting-actions {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      margin-top: var(--space-3);
    }
    /* Projected into <app-empty-state>, so the empty-state icon rule needs undoing here. */
    .empty-cta .icon {
      width: 18px;
      height: 18px;
      margin: 0;
      color: inherit;
    }
  `]
})
export class MeetingsTabComponent implements OnChanges {
  @Input({ required: true }) customerId!: string;
  private customersService = inject(CustomersService);
  private toast = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);
  private idSignal = signal<string>('');

  meetings = computed(() => this.customersService.meetingsFor(this.idSignal()));
  formatDate = formatDate;
  formatTime = formatTime;
  dialogOpen = signal(false);
  editingMeeting = signal<Meeting | null>(null);

  ngOnChanges() {
    this.idSignal.set(this.customerId);
  }

  openCreate() {
    this.editingMeeting.set(null);
    this.dialogOpen.set(true);
  }

  openEdit(m: Meeting) {
    this.editingMeeting.set(m);
    this.dialogOpen.set(true);
  }

  markCompleted(m: Meeting) {
    this.customersService.updateMeeting(this.customerId, m.id, { completed: true }).subscribe({
      error: () => this.toast.error('העדכון נכשל')
    });
  }

  async deleteMeeting(m: Meeting) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'מחיקת פגישה',
      message: `למחוק את הפגישה מתאריך ${this.formatDate(m.date)}?`,
      confirmLabel: 'מחיקה',
      danger: true
    });
    if (!confirmed) return;
    this.customersService.deleteMeeting(this.customerId, m.id).subscribe({
      error: () => this.toast.error('מחיקת הפגישה נכשלה')
    });
  }
}
