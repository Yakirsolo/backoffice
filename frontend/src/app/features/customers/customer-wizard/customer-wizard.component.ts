import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CustomersService } from '../../../core/services/customers.service';
import {
  BILLING_INTERVAL_UNIT_LABELS, BillingIntervalUnit, LeadSource, LEAD_SOURCE_LABELS
} from '../../../core/models/customer.model';
import { defaultProgramName } from '../../../shared/status-utils';

interface WizardData {
  name: string;
  age: number | null;
  phone: string;
  instagram: string;
  facebook: string;
  description: string;
  price: number | null;
  billingIntervalValue: number | null;
  billingIntervalUnit: BillingIntervalUnit;
  startDate: string;
  source: LeadSource;
  weight: number | null;
  waist: number | null;
  thigh: number | null;
  hip: number | null;
  hasBeforePhoto: boolean;
  agreementMode: 'upload' | 'generate' | null;
}

@Component({
  selector: 'app-customer-wizard',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './customer-wizard.component.html',
  styleUrl: './customer-wizard.component.scss'
})
export class CustomerWizardComponent {
  private customersService = inject(CustomersService);
  private router = inject(Router);

  steps = ['פרטים אישיים', 'פרטי תהליך', 'מדידות התחלתיות', 'מסמכים'];
  currentStep = signal(0);

  sourceOptions: LeadSource[] = ['instagram', 'facebook', 'referral', 'website', 'other'];
  sourceLabels = LEAD_SOURCE_LABELS;

  billingUnitOptions: BillingIntervalUnit[] = ['day', 'week', 'month'];
  billingUnitLabels = BILLING_INTERVAL_UNIT_LABELS;

  data: WizardData = {
    name: '', age: null, phone: '', instagram: '', facebook: '', description: '',
    price: null, billingIntervalValue: 1, billingIntervalUnit: 'month',
    startDate: new Date().toISOString().slice(0, 10), source: 'instagram',
    weight: null, waist: null, thigh: null, hip: null, hasBeforePhoto: false,
    agreementMode: null
  };

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
      instagram: this.data.instagram || undefined,
      facebook: this.data.facebook || undefined,
      description: this.data.description,
      program: this.programName,
      price: this.data.price!,
      billingIntervalValue: this.data.billingIntervalValue!,
      billingIntervalUnit: this.data.billingIntervalUnit,
      startDate: this.data.startDate,
      source: this.data.source,
      startWeight: this.data.weight!,
      targetWeight: this.data.weight!,
      waist: this.data.waist ?? undefined,
      thigh: this.data.thigh ?? undefined,
      hip: this.data.hip ?? undefined
    }).subscribe({
      next: customer => this.router.navigate(['/customers', customer.id]),
      error: () => { this.submitting = false; }
    });
  }
}
