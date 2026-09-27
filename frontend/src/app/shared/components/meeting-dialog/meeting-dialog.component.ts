import { Component, EventEmitter, Input, OnInit, Output, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideSearch, LucideX } from '@lucide/angular';
import { Meeting } from '../../../core/models/customer.model';
import { AuthService } from '../../../core/services/auth.service';
import { CustomersService } from '../../../core/services/customers.service';
import { ToastService } from '../../../core/services/toast.service';
import { todayIso } from '../../status-utils';

const DURATION_PRESETS = [30, 45, 60];

@Component({
  selector: 'app-meeting-dialog',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideSearch, LucideX],
  templateUrl: './meeting-dialog.component.html',
  styleUrl: './meeting-dialog.component.scss'
})
export class MeetingDialogComponent implements OnInit {
  /** Fixed customer (profile tab). Leave empty to let the coach search for one (calendar page). */
  @Input() customerId = '';
  @Input() meeting: Meeting | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  private customersService = inject(CustomersService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);

  durationPresets = DURATION_PRESETS;

  private activeCustomers = computed(() => this.customersService.customers().filter(c => c.status === 'active'));

  customerQuery = signal('');
  pickedCustomerId = signal('');
  listOpen = signal(false);

  pickedCustomerName = computed(() =>
    this.activeCustomers().find(c => c.id === this.pickedCustomerId())?.name ?? ''
  );

  private filtered = computed(() => {
    const q = this.customerQuery().trim().toLowerCase();
    const all = this.activeCustomers();
    if (!q) return all;
    return all.filter(c => c.name.toLowerCase().includes(q) || (c.phone ?? '').includes(q));
  });

  /** Capped so the list stays scannable; the rest are reachable by typing more. */
  matches = computed(() => this.filtered().slice(0, 8));
  hiddenMatchCount = computed(() => this.filtered().length - this.matches().length);

  date = signal(todayIso());
  time = signal('10:00');
  description = signal('');
  durationMinutes = signal<number | null>(45);
  zoomLink = signal('');
  savedZoomRoom = signal('');
  saving = signal(false);

  isEdit = computed(() => !!this.meeting);

  ngOnInit() {
    if (this.meeting) {
      this.date.set(this.meeting.date);
      this.time.set(this.meeting.time);
      this.description.set(this.meeting.type);
      this.durationMinutes.set(this.meeting.durationMinutes ?? null);
      this.zoomLink.set(this.meeting.zoomLink ?? '');
    }
  }

  constructor() {
    this.authService.getMySettings().subscribe(settings => {
      this.savedZoomRoom.set(settings.zoomPersonalLink ?? '');
    });
  }

  private targetCustomerId = computed(() => this.customerId || this.pickedCustomerId());

  canSave = computed(() => !this.saving() && !!this.targetCustomerId() && !!this.date() && !!this.time());

  selectCustomer(id: string, name: string) {
    this.pickedCustomerId.set(id);
    this.customerQuery.set(name);
    this.listOpen.set(false);
  }

  clearCustomer() {
    this.pickedCustomerId.set('');
    this.customerQuery.set('');
    this.listOpen.set(true);
  }

  onQueryInput(value: string) {
    this.customerQuery.set(value);
    if (this.pickedCustomerId() && value !== this.pickedCustomerName()) {
      this.pickedCustomerId.set('');
    }
    this.listOpen.set(true);
  }

  pickDuration(minutes: number) {
    this.durationMinutes.set(this.durationMinutes() === minutes ? null : minutes);
  }

  useSavedZoomRoom() {
    this.zoomLink.set(this.savedZoomRoom());
  }

  openZoomScheduler() {
    window.open('https://zoom.us/meeting/schedule', '_blank', 'noopener');
  }

  save() {
    if (!this.canSave()) return;
    this.saving.set(true);
    const payload = {
      date: this.date(),
      time: this.time(),
      // The API requires a label; the description doubles as it, with a neutral fallback.
      type: this.description().trim() || 'פגישה',
      durationMinutes: this.durationMinutes() ?? undefined,
      zoomLink: this.zoomLink().trim() || undefined
    };

    const request = this.meeting
      ? this.customersService.updateMeeting(this.targetCustomerId(), this.meeting.id, payload)
      : this.customersService.addMeeting(this.targetCustomerId(), payload);

    request.subscribe({
      next: () => {
        this.toast.success(this.meeting ? 'הפגישה עודכנה' : 'הפגישה נקבעה');
        this.saved.emit();
        this.closed.emit();
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('שמירת הפגישה נכשלה. בדקו את הפרטים ונסו שוב');
      }
    });
  }

  close() {
    if (!this.saving()) this.closed.emit();
  }
}
