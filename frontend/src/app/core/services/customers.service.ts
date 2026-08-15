import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, from, switchMap, tap } from 'rxjs';
import {
  BillingIntervalUnit, Customer, CustomerStatus, DashboardData, CustomerDocument, DocumentType, Meeting, Payment,
  PaymentStatus, Photo, PhotoType, ProgressMeasurement, TimelineEvent
} from '../models/customer.model';
import { API_BASE_URL } from '../config/api-config';
import { resizeImage } from '../../shared/image-resize';

export interface NewCustomerData {
  name: string; age: number; phone: string; instagram?: string; facebook?: string; description?: string;
  program: string; price: number; billingIntervalValue: number; billingIntervalUnit: BillingIntervalUnit;
  startDate: string; source: Customer['source'];
  startWeight: number; targetWeight: number; waist?: number; thigh?: number; hip?: number;
}

@Injectable({ providedIn: 'root' })
export class CustomersService {
  private http = inject(HttpClient);

  /** Cached full collections - loaded once and kept in sync after writes, filtered client-side per customer. */
  readonly customers = signal<Customer[]>([]);
  readonly payments = signal<Payment[]>([]);
  readonly meetings = signal<Meeting[]>([]);

  constructor() {
    this.refreshCustomers();
    this.refreshPayments();
    this.refreshMeetings();
  }

  refreshCustomers(status?: CustomerStatus, search?: string) {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (search) params = params.set('search', search);
    this.http.get<Customer[]>(`${API_BASE_URL}/customers`, { params })
      .subscribe(list => this.customers.set(list));
  }

  private refreshPayments() {
    this.http.get<Payment[]>(`${API_BASE_URL}/payments`).subscribe(list => this.payments.set(list));
  }

  private refreshMeetings() {
    this.http.get<Meeting[]>(`${API_BASE_URL}/meetings`).subscribe(list => this.meetings.set(list));
  }

  getCustomer(id: string): Customer | undefined {
    return this.customers().find(c => c.id === id);
  }

  paymentsFor(customerId: string): Payment[] {
    return this.payments()
      .filter(p => p.customerId === customerId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  meetingsFor(customerId: string): Meeting[] {
    return this.meetings()
      .filter(m => m.customerId === customerId)
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  }

  measurementsFor$(customerId: string): Observable<ProgressMeasurement[]> {
    return this.http.get<ProgressMeasurement[]>(`${API_BASE_URL}/customers/${customerId}/measurements`);
  }

  documentsFor$(customerId: string): Observable<CustomerDocument[]> {
    return this.http.get<CustomerDocument[]>(`${API_BASE_URL}/customers/${customerId}/documents`);
  }

  timelineFor$(customerId: string): Observable<TimelineEvent[]> {
    return this.http.get<TimelineEvent[]>(`${API_BASE_URL}/customers/${customerId}/timeline`);
  }

  photosFor$(customerId: string): Observable<Photo[]> {
    return this.http.get<Photo[]>(`${API_BASE_URL}/customers/${customerId}/photos`);
  }

  uploadPhoto(customerId: string, file: File, type: PhotoType, date: string): Observable<Photo> {
    return from(resizeImage(file)).pipe(
      switchMap(blob =>
        this.http.post<{ uploadUrl: string; storageKey: string }>(
          `${API_BASE_URL}/customers/${customerId}/photos/upload-url`,
          { fileName: file.name, contentType: 'image/jpeg' }
        ).pipe(
          switchMap(({ uploadUrl, storageKey }) =>
            this.http.put(uploadUrl, blob, { headers: { 'Content-Type': 'image/jpeg' } }).pipe(
              switchMap(() =>
                this.http.post<Photo>(`${API_BASE_URL}/customers/${customerId}/photos`, { storageKey, type, date })
              )
            )
          )
        )
      )
    );
  }

  uploadDocument(customerId: string, file: File, type: DocumentType, date: string): Observable<CustomerDocument> {
    const contentType = file.type || 'application/octet-stream';
    return this.http.post<{ uploadUrl: string; storageKey: string }>(
      `${API_BASE_URL}/customers/${customerId}/documents/upload-url`,
      { fileName: file.name, contentType, sizeBytes: file.size }
    ).pipe(
      switchMap(({ uploadUrl, storageKey }) =>
        this.http.put(uploadUrl, file, { headers: { 'Content-Type': contentType } }).pipe(
          switchMap(() =>
            this.http.post<CustomerDocument>(`${API_BASE_URL}/customers/${customerId}/documents`, {
              storageKey, type, name: file.name, date, contentType, sizeBytes: file.size
            })
          )
        )
      )
    );
  }

  addMeasurement(customerId: string, data: { date: string; weight: number; waist?: number; thigh?: number; hip?: number }) {
    return this.http.post<ProgressMeasurement>(`${API_BASE_URL}/customers/${customerId}/measurements`, data)
      .pipe(tap(() => this.refreshCustomers()));
  }

  updateMeasurement(customerId: string, measurementId: string, data: { date: string; weight: number; waist?: number; thigh?: number; hip?: number }) {
    return this.http.patch<ProgressMeasurement>(`${API_BASE_URL}/customers/${customerId}/measurements/${measurementId}`, data)
      .pipe(tap(() => this.refreshCustomers()));
  }

  deleteMeasurement(customerId: string, measurementId: string) {
    return this.http.delete<void>(`${API_BASE_URL}/customers/${customerId}/measurements/${measurementId}`)
      .pipe(tap(() => this.refreshCustomers()));
  }

  addMeeting(customerId: string, data: { date: string; time: string; type: string; zoomLink?: string }) {
    return this.http.post<Meeting>(`${API_BASE_URL}/customers/${customerId}/meetings`, data)
      .pipe(tap(() => this.refreshMeetings()));
  }

  addPayment(customerId: string, data: { amount: number; date: string; status: PaymentStatus }) {
    return this.http.post<Payment>(`${API_BASE_URL}/customers/${customerId}/payments`, data)
      .pipe(tap(() => {
        this.refreshPayments();
        this.refreshCustomers();
      }));
  }

  updatePayment(customerId: string, paymentId: string, data: { amount: number; date: string; status: PaymentStatus }) {
    return this.http.patch<Payment>(`${API_BASE_URL}/customers/${customerId}/payments/${paymentId}`, data)
      .pipe(tap(() => {
        this.refreshPayments();
        this.refreshCustomers();
      }));
  }

  weightLoss(customer: Customer): number {
    return Math.round((customer.startWeight - customer.currentWeight) * 10) / 10;
  }

  addCustomer(data: NewCustomerData): Observable<Customer> {
    return this.http.post<Customer>(`${API_BASE_URL}/customers`, data).pipe(
      tap(() => {
        this.refreshCustomers();
        this.refreshPayments();
      }),
    );
  }

  updateCustomerStatus(customerId: string, status: CustomerStatus) {
    return this.updateCustomer(customerId, { status });
  }

  updateCustomer(customerId: string, data: Partial<{
    name: string; age: number; phone: string; instagram: string; facebook: string;
    description: string; source: Customer['source']; program: string; targetWeight: number;
    status: CustomerStatus;
  }>) {
    return this.http.patch<Customer>(`${API_BASE_URL}/customers/${customerId}`, data)
      .pipe(tap(() => this.refreshCustomers()));
  }

  dashboard(): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${API_BASE_URL}/dashboard`);
  }

  generateAgreement(customerId?: string): Observable<{ customerName: string; program: string; price: number | null }> {
    return this.http.post<{ customerName: string; program: string; price: number | null }>(
      `${API_BASE_URL}/agreements/generate`, { customerId },
    );
  }
}
