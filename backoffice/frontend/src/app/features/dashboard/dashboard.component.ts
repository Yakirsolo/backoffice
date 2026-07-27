import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CustomersService } from '../../core/services/customers.service';
import { DashboardData } from '../../core/models/customer.model';
import { addDaysIso, formatDate, formatTime, todayIso } from '../../shared/status-utils';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  private customersService = inject(CustomersService);

  data = signal<DashboardData | null>(null);
  today = todayIso();
  formatDate = formatDate;
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
