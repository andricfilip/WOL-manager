import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { NotificationService } from '../../../services/notification.service';
import { Computer } from '../../../models/computer.model';

@Component({
  selector: 'app-admin-computers',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="section">
      <div class="section-header">
        <h2>💻 Computers</h2>
        <a routerLink="add" class="btn btn-primary btn-sm">+ Add Computer</a>
      </div>

      <div *ngIf="loading" class="loading"><div class="loader"></div></div>

      <div *ngIf="!loading && computers.length === 0" class="empty">No computers found</div>

      <div *ngIf="!loading && computers.length > 0" class="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>MAC Address</th>
              <th>IP Address</th>
              <th>OS</th>
              <th>Status</th>
              <th>Assigned Users</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let c of computers">
              <td class="bold">{{ c.name }}</td>
              <td class="mono">{{ c.mac_address }}</td>
              <td>{{ c.ip_address || '-' }}</td>
              <td>{{ c.os_type === 'windows' ? '🪟' : c.os_type === 'linux' ? '🐧' : '❓' }}</td>
              <td>
                <span class="badge" [class.badge-success]="c.status === 'online'"
                      [class.badge-danger]="c.status === 'offline'">
                  {{ c.status }}
                </span>
              </td>
              <td>
                <span *ngFor="let u of (c.assigned_users || []).slice(0, 3)" class="user-chip">
                  {{ u.username }}
                </span>
                <span *ngIf="(c.assigned_users || []).length > 3" class="more-badge">
                  +{{ (c.assigned_users || []).length - 3 }}
                </span>
              </td>
              <td class="actions">
                <a [routerLink]="[c.id, 'edit']" class="btn btn-outline btn-xs">✏️ Edit</a>
                <button class="btn btn-danger btn-xs" (click)="deleteComputer(c)">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .section-header h2 { margin: 0; font-size: 1.3rem; font-weight: 700; color: #1e293b; }
    .btn { padding: 10px 20px; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; font-size: 0.85rem; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s; }
    .btn-sm { padding: 8px 16px; font-size: 0.8rem; }
    .btn-xs { padding: 6px 12px; font-size: 0.75rem; }
    .btn-primary { background: #0066cc; color: white; }
    .btn-outline { background: white; border: 1px solid #e2e8f0; color: #475569; }
    .btn-danger { background: #ef4444; color: white; }
    .loading { text-align: center; padding: 60px; }
    .loader { width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #0066cc; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty { text-align: center; padding: 60px; color: #94a3b8; }
    .table-container { background: white; border-radius: 14px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 700px; }
    th { background: #f8fafc; padding: 12px 16px; text-align: left; font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; }
    td { padding: 12px 16px; font-size: 0.85rem; color: #475569; border-bottom: 1px solid #f1f5f9; }
    tr:hover { background: #fafbfd; }
    .bold { font-weight: 600; color: #1e293b; }
    .mono { font-family: monospace; font-size: 0.8rem; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 10px; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; }
    .badge-success { background: #ecfdf5; color: #065f46; }
    .badge-danger { background: #fef2f2; color: #991b1b; }
    .user-chip { display: inline-block; background: #eff6ff; color: #1e40af; padding: 2px 8px; border-radius: 6px; font-size: 0.75rem; margin-right: 4px; }
    .more-badge { font-size: 0.75rem; color: #94a3b8; }
    .actions { display: flex; gap: 6px; }
  `]
})
export class AdminComputersComponent implements OnInit {
  computers: Computer[] = [];
  loading = true;

  constructor(private api: ApiService, private notify: NotificationService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.api.getAdminComputers().subscribe({
      next: (res) => {
        this.computers = res.data?.computers || [];
        this.loading = false;
      },
      error: () => { this.notify.error('Failed to load computers'); this.loading = false; }
    });
  }

  deleteComputer(c: Computer): void {
    if (!confirm(`Delete "${c.name}"? This cannot be undone.`)) return;
    this.api.deleteComputer(c.id).subscribe({
      next: (res) => {
        if (res.success) { this.notify.success('Computer deleted'); this.load(); }
        else this.notify.error(res.message || 'Failed');
      },
      error: () => this.notify.error('Failed to delete')
    });
  }
}
