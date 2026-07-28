import { Component, computed, inject } from '@angular/core';
import { CustomersService } from '../../core/services/customers.service';
import { CUSTOMER_STATUS_LABELS, CustomerStatus } from '../../core/models/customer.model';
import { formatWeightChange, todayIso } from '../../shared/status-utils';

@Component({
  selector: 'app-analytics',
  standalone: true,
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.scss'
})
export class AnalyticsComponent {
  private customersService = inject(CustomersService);
  statusLabels = CUSTOMER_STATUS_LABELS;

  customers = computed(() => this.customersService.customers());

  activeCount = computed(() => this.customers().filter(c => c.status === 'active').length);

  averageWeightLoss = computed(() => {
    const list = this.customers();
    if (!list.length) return 0;
    const total = list.reduce((sum, c) => sum + this.customersService.weightLoss(c), 0);
    return Math.round((total / list.length) * 10) / 10;
  });

  averageWeightLossText = computed(() => formatWeightChange(this.averageWeightLoss()));

  monthRevenue = computed(() => {
    const month = todayIso().slice(0, 7);
    return this.customersService.payments()
      .filter(p => p.status === 'paid' && p.date.slice(0, 7) === month)
      .reduce((sum, p) => sum + p.amount, 0);
  });

  statusBreakdown = computed(() => {
    const list = this.customers();
    const statuses: CustomerStatus[] = ['active', 'finished'];
    return statuses.map(status => ({
      status,
      count: list.filter(c => c.status === status).length,
      percent: list.length ? Math.round((list.filter(c => c.status === status).length / list.length) * 100) : 0
    }));
  });

  sourceBreakdown = computed(() => {
    const list = this.customers();
    const bySource = new Map<string, number>();
    for (const c of list) {
      bySource.set(c.source, (bySource.get(c.source) ?? 0) + 1);
    }
    return Array.from(bySource.entries()).map(([source, count]) => ({
      source,
      count,
      percent: list.length ? Math.round((count / list.length) * 100) : 0
    }));
  });
}
