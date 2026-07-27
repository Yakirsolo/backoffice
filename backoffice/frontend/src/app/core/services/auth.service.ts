import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api-config';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface UserSettings {
  name: string;
  businessName: string | null;
  email: string;
  phone: string | null;
  notifyPaymentReminders: boolean;
  notifyFollowUp: boolean;
}

export interface UserSettingsUpdate {
  name?: string;
  businessName?: string;
  phone?: string;
  notifyPaymentReminders?: boolean;
  notifyFollowUp?: boolean;
}

interface AuthResponse {
  accessToken: string;
  expiresInSeconds: number;
  user: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  /** Kept in memory only (not localStorage) - lost on page reload, restored via refresh cookie. */
  readonly accessToken = signal<string | null>(null);
  readonly currentUser = signal<AuthUser | null>(null);

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${API_BASE_URL}/auth/login`, { email, password }, { withCredentials: true })
      .pipe(tap(res => this.applySession(res)));
  }

  /** Attempts to restore a session from the httpOnly refresh cookie. Never throws. */
  restoreSession(): Observable<boolean> {
    return this.http
      .post<AuthResponse>(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
      .pipe(
        tap(res => this.applySession(res)),
        map(() => true),
        catchError(() => of(false)),
      );
  }

  refresh(): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
      .pipe(tap(res => this.applySession(res)));
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${API_BASE_URL}/auth/logout`, {}, { withCredentials: true }).pipe(
      tap(() => {
        this.accessToken.set(null);
        this.currentUser.set(null);
      }),
    );
  }

  getMySettings(): Observable<UserSettings> {
    return this.http.get<UserSettings>(`${API_BASE_URL}/me`);
  }

  updateMySettings(update: UserSettingsUpdate): Observable<UserSettings> {
    return this.http.patch<UserSettings>(`${API_BASE_URL}/me`, update);
  }

  private applySession(res: AuthResponse) {
    this.accessToken.set(res.accessToken);
    this.currentUser.set(res.user);
  }
}
