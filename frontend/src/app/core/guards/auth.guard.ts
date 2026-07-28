import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.accessToken()) {
    return true;
  }

  return authService.restoreSession().pipe(
    map(restored => restored || router.createUrlTree(['/login'])),
  );
};
