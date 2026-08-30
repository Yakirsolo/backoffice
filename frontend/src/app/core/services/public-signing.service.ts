import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, switchMap } from 'rxjs';
import { API_BASE_URL } from '../config/api-config';

export interface PublicAgreement {
  customerName: string;
  customerIdNumber: string;
  customerAddress: string;
  program: string;
  durationMonths: number | null;
  price: number | null;
  paymentTerms: string;
  agreementDate: string;
}

@Injectable({ providedIn: 'root' })
export class PublicSigningService {
  private http = inject(HttpClient);

  getAgreement(token: string): Observable<PublicAgreement> {
    return this.http.get<PublicAgreement>(`${API_BASE_URL}/public/sign/${token}`);
  }

  submitSignedPdf(token: string, pdfBlob: Blob): Observable<void> {
    return this.http.post<{ uploadUrl: string; storageKey: string }>(
      `${API_BASE_URL}/public/sign/${token}/upload-url`, {}
    ).pipe(
      switchMap(({ uploadUrl }) =>
        this.http.put(uploadUrl, pdfBlob, { headers: { 'Content-Type': 'application/pdf' } }).pipe(
          switchMap(() =>
            this.http.post<void>(`${API_BASE_URL}/public/sign/${token}/complete`, {})
          )
        )
      )
    );
  }
}
