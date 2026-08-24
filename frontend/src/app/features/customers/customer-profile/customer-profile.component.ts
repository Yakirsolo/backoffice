import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { LucideChevronRight, LucideFlag, LucideRotateCcw } from '@lucide/angular';
import { CustomersService } from '../../../core/services/customers.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { CUSTOMER_STATUS_LABELS, Customer } from '../../../core/models/customer.model';
import { customerStatusBadgeClass, formatWeightChange } from '../../../shared/status-utils';
import { OverviewTabComponent } from './tabs/overview-tab.component';
import { ProgressTabComponent } from './tabs/progress-tab.component';
import { HistoryTabComponent } from './tabs/history-tab.component';
import { PaymentsTabComponent } from './tabs/payments-tab.component';
import { DocumentsTabComponent } from './tabs/documents-tab.component';
import { MeetingsTabComponent } from './tabs/meetings-tab.component';

type TabId = 'overview' | 'progress' | 'history' | 'payments' | 'documents' | 'meetings';

@Component({
  selector: 'app-customer-profile',
  standalone: true,
  imports: [
    RouterLink,
    OverviewTabComponent, ProgressTabComponent, HistoryTabComponent,
    PaymentsTabComponent, DocumentsTabComponent, MeetingsTabComponent,
    LucideChevronRight, LucideFlag, LucideRotateCcw
  ],
  templateUrl: './customer-profile.component.html',
  styleUrl: './customer-profile.component.scss'
})
export class CustomerProfileComponent {
  private route = inject(ActivatedRoute);
  private customersService = inject(CustomersService);
  private confirmDialog = inject(ConfirmDialogService);

  customerId = toSignal(this.route.paramMap.pipe(map(p => p.get('id')!)), { initialValue: '' });
  customer = computed(() => this.customersService.getCustomer(this.customerId()));

  statusLabels = CUSTOMER_STATUS_LABELS;
  customerStatusBadgeClass = customerStatusBadgeClass;

  activeTab = signal<TabId>('overview');

  tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'סקירה' },
    { id: 'progress', label: 'התקדמות' },
    { id: 'history', label: 'היסטוריה' },
    { id: 'payments', label: 'תשלומים' },
    { id: 'documents', label: 'מסמכים' },
    { id: 'meetings', label: 'פגישות' }
  ];

  weightLoss = computed(() => {
    const c = this.customer();
    return c ? this.customersService.weightLoss(c) : 0;
  });

  weightChangeText = computed(() => formatWeightChange(this.weightLoss()));

  changingStatus = signal(false);

  setTab(tab: TabId) {
    this.activeTab.set(tab);
  }

  async toggleStatus(c: Customer) {
    const goingToFinished = c.status === 'active';
    const confirmMessage = goingToFinished
      ? `לסמן את ${c.name} כלקוחה שסיימה את התהליך?`
      : `להחזיר את ${c.name} לסטטוס פעיל?`;
    const confirmed = await this.confirmDialog.confirm({ title: 'שינוי סטטוס', message: confirmMessage });
    if (!confirmed) return;

    this.changingStatus.set(true);
    this.customersService.updateCustomerStatus(c.id, goingToFinished ? 'finished' : 'active').subscribe({
      next: () => this.changingStatus.set(false),
      error: () => this.changingStatus.set(false)
    });
  }
}
