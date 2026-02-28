import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, tap } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated) {
    return true;
  }

  return authService.checkAuth().pipe(
    tap(isAuth => {
      if (!isAuth) {
        router.navigate(['/login']);
      }
    })
  );
};

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated && authService.isAdmin) {
    return true;
  }

  return authService.checkAuth().pipe(
    map(isAuth => {
      if (isAuth && authService.isAdmin) {
        return true;
      }
      router.navigate(['/dashboard']);
      return false;
    })
  );
};

export const loginGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated) {
    router.navigate(['/dashboard']);
    return false;
  }

  return authService.checkAuth().pipe(
    map(isAuth => {
      if (isAuth) {
        router.navigate(['/dashboard']);
        return false;
      }
      return true;
    })
  );
};
