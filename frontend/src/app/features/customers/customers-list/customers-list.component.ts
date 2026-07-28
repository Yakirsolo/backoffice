import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CustomersService } from '../../../core/services/customers.service';
import { CustomerStatus, CUSTOMER_STATUS_LABELS } from '../../../core/models/customer.model';
import { customerStatusBadgeClass, formatDate, formatWeightChange } from '../../../shared/status-utils';

type StatusFilter = CustomerStatus | 'all';

@Component({
  selector: 'app-customers-list',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './customers-list.component.html',
  styleUrl: './customers-list.component.scss'
})
export class CustomersListComponent {
  private customersService = inject(CustomersService);

  searchTerm = signal('');
  statusFilter = signal<StatusFilter>('all');

  statusLabels = CUSTOMER_STATUS_LABELS;
  statusOptions: StatusFilter[] = ['all', 'active', 'finished'];

  customerStatusBadgeClass = customerStatusBadgeClass;
  formatDate = formatDate;

  filteredCustomers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();
    return this.customersService.customers().filter(c => {
      const matchesStatus = status === 'all' || c.status === status;
      const matchesTerm = !term || c.name.toLowerCase().includes(term) || c.phone.includes(term);
      return matchesStatus && matchesTerm;
    });
  });

  weightLoss(customerId: string): number {
    const customer = this.customersService.getCustomer(customerId);
    return customer ? this.customersService.weightLoss(customer) : 0;
  }

  weightChangeText(customerId: string): string {
    return formatWeightChange(this.weightLoss(customerId));
  }

  setStatus(status: StatusFilter) {
    this.statusFilter.set(status);
  }
}
