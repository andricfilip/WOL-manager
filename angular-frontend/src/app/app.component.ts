import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { ToastComponent } from './components/toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, ToastComponent],
  template: `
    <app-navbar></app-navbar>
    <main class="app-main">
      <router-outlet></router-outlet>
    </main>
    <app-toast></app-toast>
  `,
  styles: [`
    .app-main {
      padding-top: 70px;
      min-height: 100vh;
      background: #f0f4f8;
    }
  `]
})
export class AppComponent {
  title = 'WOL Manager';
}
