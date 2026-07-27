import { Component, Input, OnChanges, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CustomersService } from '../../../../core/services/customers.service';
import { CustomerDocument, DOCUMENT_TYPE_LABELS } from '../../../../core/models/customer.model';
import { formatDate } from '../../../../shared/status-utils';

const TYPE_ICONS: Record<string, string> = { agreement: '📄', menu: '🍽️', other: '📎' };

@Component({
  selector: 'app-documents-tab',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="documents-header">
      <button class="btn btn-secondary">⬆️ העלאת קובץ</button>
      <a class="btn btn-primary" [routerLink]="['/agreement']" [queryParams]="{ customerId: customerId }">
        📝 יצירת הסכם
      </a>
    </div>

    @if (documents().length === 0) {
      <div class="card empty-state">עדיין לא הועלו מסמכים</div>
    } @else {
      <div class="documents-grid">
        @for (doc of documents(); track doc.id) {
          <div class="card doc-card">
            <div class="doc-icon">{{ icons[doc.type] }}</div>
            <div class="doc-info">
              <div class="doc-name">{{ doc.name }}</div>
              <div class="doc-meta">{{ typeLabels[doc.type] }} · {{ formatDate(doc.date) }}</div>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .documents-header {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    .documents-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 14px;
    }
    .doc-card {
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .doc-icon {
      font-size: 22px;
      width: 40px;
      height: 40px;
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .doc-name {
      font-weight: 600;
      font-size: 13px;
    }
    .doc-meta {
      color: var(--color-text-muted);
      font-size: 12px;
      margin-top: 2px;
    }
  `]
})
export class DocumentsTabComponent implements OnChanges {
  @Input({ required: true }) customerId!: string;
  private customersService = inject(CustomersService);

  documents = signal<CustomerDocument[]>([]);
  typeLabels = DOCUMENT_TYPE_LABELS;
  icons = TYPE_ICONS;
  formatDate = formatDate;

  ngOnChanges() {
    this.customersService.documentsFor$(this.customerId).subscribe(list => this.documents.set(list));
  }
}
