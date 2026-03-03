import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { NotificationService } from '../../../services/notification.service';
import { User } from '../../../models/user.model';
import { Computer, ComputerFormData } from '../../../models/computer.model';

@Component({
  selector: 'app-admin-computer-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="form-page">
      <div class="form-header">
        <button class="btn-back" (click)="goBack()">← Back</button>
        <h2>{{ isEdit ? 'Edit Computer' : 'Add Computer' }}</h2>
      </div>

      <div class="form-card">
        <div class="form-section">
          <h3>Basic Information</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>Name *</label>
              <input type="text" [(ngModel)]="form.name" placeholder="Computer name" required>
            </div>
            <div class="form-group">
              <label>MAC Address *</label>
              <input type="text" [(ngModel)]="form.mac_address" placeholder="AA:BB:CC:DD:EE:FF" required>
            </div>
            <div class="form-group">
              <label>IP Address</label>
              <input type="text" [(ngModel)]="form.ip_address" placeholder="192.168.1.100">
            </div>
            <div class="form-group">
              <label>OS Type</label>
              <select [(ngModel)]="form.os_type">
                <option value="linux">Linux</option>
                <option value="windows">Windows</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
          </div>
          <div class="form-group full">
            <label>Description</label>
            <textarea [(ngModel)]="form.description" placeholder="Optional description" rows="3"></textarea>
          </div>
        </div>

        <div class="form-section">
          <h3>SSH Configuration</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>SSH Host</label>
              <input type="text" [(ngModel)]="form.ssh_host" placeholder="Same as IP if empty">
            </div>
            <div class="form-group">
              <label>SSH Port</label>
              <input type="number" [(ngModel)]="form.ssh_port" placeholder="22">
            </div>
            <div class="form-group">
              <label>SSH Username</label>
              <input type="text" [(ngModel)]="form.ssh_username" placeholder="root">
            </div>
            <div class="form-group">
              <label>SSH Password {{ isEdit ? '(leave empty to keep current)' : '' }}</label>
              <input type="password" [(ngModel)]="form.ssh_password" placeholder="SSH password">
            </div>
          </div>
          <div class="toggle-group">
            <span class="toggle-label">Enable SSH Auto-Login</span>
            <label class="toggle-switch">
              <input type="checkbox" [(ngModel)]="form.ssh_auto_login">
              <span class="toggle-track">
                <span class="toggle-thumb"></span>
              </span>
            </label>
          </div>
        </div>

        <div class="form-section" *ngIf="allUsers.length > 0">
          <h3>User Assignment</h3>
          <div class="users-list">
            <div *ngFor="let user of allUsers" class="user-row">
              <label class="check-label">
                <input type="checkbox" [checked]="isUserAssigned(user.id)"
                       (change)="toggleUser(user.id, $event)">
                <span class="checkmark"></span>
                <span class="check-text">{{ user.username }}</span>
              </label>
              <select *ngIf="isUserAssigned(user.id)"
                      [value]="getUserRole(user.id)"
                      (change)="setUserRole(user.id, $any($event.target).value)">
                <option value="viewer">Viewer</option>
                <option value="operator">Operator</option>
                <option value="owner">Owner</option>
              </select>
            </div>
          </div>
        </div>

        <div class="form-actions">
          <button class="btn btn-secondary" (click)="goBack()">Cancel</button>
          <button class="btn btn-primary" (click)="submit()" [disabled]="saving">
            {{ saving ? 'Saving...' : (isEdit ? 'Update' : 'Create') }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .form-page { }
    .form-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
    .form-header h2 { margin: 0; font-size: 1.3rem; font-weight: 700; color: var(--text-heading); }
    .btn-back { background: none; border: none; color: var(--accent); cursor: pointer; font-weight: 600; font-size: 0.9rem; }
    .btn-back:hover { text-decoration: underline; }
    .form-card {
      background: var(--bg-card);
      border-radius: 16px;
      padding: 28px;
      box-shadow: var(--shadow);
      border: 1px solid var(--border);
    }
    .form-section { margin-bottom: 28px; padding-bottom: 24px; border-bottom: 1px solid var(--border); }
    .form-section:last-of-type { border-bottom: none; }
    .form-section h3 { margin: 0 0 16px; font-size: 1rem; font-weight: 700; color: var(--text-heading); }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group.full { grid-column: 1/-1; }
    .form-group label {
      font-size: 0.8rem; font-weight: 600; color: var(--text-muted);
      text-transform: uppercase; letter-spacing: 0.3px;
    }
    .form-group input, .form-group select, .form-group textarea {
      padding: 10px 14px;
      border: 2px solid var(--border);
      border-radius: 10px;
      font-size: 0.9rem;
      outline: none;
      transition: border-color 0.2s;
      background: var(--bg-input);
      color: var(--text-primary);
      box-sizing: border-box;
    }
    .form-group select {
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%2364748b' d='M6 8L0 0h12z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      background-size: 10px;
      padding-right: 36px;
      cursor: pointer;
    }
    html.dark .form-group select {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%2394a3b8' d='M6 8L0 0h12z'/%3E%3C/svg%3E");
    }
    .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-glow);
    }
    .form-group textarea { resize: vertical; font-family: inherit; }

    /* Toggle switch for SSH auto-login */
    .toggle-group {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 0 0;
      margin-top: 8px;
    }
    .toggle-label { font-weight: 600; color: var(--text-label); font-size: 0.85rem; flex: 1; }
    .toggle-switch { display: inline-flex; align-items: center; cursor: pointer; flex-shrink: 0; }
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

    /* Custom checkbox */
    .check-label {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      position: relative;
      font-size: 0.9rem;
      color: var(--text-secondary);
      user-select: none;
    }
    .check-label input { position: absolute; opacity: 0; width: 0; height: 0; }
    .checkmark {
      width: 20px; height: 20px;
      border: 2px solid var(--border);
      border-radius: 6px;
      background: var(--bg-input);
      flex-shrink: 0;
      transition: all 0.2s;
      position: relative;
    }
    .check-label input:checked ~ .checkmark {
      background: var(--accent);
      border-color: var(--accent);
    }
    .checkmark::after {
      content: '';
      position: absolute;
      display: none;
      left: 6px; top: 2px;
      width: 5px; height: 10px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }
    .check-label input:checked ~ .checkmark::after { display: block; }
    .check-text { font-weight: 500; color: var(--text-primary); }

    .users-list { display: flex; flex-direction: column; gap: 8px; }
    .user-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: var(--bg-page);
      border-radius: 10px;
      border: 1px solid var(--border);
      transition: background 0.2s;
    }
    .user-row:hover { background: var(--bg-row-hover); }
    .user-row select {
      padding: 6px 10px;
      border: 1px solid var(--border);
      border-radius: 6px;
      font-size: 0.8rem;
      background: var(--bg-input);
      color: var(--text-primary);
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%2364748b' d='M6 8L0 0h12z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 8px center;
      background-size: 8px;
      padding-right: 28px;
      cursor: pointer;
      min-width: 100px;
    }
    html.dark .user-row select {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%2394a3b8' d='M6 8L0 0h12z'/%3E%3C/svg%3E");
    }

    .form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px; }
    .btn {
      padding: 10px 24px; border: none; border-radius: 10px; font-weight: 600;
      cursor: pointer; font-size: 0.9rem; transition: all 0.2s;
    }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-primary { background: var(--accent); color: white; }
    .btn-primary:hover:not(:disabled) { background: var(--accent-hover); }
    .btn-secondary { background: var(--bg-badge); color: var(--text-secondary); }

    @media (max-width: 768px) {
      .form-grid { grid-template-columns: 1fr; }
      .form-card { padding: 20px; }
    }
  `]
})
export class AdminComputerFormComponent implements OnInit {
  isEdit = false;
  computerId: number | null = null;
  saving = false;
  allUsers: User[] = [];
  assignedUsers: Map<number, string> = new Map();

  form: ComputerFormData = {
    name: '', mac_address: '', ip_address: '', description: '',
    os_type: 'linux', ssh_host: '', ssh_port: 22, ssh_username: '',
    ssh_password: '', ssh_auto_login: false, assigned_users: []
  };

  constructor(
    private api: ApiService,
    private notify: NotificationService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.computerId = +id;
      this.loadComputer();
    } else {
      this.loadUsers();
    }
  }

  loadComputer(): void {
    this.api.getAdminComputer(this.computerId!).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const c = res.data.computer;
          this.form = {
            name: c.name, mac_address: c.mac_address, ip_address: c.ip_address || '',
            description: c.description || '', os_type: c.os_type, ssh_host: c.ssh_host || '',
            ssh_port: c.ssh_port || 22, ssh_username: c.ssh_username || '', ssh_password: '',
            ssh_auto_login: c.ssh_auto_login, assigned_users: []
          };
          this.allUsers = res.data.users || [];
          if (res.data.user_roles) {
            Object.entries(res.data.user_roles).forEach(([uid, role]: [string, any]) => {
              this.assignedUsers.set(+uid, role);
            });
          }
        }
      },
      error: () => this.notify.error('Failed to load computer')
    });
  }

  loadUsers(): void {
    this.api.getAdminUsers().subscribe({
      next: (res) => { this.allUsers = res.data?.users || []; },
      error: () => {}
    });
  }

  isUserAssigned(userId: number): boolean { return this.assignedUsers.has(userId); }
  getUserRole(userId: number): string { return this.assignedUsers.get(userId) || 'operator'; }
  toggleUser(userId: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) this.assignedUsers.set(userId, 'operator');
    else this.assignedUsers.delete(userId);
  }
  setUserRole(userId: number, role: string): void { this.assignedUsers.set(userId, role); }

  submit(): void {
    if (!this.form.name || !this.form.mac_address) {
      this.notify.warning('Name and MAC address are required');
      return;
    }
    this.saving = true;
    this.form.assigned_users = Array.from(this.assignedUsers.entries()).map(([user_id, role]) => ({ user_id, role }));

    const obs = this.isEdit
      ? this.api.updateComputer(this.computerId!, this.form)
      : this.api.createComputer(this.form);

    obs.subscribe({
      next: (res) => {
        if (res.success) {
          this.notify.success(this.isEdit ? 'Computer updated!' : 'Computer created!');
          this.goBack();
        } else {
          this.notify.error(res.message || 'Failed');
        }
        this.saving = false;
      },
      error: () => { this.notify.error('Failed to save'); this.saving = false; }
    });
  }

  goBack(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }
}
