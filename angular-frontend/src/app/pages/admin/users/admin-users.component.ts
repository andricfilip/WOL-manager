import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { NotificationService } from '../../../services/notification.service';
import { AuthService } from '../../../services/auth.service';
import { User } from '../../../models/user.model';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="section">
      <div class="section-header">
        <h2>👥 Users</h2>
        <button class="btn btn-primary btn-sm" (click)="showAddModal = true">+ Add User</button>
      </div>

      <div *ngIf="loading" class="loading"><div class="loader"></div></div>

      <div *ngIf="!loading && users.length > 0" class="table-container">
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Groups</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let u of users">
              <td class="bold">{{ u.username }}</td>
              <td>{{ u.email }}</td>
              <td>
                <span class="badge" [class.badge-admin]="u.is_admin" [class.badge-user]="!u.is_admin">
                  {{ u.is_admin ? '🛡️ Admin' : '👤 User' }}
                </span>
              </td>
              <td>
                <span class="badge" [class.badge-success]="u.can_view_groups" [class.badge-muted]="!u.can_view_groups">
                  {{ u.can_view_groups ? '✅' : '❌' }}
                </span>
              </td>
              <td class="time">{{ formatDate(u.created_at) }}</td>
              <td class="actions">
                <button class="btn btn-outline btn-xs" (click)="openEditModal(u)">✏️</button>
                <button class="btn btn-xs" [class.btn-warning]="u.is_admin" [class.btn-success]="!u.is_admin"
                        (click)="toggleAdmin(u)" [disabled]="u.id === currentUserId">
                  {{ u.is_admin ? '⬇️' : '⬆️' }}
                </button>
                <button class="btn btn-outline btn-xs" (click)="toggleGroups(u)">
                  {{ u.can_view_groups ? '🔒' : '🔓' }}
                </button>
                <button class="btn btn-danger btn-xs" (click)="deleteUser(u)" [disabled]="u.id === currentUserId">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Add User Modal -->
      <div *ngIf="showAddModal" class="modal-overlay" (click)="showAddModal = false">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>➕ Add User</h2>
            <button class="modal-close" (click)="showAddModal = false">×</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Username</label>
              <input type="text" [(ngModel)]="newUser.username" placeholder="Min 3 characters">
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" [(ngModel)]="newUser.email" placeholder="user@example.com">
            </div>
            <div class="form-group">
              <label>Password</label>
              <input type="password" [(ngModel)]="newUser.password" placeholder="Min 6 characters">
            </div>
            <div class="form-group toggle-group">
              <span class="toggle-label">Admin privileges</span>
              <label class="toggle-switch">
                <input type="checkbox" [(ngModel)]="newUser.is_admin">
                <span class="toggle-track">
                  <span class="toggle-thumb"></span>
                </span>
              </label>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showAddModal = false">Cancel</button>
            <button class="btn btn-primary" (click)="addUser()" [disabled]="saving">
              {{ saving ? 'Creating...' : 'Create User' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Edit User Modal -->
      <div *ngIf="showEditModal" class="modal-overlay" (click)="showEditModal = false">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>✏️ Edit User</h2>
            <button class="modal-close" (click)="showEditModal = false">×</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Username</label>
              <input type="text" [(ngModel)]="editData.username">
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" [(ngModel)]="editData.email">
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showEditModal = false">Cancel</button>
            <button class="btn btn-primary" (click)="saveEdit()" [disabled]="saving">
              {{ saving ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .section-header h2 { margin: 0; font-size: 1.3rem; font-weight: 700; color: var(--text-heading); }
    .btn { padding: 10px 20px; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; font-size: 0.85rem; transition: all 0.2s; display: inline-flex; align-items: center; gap: 4px; }
    .btn-sm { padding: 8px 16px; font-size: 0.8rem; }
    .btn-xs { padding: 6px 10px; font-size: 0.75rem; }
    .btn-primary { background: var(--accent); color: white; }
    .btn-outline { background: var(--bg-card); border: 1px solid var(--border); color: var(--text-secondary); }
    .btn-danger { background: #ef4444; color: white; }
    .btn-success { background: #10b981; color: white; }
    .btn-warning { background: #f59e0b; color: white; }
    .btn-secondary { background: var(--bg-badge); color: var(--text-secondary); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .loading { text-align: center; padding: 60px; }
    .loader { width: 40px; height: 40px; border: 4px solid var(--loader-track); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .table-container { background: var(--bg-card); border-radius: 14px; overflow: hidden; box-shadow: var(--shadow); border: 1px solid var(--border); overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 700px; }
    th { background: var(--bg-page); padding: 12px 16px; text-align: left; font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; border-bottom: 2px solid var(--border); }
    td { padding: 12px 16px; font-size: 0.85rem; color: var(--text-secondary); border-bottom: 1px solid var(--border); }
    tr:hover td { background: var(--bg-row-hover); }
    .bold { font-weight: 600; color: var(--text-primary); }
    .time { color: var(--text-muted); font-size: 0.8rem; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 10px; font-size: 0.7rem; font-weight: 600; }
    .badge-admin { background: #eff6ff; color: #1e40af; }
    .badge-user { background: var(--bg-badge); color: var(--text-secondary); }
    .badge-success { background: #ecfdf5; color: #065f46; }
    .badge-muted { background: var(--bg-badge); color: var(--text-muted); }
    .actions { display: flex; gap: 6px; }

    .modal-overlay { position: fixed; inset: 0; background: var(--bg-overlay); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 10000; }
    .modal-card { background: var(--bg-card); border-radius: 16px; width: 90%; max-width: 440px; overflow: hidden; border: 1px solid var(--border); }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid var(--border); }
    .modal-header h2 { margin: 0; font-size: 1.1rem; color: var(--text-heading); }
    .modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-muted); }
    .modal-body { padding: 24px; }
    .modal-footer { display: flex; gap: 10px; justify-content: flex-end; padding: 16px 24px; background: var(--bg-page); border-top: 1px solid var(--border); }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; font-weight: 600; margin-bottom: 6px; color: var(--text-label); font-size: 0.85rem; }
    .form-group input[type=text], .form-group input[type=email], .form-group input[type=password] {
      width: 100%; padding: 10px 14px; border: 2px solid var(--border); border-radius: 10px; font-size: 0.9rem; outline: none;
      box-sizing: border-box; background: var(--bg-input); color: var(--text-primary); transition: border-color 0.2s;
    }
    .form-group input[type=text]:focus, .form-group input[type=email]:focus, .form-group input[type=password]:focus { border-color: var(--accent); }

    /* Toggle Switch */
    .toggle-group {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 0;
      border-top: 1px solid var(--border);
      margin-top: 4px;
    }
    .toggle-label { font-weight: 600; color: var(--text-label); font-size: 0.85rem; }
    .toggle-switch { display: inline-flex; align-items: center; cursor: pointer; }
    .toggle-switch input { display: none; }
    .toggle-track {
      width: 44px; height: 24px;
      background: var(--loader-track);
      border-radius: 12px;
      position: relative;
      transition: background 0.25s;
    }
    .toggle-switch input:checked + .toggle-track { background: var(--accent); }
    .toggle-thumb {
      position: absolute;
      top: 3px; left: 3px;
      width: 18px; height: 18px;
      background: white;
      border-radius: 50%;
      transition: transform 0.25s;
      box-shadow: 0 1px 4px rgba(0,0,0,0.2);
    }
    .toggle-switch input:checked + .toggle-track .toggle-thumb { transform: translateX(20px); }
  `]
})
export class AdminUsersComponent implements OnInit {
  users: User[] = [];
  loading = true;
  saving = false;
  currentUserId = 0;

  showAddModal = false;
  showEditModal = false;
  editUserId = 0;

  newUser = { username: '', email: '', password: '', is_admin: false };
  editData = { username: '', email: '' };

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private notify: NotificationService
  ) {
    this.currentUserId = this.auth.currentUser?.id || 0;
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.api.getAdminUsers().subscribe({
      next: (res) => { this.users = res.data?.users || []; this.loading = false; },
      error: () => { this.notify.error('Failed to load users'); this.loading = false; }
    });
  }

  addUser(): void {
    if (!this.newUser.username || !this.newUser.email || !this.newUser.password) {
      this.notify.warning('All fields are required');
      return;
    }
    this.saving = true;
    this.api.createUser(this.newUser).subscribe({
      next: (res) => {
        if (res.success) { this.notify.success('User created!'); this.showAddModal = false; this.load(); this.newUser = { username: '', email: '', password: '', is_admin: false }; }
        else this.notify.error(res.message || 'Failed');
        this.saving = false;
      },
      error: () => { this.notify.error('Failed'); this.saving = false; }
    });
  }

  openEditModal(user: User): void {
    this.editUserId = user.id;
    this.editData = { username: user.username, email: user.email };
    this.showEditModal = true;
  }

  saveEdit(): void {
    this.saving = true;
    this.api.editUser(this.editUserId, this.editData).subscribe({
      next: (res) => {
        if (res.success) { this.notify.success('User updated!'); this.showEditModal = false; this.load(); }
        else this.notify.error(res.message || 'Failed');
        this.saving = false;
      },
      error: () => { this.notify.error('Failed'); this.saving = false; }
    });
  }

  toggleAdmin(user: User): void {
    if (!confirm(`Toggle admin status for "${user.username}"?`)) return;
    this.api.toggleAdmin(user.id).subscribe({
      next: (res) => { if (res.success) { this.notify.success(res.message || 'Updated'); this.load(); } else this.notify.error(res.message || 'Failed'); },
      error: () => this.notify.error('Failed')
    });
  }

  toggleGroups(user: User): void {
    this.api.toggleGroups(user.id).subscribe({
      next: (res) => { if (res.success) { this.notify.success(res.message || 'Updated'); this.load(); } else this.notify.error(res.message || 'Failed'); },
      error: () => this.notify.error('Failed')
    });
  }

  deleteUser(user: User): void {
    if (!confirm(`Delete "${user.username}"? This cannot be undone.`)) return;
    this.api.deleteUser(user.id).subscribe({
      next: (res) => { if (res.success) { this.notify.success('User deleted'); this.load(); } else this.notify.error(res.message || 'Failed'); },
      error: () => this.notify.error('Failed')
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString();
  }
}
