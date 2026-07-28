import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CustomersService } from '../../core/services/customers.service';
import { formatDate, formatTime, todayIso } from '../../shared/status-utils';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss'
})
export class CalendarComponent {
  private customersService = inject(CustomersService);
  formatDate = formatDate;
  formatTime = formatTime;
  today = todayIso();

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
}
