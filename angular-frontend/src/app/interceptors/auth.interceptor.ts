import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  const modifiedReq = req.clone({
    withCredentials: true,
    setHeaders: {
      'Content-Type': req.headers.has('Content-Type') ? req.headers.get('Content-Type')! : 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }
  });

  return next(modifiedReq).pipe(
    catchError(error => {
      // Skip redirect for auth endpoints — login/me/logout handle 401 themselves.
      // Without this, a failed login (wrong password → 401) triggers a redirect
      // loop while still on the login page.
      const isAuthEndpoint = req.url.includes('/api/angular/auth/');
      if (error.status === 401 && !isAuthEndpoint) {
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
