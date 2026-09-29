import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideCheck, LucideChevronLeft, LucideChevronRight, LucidePencil, LucidePlus, LucideTrash2, LucideVideo } from '@lucide/angular';
import { CustomersService } from '../../core/services/customers.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { ToastService } from '../../core/services/toast.service';
import { Meeting } from '../../core/models/customer.model';
import { formatLongDate, formatMonthLabel, formatTime, todayIso } from '../../shared/status-utils';
import { MeetingDialogComponent } from '../../shared/components/meeting-dialog/meeting-dialog.component';

interface MeetingRow extends Meeting {
  customerName: string;
  customerPhone: string;
}

interface DayCell {
  date: string;
  dayNum: number;
  inMonth: boolean;
  isToday: boolean;
  meetingCount: number;
}

/** 0=Sunday. UTC-based so the local timezone never shifts the weekday. */
function weekdayOf(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Shifts a 'YYYY-MM' string by whole months. */
function addMonths(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const index = y * 12 + (m - 1) + delta;
  const ny = Math.floor(index / 12);
  const nm = (index % 12) + 1;
  return `${ny}-${String(nm).padStart(2, '0')}`;
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [
    RouterLink, MeetingDialogComponent,
    LucidePlus, LucidePencil, LucideTrash2, LucideCheck, LucideVideo, LucideChevronLeft, LucideChevronRight
  ],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss'
})
export class CalendarComponent {
  private customersService = inject(CustomersService);
  private toast = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);

  formatTime = formatTime;
  today = todayIso();
  readonly weekdayLabels = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

  viewMonth = signal(this.today.slice(0, 7));
  selectedDate = signal(this.today);

  dialogOpen = signal(false);
  editingMeeting = signal<Meeting | null>(null);
  createDate = signal('');

  monthLabel = computed(() => formatMonthLabel(this.viewMonth()));

  private rowsByDate = computed(() => {
    const map = new Map<string, MeetingRow[]>();
    for (const m of this.customersService.meetings()) {
      const customer = this.customersService.getCustomer(m.customerId);
      const row: MeetingRow = { ...m, customerName: customer?.name ?? '', customerPhone: customer?.phone ?? '' };
      const list = map.get(m.date) ?? [];
      list.push(row);
      map.set(m.date, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.time.localeCompare(b.time));
    return map;
  });

  weeks = computed<DayCell[][]>(() => {
    const month = this.viewMonth();
    const firstOfMonth = `${month}-01`;
    const gridStart = addDaysIso(firstOfMonth, -weekdayOf(firstOfMonth));
    const byDate = this.rowsByDate();

    const weeks: DayCell[][] = [];
    for (let w = 0; w < 6; w++) {
      const week: DayCell[] = [];
      for (let d = 0; d < 7; d++) {
        const date = addDaysIso(gridStart, w * 7 + d);
        week.push({
          date,
          dayNum: Number(date.slice(8, 10)),
          inMonth: date.slice(0, 7) === month,
          isToday: date === this.today,
          meetingCount: byDate.get(date)?.length ?? 0
        });
      }
      // Drop a trailing week that belongs entirely to the next month.
      if (week.every(c => !c.inMonth) && weeks.length >= 4) break;
      weeks.push(week);
    }
    return weeks;
  });

  selectedMeetings = computed(() => this.rowsByDate().get(this.selectedDate()) ?? []);

  selectedLabel = computed(() => {
    const label = formatLongDate(this.selectedDate());
    return this.selectedDate() === this.today ? `היום · ${label}` : label;
  });

  prevMonth() { this.viewMonth.set(addMonths(this.viewMonth(), -1)); }
  nextMonth() { this.viewMonth.set(addMonths(this.viewMonth(), 1)); }

  goToday() {
    this.viewMonth.set(this.today.slice(0, 7));
    this.selectedDate.set(this.today);
  }

  selectDay(cell: DayCell) {
    this.selectedDate.set(cell.date);
    if (!cell.inMonth) this.viewMonth.set(cell.date.slice(0, 7));
  }

  openCreate() {
    this.editingMeeting.set(null);
    this.createDate.set(this.selectedDate());
    this.dialogOpen.set(true);
  }

  openEdit(m: MeetingRow) {
    this.editingMeeting.set(m);
    this.createDate.set('');
    this.dialogOpen.set(true);
  }

  markCompleted(m: MeetingRow) {
    this.customersService.updateMeeting(m.customerId, m.id, { completed: true }).subscribe({
      error: () => this.toast.error('העדכון נכשל')
    });
  }

  async deleteMeeting(m: MeetingRow) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'מחיקת פגישה',
      message: `למחוק את הפגישה של ${m.customerName || 'הלקוחה'} בשעה ${this.formatTime(m.time)}?`,
      confirmLabel: 'מחיקה',
      danger: true
    });
    if (!confirmed) return;
    this.customersService.deleteMeeting(m.customerId, m.id).subscribe({
      error: () => this.toast.error('מחיקת הפגישה נכשלה')
    });
  }
}
