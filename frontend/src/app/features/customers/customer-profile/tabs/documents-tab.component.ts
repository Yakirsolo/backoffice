import { Component, Input, OnChanges, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { LucideFileText, LucidePaperclip, LucideTrash2, LucideUpload, LucideUtensils } from '@lucide/angular';
import { CustomersService } from '../../../../core/services/customers.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { CustomerDocument, DocumentType, DOCUMENT_TYPE_LABELS } from '../../../../core/models/customer.model';
import { formatDate, formatFileSize, todayIso } from '../../../../shared/status-utils';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

const ALLOWED_CONTENT_TYPES = new Set([
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain'
]);
const MAX_FILE_SIZE = 20 * 1024 * 1024;

@Component({
  selector: 'app-documents-tab',
  standalone: true,
  imports: [FormsModule, EmptyStateComponent, LucideUpload, LucideFileText, LucideUtensils, LucidePaperclip, LucideTrash2],
  template: `
    <div class="documents-header">
      <button class="btn btn-secondary" (click)="showUploadPopover.set(!showUploadPopover())">
        <svg lucideUpload class="icon"></svg> העלאת קובץ
      </button>

      @if (showUploadPopover()) {
        <div class="upload-popover card">
          <div class="field-group">
            <label class="field-label">סוג מסמך</label>
            <select class="input-field" [(ngModel)]="uploadType">
              @for (t of documentTypes; track t) {
                <option [value]="t">{{ typeLabels[t] }}</option>
              }
            </select>
          </div>
          <div class="field-group">
            <label class="field-label">תאריך</label>
            <input class="input-field" type="date" [(ngModel)]="uploadDate" />
          </div>

          <input
            #fileInput
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.txt"
            multiple
            hidden
            (change)="onFilesSelected($event)"
          />
          <button class="btn btn-primary" (click)="fileInput.click()" [disabled]="uploading()">
            <svg lucideUpload class="icon"></svg> {{ uploading() ? 'מעלה...' : 'בחירת קבצים' }}
          </button>
          <div class="popover-hint">PDF, Word, Excel או תמונה · עד 20MB לקובץ</div>

          @if (uploadError()) {
            <div class="popover-error">{{ uploadError() }}</div>
          }
        </div>
      }
    </div>

    @if (documents().length === 0) {
      <app-empty-state heading="עדיין לא הועלו מסמכים">
        <svg lucidePaperclip class="icon" empty-icon></svg>
      </app-empty-state>
    } @else {
      <div class="documents-grid">
        @for (doc of documents(); track doc.id) {
          <div class="card doc-card">
            <a class="doc-link" [href]="doc.downloadUrl" target="_blank" rel="noopener">
              <div class="doc-icon">
                @switch (doc.type) {
                  @case ('agreement') { <svg lucideFileText class="icon"></svg> }
                  @case ('menu') { <svg lucideUtensils class="icon"></svg> }
                  @default { <svg lucidePaperclip class="icon"></svg> }
                }
              </div>
              <div class="doc-info">
                <div class="doc-name">{{ doc.name }}</div>
                <div class="doc-meta">{{ typeLabels[doc.type] }} · {{ formatDate(doc.date) }} · {{ formatFileSize(doc.sizeBytes) }}</div>
              </div>
            </a>
            <button class="btn btn-ghost btn-sm doc-delete" title="מחיקה" (click)="deleteDocument(doc)">
              <svg lucideTrash2 class="icon"></svg>
            </button>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .documents-header {
      display: flex;
      gap: var(--space-2);
      margin-bottom: var(--space-5);
      position: relative;
    }
    .upload-popover {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 260px;
      padding: var(--space-4);
      z-index: 10;
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      box-shadow: var(--shadow-md);
    }
    .popover-hint {
      font-size: 11px;
      color: var(--color-text-faint);
      text-align: center;
    }
    .popover-error {
      font-size: 12px;
      color: var(--color-danger);
      background: var(--color-danger-soft);
      border-radius: var(--radius-sm);
      padding: 8px 10px;
    }
    .documents-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: var(--space-3);
    }
    .doc-card {
      padding: var(--space-4);
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }
    .doc-link {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: var(--space-4);
    }
    .doc-icon {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-sm);
      background: var(--color-surface-sunken);
      color: var(--color-text-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .doc-info {
      min-width: 0;
    }
    .doc-name {
      font-weight: 600;
      font-size: 13px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
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
  private confirmDialog = inject(ConfirmDialogService);
  private toast = inject(ToastService);

  documents = signal<CustomerDocument[]>([]);
  typeLabels = DOCUMENT_TYPE_LABELS;
  documentTypes = Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[];
  formatDate = formatDate;
  formatFileSize = formatFileSize;

  showUploadPopover = signal(false);
  uploading = signal(false);
  uploadError = signal<string | null>(null);
  uploadType: DocumentType = 'other';
  uploadDate = todayIso();

  ngOnChanges() {
    this.loadDocuments();
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length === 0) return;

    this.uploadError.set(null);
    const valid: File[] = [];
    const errors: string[] = [];
    for (const file of files) {
      if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
        errors.push(`"${file.name}" - סוג קובץ לא נתמך`);
      } else if (file.size > MAX_FILE_SIZE) {
        errors.push(`"${file.name}" - חורג מהגודל המרבי (20MB)`);
      } else {
        valid.push(file);
      }
    }
    if (errors.length) this.uploadError.set(errors.join(' · '));
    if (valid.length === 0) return;

    this.uploading.set(true);
    const uploads = valid.map(file =>
      this.customersService.uploadDocument(this.customerId, file, this.uploadType, this.uploadDate)
    );
    forkJoin(uploads).subscribe({
      next: () => {
        this.uploading.set(false);
        this.showUploadPopover.set(false);
        this.loadDocuments();
        this.toast.success('הקבצים הועלו בהצלחה');
      },
      error: () => {
        this.uploading.set(false);
        this.uploadError.set('העלאת חלק מהקבצים נכשלה, נסי שוב');
        this.loadDocuments();
      }
    });
  }

  async deleteDocument(doc: CustomerDocument) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'מחיקת מסמך',
      message: `למחוק את "${doc.name}"?`,
      confirmLabel: 'מחיקה',
      danger: true
    });
    if (!confirmed) return;
    this.customersService.deleteDocument(this.customerId, doc.id).subscribe({
      next: () => this.loadDocuments(),
      error: () => this.confirmDialog.alert('מחיקת המסמך נכשלה')
    });
  }

  private loadDocuments() {
    this.customersService.documentsFor$(this.customerId).subscribe(list => this.documents.set(list));
  }
}
