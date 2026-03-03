import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="profile-page">
      <div class="page-header">
        <h1><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Profile</h1>
      </div>

      <div class="profile-grid" *ngIf="user">
        <!-- User Info Card -->
        <div class="card">
          <div class="card-header">
            <h2>Account Information</h2>
          </div>
          <div class="card-body">
            <div class="user-avatar">
              <div class="avatar-circle">{{ user.username.charAt(0).toUpperCase() }}</div>
            </div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Username</span>
                <span class="info-value">{{ user.username }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Email</span>
                <span class="info-value">{{ user.email }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Role</span>
                <span class="role-badge" [class.admin]="user.is_admin">
                  {{ user.is_admin ? 'Admin' : 'User' }}
                </span>
              </div>
              <div class="info-item">
                <span class="info-label">Member Since</span>
                <span class="info-value">{{ formatDate(user.created_at) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Edit Profile Card -->
        <div class="card">
          <div class="card-header">
            <h2>Edit Profile</h2>
          </div>
          <div class="card-body">
            <div class="form-group">
              <label>Username</label>
              <input type="text" [(ngModel)]="editUsername" placeholder="Username">
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" [(ngModel)]="editEmail" placeholder="Email">
            </div>
            <button class="btn btn-primary" (click)="updateProfile()" [disabled]="savingProfile">
              {{ savingProfile ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </div>

        <!-- Change Password Card -->
        <div class="card">
          <div class="card-header">
            <h2>Change Password</h2>
          </div>
          <div class="card-body">
            <div class="form-group">
              <label>Current Password</label>
              <input type="password" [(ngModel)]="oldPassword" placeholder="Current password">
            </div>
            <div class="form-group">
              <label>New Password</label>
              <input type="password" [(ngModel)]="newPassword" placeholder="New password">
            </div>
            <div class="form-group">
              <label>Confirm New Password</label>
              <input type="password" [(ngModel)]="confirmPassword" placeholder="Confirm new password">
            </div>
            <button class="btn btn-warning" (click)="changePassword()" [disabled]="changingPassword">
              {{ changingPassword ? 'Changing...' : '🔑 Change Password' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .profile-page { padding: 24px; max-width: 1200px; margin: 0 auto; }
    .page-header h1 { font-size: 1.75rem; font-weight: 800; color: var(--text-heading); margin: 0 0 24px; }

    .profile-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 20px;
    }
    .card {
      background: var(--bg-card);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: var(--shadow);
      border: 1px solid var(--border);
    }
    .card-header {
      padding: 18px 24px;
      border-bottom: 1px solid var(--border);
      background: var(--bg-page);
    }
    .card-header h2 { margin: 0; font-size: 1rem; font-weight: 700; color: var(--text-heading); }
    .card-body { padding: 24px; }

    .user-avatar { text-align: center; margin-bottom: 24px; }
    .avatar-circle {
      width: 80px; height: 80px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0066cc, #00a8e8);
      color: white;
      font-size: 2rem;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,102,204,0.3);
    }
    .info-grid { display: flex; flex-direction: column; gap: 16px; }
    .info-item { display: flex; flex-direction: column; gap: 4px; }
    .info-label { font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
    .info-value { font-size: 0.95rem; color: var(--text-primary); font-weight: 500; }
    .role-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 12px;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      background: var(--bg-badge);
      color: var(--text-secondary);
      width: fit-content;
    }
    .role-badge.admin { 
      background: rgba(59, 130, 246, 0.15);
      color: var(--accent);
      border: 1px solid rgba(59, 130, 246, 0.3);
    }

    .form-group { margin-bottom: 18px; }
    .form-group label {
      display: block;
      margin-bottom: 6px;
      font-weight: 600;
      color: var(--text-label);
      font-size: 0.85rem;
    }
    .form-group input {
      width: 100%;
      padding: 10px 14px;
      border: 2px solid var(--border);
      border-radius: 10px;
      font-size: 0.9rem;
      outline: none;
      transition: border-color 0.2s;
      box-sizing: border-box;
      background: var(--bg-input);
      color: var(--text-primary);
    }
    .form-group input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }

    .btn {
      padding: 10px 24px;
      border: none;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s;
      width: 100%;
    }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-primary { background: linear-gradient(135deg, #0066cc, #0052a3); color: white; }
    .btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,102,204,0.4); }
    .btn-warning { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; }
    .btn-warning:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(245,158,11,0.4); }

    @media (max-width: 768px) {
      .profile-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class ProfileComponent implements OnInit {
  user: User | null = null;
  editUsername = '';
  editEmail = '';
  oldPassword = '';
  newPassword = '';
  confirmPassword = '';
  savingProfile = false;
  changingPassword = false;

  constructor(
    private auth: AuthService,
    private notify: NotificationService
  ) {}

  ngOnInit(): void {
    this.auth.currentUser$.subscribe(user => {
      this.user = user;
      if (user) {
        this.editUsername = user.username;
        this.editEmail = user.email;
      }
    });
  }

  updateProfile(): void {
    if (!this.editUsername || !this.editEmail) {
      this.notify.warning('Username and email are required');
      return;
    }
    this.savingProfile = true;
    this.auth.updateProfile({ username: this.editUsername, email: this.editEmail }).subscribe({
      next: (res) => {
        if (res.success) {
          this.notify.success('Profile updated!');
          this.auth.checkAuth().subscribe();
        } else {
          this.notify.error(res.message || 'Update failed');
        }
        this.savingProfile = false;
      },
      error: () => {
        this.notify.error('Failed to update profile');
        this.savingProfile = false;
      }
    });
  }

  changePassword(): void {
    if (!this.oldPassword || !this.newPassword || !this.confirmPassword) {
      this.notify.warning('All fields are required');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.notify.error('Passwords do not match');
      return;
    }
    this.changingPassword = true;
    this.auth.changePassword({
      old_password: this.oldPassword,
      new_password: this.newPassword
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.notify.success('Password changed!');
          this.oldPassword = '';
          this.newPassword = '';
          this.confirmPassword = '';
        } else {
          this.notify.error(res.message || 'Failed');
        }
        this.changingPassword = false;
      },
      error: () => {
        this.notify.error('Failed to change password');
        this.changingPassword = false;
      }
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }
}
