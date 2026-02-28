import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { WebSocketService, StatusUpdate } from '../../services/websocket.service';
import { NotificationService } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';
import { DashboardComputer, DashboardGroup, DashboardData } from '../../models/api.model';
import { Subscription } from 'rxjs';
import { SshTerminalComponent } from '../../components/ssh-terminal/ssh-terminal.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, SshTerminalComponent],
  template: `
    <div class="dashboard">
      <!-- Header -->
      <div class="dashboard-header">
        <div class="header-left">
          <h1>Dashboard</h1>
          <span class="computer-count" *ngIf="computers.length">
            {{ computers.length }} computer{{ computers.length !== 1 ? 's' : '' }}
          </span>
        </div>
        <div class="header-actions">
          <div class="search-box" *ngIf="enableSearch">
            <span class="search-icon">🔍</span>
            <input type="text" [(ngModel)]="searchTerm" placeholder="Search computers..."
                   (input)="filterComputers()">
            <button *ngIf="searchTerm" class="search-clear" (click)="searchTerm = ''; filterComputers()">×</button>
          </div>
          <button class="btn btn-outline" (click)="refreshStatuses()" [disabled]="refreshing">
            <span *ngIf="refreshing" class="spinner-sm"></span>
            {{ refreshing ? 'Checking...' : '🔄 Refresh Status' }}
          </button>
        </div>
      </div>

      <!-- Loading state -->
      <div *ngIf="loading" class="loading-state">
        <div class="loader"></div>
        <p>Loading computers...</p>
      </div>

      <!-- Empty state -->
      <div *ngIf="!loading && computers.length === 0" class="empty-state">
        <div class="empty-icon">💻</div>
        <h2>No computers assigned</h2>
        <p>Contact your administrator to get computers assigned to your account.</p>
      </div>

      <!-- Groups -->
      <ng-container *ngIf="!loading && enableGroups && groups.length > 0">
        <div *ngFor="let group of groups" class="group-section">
          <div class="group-header" [style.border-left-color]="group.color">
            <div class="group-info">
              <span class="group-icon" [innerHTML]="group.icon"></span>
              <h2 class="group-name">{{ group.name }}</h2>
              <span class="group-badge">{{ getGroupComputers(group).length }}</span>
            </div>
            <button *ngIf="group.allow_wake" class="btn btn-success btn-sm"
                    (click)="wakeGroup(group)" [disabled]="wakingGroup === group.id">
              {{ wakingGroup === group.id ? '⏳ Waking...' : '⚡ Wake All' }}
            </button>
          </div>
          <div class="computer-grid">
            <div *ngFor="let computer of getGroupComputers(group)"
                 class="computer-card" [class.online]="computer.status === 'online'"
                 [class.offline]="computer.status === 'offline'">
              <ng-container *ngTemplateOutlet="computerCardTpl; context: { $implicit: computer, group: group }">
              </ng-container>
            </div>
          </div>
        </div>
      </ng-container>

      <!-- Ungrouped computers -->
      <div *ngIf="!loading && filteredUngrouped.length > 0" class="group-section">
        <div class="group-header" style="border-left-color: #64748b">
          <div class="group-info">
            <span class="group-icon">💻</span>
            <h2 class="group-name">{{ enableGroups ? 'Ungrouped' : 'My Computers' }}</h2>
            <span class="group-badge">{{ filteredUngrouped.length }}</span>
          </div>
        </div>
        <div class="computer-grid">
          <div *ngFor="let computer of filteredUngrouped"
               class="computer-card" [class.online]="computer.status === 'online'"
               [class.offline]="computer.status === 'offline'">
            <ng-container *ngTemplateOutlet="computerCardTpl; context: { $implicit: computer }">
            </ng-container>
          </div>
        </div>
      </div>
    </div>

    <!-- Computer card template -->
    <ng-template #computerCardTpl let-computer let-group="group">
      <div class="card-header-row">
        <h3>{{ computer.name }}</h3>
        <div class="status-badge" [class.status-online]="computer.status === 'online'"
             [class.status-offline]="computer.status === 'offline'"
             [class.status-unknown]="computer.status === 'unknown'">
          <span class="status-dot"></span>
          {{ computer.status === 'online' ? 'Online' : computer.status === 'offline' ? 'Offline' : 'Unknown' }}
        </div>
      </div>
      <div class="card-details">
        <div class="detail-row" *ngIf="computer.ip_address">
          <span class="detail-label">IP</span>
          <span class="detail-value">{{ computer.ip_address }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">MAC</span>
          <span class="detail-value mac">{{ computer.mac_address }}</span>
        </div>
        <div class="detail-row" *ngIf="computer.os_type !== 'unknown'">
          <span class="detail-label">OS</span>
          <span class="detail-value">{{ computer.os_type === 'windows' ? '🪟 Windows' : '🐧 Linux' }}</span>
        </div>
        <div class="detail-row" *ngIf="computer.description">
          <span class="detail-label">Info</span>
          <span class="detail-value">{{ computer.description }}</span>
        </div>
        <div class="detail-row" *ngIf="computer.last_wol">
          <span class="detail-label">Last WoL</span>
          <span class="detail-value time">{{ formatTime(computer.last_wol) }}</span>
        </div>
      </div>
      <div class="card-actions">
        <button class="btn btn-wake" (click)="wakeComputer(computer)"
                [disabled]="computer.status === 'online' || wakingComputers[computer.id]"
                *ngIf="canOperate(computer, group)">
          {{ wakingComputers[computer.id] ? '⏳ Sending...' : '⚡ Wake Up' }}
        </button>
        <button class="btn btn-shutdown" (click)="shutdownComputer(computer)"
                [disabled]="computer.status !== 'online' || shuttingDown[computer.id]"
                *ngIf="computer.has_ssh && canOperate(computer, group)">
          {{ shuttingDown[computer.id] ? '⏳ Shutting down...' : '🔌 Shutdown' }}
        </button>
        <button class="btn btn-terminal" (click)="openTerminal(computer)"
                [disabled]="computer.status !== 'online'"
                *ngIf="computer.has_ssh && canOperate(computer, group)">
          💻 Terminal
        </button>
      </div>
    </ng-template>

    <!-- SSH Terminal Modal -->
    <app-ssh-terminal *ngIf="terminalComputer"
      [computer]="terminalComputer"
      (close)="closeTerminal()">
    </app-ssh-terminal>
  `,
  styles: [`
    .dashboard { padding: 24px; max-width: 1400px; margin: 0 auto; }
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .header-left { display: flex; align-items: baseline; gap: 12px; }
    .header-left h1 { font-size: 2rem; font-weight: 800; color: var(--text-heading); margin: 0; }
    .computer-count {
      background: var(--bg-badge);
      color: var(--text-secondary);
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .header-actions { display: flex; gap: 12px; align-items: center; }
    .search-box {
      display: flex;
      align-items: center;
      background: var(--bg-input);
      border: 2px solid var(--border);
      border-radius: 12px;
      padding: 0 12px;
      transition: all 0.2s;
    }
    .search-box:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(0,102,204,0.1); }
    .search-icon { margin-right: 8px; }
    .search-box input {
      border: none;
      padding: 10px 0;
      font-size: 0.9rem;
      outline: none;
      min-width: 200px;
      background: transparent;
      color: var(--text-primary);
    }
    .search-box input::placeholder { color: var(--text-muted); }
    .search-clear {
      background: none;
      border: none;
      font-size: 1.3rem;
      cursor: pointer;
      color: var(--text-muted);
      padding: 0 4px;
    }
    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 0.875rem;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-outline {
      background: var(--bg-card);
      border: 2px solid var(--border);
      color: var(--text-secondary);
    }
    .btn-outline:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
    .btn-success { background: linear-gradient(135deg, #10b981, #059669); color: white; }
    .btn-success:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(16,185,129,0.4); }
    .btn-sm { padding: 8px 16px; font-size: 0.8rem; }

    /* Loading & Empty */
    .loading-state, .empty-state {
      text-align: center;
      padding: 80px 20px;
      color: var(--text-secondary);
    }
    .loader {
      width: 48px; height: 48px;
      border: 4px solid var(--loader-track);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-icon { font-size: 4rem; margin-bottom: 16px; }
    .empty-state h2 { color: var(--text-heading); margin-bottom: 8px; }

    /* Groups */
    .group-section { margin-bottom: 32px; }
    .group-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: var(--bg-card);
      border-radius: 12px;
      margin-bottom: 16px;
      border-left: 4px solid var(--accent);
      box-shadow: var(--shadow);
    }
    .group-info { display: flex; align-items: center; gap: 10px; }
    .group-icon { font-size: 1.2rem; }
    .group-name { font-size: 1.1rem; font-weight: 700; color: var(--text-heading); margin: 0; }
    .group-badge {
      background: var(--bg-badge);
      color: var(--text-secondary);
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    /* Computer Grid */
    .computer-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 16px;
    }
    .computer-card {
      background: var(--bg-card);
      border-radius: 16px;
      padding: 20px;
      border: 2px solid var(--border);
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }
    .computer-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: var(--border);
      transition: all 0.3s;
    }
    .computer-card.online::before { background: linear-gradient(90deg, #10b981, #34d399); }
    .computer-card.offline::before { background: linear-gradient(90deg, #ef4444, #f87171); }
    .computer-card:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-lg);
      border-color: var(--accent);
    }
    .card-header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 14px;
    }
    .card-header-row h3 {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text-heading);
      margin: 0;
    }
    .status-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
    }
    .status-online { background: #ecfdf5; color: #065f46; }
    .status-online .status-dot { background: #10b981; box-shadow: 0 0 8px #10b981; }
    .status-offline { background: #fef2f2; color: #991b1b; }
    .status-offline .status-dot { background: #ef4444; }
    .status-unknown { background: #f8fafc; color: #64748b; }
    .status-unknown .status-dot { background: #94a3b8; }

    .card-details { margin-bottom: 16px; }
    .detail-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 0;
      font-size: 0.85rem;
    }
    .detail-label {
      color: var(--text-muted);
      font-weight: 600;
      min-width: 52px;
      text-transform: uppercase;
      font-size: 0.7rem;
      letter-spacing: 0.5px;
    }
    .detail-value { color: var(--text-secondary); }
    .detail-value.mac { font-family: 'Consolas', monospace; font-size: 0.8rem; }
    .detail-value.time { font-size: 0.8rem; color: #94a3b8; }

    .card-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .btn-wake {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      flex: 1;
    }
    .btn-wake:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(16,185,129,0.4); }
    .btn-shutdown {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: white;
      flex: 1;
    }
    .btn-shutdown:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(239,68,68,0.4); }
    .btn-terminal {
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      color: white;
    }
    .btn-terminal:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(99,102,241,0.4); }

    .spinner-sm {
      width: 16px; height: 16px;
      border: 2px solid rgba(0,0,0,0.1);
      border-top-color: #0066cc;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @media (max-width: 768px) {
      .dashboard { padding: 16px; }
      .dashboard-header { flex-direction: column; align-items: stretch; }
      .header-actions { flex-direction: column; }
      .search-box input { min-width: 100px; }
      .computer-grid { grid-template-columns: 1fr; }
      .card-actions { flex-direction: column; }
      .card-actions .btn { width: 100%; justify-content: center; }
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  computers: DashboardComputer[] = [];
  filteredUngrouped: DashboardComputer[] = [];
  groups: DashboardGroup[] = [];
  userRoles: { [key: string]: string } = {};
  enableGroups = false;
  enableSearch = false;
  loading = true;
  refreshing = false;
  searchTerm = '';
  wakingComputers: { [key: number]: boolean } = {};
  shuttingDown: { [key: number]: boolean } = {};
  wakingGroup: number | null = null;
  terminalComputer: DashboardComputer | null = null;
  private subs: Subscription[] = [];

  constructor(
    private api: ApiService,
    private ws: WebSocketService,
    private notify: NotificationService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
    this.ws.connect();

    this.subs.push(
      this.ws.statusUpdates$.subscribe(update => {
        this.handleStatusUpdate(update);
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  loadDashboard(): void {
    this.loading = true;
    this.api.getDashboard().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.computers = res.data.computers;
          this.groups = res.data.groups;
          this.userRoles = res.data.user_roles;
          this.enableGroups = res.data.enable_groups;
          this.enableSearch = res.data.enable_search;
          this.filterComputers();
        }
        this.loading = false;
      },
      error: () => {
        this.notify.error('Failed to load dashboard');
        this.loading = false;
      }
    });
  }

  filterComputers(): void {
    const term = this.searchTerm.toLowerCase();
    const filtered = term
      ? this.computers.filter(c =>
          c.name.toLowerCase().includes(term) ||
          c.ip_address?.toLowerCase().includes(term) ||
          c.mac_address.toLowerCase().includes(term)
        )
      : this.computers;

    // Gather grouped computer IDs
    const groupedIds = new Set<number>();
    if (this.enableGroups) {
      this.groups.forEach(g => g.computer_ids.forEach(id => groupedIds.add(id)));
    }

    this.filteredUngrouped = filtered.filter(c => !groupedIds.has(c.id));
  }

  getGroupComputers(group: DashboardGroup): DashboardComputer[] {
    const term = this.searchTerm.toLowerCase();
    return this.computers.filter(c => {
      const inGroup = group.computer_ids.includes(c.id);
      if (!term) return inGroup;
      return inGroup && (
        c.name.toLowerCase().includes(term) ||
        c.ip_address?.toLowerCase().includes(term) ||
        c.mac_address.toLowerCase().includes(term)
      );
    });
  }

  canOperate(computer: DashboardComputer, group?: DashboardGroup): boolean {
    if (this.auth.isAdmin) return true;
    const role = computer.role || this.userRoles[computer.id.toString()];
    return role === 'operator' || role === 'owner';
  }

  wakeComputer(computer: DashboardComputer): void {
    this.wakingComputers[computer.id] = true;
    this.api.sendWol(computer.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.notify.success(`WOL packet sent to ${computer.name}!`);
        } else {
          this.notify.error(res.message || 'Failed to send WOL');
        }
        this.wakingComputers[computer.id] = false;
      },
      error: () => {
        this.notify.error('Failed to send WOL packet');
        this.wakingComputers[computer.id] = false;
      }
    });
  }

  shutdownComputer(computer: DashboardComputer): void {
    if (!confirm(`Are you sure you want to shutdown "${computer.name}"?`)) return;

    this.shuttingDown[computer.id] = true;
    this.api.shutdownComputer(computer.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.notify.success(`${computer.name} is shutting down!`);
          computer.status = 'offline';
        } else {
          this.notify.error(res.message || 'Shutdown failed');
        }
        this.shuttingDown[computer.id] = false;
      },
      error: () => {
        this.notify.error('Shutdown failed');
        this.shuttingDown[computer.id] = false;
      }
    });
  }

  wakeGroup(group: DashboardGroup): void {
    this.wakingGroup = group.id;
    this.api.wakeGroup(group.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.notify.success(res.message || 'Wake all sent!');
        } else {
          this.notify.error(res.message || 'Failed');
        }
        this.wakingGroup = null;
      },
      error: () => {
        this.notify.error('Failed to wake group');
        this.wakingGroup = null;
      }
    });
  }

  refreshStatuses(): void {
    this.refreshing = true;
    this.api.getAllComputerStatuses().subscribe({
      next: (res) => {
        if (res.success && res.data?.results) {
          res.data.results.forEach(s => {
            const c = this.computers.find(comp => comp.id === s.id);
            if (c) {
              c.status = s.status;
              c.last_checked = s.last_checked;
            }
          });
        }
        this.refreshing = false;
      },
      error: () => {
        this.notify.error('Failed to refresh statuses');
        this.refreshing = false;
      }
    });
  }

  openTerminal(computer: DashboardComputer): void {
    this.terminalComputer = computer;
  }

  closeTerminal(): void {
    this.terminalComputer = null;
  }

  handleStatusUpdate(update: StatusUpdate): void {
    const computer = this.computers.find(c => c.id === update.computer_id);
    if (computer) {
      computer.status = update.status;
      computer.last_checked = update.last_checked;
    }
  }

  formatTime(dateStr: string | null): string {
    if (!dateStr) return 'Never';
    const d = new Date(dateStr);
    return d.toLocaleString();
  }
}
