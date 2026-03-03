import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Toast } from '../../services/notification.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div *ngFor="let toast of toasts"
           class="toast"
           [class.toast-success]="toast.type === 'success'"
           [class.toast-error]="toast.type === 'error'"
           [class.toast-info]="toast.type === 'info'"
           [class.toast-warning]="toast.type === 'warning'"
           (click)="dismiss(toast.id)">
        <span class="toast-icon">
          <svg *ngIf="toast.type === 'success'" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <svg *ngIf="toast.type === 'error'" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          <svg *ngIf="toast.type === 'warning'" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <svg *ngIf="toast.type === 'info'" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </span>
        <span class="toast-message">{{ toast.message }}</span>
        <button class="toast-close" (click)="dismiss(toast.id)">×</button>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 420px;
    }
    .toast {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 18px;
      border-radius: 12px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.12);
      cursor: pointer;
      animation: slideIn 0.3s ease;
      backdrop-filter: blur(10px);
      font-size: 0.9rem;
    }
    .toast-success { background: #ecfdf5; border-left: 4px solid #10b981; color: #065f46; }
    .toast-error { background: #fef2f2; border-left: 4px solid #ef4444; color: #991b1b; }
    .toast-info { background: #eff6ff; border-left: 4px solid #3b82f6; color: #1e40af; }
    .toast-warning { background: #fffbeb; border-left: 4px solid #f59e0b; color: #92400e; }
    .toast-icon { font-size: 1.2rem; flex-shrink: 0; }
    .toast-message { flex: 1; }
    .toast-close {
      background: none;
      border: none;
      font-size: 1.3rem;
      cursor: pointer;
      color: inherit;
      opacity: 0.6;
      padding: 0 4px;
    }
    .toast-close:hover { opacity: 1; }
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `]
})
export class ToastComponent {
  toasts: Toast[] = [];

  constructor(private notificationService: NotificationService) {
    this.notificationService.toasts$.subscribe(toasts => this.toasts = toasts);
  }

  dismiss(id: number): void {
    this.notificationService.remove(id);
  }
}
