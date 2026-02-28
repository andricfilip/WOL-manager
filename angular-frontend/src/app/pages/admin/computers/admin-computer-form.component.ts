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
        <h2>{{ isEdit ? '✏️ Edit Computer' : '➕ Add Computer' }}</h2>
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
                <option value="linux">🐧 Linux</option>
                <option value="windows">🪟 Windows</option>
                <option value="unknown">❓ Unknown</option>
              </select>
            </div>
          </div>
          <div class="form-group full">
            <label>Description</label>
            <textarea [(ngModel)]="form.description" placeholder="Optional description" rows="3"></textarea>
          </div>
        </div>

        <div class="form-section">
          <h3>🔐 SSH Configuration</h3>
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
          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" [(ngModel)]="form.ssh_auto_login">
              <span>Enable SSH Auto-Login</span>
            </label>
          </div>
        </div>

        <div class="form-section" *ngIf="allUsers.length > 0">
          <h3>👥 User Assignment</h3>
          <div class="users-list">
            <div *ngFor="let user of allUsers" class="user-row">
              <label class="checkbox-label">
                <input type="checkbox" [checked]="isUserAssigned(user.id)"
                       (change)="toggleUser(user.id, $event)">
                <span>{{ user.username }}</span>
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
            {{ saving ? 'Saving...' : (isEdit ? '💾 Update' : '➕ Create') }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .form-page { }
    .form-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
    .form-header h2 { margin: 0; font-size: 1.3rem; font-weight: 700; color: #1e293b; }
    .btn-back { background: none; border: none; color: #0066cc; cursor: pointer; font-weight: 600; font-size: 0.9rem; }
    .form-card { background: white; border-radius: 16px; padding: 28px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .form-section { margin-bottom: 28px; padding-bottom: 24px; border-bottom: 1px solid #f1f5f9; }
    .form-section:last-of-type { border-bottom: none; }
    .form-section h3 { margin: 0 0 16px; font-size: 1rem; font-weight: 700; color: #334155; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group.full { grid-column: 1/-1; }
    .form-group label { font-size: 0.8rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.3px; }
    .form-group input, .form-group select, .form-group textarea {
      padding: 10px 14px;
      border: 2px solid #e2e8f0;
      border-radius: 10px;
      font-size: 0.9rem;
      outline: none;
      transition: border-color 0.2s;
      background: white;
    }
    .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
      border-color: #0066cc;
      box-shadow: 0 0 0 3px rgba(0,102,204,0.1);
    }
    .form-group textarea { resize: vertical; font-family: inherit; }
    .checkbox-group { margin-top: 8px; }
    .checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.9rem; color: #475569; }
    .checkbox-label input { accent-color: #0066cc; }

    .users-list { display: flex; flex-direction: column; gap: 8px; }
    .user-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: #f8fafc; border-radius: 10px; }
    .user-row select { padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.8rem; }

    .form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px; }
    .btn { padding: 10px 24px; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; font-size: 0.9rem; transition: all 0.2s; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-primary { background: #0066cc; color: white; }
    .btn-primary:hover:not(:disabled) { background: #0052a3; }
    .btn-secondary { background: #e2e8f0; color: #475569; }

    @media (max-width: 768px) { .form-grid { grid-template-columns: 1fr; } }
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
