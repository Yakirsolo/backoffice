import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api-config';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_BASE_URL)) {
    return next(req);
  }

  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.accessToken();
  const isAuthCall = req.url.includes('/auth/');

  const authorizedReq = token && !isAuthCall
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` }, withCredentials: true })
    : req.clone({ withCredentials: true });

  return next(authorizedReq).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !isAuthCall) {
        return authService.refresh().pipe(
          switchMap(() => {
            const retriedReq = req.clone({
              setHeaders: { Authorization: `Bearer ${authService.accessToken()}` },
              withCredentials: true,
            });
            return next(retriedReq);
          }),
          catchError(refreshError => {
            router.navigate(['/login']);
            return throwError(() => refreshError);
          }),
        );
      }
      return throwError(() => error);
    }),
  );
};
