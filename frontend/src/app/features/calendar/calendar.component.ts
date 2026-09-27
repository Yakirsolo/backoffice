import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideCalendarDays, LucidePlus, LucidePencil, LucideTrash2, LucideCheck } from '@lucide/angular';
import { CustomersService } from '../../core/services/customers.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { ToastService } from '../../core/services/toast.service';
import { Meeting } from '../../core/models/customer.model';
import { formatDate, formatTime, todayIso } from '../../shared/status-utils';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { MeetingDialogComponent } from '../../shared/components/meeting-dialog/meeting-dialog.component';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [RouterLink, EmptyStateComponent, MeetingDialogComponent, LucideCalendarDays, LucidePlus, LucidePencil, LucideTrash2, LucideCheck],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss'
})
export class CalendarComponent {
  private customersService = inject(CustomersService);
  private toast = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);
  formatDate = formatDate;
  formatTime = formatTime;
  today = todayIso();
  dialogOpen = signal(false);
  editingMeeting = signal<Meeting | null>(null);

  groupedMeetings = computed(() => {
    const meetings = this.customersService.meetings()
      .map(m => ({ ...m, customerName: this.customersService.getCustomer(m.customerId)?.name ?? '' }))
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

    const groups = new Map<string, typeof meetings>();
    for (const meeting of meetings) {
      const list = groups.get(meeting.date) ?? [];
      list.push(meeting);
      groups.set(meeting.date, list);
    }
    return Array.from(groups.entries()).map(([date, items]) => ({ date, items }));
  });

  openCreate() {
    this.editingMeeting.set(null);
    this.dialogOpen.set(true);
  }

  openEdit(m: Meeting) {
    this.editingMeeting.set(m);
    this.dialogOpen.set(true);
  }

  markCompleted(m: Meeting) {
    this.customersService.updateMeeting(m.customerId, m.id, { completed: true }).subscribe({
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
    this.customersService.deleteMeeting(m.customerId, m.id).subscribe({
      error: () => this.toast.error('מחיקת הפגישה נכשלה')
    });
  }
}
