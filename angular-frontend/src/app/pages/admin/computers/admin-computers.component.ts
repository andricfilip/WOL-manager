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

      <div class="search-row">
        <input type="text" [(ngModel)]="search" placeholder="🔍 Search computers..."
               class="search-input" (ngModelChange)="onSearch()">
      </div>

      <div *ngIf="loading" class="loading"><div class="loader"></div></div>

      <div *ngIf="!loading && filtered.length === 0" class="empty">No computers found</div>

      <!-- Desktop table -->
      <div *ngIf="!loading && filtered.length > 0" class="table-container desktop-only">
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
            <tr *ngFor="let c of filtered">
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

      <!-- Mobile cards -->
      <div *ngIf="!loading" class="mobile-only">
        <div *ngIf="filtered.length === 0" class="empty">No computers found</div>
        <div class="comp-card" *ngFor="let c of filtered">
          <div class="cc-header">
            <div class="cc-title">
              {{ c.os_type === 'windows' ? '🪟' : c.os_type === 'linux' ? '🐧' : '❓' }}
              {{ c.name }}
            </div>
            <span class="badge" [class.badge-success]="c.status === 'online'"
                  [class.badge-danger]="c.status === 'offline'">{{ c.status }}</span>
          </div>
          <div class="cc-row">
            <span class="cc-label">MAC</span>
            <span class="cc-value mono">{{ c.mac_address }}</span>
          </div>
          <div class="cc-row" *ngIf="c.ip_address">
            <span class="cc-label">IP</span>
            <span class="cc-value">{{ c.ip_address }}</span>
          </div>
          <div class="cc-row" *ngIf="(c.assigned_users || []).length > 0">
            <span class="cc-label">Users</span>
            <span class="cc-value">
              <span *ngFor="let u of (c.assigned_users || []).slice(0, 4)" class="user-chip">{{ u.username }}</span>
            </span>
          </div>
          <div class="cc-actions">
            <a [routerLink]="[c.id, 'edit']" class="btn btn-outline btn-sm">✏️ Edit</a>
            <button class="btn btn-danger btn-sm" (click)="deleteComputer(c)">🗑️ Delete</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .section-header h2 { margin: 0; font-size: 1.3rem; font-weight: 700; color: var(--text-heading); }
    .search-row { margin-bottom: 16px; }
    .search-input {
      width: 100%; padding: 10px 14px;
      border: 2px solid var(--border); border-radius: 10px;
      font-size: 0.875rem; outline: none;
      background: var(--bg-input); color: var(--text-primary);
      transition: border-color 0.2s; box-sizing: border-box;
    }
    .search-input:focus { border-color: var(--accent); }
    .search-input::placeholder { color: var(--text-muted); }

    .btn { padding: 10px 20px; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; font-size: 0.85rem; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s; }
    .btn-sm { padding: 8px 14px; font-size: 0.8rem; }
    .btn-xs { padding: 6px 10px; font-size: 0.75rem; }
    .btn-primary { background: var(--accent); color: white; }
    .btn-outline { background: var(--bg-card); border: 1px solid var(--border); color: var(--text-secondary); }
    .btn-danger { background: #ef4444; color: white; }
    .loading { text-align: center; padding: 60px; }
    .loader { width: 40px; height: 40px; border: 4px solid var(--loader-track); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty { text-align: center; padding: 60px; color: var(--text-muted); }

    /* Desktop table */
    .table-container { background: var(--bg-card); border-radius: 14px; overflow: hidden; box-shadow: var(--shadow); border: 1px solid var(--border); }
    table { width: 100%; border-collapse: collapse; }
    th { background: var(--bg-page); padding: 12px 16px; text-align: left; font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid var(--border); }
    td { padding: 12px 16px; font-size: 0.85rem; color: var(--text-secondary); border-bottom: 1px solid var(--border); }
    tr:hover td { background: var(--bg-row-hover); }
    .bold { font-weight: 600; color: var(--text-primary); }
    .mono { font-family: monospace; font-size: 0.8rem; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 10px; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; }
    .badge-success { background: #ecfdf5; color: #065f46; }
    .badge-danger { background: #fef2f2; color: #991b1b; }
    .user-chip { display: inline-block; background: #eff6ff; color: #1e40af; padding: 2px 8px; border-radius: 6px; font-size: 0.75rem; margin-right: 4px; }
    .more-badge { font-size: 0.75rem; color: var(--text-muted); }
    .actions { display: flex; gap: 6px; }

    /* Mobile/Desktop visibility */
    .desktop-only { display: block; }
    .mobile-only { display: none; }

    /* Mobile cards */
    .comp-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 16px;
      margin-bottom: 12px;
      box-shadow: var(--shadow);
    }
    .cc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .cc-title { font-weight: 700; color: var(--text-primary); font-size: 1rem; }
    .cc-row { display: flex; gap: 8px; margin-bottom: 6px; align-items: flex-start; }
    .cc-label { font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; min-width: 40px; padding-top: 2px; }
    .cc-value { font-size: 0.85rem; color: var(--text-secondary); flex: 1; }
    .cc-actions { display: flex; gap: 8px; margin-top: 14px; }
    .cc-actions .btn { flex: 1; justify-content: center; }

    @media (max-width: 768px) {
      .desktop-only { display: none !important; }
      .mobile-only { display: block !important; }
    }
  `]
})
export class AdminComputersComponent implements OnInit {
  computers: Computer[] = [];
  filtered: Computer[] = [];
  loading = true;
  search = '';
  private searchTimeout: any = null;

  constructor(private api: ApiService, private notify: NotificationService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.api.getAdminComputers().subscribe({
      next: (res) => {
        this.computers = res.data?.computers || [];
        this.applySearch();
        this.loading = false;
      },
      error: () => { this.notify.error('Failed to load computers'); this.loading = false; }
    });
  }

  onSearch(): void {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.applySearch(), 300);
  }

  applySearch(): void {
    const q = this.search.toLowerCase();
    this.filtered = q
      ? this.computers.filter(c =>
          c.name.toLowerCase().includes(q) ||
          c.mac_address.toLowerCase().includes(q) ||
          (c.ip_address || '').toLowerCase().includes(q)
        )
      : [...this.computers];
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
