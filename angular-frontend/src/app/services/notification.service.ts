import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private toasts: Toast[] = [];
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  public toasts$ = this.toastsSubject.asObservable();
  private nextId = 0;

  show(message: string, type: ToastType = 'info', duration: number = 5000): void {
    const toast: Toast = { id: this.nextId++, message, type };
    this.toasts.push(toast);
    this.toastsSubject.next([...this.toasts]);

    setTimeout(() => this.remove(toast.id), duration);
  }

  success(message: string): void { this.show(message, 'success'); }
  error(message: string): void { this.show(message, 'error', 8000); }
  info(message: string): void { this.show(message, 'info'); }
  warning(message: string): void { this.show(message, 'warning', 6000); }

  remove(id: number): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.toastsSubject.next([...this.toasts]);
  }
}
