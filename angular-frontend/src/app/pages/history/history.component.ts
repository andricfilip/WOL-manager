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
        <h1>📋 History</h1>
      </div>

      <!-- Filters -->
      <div class="filters-bar">
        <div class="tabs">
          <button class="tab" [class.active]="activeTab === 'wol'" (click)="activeTab = 'wol'; loadHistory()">
            ⚡ WoL Logs
          </button>
          <button class="tab" [class.active]="activeTab === 'shutdown'" (click)="activeTab = 'shutdown'; loadHistory()">
            🔌 Shutdown Logs
          </button>
          <button class="tab" [class.active]="activeTab === 'audit'" (click)="activeTab = 'audit'; loadHistory()">
            🔍 Audit Logs
          </button>
        </div>
        <div class="filter-controls">
          <input type="text" [(ngModel)]="search" placeholder="Search..." class="filter-input"
                 (keydown.enter)="loadHistory()">
          <app-datepicker [(ngModel)]="dateFrom" placeholder="From date" (ngModelChange)="loadHistory()"></app-datepicker>
          <app-datepicker [(ngModel)]="dateTo" placeholder="To date" (ngModelChange)="loadHistory()"></app-datepicker>
          <button class="btn btn-outline btn-sm" (click)="clearFilters()">Clear</button>
          <button *ngIf="isAdmin" class="btn btn-danger btn-sm" (click)="showDeleteModal = true">
            🗑️ Delete Logs
          </button>
        </div>
      </div>

      <div *ngIf="loading" class="loading-state">
        <div class="loader"></div>
      </div>

      <!-- WoL Logs Table -->
      <div *ngIf="!loading && activeTab === 'wol'" class="table-container">
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

      <!-- Shutdown Logs Table -->
      <div *ngIf="!loading && activeTab === 'shutdown'" class="table-container">
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

      <!-- Audit Logs Table -->
      <div *ngIf="!loading && activeTab === 'audit'" class="table-container">
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

      <!-- Delete Modal -->
      <div *ngIf="showDeleteModal" class="modal-overlay" (click)="showDeleteModal = false">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>🗑️ Delete Logs</h2>
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
    .page-header h1 { font-size: 2rem; font-weight: 800; color: var(--text-heading); margin: 0 0 24px; }

    .filters-bar {
      background: var(--bg-card);
      border-radius: 14px;
      padding: 16px 20px;
      margin-bottom: 20px;
      box-shadow: var(--shadow);
      border: 1px solid var(--border);
    }
    .tabs { display: flex; gap: 4px; margin-bottom: 16px; }
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
    }
    .tab.active { background: var(--accent); color: white; }
    .tab:hover:not(.active) { background: var(--bg-row-hover); color: var(--text-primary); }
    .filter-controls { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
    .filter-input {
      padding: 8px 14px;
      border: 2px solid var(--border);
      border-radius: 8px;
      font-size: 0.85rem;
      outline: none;
      background: var(--bg-input);
      color: var(--text-primary);
      transition: border-color 0.2s;
    }
    .filter-input:focus { border-color: var(--accent); }
    .filter-input::placeholder { color: var(--text-muted); }

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
      .table-container { overflow-x: auto; }
      table { min-width: 600px; }
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
