import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';
import { WolLogEntry, ShutdownLogEntry, AuditLogEntry } from '../../models/api.model';
import { DatePickerComponent } from '../../components/datepicker/datepicker.component';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePickerComponent],
  template: `
    <div class="history-page">
      <div class="page-header">
        <h1><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> History</h1>
      </div>

      <!-- Filters -->
      <div class="filters-bar">
        <div class="tabs">
          <button class="tab" [class.active]="activeTab === 'wol'" (click)="activeTab = 'wol'; loadHistory()">
            <svg class="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4.09 12.97H11L9 22 19.91 10H13z"/></svg> WoL Logs
          </button>
          <button class="tab" [class.active]="activeTab === 'shutdown'" (click)="activeTab = 'shutdown'; loadHistory()">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg> Shutdown Logs
          </button>
          <button class="tab" [class.active]="activeTab === 'audit'" (click)="activeTab = 'audit'; loadHistory()">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Audit Logs
          </button>
        </div>
        <div class="filter-controls">
          <input type="text" [(ngModel)]="search" placeholder="Search..." class="filter-input"
                 (ngModelChange)="onSearchChange()">
          <app-datepicker [(ngModel)]="dateFrom" placeholder="From date" (ngModelChange)="loadHistory()"></app-datepicker>
          <app-datepicker [(ngModel)]="dateTo" placeholder="To date" (ngModelChange)="loadHistory()"></app-datepicker>
          <button class="btn btn-outline btn-sm" (click)="clearFilters()">Clear</button>
          <button *ngIf="isAdmin" class="btn btn-danger btn-sm" (click)="showDeleteModal = true">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6m4-6v6"/><path d="M15 6V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v2"/></svg>
            Delete Logs
          </button>
        </div>
      </div>

      <div *ngIf="loading" class="loading-state">
        <div class="loader"></div>
      </div>

      <!-- WoL Logs -->
      <div *ngIf="!loading && activeTab === 'wol'" class="table-container desktop-table">
        <div *ngIf="wolLogs.length === 0" class="empty-table">No WoL logs found</div>
        <table *ngIf="wolLogs.length > 0">
          <thead>
            <tr>
              <th>Computer</th>
              <th>User</th>
              <th>Timestamp</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let log of wolLogs">
              <td class="bold">{{ log.computer_name }}</td>
              <td>{{ log.username }}</td>
              <td class="time">{{ formatTime(log.timestamp) }}</td>
              <td>
                <span class="badge" [class.badge-success]="log.status === 'sent'"
                      [class.badge-danger]="log.status === 'failed'">
                  {{ log.status }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- WoL mobile cards -->
      <ng-container *ngIf="!loading && activeTab === 'wol'">
        <div class="mobile-cards">
          <div *ngIf="wolLogs.length === 0" class="empty-table">No WoL logs found</div>
          <div class="log-card" *ngFor="let log of wolLogs">
            <div class="lc-header">
              <span class="lc-title">{{ log.computer_name }}</span>
              <span class="badge" [class.badge-success]="log.status === 'sent'" [class.badge-danger]="log.status === 'failed'">{{ log.status }}</span>
            </div>
            <div class="lc-meta">
              <span class="lc-user"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> {{ log.username }}</span>
              <span class="lc-time">{{ formatTime(log.timestamp) }}</span>
            </div>
          </div>
        </div>
      </ng-container>

      <!-- Shutdown Logs -->
      <div *ngIf="!loading && activeTab === 'shutdown'" class="table-container desktop-table">
        <div *ngIf="shutdownLogs.length === 0" class="empty-table">No shutdown logs found</div>
        <table *ngIf="shutdownLogs.length > 0">
          <thead>
            <tr>
              <th>Computer</th>
              <th>User</th>
              <th>Timestamp</th>
              <th>Status</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let log of shutdownLogs">
              <td class="bold">{{ log.computer_name }}</td>
              <td>{{ log.username }}</td>
              <td class="time">{{ formatTime(log.timestamp) }}</td>
              <td>
                <span class="badge" [class.badge-success]="log.status === 'success'"
                      [class.badge-danger]="log.status === 'failed'">
                  {{ log.status }}
                </span>
              </td>
              <td class="error-msg">{{ log.error_message || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Shutdown mobile cards -->
      <ng-container *ngIf="!loading && activeTab === 'shutdown'">
        <div class="mobile-cards">
          <div *ngIf="shutdownLogs.length === 0" class="empty-table">No shutdown logs found</div>
          <div class="log-card" *ngFor="let log of shutdownLogs">
            <div class="lc-header">
              <span class="lc-title">{{ log.computer_name }}</span>
              <span class="badge" [class.badge-success]="log.status === 'success'" [class.badge-danger]="log.status === 'failed'">{{ log.status }}</span>
            </div>
            <div class="lc-meta">
              <span class="lc-user"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> {{ log.username }}</span>
              <span class="lc-time">{{ formatTime(log.timestamp) }}</span>
            </div>
            <div *ngIf="log.error_message" class="lc-error"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> {{ log.error_message }}</div>
          </div>
        </div>
      </ng-container>

      <!-- Audit Logs -->
      <div *ngIf="!loading && activeTab === 'audit'" class="table-container desktop-table">
        <div *ngIf="auditLogs.length === 0" class="empty-table">No audit logs found</div>
        <table *ngIf="auditLogs.length > 0">
          <thead>
            <tr>
              <th>Action</th>
              <th>User</th>
              <th>Resource</th>
              <th>Status</th>
              <th>Details</th>
              <th>Timestamp</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let log of auditLogs">
              <td class="bold">{{ log.action }}</td>
              <td>{{ log.username }}</td>
              <td>{{ log.resource_type }}</td>
              <td>
                <span class="badge" [class.badge-success]="log.status === 'success'"
                      [class.badge-danger]="log.status === 'failed'"
                      [class.badge-warning]="log.status === 'denied'">
                  {{ log.status }}
                </span>
              </td>
              <td class="details-col">{{ log.details || '-' }}</td>
              <td class="time">{{ formatTime(log.timestamp) }}</td>
              <td class="mono">{{ log.ip_address }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Audit mobile cards -->
      <ng-container *ngIf="!loading && activeTab === 'audit'">
        <div class="mobile-cards">
          <div *ngIf="auditLogs.length === 0" class="empty-table">No audit logs found</div>
          <div class="log-card" *ngFor="let log of auditLogs">
            <div class="lc-header">
              <span class="lc-title">{{ log.action }}</span>
              <span class="badge"
                [class.badge-success]="log.status === 'success'"
                [class.badge-danger]="log.status === 'failed'"
                [class.badge-warning]="log.status === 'denied'">{{ log.status }}</span>
            </div>
            <div class="lc-meta">
              <span class="lc-user"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> {{ log.username }}</span>
              <span class="lc-time">{{ formatTime(log.timestamp) }}</span>
            </div>
            <div class="lc-detail" *ngIf="log.details">{{ log.details }}</div>
            <div class="lc-ip" *ngIf="log.ip_address">{{ log.ip_address }} · {{ log.resource_type }}</div>
          </div>
        </div>
      </ng-container>
      <div *ngIf="showDeleteModal" class="modal-overlay" (click)="showDeleteModal = false">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6m4-6v6"/><path d="M15 6V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v2"/></svg> Delete Logs</h2>
            <button class="modal-close" (click)="showDeleteModal = false">×</button>
          </div>
          <div class="modal-body">
            <div class="delete-options">
              <label class="radio-option">
                <input type="radio" [(ngModel)]="deleteOption" value="all" name="deleteOpt">
                Delete ALL logs
              </label>
              <label class="radio-option">
                <input type="radio" [(ngModel)]="deleteOption" value="range" name="deleteOpt">
                Delete by date range
              </label>
            </div>
            <div *ngIf="deleteOption === 'range'" class="date-range">
              <app-datepicker [(ngModel)]="deleteFrom" placeholder="From date"></app-datepicker>
              <span style="color:var(--text-muted)">to</span>
              <app-datepicker [(ngModel)]="deleteTo" placeholder="To date"></app-datepicker>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showDeleteModal = false">Cancel</button>
            <button class="btn btn-danger" (click)="deleteLogs()">Delete</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .history-page { padding: 24px; max-width: 1400px; margin: 0 auto; }
    .page-header h1 { font-size: 1.75rem; font-weight: 800; color: var(--text-heading); margin: 0 0 24px; }

    .filters-bar {
      background: var(--bg-card);
      border-radius: 14px;
      padding: 16px 20px;
      margin-bottom: 20px;
      box-shadow: var(--shadow);
      border: 1px solid var(--border);
    }
    .tabs { display: flex; gap: 4px; margin-bottom: 16px; flex-wrap: wrap; }
    .tab {
      padding: 7px 16px;
      border: none;
      border-radius: 8px;
      background: var(--bg-badge);
      color: var(--text-secondary);
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 0.85rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }
    .tab.active { background: var(--accent); color: white; }
    .tab:hover:not(.active) { background: var(--bg-row-hover); color: var(--text-primary); }
    .filter-controls { display: flex; gap: 10px; flex-wrap: wrap; align-items: stretch; }
    .filter-input {
      padding: 8px 14px;
      border: 2px solid var(--border);
      border-radius: 8px;
      font-size: 0.85rem;
      outline: none;
      background: var(--bg-input);
      color: var(--text-primary);
      transition: border-color 0.2s;
      flex: 1 1 200px;
      min-width: 0;
    }
    .filter-input:focus { border-color: var(--accent); }
    .filter-input::placeholder { color: var(--text-muted); }

    /* Desktop table: always visible on >=769 */
    .desktop-table { display: block; }
    /* Mobile cards: always hidden on >=769 */
    .mobile-cards { display: none; }

    @media (max-width: 768px) {
      .desktop-table { display: none !important; }
      .mobile-cards {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .history-page { padding: 16px; }
      .filters-bar { padding: 12px; }
      .tab { font-size: 0.78rem; padding: 6px 10px; flex: 1; min-width: 0; text-align: center; }
      .filter-controls { gap: 8px; }
      .filter-controls > * { flex: 1 1 100%; min-width: 0; }
      .filter-input { flex: 1 1 100%; }
      .btn { width: 100%; justify-content: center; }
    }

    /* Log cards */
    .log-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px 16px;
      box-shadow: var(--shadow);
    }
    .lc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .lc-title { font-weight: 700; color: var(--text-primary); font-size: 0.95rem; }
    .lc-meta { display: flex; justify-content: space-between; align-items: center; }
    .lc-user { font-size: 0.8rem; color: var(--text-secondary); }
    .lc-time { font-size: 0.75rem; color: var(--text-muted); }
    .lc-detail { margin-top: 6px; font-size: 0.8rem; color: var(--text-secondary); }
    .lc-ip { margin-top: 4px; font-size: 0.75rem; color: var(--text-muted); font-family: monospace; }
    .lc-error { margin-top: 4px; font-size: 0.8rem; color: #ef4444; }

    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      font-size: 0.85rem;
      transition: all 0.2s;
    }
    .btn-sm { padding: 8px 14px; font-size: 0.8rem; }
    .btn-outline { background: var(--bg-card); border: 2px solid var(--border); color: var(--text-secondary); }
    .btn-outline:hover { border-color: var(--accent); color: var(--accent); }
    .btn-danger { background: #ef4444; color: white; }
    .btn-secondary { background: var(--bg-badge); color: var(--text-secondary); }

    .loading-state { text-align: center; padding: 60px; }
    .loader {
      width: 40px; height: 40px;
      border: 4px solid var(--loader-track);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .table-container {
      background: var(--bg-card);
      border-radius: 14px;
      overflow: hidden;
      box-shadow: var(--shadow);
      border: 1px solid var(--border);
    }
    .empty-table {
      text-align: center;
      padding: 60px;
      color: var(--text-muted);
      font-size: 1rem;
    }
    table { width: 100%; border-collapse: collapse; }
    th {
      background: var(--bg-page);
      padding: 12px 16px;
      text-align: left;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid var(--border);
    }
    td {
      padding: 12px 16px;
      font-size: 0.85rem;
      color: var(--text-secondary);
      border-bottom: 1px solid var(--border);
    }
    tr:hover td { background: var(--bg-row-hover); }
    .bold { font-weight: 600; color: var(--text-primary); }
    .time { color: var(--text-muted); font-size: 0.8rem; }
    .mono { font-family: monospace; font-size: 0.8rem; }
    .error-msg { color: #ef4444; font-size: 0.8rem; max-width: 200px; }
    .details-col { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 10px;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge-success { background: #ecfdf5; color: #065f46; }
    .badge-danger { background: #fef2f2; color: #991b1b; }
    .badge-warning { background: #fffbeb; color: #92400e; }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: var(--bg-overlay);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    }
    .modal-card {
      background: var(--bg-card);
      border-radius: 16px;
      width: 90%;
      max-width: 440px;
      overflow: hidden;
      border: 1px solid var(--border);
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid var(--border);
    }
    .modal-header h2 { margin: 0; font-size: 1.2rem; color: var(--text-heading); }
    .modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-muted); }
    .modal-body { padding: 24px; }
    .modal-footer { display: flex; gap: 10px; justify-content: flex-end; padding: 16px 24px; background: var(--bg-page); border-top: 1px solid var(--border); }

    .delete-options { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
    .radio-option { display: flex; align-items: center; gap: 8px; cursor: pointer; }
    .date-range { display: flex; align-items: center; gap: 10px; }

    @media (max-width: 768px) {
      .filter-controls { flex-direction: column; }
      .tabs { flex-wrap: wrap; }
    }
  `]
})
export class HistoryComponent implements OnInit {
  activeTab: 'wol' | 'shutdown' | 'audit' = 'wol';
  loading = true;
  search = '';
  dateFrom = '';
  dateTo = '';
  wolLogs: WolLogEntry[] = [];
  shutdownLogs: ShutdownLogEntry[] = [];
  auditLogs: AuditLogEntry[] = [];
  isAdmin = false;
  private searchTimeout: any = null;

