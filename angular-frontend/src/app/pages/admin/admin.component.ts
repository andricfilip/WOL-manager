import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="admin-page">
      <div class="page-header">
        <h1><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> Administration</h1>
      </div>
      <div class="admin-layout">
        <nav class="admin-sidebar">
          <a routerLink="computers" routerLinkActive="active">Computers</a>
          <a routerLink="users" routerLinkActive="active">Users</a>
          <a routerLink="groups" routerLinkActive="active">Groups</a>
          <a routerLink="settings" routerLinkActive="active">Settings</a>
        </nav>
        <div class="admin-content">
          <router-outlet></router-outlet>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-page { padding: 24px; max-width: 1400px; margin: 0 auto; }
    .page-header { margin-bottom: 24px; }
    .page-header h1 { font-size: 1.75rem; font-weight: 800; color: var(--text-heading); margin: 0; }
    .admin-layout { display: flex; gap: 24px; }
    .admin-sidebar {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 200px;
      background: var(--bg-card);
      border-radius: 14px;
      padding: 12px;
      box-shadow: var(--shadow);
      border: 1px solid var(--border);
      height: fit-content;
      position: sticky;
      top: 24px;
    }
    .admin-sidebar a {
      padding: 10px 16px;
      border-radius: 8px;
      text-decoration: none;
      color: var(--text-secondary);
      font-weight: 600;
      font-size: 0.9rem;
      transition: all 0.2s;
    }
    .admin-sidebar a:hover { background: var(--bg-row-hover); color: var(--text-primary); }
    .admin-sidebar a.active { background: var(--accent); color: white; }
    .admin-content { flex: 1; min-width: 0; }

    @media (max-width: 768px) {
      .admin-page { padding: 16px; }
      .admin-layout { flex-direction: column; }
      .admin-sidebar {
        flex-direction: row;
        min-width: auto;
        position: static;
        overflow-x: visible;
        flex-wrap: wrap;
      }
      .admin-sidebar a { 
        white-space: nowrap;
        flex: 1;
        min-width: calc(50% - 4px);
        text-align: center;
      }
    }
  `]
})
export class AdminComponent {}
