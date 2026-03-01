import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './components/navbar/navbar.component';
import { ToastComponent } from './components/toast/toast.component';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, ToastComponent],
  template: `
    <app-navbar></app-navbar>
    <main class="app-main" [class.with-sidebar]="isAuthenticated">
      <router-outlet></router-outlet>
    </main>
    <app-toast></app-toast>
  `,
  styles: [`
    .app-main {
      min-height: 100vh;
      background: var(--bg-page);
      transition: background-color 0.25s;
    }
    /* Desktop: sidebar visible, push content right */
    @media (min-width: 769px) {
      .app-main.with-sidebar {
        margin-left: 230px;
      }
    }
    /* Mobile: topbar instead of sidebar */
    @media (max-width: 768px) {
      .app-main.with-sidebar {
        padding-top: 56px;
      }
    }
  `]
})
export class AppComponent implements OnInit {
  title = 'WOL Manager';
  isAuthenticated = false;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.isAuthenticated = !!user;
    });
  }
}
