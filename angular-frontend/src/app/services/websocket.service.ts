import { Injectable, NgZone } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Subject, Observable } from 'rxjs';

export interface StatusUpdate {
  computer_id: number;
  status: string;
  last_checked: string;
}

export interface TerminalEvent {
  type: 'ready' | 'output' | 'error' | 'closed';
  data?: string;
  message?: string;
  code?: string;
  reason?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: Socket | null = null;
  private statusUpdates = new Subject<StatusUpdate>();
  private terminalEvents = new Subject<TerminalEvent>();
  private connectionStatus = new Subject<boolean>();

  public statusUpdates$ = this.statusUpdates.asObservable();
  public terminalEvents$ = this.terminalEvents.asObservable();
  public connectionStatus$ = this.connectionStatus.asObservable();

  constructor(private ngZone: NgZone) {}

  connect(): void {
    if (this.socket?.connected) return;

    this.socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      withCredentials: true
    });

    this.socket.on('connect', () => {
      this.ngZone.run(() => this.connectionStatus.next(true));
    });

    this.socket.on('disconnect', () => {
      this.ngZone.run(() => this.connectionStatus.next(false));
    });

    this.socket.on('status_update', (data: StatusUpdate) => {
      this.ngZone.run(() => this.statusUpdates.next(data));
    });

    this.socket.on('terminal_ready', (data: any) => {
      this.ngZone.run(() => this.terminalEvents.next({ type: 'ready', message: data.message }));
    });

    this.socket.on('terminal_output', (data: any) => {
      this.ngZone.run(() => this.terminalEvents.next({ type: 'output', data: data.data }));
    });

    this.socket.on('terminal_error', (data: any) => {
      this.ngZone.run(() => this.terminalEvents.next({
        type: 'error',
        message: data.message,
        code: data.code
      }));
    });

    this.socket.on('terminal_closed', (data: any) => {
      this.ngZone.run(() => this.terminalEvents.next({ type: 'closed', reason: data.reason }));
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  requestStatus(computerId: number): void {
    this.socket?.emit('request_status', { computer_id: computerId });
  }

  connectTerminal(computerId: number, manualPassword?: string, cols?: number, rows?: number): void {
    this.socket?.emit('terminal_connect', {
      computer_id: computerId,
      manual_password: manualPassword,
      cols: cols || 80,
      rows: rows || 24
    });
  }

  sendTerminalInput(data: string): void {
    this.socket?.emit('terminal_input', { data });
  }

  resizeTerminal(cols: number, rows: number): void {
    this.socket?.emit('terminal_resize', { cols, rows });
  }

  disconnectTerminal(): void {
    this.socket?.emit('disconnect');
  }
}
