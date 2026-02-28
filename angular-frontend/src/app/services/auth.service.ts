import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, map, catchError, of } from 'rxjs';
import { Router } from '@angular/router';
import { User, LoginRequest, ChangePasswordRequest, UpdateProfileRequest } from '../models/user.model';
import { ApiResponse } from '../models/api.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.checkAuth();
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  get isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  get isAdmin(): boolean {
    return this.currentUser?.is_admin ?? false;
  }

  checkAuth(): Observable<boolean> {
    return this.http.get<ApiResponse<User>>('/api/angular/auth/me').pipe(
      tap(res => {
        if (res.success && res.data) {
          this.currentUserSubject.next(res.data);
          this.isAuthenticatedSubject.next(true);
        } else {
          this.currentUserSubject.next(null);
          this.isAuthenticatedSubject.next(false);
        }
      }),
      map(res => res.success),
      catchError(() => {
        this.currentUserSubject.next(null);
        this.isAuthenticatedSubject.next(false);
        return of(false);
      })
    );
  }

  login(credentials: LoginRequest): Observable<ApiResponse<User>> {
    return this.http.post<ApiResponse<User>>('/api/angular/auth/login', credentials).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.currentUserSubject.next(res.data);
          this.isAuthenticatedSubject.next(true);
        }
      })
    );
  }

  logout(): Observable<ApiResponse> {
    return this.http.post<ApiResponse>('/api/angular/auth/logout', {}).pipe(
      tap(() => {
        this.currentUserSubject.next(null);
        this.isAuthenticatedSubject.next(false);
        this.router.navigate(['/login']);
      })
    );
  }

  changePassword(data: ChangePasswordRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>('/profile/change-password', data);
  }

  updateProfile(data: UpdateProfileRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>('/profile/update', data);
  }
}
