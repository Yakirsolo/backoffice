import { Component, Input } from '@angular/core';
import { formatDate, formatLegalDate } from '../../status-utils';

@Component({
  selector: 'app-agreement-document',
  standalone: true,
  templateUrl: './agreement-document.component.html',
  styleUrl: './agreement-document.component.scss'
})
export class AgreementDocumentComponent {
  @Input({ required: true }) customerName = '';
  @Input({ required: true }) customerIdNumber = '';
  @Input({ required: true }) customerAddress = '';
  @Input({ required: true }) program = '';
  @Input() durationMonths: number | null = null;
  @Input() price: number | null = null;
  @Input({ required: true }) paymentTerms = '';
  @Input({ required: true }) agreementDate = '';

  readonly coachName = 'דורין כרכוכלי';
  readonly coachIdNumber = '316012087';
  readonly coachAddress = "רח' הלפרין 4, תל אביב";

  get legalDateLabel(): string {
    return formatLegalDate(this.agreementDate);
  }

  get shortDateLabel(): string {
    return formatDate(this.agreementDate);
  }
}
