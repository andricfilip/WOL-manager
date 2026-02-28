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
          {{ toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : toast.type === 'warning' ? '⚠️' : 'ℹ️' }}
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
