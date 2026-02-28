import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebSocketService, TerminalEvent } from '../../services/websocket.service';
import { NotificationService } from '../../services/notification.service';
import { Subscription } from 'rxjs';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';

@Component({
  selector: 'app-ssh-terminal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Password Modal -->
    <div class="modal-overlay" *ngIf="showPasswordModal" (click)="onClose()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>🔐 SSH Authentication</h2>
          <button class="modal-close" (click)="onClose()">×</button>
        </div>
        <div class="modal-body">
          <p>Enter SSH password for <strong>{{ computer.name }}</strong></p>
          <div class="form-group">
            <label>Password</label>
            <input type="password" [(ngModel)]="sshPassword" placeholder="SSH Password"
                   (keydown.enter)="connectWithPassword()" autofocus>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="onClose()">Cancel</button>
          <button class="btn btn-primary" (click)="connectWithPassword()">Connect</button>
        </div>
      </div>
    </div>

    <!-- Terminal Modal -->
    <div class="terminal-overlay" *ngIf="showTerminal">
      <div class="terminal-container">
        <div class="terminal-header">
          <span class="terminal-title">💻 {{ computer.name }}</span>
          <div class="terminal-status" [class.connected]="isConnected">
            <span class="status-dot"></span>
            {{ isConnected ? 'Connected' : 'Connecting...' }}
          </div>
          <button class="terminal-close" (click)="onClose()">✕</button>
        </div>
        <div #terminalContainer class="terminal-body"></div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay, .terminal-overlay {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .modal-overlay { background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); }
    .terminal-overlay { background: rgba(0,0,0,0.85); }
    .modal-card {
      background: white;
      border-radius: 16px;
      width: 90%;
      max-width: 440px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid #e2e8f0;
    }
    .modal-header h2 { margin: 0; font-size: 1.2rem; }
    .modal-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: #94a3b8;
      padding: 4px;
    }
    .modal-body { padding: 24px; }
    .modal-body p { margin-bottom: 16px; color: #475569; }
    .form-group label {
      display: block;
      font-weight: 600;
      margin-bottom: 8px;
      color: #334155;
    }
    .form-group input {
      width: 100%;
      padding: 12px;
      border: 2px solid #e2e8f0;
      border-radius: 10px;
      font-size: 1rem;
      outline: none;
      transition: border-color 0.2s;
    }
    .form-group input:focus {
      border-color: #0066cc;
      box-shadow: 0 0 0 3px rgba(0,102,204,0.1);
    }
    .modal-footer {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      padding: 16px 24px;
      background: #f8fafc;
    }
    .btn {
      padding: 10px 24px;
      border: none;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      font-size: 0.9rem;
    }
    .btn-primary { background: #0066cc; color: white; }
    .btn-secondary { background: #e2e8f0; color: #475569; }
    .terminal-container {
      width: 90vw;
      height: 80vh;
      display: flex;
      flex-direction: column;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    }
    .terminal-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px 20px;
      background: #1e293b;
      color: #e2e8f0;
    }
    .terminal-title { font-weight: 700; flex: 1; }
    .terminal-status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8rem;
      color: #94a3b8;
    }
    .terminal-status .status-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: #94a3b8;
    }
    .terminal-status.connected .status-dot { background: #10b981; box-shadow: 0 0 8px #10b981; }
    .terminal-status.connected { color: #10b981; }
    .terminal-close {
      background: rgba(255,255,255,0.1);
      border: none;
      color: #e2e8f0;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1rem;
    }
    .terminal-close:hover { background: rgba(255,255,255,0.2); }
    .terminal-body {
      flex: 1;
      background: #0d1117;
      padding: 8px;
    }
    :host ::ng-deep .xterm { height: 100%; }
    :host ::ng-deep .xterm-viewport { overflow-y: auto !important; }
  `]
})
export class SshTerminalComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() computer: any;
  @Output() close = new EventEmitter<void>();
  @ViewChild('terminalContainer') terminalContainer!: ElementRef;

  showPasswordModal = false;
  showTerminal = false;
  isConnected = false;
  sshPassword = '';

  private terminal: Terminal | null = null;
  private fitAddon: FitAddon | null = null;
  private subs: Subscription[] = [];

  constructor(
    private ws: WebSocketService,
    private notify: NotificationService
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.ws.terminalEvents$.subscribe(event => this.handleTerminalEvent(event))
    );

    if (this.computer.ssh_auto_login) {
      this.showTerminal = true;
      setTimeout(() => this.initTerminal(), 0);
    } else {
      this.showPasswordModal = true;
    }
  }

  ngAfterViewInit(): void {
    if (this.showTerminal) {
      this.initTerminal();
    }
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.terminal?.dispose();
  }

  connectWithPassword(): void {
    if (!this.sshPassword) {
      this.notify.warning('Please enter SSH password');
      return;
    }
    this.showPasswordModal = false;
    this.showTerminal = true;
    setTimeout(() => this.initTerminal(this.sshPassword), 0);
  }

  private initTerminal(password?: string): void {
    if (!this.terminalContainer?.nativeElement) return;

    this.terminal = new Terminal({
      theme: {
        background: '#0d1117',
        foreground: '#c9d1d9',
        cursor: '#58a6ff',
        cursorAccent: '#0d1117',
        selectionBackground: '#264f78',
        black: '#0d1117',
        red: '#ff7b72',
        green: '#7ee787',
        yellow: '#d29922',
        blue: '#58a6ff',
        magenta: '#bc8cff',
        cyan: '#39c5cf',
        white: '#b1bac4',
      },
      fontFamily: '"Cascadia Code", "Fira Code", monospace',
      fontSize: 14,
      cursorBlink: true,
      cursorStyle: 'bar',
    });

    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);
    this.terminal.open(this.terminalContainer.nativeElement);
    this.fitAddon.fit();

    this.terminal.onData(data => {
      this.ws.sendTerminalInput(data);
    });

    window.addEventListener('resize', () => {
      this.fitAddon?.fit();
      if (this.terminal) {
        this.ws.resizeTerminal(this.terminal.cols, this.terminal.rows);
      }
    });

    const cols = this.terminal.cols;
    const rows = this.terminal.rows;
    this.ws.connectTerminal(this.computer.id, password, cols, rows);
  }

  private handleTerminalEvent(event: TerminalEvent): void {
    switch (event.type) {
      case 'ready':
        this.isConnected = true;
        break;
      case 'output':
        if (event.data) this.terminal?.write(event.data);
        break;
      case 'error':
        this.notify.error(event.message || 'Terminal error');
        if (event.code === 'DECRYPTION_FAILED' || event.code === 'AUTH_FAILED') {
          this.showTerminal = false;
          this.showPasswordModal = true;
        }
        break;
      case 'closed':
        this.isConnected = false;
        this.terminal?.write('\r\n\r\n[Session closed]\r\n');
        break;
    }
  }

  onClose(): void {
    this.terminal?.dispose();
    this.close.emit();
  }
}
