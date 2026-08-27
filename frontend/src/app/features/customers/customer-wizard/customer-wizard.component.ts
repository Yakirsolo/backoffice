import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable, forkJoin } from 'rxjs';
import { LucideCheck, LucideChevronLeft, LucideChevronRight, LucideFileSignature, LucideUpload, LucideX } from '@lucide/angular';
import { CustomersService, UnlinkedAgreement } from '../../../core/services/customers.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import {
  BILLING_INTERVAL_UNIT_LABELS, BillingIntervalUnit, LeadSource, LEAD_SOURCE_LABELS
} from '../../../core/models/customer.model';
import { defaultProgramName } from '../../../shared/status-utils';

interface WizardData {
  name: string;
  age: number | null;
  phone: string;
  description: string;
  price: number | null;
  billingIntervalValue: number | null;
  billingIntervalUnit: BillingIntervalUnit;
  startDate: string;
  source: LeadSource;
  weight: number | null;
  targetWeight: number | null;
  waist: number | null;
  thigh: number | null;
  hip: number | null;
  beforePhotoFiles: File[];
  agreementMode: 'upload' | 'existing' | null;
  agreementFile: File | null;
  selectedAgreementId: string | null;
}

@Component({
  selector: 'app-customer-wizard',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideChevronRight, LucideChevronLeft, LucideUpload, LucideX, LucideCheck, LucideFileSignature],
  templateUrl: './customer-wizard.component.html',
  styleUrl: './customer-wizard.component.scss'
})
export class CustomerWizardComponent {
  private customersService = inject(CustomersService);
  private confirmDialog = inject(ConfirmDialogService);
  private router = inject(Router);

  steps = ['פרטים אישיים', 'פרטי תהליך', 'מדידות התחלתיות', 'מסמכים'];
  currentStep = signal(0);

  sourceOptions: LeadSource[] = ['instagram', 'facebook', 'referral', 'website', 'other'];
  sourceLabels = LEAD_SOURCE_LABELS;

  billingUnitOptions: BillingIntervalUnit[] = ['day', 'week', 'month'];
  billingUnitLabels = BILLING_INTERVAL_UNIT_LABELS;

  data: WizardData = {
    name: '', age: null, phone: '', description: '',
    price: null, billingIntervalValue: 1, billingIntervalUnit: 'month',
    startDate: new Date().toISOString().slice(0, 10), source: 'instagram',
    weight: null, targetWeight: null, waist: null, thigh: null, hip: null, beforePhotoFiles: [],
    agreementMode: null, agreementFile: null, selectedAgreementId: null
  };

  unlinkedAgreements = signal<UnlinkedAgreement[]>([]);

  constructor() {
    this.customersService.listUnlinkedAgreements().subscribe(list => this.unlinkedAgreements.set(list));
  }

  onAgreementFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.data.agreementFile = input.files?.[0] ?? null;
  }

  onBeforePhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    this.data.beforePhotoFiles = [...this.data.beforePhotoFiles, ...files];
  }

  removeBeforePhoto(index: number) {
    this.data.beforePhotoFiles = this.data.beforePhotoFiles.filter((_, i) => i !== index);
  }

  /** The plan name is derived from its billing cadence - no need to type it separately. */
  get programName(): string {
    return defaultProgramName(this.data.billingIntervalValue ?? 0, this.data.billingIntervalUnit);
  }

  get canGoNext(): boolean {
    switch (this.currentStep()) {
      case 0: return !!this.data.name && !!this.data.phone && !!this.data.age;
      case 1: return !!this.data.price && !!this.data.startDate && !!this.data.billingIntervalValue;
      case 2: return !!this.data.weight;
      default: return true;
    }
  }

  next() {
    if (this.currentStep() < this.steps.length - 1 && this.canGoNext) {
      this.currentStep.set(this.currentStep() + 1);
    }
  }

  back() {
    if (this.currentStep() > 0) {
      this.currentStep.set(this.currentStep() - 1);
    }
  }

  goToStep(index: number) {
    if (index <= this.currentStep()) {
      this.currentStep.set(index);
    }
  }

  submitting = false;

  finish() {
    this.submitting = true;
    this.customersService.addCustomer({
      name: this.data.name,
      age: this.data.age!,
      phone: this.data.phone,
      description: this.data.description,
      program: this.programName,
      price: this.data.price!,
      billingIntervalValue: this.data.billingIntervalValue!,
      billingIntervalUnit: this.data.billingIntervalUnit,
      startDate: this.data.startDate,
      source: this.data.source,
      startWeight: this.data.weight!,
      targetWeight: this.data.targetWeight ?? this.data.weight!,
      waist: this.data.waist ?? undefined,
      thigh: this.data.thigh ?? undefined,
      hip: this.data.hip ?? undefined
    }).subscribe({
      next: customer => {
        const tasks: Observable<unknown>[] = this.data.beforePhotoFiles.map(file =>
          this.customersService.uploadPhoto(customer.id, file, 'before', this.data.startDate)
        );

        if (this.data.agreementMode === 'upload' && this.data.agreementFile) {
          tasks.push(this.customersService.uploadDocument(customer.id, this.data.agreementFile, 'agreement', this.data.startDate));
        } else if (this.data.agreementMode === 'existing' && this.data.selectedAgreementId) {
          tasks.push(this.customersService.attachAgreement(this.data.selectedAgreementId, customer.id));
        }

        if (tasks.length === 0) {
          this.router.navigate(['/customers', customer.id]);
          return;
        }
        forkJoin(tasks).subscribe({
          next: () => this.router.navigate(['/customers', customer.id]),
          error: () => {
            this.confirmDialog.alert(
              'הלקוחה נוצרה בהצלחה, אך חלק מהקבצים לא נשמרו. ניתן להוסיף אותם מאוחר יותר מדף הלקוחה.',
              'הצלחה חלקית'
            );
            this.router.navigate(['/customers', customer.id]);
          }
        });
      },
      error: () => { this.submitting = false; }
    });
  }
}
