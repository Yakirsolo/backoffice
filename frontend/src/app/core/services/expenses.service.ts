import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, from, of, switchMap, tap } from 'rxjs';
import { Expense, ExpenseCategory } from '../models/customer.model';
import { API_BASE_URL } from '../config/api-config';
import { resizeImage } from '../../shared/image-resize';

/** Receipt metadata carried on an expense write once the file has been uploaded to storage. */
export interface ReceiptRef {
  receiptStorageKey: string;
  receiptContentType: string;
  receiptSizeBytes: number;
}

export interface ExpenseInput {
  amount: number;
  date: string;
  category: ExpenseCategory;
  description: string;
  notes?: string;
  receiptStorageKey?: string;
  receiptContentType?: string;
  receiptSizeBytes?: number;
  /** Update only: detach the current receipt when no new one is provided. */
  removeReceipt?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ExpensesService {
  private http = inject(HttpClient);

  /** Cached full collection - small dataset, loaded once and re-fetched after writes (matches CustomersService). */
  readonly expenses = signal<Expense[]>([]);

  constructor() {
    this.refresh();
  }

  private refresh() {
    this.http.get<Expense[]>(`${API_BASE_URL}/expenses`).subscribe(list => this.expenses.set(list));
  }

  /** Uploads a receipt directly to storage and resolves its metadata (images are downscaled first). */
  uploadReceipt(file: File): Observable<ReceiptRef> {
    const isImage = file.type.startsWith('image/');
    const prepared$ = isImage
      ? from(resizeImage(file)).pipe(switchMap(blob => of({ body: blob as Blob, contentType: 'image/jpeg' })))
      : of({ body: file as Blob, contentType: file.type || 'application/octet-stream' });

    return prepared$.pipe(
      switchMap(({ body, contentType }) =>
        this.http.post<{ uploadUrl: string; storageKey: string }>(
          `${API_BASE_URL}/expenses/upload-url`,
          { fileName: file.name, contentType }
        ).pipe(
          switchMap(({ uploadUrl, storageKey }) =>
            this.http.put(uploadUrl, body, { headers: { 'Content-Type': contentType } }).pipe(
              switchMap(() => of<ReceiptRef>({
                receiptStorageKey: storageKey,
                receiptContentType: contentType,
                receiptSizeBytes: body.size
              }))
            )
          )
        )
      )
    );
  }

  add(input: ExpenseInput): Observable<Expense> {
    return this.http.post<Expense>(`${API_BASE_URL}/expenses`, input)
      .pipe(tap(() => this.refresh()));
  }

  update(id: string, input: ExpenseInput): Observable<Expense> {
    return this.http.patch<Expense>(`${API_BASE_URL}/expenses/${id}`, input)
      .pipe(tap(() => this.refresh()));
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/expenses/${id}`)
      .pipe(tap(() => this.refresh()));
  }
}
