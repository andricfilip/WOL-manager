import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-page">
      <div class="login-card">
        <div class="login-header">
          <div class="logo-icon">⚡</div>
          <h1>ComputerRunner</h1>
          <p class="subtitle">Wake-on-LAN Manager</p>
        </div>

        <form (ngSubmit)="onSubmit()" class="login-form">
          <div class="form-group">
            <label for="username">Username</label>
            <div class="input-wrapper">
              <span class="input-icon">👤</span>
              <input type="text" id="username" [(ngModel)]="username" name="username"
                     placeholder="Enter your username" required autocomplete="username">
            </div>
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <div class="input-wrapper">
              <span class="input-icon">🔒</span>
              <input [type]="showPassword ? 'text' : 'password'" id="password"
                     [(ngModel)]="password" name="password"
                     placeholder="Enter your password" required autocomplete="current-password">
              <button type="button" class="toggle-password" (click)="showPassword = !showPassword">
                {{ showPassword ? '🙈' : '👁️' }}
              </button>
            </div>
          </div>

          <div class="form-options">
            <label class="checkbox-label">
              <input type="checkbox" [(ngModel)]="remember" name="remember">
              <span class="checkmark"></span>
              Remember me
            </label>
          </div>

          <button type="submit" class="btn-login" [disabled]="loading">
            <span *ngIf="loading" class="spinner"></span>
            {{ loading ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>

        <div class="login-footer">
          <p>Need an account? Contact your administrator.</p>
        </div>
      </div>

      <div class="login-bg">
        <div class="bg-shape bg-shape-1"></div>
        <div class="bg-shape bg-shape-2"></div>
        <div class="bg-shape bg-shape-3"></div>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0a1628 0%, #1a365d 50%, #0d2137 100%);
      position: relative;
      overflow: hidden;
      padding: 20px;
    }
    .login-bg {
      position: absolute;
      inset: 0;
      overflow: hidden;
      z-index: 0;
    }
    .bg-shape {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.15;
    }
    .bg-shape-1 {
      width: 500px; height: 500px;
      background: #0066cc;
      top: -100px; right: -100px;
      animation: float 8s ease-in-out infinite;
    }
    .bg-shape-2 {
      width: 400px; height: 400px;
      background: #00a8e8;
      bottom: -50px; left: -50px;
      animation: float 10s ease-in-out infinite reverse;
    }
    .bg-shape-3 {
      width: 300px; height: 300px;
      background: #2a9d8f;
      top: 50%; left: 50%;
      animation: float 12s ease-in-out infinite;
    }
    @keyframes float {
      0%, 100% { transform: translate(0, 0); }
      50% { transform: translate(30px, -30px); }
    }
    .login-card {
      background: rgba(255, 255, 255, 0.97);
      border-radius: 24px;
      padding: 48px 40px;
      width: 100%;
      max-width: 440px;
      box-shadow: 0 25px 60px rgba(0,0,0,0.3);
      position: relative;
      z-index: 1;
      backdrop-filter: blur(20px);
    }
    .login-header {
      text-align: center;
      margin-bottom: 36px;
    }
    .logo-icon {
      font-size: 3rem;
      margin-bottom: 12px;
      filter: drop-shadow(0 4px 8px rgba(0,102,204,0.3));
    }
    .login-header h1 {
      font-size: 1.8rem;
      font-weight: 800;
      color: #1a365d;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .subtitle {
      color: #64748b;
      font-size: 0.95rem;
      margin-top: 4px;
    }
    .form-group {
      margin-bottom: 20px;
    }
    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #334155;
      font-size: 0.9rem;
    }
    .input-wrapper {
      display: flex;
      align-items: center;
      background: #f8fafc;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      transition: all 0.2s;
      overflow: hidden;
    }
    .input-wrapper:focus-within {
      border-color: #0066cc;
      box-shadow: 0 0 0 4px rgba(0,102,204,0.1);
      background: white;
    }
    .input-icon {
      padding: 0 12px;
      font-size: 1.1rem;
    }
    .input-wrapper input {
      flex: 1;
      padding: 14px 12px 14px 0;
      border: none;
      background: transparent;
      font-size: 1rem;
      color: #1e293b;
      outline: none;
    }
    .toggle-password {
      background: none;
      border: none;
      padding: 0 12px;
      cursor: pointer;
      font-size: 1.1rem;
    }
    .form-options {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #64748b;
      font-size: 0.9rem;
      cursor: pointer;
    }
    .checkbox-label input[type="checkbox"] { accent-color: #0066cc; }
    .btn-login {
      width: 100%;
      padding: 16px;
      background: linear-gradient(135deg, #0066cc, #0052a3);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 1.05rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      letter-spacing: 0.3px;
    }
    .btn-login:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0,102,204,0.4);
    }
    .btn-login:disabled { opacity: 0.7; cursor: not-allowed; }
    .spinner {
      width: 20px; height: 20px;
      border: 3px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .login-footer {
      text-align: center;
      margin-top: 24px;
      font-size: 0.85rem;
      color: #94a3b8;
    }
  `]
})
export class LoginComponent {
  username = '';
  password = '';
  remember = false;
  showPassword = false;
  loading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private notify: NotificationService
  ) {}

  onSubmit(): void {
    if (!this.username || !this.password) {
      this.notify.warning('Please enter username and password');
      return;
    }

    this.loading = true;
    this.authService.login({
      username: this.username,
      password: this.password,
      remember: this.remember
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.notify.success('Login successful!');
          this.router.navigate(['/dashboard']);
        } else {
          this.notify.error(res.message || 'Login failed');
        }
        this.loading = false;
      },
      error: (err) => {
        this.notify.error(err.error?.message || 'Login failed. Please try again.');
        this.loading = false;
      }
    });
  }
}
