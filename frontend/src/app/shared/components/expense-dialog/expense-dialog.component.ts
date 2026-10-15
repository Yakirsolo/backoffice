import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideFileText, LucideReceipt, LucideTrash2, LucideX } from '@lucide/angular';
import { ExpensesService, ExpenseInput } from '../../../core/services/expenses.service';
import { ToastService } from '../../../core/services/toast.service';
import { Expense, ExpenseCategory, EXPENSE_CATEGORY_LABELS } from '../../../core/models/customer.model';
import { todayIso } from '../../status-utils';

const ALLOWED_RECEIPT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const MAX_RECEIPT_SIZE = 15 * 1024 * 1024;

@Component({
  selector: 'app-expense-dialog',
  standalone: true,
  imports: [FormsModule, LucideX, LucideReceipt, LucideTrash2, LucideFileText],
  templateUrl: './expense-dialog.component.html',
  styleUrl: './expense-dialog.component.scss'
})
export class ExpenseDialogComponent implements OnInit, OnDestroy {
  @Input() expense: Expense | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  private expensesService = inject(ExpensesService);
  private toast = inject(ToastService);

  categoryLabels = EXPENSE_CATEGORY_LABELS;
  categories = Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[];

  amount = signal<number | null>(null);
  description = signal('');
  category = signal<ExpenseCategory>('other');
  date = signal(todayIso());
  notes = signal('');
  saving = signal(false);

  // Receipt state. A newly uploaded receipt supersedes any existing one; removeExisting only matters
  // when editing an expense whose receipt we intend to detach without replacing it.
  newReceipt = signal<{ receiptStorageKey: string; receiptContentType: string; receiptSizeBytes: number } | null>(null);
  localPreviewUrl = signal<string | null>(null);
  receiptFileName = signal<string | null>(null);
  receiptIsImage = signal(false);
  existingReceiptUrl = signal<string | null>(null);
  existingReceiptIsImage = signal(false);
  removeExisting = signal(false);
  uploadingReceipt = signal(false);
  receiptError = signal<string | null>(null);

  isEdit = computed(() => !!this.expense);

  hasReceipt = computed(() =>
    !!this.newReceipt() || (!!this.existingReceiptUrl() && !this.removeExisting())
  );

  previewUrl = computed(() => this.localPreviewUrl() ?? (this.removeExisting() ? null : this.existingReceiptUrl()));

  /** A fresh pick (image object-URL or a named file) reflects the new file; otherwise the saved receipt. */
  private hasNewSelection = computed(() => !!this.newReceipt() || !!this.localPreviewUrl() || !!this.receiptFileName());

  previewIsImage = computed(() =>
    this.hasNewSelection() ? this.receiptIsImage() : this.existingReceiptIsImage()
  );

  canSave = computed(() =>
    !this.saving() &&
    !this.uploadingReceipt() &&
    (this.amount() ?? 0) > 0 &&
    !!this.description().trim() &&
    !!this.date()
  );

  ngOnInit() {
    const e = this.expense;
    if (!e) return;
    this.amount.set(e.amount);
    this.description.set(e.description);
    this.category.set(e.category);
    this.date.set(e.date);
    this.notes.set(e.notes ?? '');
    if (e.hasReceipt && e.receiptUrl) {
      this.existingReceiptUrl.set(e.receiptUrl);
      this.existingReceiptIsImage.set((e.receiptContentType ?? '').startsWith('image/'));
    }
  }

  ngOnDestroy() {
    this.revokeLocalPreview();
  }

  selectCategory(c: ExpenseCategory) {
    this.category.set(c);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.receiptError.set(null);
    if (!ALLOWED_RECEIPT_TYPES.has(file.type)) {
      this.receiptError.set('סוג קובץ לא נתמך — תמונה או PDF בלבד');
      return;
    }
    if (file.size > MAX_RECEIPT_SIZE) {
      this.receiptError.set('הקובץ חורג מהגודל המרבי (15MB)');
      return;
    }

    const isImage = file.type.startsWith('image/');
    this.revokeLocalPreview();
    this.newReceipt.set(null);
    this.removeExisting.set(true); // a new file replaces whatever existed
    this.receiptIsImage.set(isImage);
    this.receiptFileName.set(isImage ? null : file.name);
    this.localPreviewUrl.set(isImage ? URL.createObjectURL(file) : null);

    this.uploadingReceipt.set(true);
    this.expensesService.uploadReceipt(file).subscribe({
      next: ref => {
        this.newReceipt.set(ref);
        this.uploadingReceipt.set(false);
      },
      error: () => {
        this.uploadingReceipt.set(false);
        this.receiptError.set('העלאת הקבלה נכשלה, נסי שוב');
        this.clearReceiptSelection();
        // A failed replacement must not discard a receipt that was already saved on this expense.
        this.removeExisting.set(false);
      }
    });
  }

  removeReceipt() {
    this.clearReceiptSelection();
    // When editing, also mark the previously-saved receipt for detachment on save.
    if (this.existingReceiptUrl()) this.removeExisting.set(true);
  }

  private clearReceiptSelection() {
    this.revokeLocalPreview();
    this.newReceipt.set(null);
    this.receiptFileName.set(null);
    this.receiptIsImage.set(false);
  }

  private revokeLocalPreview() {
    const url = this.localPreviewUrl();
    if (url) URL.revokeObjectURL(url);
    this.localPreviewUrl.set(null);
  }

  save() {
    if (!this.canSave()) return;
    this.saving.set(true);

    const input: ExpenseInput = {
      amount: this.amount()!,
      date: this.date(),
      category: this.category(),
      description: this.description().trim(),
      notes: this.notes().trim() || undefined
    };

    const receipt = this.newReceipt();
    if (receipt) {
      input.receiptStorageKey = receipt.receiptStorageKey;
      input.receiptContentType = receipt.receiptContentType;
      input.receiptSizeBytes = receipt.receiptSizeBytes;
    } else if (this.isEdit() && this.removeExisting()) {
      input.removeReceipt = true;
    }

    const request = this.expense
      ? this.expensesService.update(this.expense.id, input)
      : this.expensesService.add(input);

    request.subscribe({
      next: () => {
        this.toast.success(this.isEdit() ? 'ההוצאה עודכנה' : 'ההוצאה נשמרה');
        this.saved.emit();
        this.closed.emit();
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('שמירת ההוצאה נכשלה. בדקי את הפרטים ונסי שוב');
      }
    });
  }

  close() {
    if (!this.saving() && !this.uploadingReceipt()) this.closed.emit();
  }
}
