import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { NotificationService } from '../../../services/notification.service';
import { AppSettings } from '../../../models/computer.model';

interface SettingsData {
  settings?: AppSettings & { language?: string; app_title?: string; max_computers_per_page?: number };
  system_info?: any;
}

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="section">
      <div class="section-header">
        <h2><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> Settings</h2>
      </div>

      <div *ngIf="loading" class="loading"><div class="loader"></div></div>

      <div *ngIf="!loading" class="settings-grid">
        <!-- General -->
        <div class="settings-card">
          <h3>General</h3>
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Language</span>
              <span class="setting-desc">Set the application language</span>
            </div>
            <select [(ngModel)]="settings.language" class="setting-select">
              <option value="sr">Srpski</option>
              <option value="en">English</option>
            </select>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Enable Groups</span>
              <span class="setting-desc">Group computers on the dashboard</span>
            </div>
            <label class="toggle">
              <input type="checkbox" [(ngModel)]="settings.enable_groups">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Enable Search</span>
              <span class="setting-desc">Show search bar on the dashboard</span>
            </div>
            <label class="toggle">
              <input type="checkbox" [(ngModel)]="settings.enable_search">
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- Appearance -->
        <div class="settings-card">
          <h3>🎨 Appearance</h3>
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">App Title</span>
              <span class="setting-desc">Displayed in the header</span>
            </div>
            <input type="text" [(ngModel)]="settings.app_title" class="setting-input" placeholder="WOL Manager">
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Max Computers per Page</span>
              <span class="setting-desc">Dashboard grid limit</span>
            </div>
            <input type="number" [(ngModel)]="settings.max_computers_per_page" class="setting-input short" min="4" max="100">
          </div>
        </div>

        <!-- System Info -->
        <div class="settings-card">
          <h3>ℹ️ System Information</h3>
          <div class="info-grid">
            <div class="info-item"><span class="info-label">Version</span><span class="info-value">{{ systemInfo.version || '1.0.0' }}</span></div>
            <div class="info-item"><span class="info-label">Total Users</span><span class="info-value">{{ systemInfo.total_users || '-' }}</span></div>
            <div class="info-item"><span class="info-label">Total Computers</span><span class="info-value">{{ systemInfo.total_computers || '-' }}</span></div>
            <div class="info-item"><span class="info-label">Total Groups</span><span class="info-value">{{ systemInfo.total_groups || '-' }}</span></div>
          </div>
        </div>

        <!-- Data Management -->
        <div class="settings-card">
          <h3>🗂️ Data Management</h3>
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Clear All Logs</span>
              <span class="setting-desc">Remove all WoL, shutdown and audit logs</span>
            </div>
            <button class="btn btn-danger btn-sm" (click)="clearLogs()">Clear Logs</button>
          </div>
        </div>
      </div>

      <div *ngIf="!loading" class="save-bar">
        <button class="btn btn-primary" (click)="save()" [disabled]="saving">
          {{ saving ? 'Saving...' : 'Save Settings' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .section-header { margin-bottom: 20px; }
    .section-header h2 { margin: 0; font-size: 1.3rem; font-weight: 700; color: var(--text-heading); }
    .btn { padding: 10px 20px; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; font-size: 0.85rem; transition: all 0.2s; }
    .btn-sm { padding: 8px 14px; font-size: 0.8rem; }
    .btn-primary { background: var(--accent); color: white; }
    .btn-danger { background: #ef4444; color: white; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .loading { text-align: center; padding: 60px; }
    .loader { width: 40px; height: 40px; border: 4px solid var(--loader-track); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .settings-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 20px; }
    .settings-card {
      background: var(--bg-card); border-radius: 14px; padding: 24px;
      box-shadow: var(--shadow); border: 1px solid var(--border);
    }
    .settings-card h3 { margin: 0 0 18px; font-size: 1.05rem; font-weight: 700; color: var(--text-heading); }
    .setting-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 0; border-bottom: 1px solid var(--border); gap: 16px;
    }
    .setting-row:last-child { border-bottom: none; }
    .setting-info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
    .setting-label { font-weight: 600; color: var(--text-label); font-size: 0.9rem; }
    .setting-desc { font-size: 0.75rem; color: var(--text-muted); }
    .setting-select, .setting-input {
      padding: 8px 12px; border: 2px solid var(--border); border-radius: 8px;
      font-size: 0.85rem; outline: none; background: var(--bg-input);
      color: var(--text-primary); transition: border-color 0.2s;
    }
    .setting-select {
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%2364748b' d='M6 8L0 0h12z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      background-size: 10px;
      padding-right: 36px;
      cursor: pointer;
      min-width: 140px;
    }
    html.dark .setting-select {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%2394a3b8' d='M6 8L0 0h12z'/%3E%3C/svg%3E");
    }
    .setting-select:focus, .setting-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
    .setting-input.short { width: 80px; text-align: center; }

    /* Toggle Switch */
    .toggle { position: relative; display: inline-block; width: 48px; height: 26px; cursor: pointer; flex-shrink: 0; }
    .toggle input { opacity: 0; width: 0; height: 0; }
    .toggle-slider {
      position: absolute; inset: 0; background: var(--loader-track);
      border-radius: 26px; transition: 0.3s;
    }
    .toggle-slider::before {
      content: ''; position: absolute; height: 20px; width: 20px;
      left: 3px; bottom: 3px; background: white; border-radius: 50%;
      transition: 0.3s; box-shadow: 0 1px 4px rgba(0,0,0,0.2);
    }
    .toggle input:checked + .toggle-slider { background: var(--accent); }
    .toggle input:checked + .toggle-slider::before { transform: translateX(22px); }

    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .info-item { background: var(--bg-page); padding: 14px; border-radius: 10px; border: 1px solid var(--border); }
    .info-label { display: block; font-size: 0.7rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; margin-bottom: 4px; }
    .info-value { font-size: 1.2rem; font-weight: 700; color: var(--text-heading); }

    .save-bar { margin-top: 24px; display: flex; justify-content: flex-end; }

    @media (max-width: 768px) {
      .settings-grid { grid-template-columns: 1fr; }
      .setting-row { flex-wrap: wrap; }
    }
  `]
})
export class AdminSettingsComponent implements OnInit {
  settings: any = {
    language: 'sr', enable_groups: true, enable_search: true, app_title: 'WOL Manager', max_computers_per_page: 20
  };

  systemInfo: any = {};
  loading = true;
  saving = false;

  constructor(private api: ApiService, private notify: NotificationService) {}

  ngOnInit(): void {
    this.api.getSettings().subscribe({
      next: (res: any) => {
        if (res.data?.settings) this.settings = { ...this.settings, ...res.data.settings };
        if (res.data?.system_info) this.systemInfo = res.data.system_info;
        this.loading = false;
      },
      error: () => { this.notify.error('Failed to load settings'); this.loading = false; }
    });
  }

  save(): void {
    this.saving = true;
    this.api.saveSettings(this.settings).subscribe({
      next: (res) => {
        if (res.success) this.notify.success('Settings saved!');
        else this.notify.error(res.message || 'Failed');
        this.saving = false;
      },
      error: () => { this.notify.error('Failed to save settings'); this.saving = false; }
    });
  }

  clearLogs(): void {
    if (!confirm('Are you sure? This will delete ALL logs.')) return;
    this.api.clearLogs().subscribe({
      next: (res) => { if (res.success) this.notify.success('Logs cleared'); else this.notify.error(res.message || 'Failed'); },
      error: () => this.notify.error('Failed to clear logs')
    });
  }
}
