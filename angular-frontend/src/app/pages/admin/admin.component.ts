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
        <h1>⚙️ Administration</h1>
      </div>
      <div class="admin-layout">
        <nav class="admin-sidebar">
          <a routerLink="computers" routerLinkActive="active">💻 Computers</a>
          <a routerLink="users" routerLinkActive="active">👥 Users</a>
          <a routerLink="groups" routerLinkActive="active">📁 Groups</a>
          <a routerLink="settings" routerLinkActive="active">🔧 Settings</a>
        </nav>
        <div class="admin-content">
          <router-outlet></router-outlet>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-page { padding: 24px; max-width: 1400px; margin: 0 auto; }
    .page-header h1 { font-size: 2rem; font-weight: 800; color: #1a365d; margin: 0 0 24px; }
    .admin-layout { display: flex; gap: 24px; }
    .admin-sidebar {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 200px;
      background: white;
      border-radius: 14px;
      padding: 12px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      border: 1px solid #e2e8f0;
      height: fit-content;
      position: sticky;
      top: 88px;
    }
    .admin-sidebar a {
      padding: 10px 16px;
      border-radius: 8px;
      text-decoration: none;
      color: #64748b;
      font-weight: 600;
      font-size: 0.9rem;
      transition: all 0.2s;
    }
    .admin-sidebar a:hover { background: #f1f5f9; color: #334155; }
    .admin-sidebar a.active { background: #0066cc; color: white; }
    .admin-content { flex: 1; min-width: 0; }

    @media (max-width: 768px) {
      .admin-layout { flex-direction: column; }
      .admin-sidebar {
        flex-direction: row;
        min-width: auto;
        position: static;
        overflow-x: auto;
      }
      .admin-sidebar a { white-space: nowrap; }
    }
  `]
})
export class AdminComponent {}
