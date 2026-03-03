import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { Subscription, filter } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <ng-container *ngIf="isAuthenticated">
      <!-- Mobile topbar -->
      <div class="topbar">
        <button class="topbar-toggle" (click)="toggleMenu()" [attr.aria-label]="menuOpen ? 'Close menu' : 'Open menu'">
          <span class="hamburger" [class.open]="menuOpen">
            <span></span><span></span><span></span>
          </span>
        </button>
        <a routerLink="/dashboard" class="topbar-brand">
          <span class="brand-icon"><svg class="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4.09 12.97H11L9 22 19.91 10H13z"/></svg></span>
          <span class="brand-text">WoL Manager</span>
        </a>
        <button class="topbar-theme" (click)="toggleTheme()">
          <svg *ngIf="!isDark" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          <svg *ngIf="isDark" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        </button>
      </div>

      <!-- Overlay backdrop -->
      <div class="sidebar-backdrop" [class.visible]="menuOpen" (click)="close()"></div>

      <!-- Sidebar -->
      <nav class="sidebar" [class.open]="menuOpen">
        <!-- Brand -->
        <div class="sidebar-brand">
          <span class="brand-icon"><svg class="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4.09 12.97H11L9 22 19.91 10H13z"/></svg></span>
          <span class="brand-name">WoL Manager</span>
        </div>

        <!-- Nav links -->
        <div class="sidebar-nav">
          <span class="nav-section">Main</span>
          <a class="sidebar-link" routerLink="/dashboard" routerLinkActive="active"
             [routerLinkActiveOptions]="{exact:true}" (click)="close()">
            <span class="link-icon"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg></span>
            <span class="link-label">Dashboard</span>
          </a>
          <a class="sidebar-link" routerLink="/statistics" routerLinkActive="active" (click)="close()">
            <span class="link-icon"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg></span>
            <span class="link-label">Statistics</span>
          </a>
          <a class="sidebar-link" routerLink="/history" routerLinkActive="active" (click)="close()">
            <span class="link-icon"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>
            <span class="link-label">History</span>
          </a>
          <ng-container *ngIf="isAdmin">
            <span class="nav-section" style="margin-top:8px">Admin</span>
            <a class="sidebar-link" routerLink="/admin" routerLinkActive="active" (click)="close()">
              <span class="link-icon"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></span>
              <span class="link-label">Admin Panel</span>
            </a>
          </ng-container>
        </div>

        <!-- Bottom section -->
        <div class="sidebar-bottom">
          <a class="sidebar-link" routerLink="/profile" routerLinkActive="active" (click)="close()">
            <span class="link-icon"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
            <span class="link-label">{{ username }}</span>
          </a>
          <button class="sidebar-link theme-link" (click)="toggleTheme()">
            <span class="link-icon">
              <svg *ngIf="!isDark" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              <svg *ngIf="isDark" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            </span>
            <span class="link-label">{{ isDark ? 'Light mode' : 'Dark mode' }}</span>
          </button>
          <button class="sidebar-link logout-link" (click)="onLogout()">
            <span class="link-icon"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></span>
            <span class="link-label">Logout</span>
          </button>
        </div>
      </nav>
    </ng-container>
  `,
  styles: [`
    /* ===== TOPBAR (mobile only) ===== */
    .topbar {
      display: none;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      height: 56px;
      background: var(--bg-nav);
      border-bottom: 1px solid var(--border);
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 900;
      backdrop-filter: blur(20px);
    }
    .topbar-toggle {
      background: none; border: none; cursor: pointer;
      padding: 8px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      min-width: 44px; min-height: 44px;
      transition: background 0.2s;
    }
    .topbar-toggle:hover { background: var(--bg-row-hover); }
    .topbar-toggle:active { transform: scale(0.95); }
    .hamburger { display: flex; flex-direction: column; gap: 5px; }
    .hamburger span {
      width: 22px; height: 2px;
      background: var(--text-primary);
      border-radius: 2px;
      transition: all 0.3s;
      display: block;
    }
    .hamburger.open span:nth-child(1) { transform: rotate(45deg) translate(5px, 5px); }
    .hamburger.open span:nth-child(2) { opacity: 0; }
    .hamburger.open span:nth-child(3) { transform: rotate(-45deg) translate(5px, -5px); }

    .topbar-brand {
      display: flex; align-items: center; gap: 6px;
      font-weight: 800; font-size: 1.1rem;
      color: var(--accent); text-decoration: none;
    }
    .topbar-theme {
      background: none; border: none; cursor: pointer;
      font-size: 1.2rem; padding: 6px; border-radius: 8px;
    }
    .brand-icon { font-size: 1.3rem; }

    /* ===== BACKDROP ===== */
    .sidebar-backdrop {
      display: none;
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.5);
      z-index: 990;
      opacity: 0;
      transition: opacity 0.25s;
      backdrop-filter: blur(2px);
      pointer-events: none;
    }
    .sidebar-backdrop.visible { opacity: 1; pointer-events: auto; }

    /* ===== SIDEBAR ===== */
    .sidebar {
      position: fixed;
      top: 0; left: 0; bottom: 0;
      width: 230px;
      background: var(--bg-sidebar);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      z-index: 1000;
      transition: background 0.25s, border-color 0.25s;
      overflow: hidden;
    }

    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 20px 18px 16px;
      font-size: 1.1rem;
      font-weight: 800;
      color: var(--accent);
      border-bottom: 1px solid var(--border);
      letter-spacing: -0.3px;
      flex-shrink: 0;
    }
    .brand-name { font-size: 1rem; }

    .sidebar-nav {
      flex: 1;
      padding: 12px 10px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow-y: auto;
    }
    .sidebar-nav::-webkit-scrollbar { width: 0; }

    .nav-section {
      font-size: 0.65rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 6px 8px 4px;
    }

    .sidebar-link {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 12px;
      border-radius: 10px;
      text-decoration: none;
      color: var(--text-secondary);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      border: none;
      background: none;
      width: 100%;
      text-align: left;
      transition: background 0.15s, color 0.15s;
    }
    .sidebar-link:hover {
      background: var(--bg-row-hover);
      color: var(--text-primary);
    }
    .sidebar-link.active {
      background: var(--accent);
      color: white;
      font-weight: 600;
    }
    .link-icon { font-size: 1rem; width: 20px; text-align: center; flex-shrink: 0; }
    .link-label { flex: 1; }

    .sidebar-bottom {
      padding: 10px 10px 16px;
      border-top: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex-shrink: 0;
    }
    .theme-link { color: var(--text-secondary); }
    .logout-link { color: #e63946; }
    .logout-link:hover { background: rgba(239,68,68,0.1); color: #dc2626; }

    /* ===== DESKTOP: sidebar always visible ===== */
    @media (min-width: 769px) {
      .topbar { display: none !important; }
      .sidebar-backdrop { display: none !important; }
      .sidebar { transform: none !important; }
    }

    /* ===== MOBILE: topbar + overlay sidebar ===== */
    @media (max-width: 768px) {
      .topbar { display: flex; }
      .sidebar-backdrop { display: block; }
      .sidebar {
        transform: translateX(-100%);
        top: 0;
        box-shadow: var(--shadow-lg);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .sidebar.open {
        transform: translateX(0);
      }
    }
  `]
})
export class NavbarComponent implements OnInit, OnDestroy {
  isAuthenticated = false;
  isAdmin = false;
  menuOpen = false;
  isDark = false;
  username = '';
  private sub!: Subscription;
  private themeSub!: Subscription;
  private routerSub!: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private theme: ThemeService
  ) {}

  ngOnInit(): void {
    this.sub = this.authService.currentUser$.subscribe(user => {
      this.isAuthenticated = !!user;
      this.isAdmin = user?.is_admin ?? false;
      this.username = user?.username ?? '';
    });
    this.themeSub = this.theme.theme$.subscribe(t => this.isDark = t === 'dark');
    this.routerSub = this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(() => this.menuOpen = false);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.themeSub?.unsubscribe();
    this.routerSub?.unsubscribe();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.close(); }

  toggleMenu(): void { 
    this.menuOpen = !this.menuOpen;
    console.log('Menu toggled:', this.menuOpen);
  }
  close(): void { this.menuOpen = false; }
  toggleTheme(): void { this.theme.toggle(); }

  onLogout(): void {
    this.menuOpen = false;
    this.authService.logout().subscribe();
  }
}