  // Delete modal
  showDeleteModal = false;
  deleteOption = 'all';
  deleteFrom = '';
  deleteTo = '';

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private notify: NotificationService
  ) {
    this.isAdmin = this.auth.isAdmin;
  }

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    this.loading = true;
    this.api.getHistory({
      search: this.search,
      date_from: this.dateFrom,
      date_to: this.dateTo,
      type: this.activeTab
    }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.wolLogs = res.data.wol_logs || [];
          this.shutdownLogs = res.data.shutdown_logs || [];
          this.auditLogs = res.data.audit_logs || [];
        }
        this.loading = false;
      },
      error: () => {
        this.notify.error('Failed to load history');
        this.loading = false;
      }
    });
  }

  clearFilters(): void {
    this.search = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.loadHistory();
  }

  onSearchChange(): void {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.loadHistory(), 350);
  }

  deleteLogs(): void {
    if (!confirm('Are you sure? This cannot be undone.')) return;

    this.api.deleteHistory(this.deleteOption, this.deleteFrom, this.deleteTo).subscribe({
      next: (res) => {
        if (res.success) {
          this.notify.success(res.message || 'Logs deleted');
          this.showDeleteModal = false;
          this.loadHistory();
        } else {
          this.notify.error(res.message || 'Failed');
        }
      },
      error: () => this.notify.error('Failed to delete logs')
    });
  }

  formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString();
  }
}
