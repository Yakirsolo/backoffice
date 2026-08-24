import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideCalendar,
  LucideCreditCard,
  LucideFlag,
  LucidePlus,
  LucideUserPlus,
  LucideUsers,
  LucideVideo
} from '@lucide/angular';
import { AuthService } from '../../core/services/auth.service';
import { CustomersService } from '../../core/services/customers.service';
import { DashboardData } from '../../core/models/customer.model';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { addDaysIso, formatDate, formatLongDate, formatTime, todayIso } from '../../shared/status-utils';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink, EmptyStateComponent,
    LucideCalendar, LucideUserPlus, LucideCreditCard, LucideFlag, LucideVideo, LucidePlus, LucideUsers
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  private authService = inject(AuthService);
  private customersService = inject(CustomersService);

  currentUser = this.authService.currentUser;
  data = signal<DashboardData | null>(null);
  today = todayIso();
  formatLongDate = formatLongDate;
  formatTime = formatTime;

  constructor() {
    this.customersService.dashboard().subscribe(data => this.data.set(data));
  }

  paymentNote(dateIso: string, status: string): string {
    if (status === 'overdue') return 'תשלום באיחור';
    if (dateIso === this.today) return 'תשלום היום';
    if (dateIso === addDaysIso(this.today, 1)) return 'תשלום מחר';
    return `תשלום ב-${formatDate(dateIso)}`;
  }
}
