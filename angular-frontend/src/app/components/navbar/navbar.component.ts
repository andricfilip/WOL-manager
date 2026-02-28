import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="navbar" [class.dark-nav]="isDark" *ngIf="isAuthenticated">
      <div class="navbar-content">
        <a routerLink="/dashboard" class="navbar-brand">
          <span class="brand-icon">⚡</span>
          ComputerRunner
        </a>
        <button class="mobile-toggle" (click)="menuOpen = !menuOpen" [class.active]="menuOpen">
          <span></span><span></span><span></span>
        </button>
        <ul class="navbar-menu" [class.open]="menuOpen">
          <li><a routerLink="/dashboard" routerLinkActive="active" (click)="menuOpen = false">
            <i class="icon">📊</i> Dashboard
          </a></li>
          <li><a routerLink="/statistics" routerLinkActive="active" (click)="menuOpen = false">
            <i class="icon">📈</i> Statistics
          </a></li>
          <li><a routerLink="/history" routerLinkActive="active" (click)="menuOpen = false">
            <i class="icon">📋</i> History
          </a></li>
          <li *ngIf="isAdmin"><a routerLink="/admin" routerLinkActive="active" (click)="menuOpen = false">
            <i class="icon">⚙️</i> Admin
          </a></li>
          <li><a routerLink="/profile" routerLinkActive="active" (click)="menuOpen = false">
            <i class="icon">👤</i> Profile
          </a></li>
          <li>
            <button class="theme-btn" (click)="toggleTheme()" [title]="isDark ? 'Svetla tema' : 'Tamna tema'">
              <span *ngIf="isDark">☀️</span>
              <span *ngIf="!isDark">🌙</span>
            </button>
          </li>
          <li><a class="logout" (click)="onLogout()">
            <i class="icon">🚪</i> Logout
          </a></li>
        </ul>
      </div>
    </nav>
  `,
  styles: [`
    .navbar {
      background: var(--bg-nav);
      backdrop-filter: blur(20px);
      box-shadow: 0 1px 20px rgba(0,0,0,0.08);
      position: sticky;
      top: 0;
      z-index: 1000;
      border-bottom: 1px solid var(--bg-nav-border);
      transition: background 0.25s, border-color 0.25s;
    }
    .navbar-content {
      max-width: 1400px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 24px;
      height: 64px;
    }
    .navbar-brand {
      font-size: 1.3rem;
      font-weight: 800;
      color: var(--accent);
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 8px;
      letter-spacing: -0.5px;
    }
    .brand-icon { font-size: 1.5rem; }
    .navbar-menu {
      display: flex;
      gap: 4px;
      list-style: none;
      margin: 0;
      padding: 0;
      align-items: center;
    }
    .navbar-menu a {
      color: var(--text-secondary);
      text-decoration: none;
      font-weight: 500;
      padding: 8px 16px;
      border-radius: 10px;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.9rem;
      cursor: pointer;
    }
    .navbar-menu a:hover {
      background: var(--bg-badge);
      color: var(--accent);
    }
    .navbar-menu a.active {
      background: var(--accent);
      color: white;
    }
    .navbar-menu .logout { color: #e63946; }
    .navbar-menu .logout:hover { background: rgba(239,68,68,0.1); color: #dc2626; }
    .theme-btn {
      background: var(--bg-badge);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 7px 12px;
      cursor: pointer;
      font-size: 1.1rem;
      line-height: 1;
      transition: all 0.2s;
      display: flex;
      align-items: center;
    }
    .theme-btn:hover { background: var(--bg-card-hover); transform: scale(1.1); }
    .icon { font-style: normal; font-size: 1rem; }
    .mobile-toggle {
      display: none;
      flex-direction: column;
      gap: 5px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px;
    }
    .mobile-toggle span {
      width: 24px;
      height: 2px;
      background: var(--text-secondary);
      border-radius: 2px;
      transition: all 0.3s;
    }
    @media (max-width: 768px) {
      .mobile-toggle { display: flex; }
      .navbar-menu {
        display: none;
        position: absolute;
        top: 64px;
        left: 0;
        right: 0;
        background: var(--bg-nav);
        flex-direction: column;
        padding: 16px;
        box-shadow: var(--shadow-lg);
        gap: 4px;
        border-bottom: 1px solid var(--border);
      }
      .navbar-menu.open { display: flex; }
      .navbar-menu a { justify-content: center; padding: 12px; }
    }
  `]
})
export class NavbarComponent implements OnInit, OnDestroy {
  isAuthenticated = false;
  isAdmin = false;
  menuOpen = false;
  isDark = false;
  private sub!: Subscription;
  private themeSub!: Subscription;

  constructor(private authService: AuthService, private router: Router, private theme: ThemeService) {}

  ngOnInit(): void {
    this.sub = this.authService.currentUser$.subscribe(user => {
      this.isAuthenticated = !!user;
      this.isAdmin = user?.is_admin ?? false;
    });
    this.themeSub = this.theme.theme$.subscribe(t => this.isDark = t === 'dark');
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.themeSub?.unsubscribe();
  }

  toggleTheme(): void { this.theme.toggle(); }

  onLogout(): void {
    this.menuOpen = false;
    this.authService.logout().subscribe();
  }
}
