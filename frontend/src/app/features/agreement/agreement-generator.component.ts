import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideChevronRight, LucidePrinter } from '@lucide/angular';
import { CustomersService, UnlinkedAgreement } from '../../core/services/customers.service';
import { AgreementDocumentComponent } from '../../shared/components/agreement-document/agreement-document.component';
import { formatDate, todayIso } from '../../shared/status-utils';

type AgreementTab = 'create' | 'unlinked';

@Component({
  selector: 'app-agreement-generator',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideChevronRight, LucidePrinter, AgreementDocumentComponent],
  templateUrl: './agreement-generator.component.html',
  styleUrl: './agreement-generator.component.scss'
})
export class AgreementGeneratorComponent {
  private route = inject(ActivatedRoute);
  private customersService = inject(CustomersService);

  customerId = signal<string | null>(null);
  customerName = signal('');
  customerIdNumber = signal('');
  customerAddress = signal('');
  program = signal('');
  durationMonths = signal<number | null>(3);
  price = signal<number | null>(null);
  paymentTerms = signal('תשלום חודשי מראש');

  todayIsoValue = todayIso();
  today = formatDate(this.todayIsoValue);
  signingLink = signal<string | null>(null);
  creatingLink = signal(false);

  unlinkedAgreements = signal<UnlinkedAgreement[]>([]);
  formatDate = formatDate;

  activeTab = signal<AgreementTab>('create');
  tabs: { id: AgreementTab; label: string }[] = [
    { id: 'create', label: 'יצירת הסכם' },
    { id: 'unlinked', label: 'חוזים ללקוחות פוטנציאליים' }
  ];

  setTab(tab: AgreementTab) {
    this.activeTab.set(tab);
  }

  constructor() {
    const customerId = this.route.snapshot.queryParamMap.get('customerId');
    if (customerId) {
      this.customerId.set(customerId);
      this.customersService.generateAgreement(customerId).subscribe(prefill => {
        this.customerName.set(prefill.customerName);
        this.program.set(prefill.program);
        this.price.set(prefill.price);
      });
    }

    this.customersService.listUnlinkedAgreements().subscribe(list => this.unlinkedAgreements.set(list));
  }

  isReady = computed(() => !!this.customerName() && !!this.program() && !!this.price());
  canCreateLink = computed(() => this.isReady() && !!this.customerIdNumber() && !!this.customerAddress());

  print() {
    window.print();
  }

  createSigningLink() {
    if (!this.canCreateLink()) return;

    this.creatingLink.set(true);
    this.signingLink.set(null);
    this.customersService.createSignatureRequest({
      customerId: this.customerId(),
      customerName: this.customerName(),
      customerIdNumber: this.customerIdNumber(),
      customerAddress: this.customerAddress(),
      program: this.program(),
      durationMonths: this.durationMonths(),
      price: this.price(),
      paymentTerms: this.paymentTerms(),
      agreementDate: todayIso()
    }).subscribe({
      next: ({ token }) => {
        this.signingLink.set(`${location.origin}/sign/${token}`);
        this.creatingLink.set(false);
      },
      error: () => this.creatingLink.set(false)
    });
  }

  async copySigningLink() {
    const link = this.signingLink();
    if (link) {
      await navigator.clipboard.writeText(link);
    }
  }
}
