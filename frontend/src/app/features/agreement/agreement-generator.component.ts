import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideChevronRight, LucidePrinter } from '@lucide/angular';
import { CustomersService } from '../../core/services/customers.service';
import { formatDate, todayIso } from '../../shared/status-utils';

@Component({
  selector: 'app-agreement-generator',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideChevronRight, LucidePrinter],
  templateUrl: './agreement-generator.component.html',
  styleUrl: './agreement-generator.component.scss'
})
export class AgreementGeneratorComponent {
  private route = inject(ActivatedRoute);
  private customersService = inject(CustomersService);

  customerName = signal('');
  program = signal('');
  durationMonths = signal<number | null>(3);
  price = signal<number | null>(null);
  paymentTerms = signal('תשלום חודשי מראש');

  today = formatDate(todayIso());

  constructor() {
    const customerId = this.route.snapshot.queryParamMap.get('customerId');
    if (customerId) {
      this.customersService.generateAgreement(customerId).subscribe(prefill => {
        this.customerName.set(prefill.customerName);
        this.program.set(prefill.program);
        this.price.set(prefill.price);
      });
    }
  }

  isReady = computed(() => !!this.customerName() && !!this.program() && !!this.price());

  print() {
    window.print();
  }
}
