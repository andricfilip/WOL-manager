import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';
import { StatEntry } from '../../models/api.model';
import { Chart, registerables } from 'chart.js';
import { OsIconComponent } from '../../components/os-icon/os-icon.component';

Chart.register(...registerables);

@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [CommonModule, OsIconComponent],
  template: `
    <div class="statistics-page">
      <div class="page-header">
        <h1><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg> Statistics</h1>
        <div class="period-selector">
          <button *ngFor="let p of periods" class="period-btn"
                  [class.active]="selectedPeriod === p.days"
                  (click)="loadStats(p.days)">
            {{ p.label }}
          </button>
        </div>
      </div>

      <div *ngIf="loading" class="loading-state">
        <div class="loader"></div>
        <p>Loading statistics...</p>
      </div>

      <ng-container *ngIf="!loading">
        <!-- Summary Cards -->
        <div class="stats-summary">
          <div class="stat-card">
            <div class="stat-icon online"><svg class="icon" viewBox="0 0 24 24" fill="currentColor" style="color:#10b981"><circle cx="12" cy="12" r="10"/></svg></div>
            <div class="stat-info">
              <span class="stat-value">{{ onlineCount }}</span>
              <span class="stat-label">Currently Online</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon wol"><svg class="icon" viewBox="0 0 24 24" fill="currentColor" style="color:#3b82f6"><path d="M13 2 4.09 12.97H11L9 22 19.91 10H13z"/></svg></div>
            <div class="stat-info">
              <span class="stat-value">{{ totalWol }}</span>
              <span class="stat-label">WoL Packets</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon shutdown"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="color:#ef4444"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg></div>
            <div class="stat-info">
              <span class="stat-value">{{ totalShutdowns }}</span>
              <span class="stat-label">Shutdowns</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon uptime"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="color:#f59e0b"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
            <div class="stat-info">
              <span class="stat-value">{{ avgUptime }}%</span>
              <span class="stat-label">Avg Uptime</span>
            </div>
          </div>
        </div>

        <!-- Charts -->
        <div class="charts-row">
          <div class="chart-card">
            <h3>Status Distribution</h3>
            <canvas #pieChart></canvas>
          </div>
          <div class="chart-card wide">
            <h3>Activity Overview</h3>
            <div class="chart-wrap">
              <canvas #barChart></canvas>
            </div>
          </div>
        </div>

        <!-- Per-computer stats -->
        <div class="computer-stats">
          <h2>Computer Details</h2>
          <div class="stats-grid">
            <div *ngFor="let stat of stats" class="stat-detail-card">
              <div class="stat-detail-header">
                <div class="stat-name">
                  <app-os-icon [type]="stat.os_type"></app-os-icon>
                  {{ stat.name }}
                </div>
                <div class="stat-status" [class.online]="stat.current_status === 'online'"
                     [class.offline]="stat.current_status === 'offline'">
                  {{ stat.current_status }}
                </div>
              </div>
              <div class="stat-metrics">
                <div class="metric">
                  <span class="metric-value">{{ stat.uptime_pct | number:'1.1-1' }}%</span>
                  <span class="metric-label">Uptime</span>
                  <div class="metric-bar">
                    <div class="metric-fill" [style.width.%]="stat.uptime_pct"
                         [style.background]="stat.uptime_pct > 70 ? '#10b981' : stat.uptime_pct > 30 ? '#f59e0b' : '#ef4444'">
                    </div>
                  </div>
                </div>
                <div class="metric">
                  <span class="metric-value">{{ stat.online_hours | number:'1.1-1' }}h</span>
                  <span class="metric-label">Online Hours</span>
                </div>
                <div class="metric">
                  <span class="metric-value">{{ stat.wol_count }}</span>
                  <span class="metric-label">WoL Sent</span>
                </div>
                <div class="metric">
                  <span class="metric-value">{{ stat.shutdown_count }}</span>
                  <span class="metric-label">Shutdowns</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .statistics-page { padding: 24px; max-width: 1400px; margin: 0 auto; }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .page-header h1 { font-size: 1.75rem; font-weight: 800; color: var(--text-heading); margin: 0; }
    .period-selector { display: flex; gap: 3px; background: var(--bg-badge); border-radius: 10px; padding: 3px; }
    .period-btn {
      padding: 6px 13px;
      border: none;
      border-radius: 7px;
      background: transparent;
      color: var(--text-secondary);
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 0.82rem;
    }
    .period-btn.active { background: var(--bg-card); color: var(--accent); box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
    .period-btn:hover:not(.active) { color: var(--text-primary); }

    .loading-state { text-align: center; padding: 80px 20px; color: var(--text-secondary); }
    .loader {
      width: 48px; height: 48px;
      border: 4px solid var(--loader-track);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .stats-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 12px;
      margin-bottom: 28px;
    }
    .stat-card {
      background: var(--bg-card);
      border-radius: 14px;
      padding: 16px 18px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: var(--shadow);
      border: 1px solid var(--border);
    }
    .stat-icon { font-size: 1.6rem; }
    .stat-info { display: flex; flex-direction: column; }
    .stat-value { font-size: 1.5rem; font-weight: 800; color: var(--text-heading); line-height: 1.1; }
    .stat-label { font-size: 0.78rem; color: var(--text-muted); margin-top: 3px; }

    .charts-row {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 16px;
      margin-bottom: 32px;
    }
    .chart-card {
      background: var(--bg-card);
      border-radius: 16px;
      padding: 24px;
      box-shadow: var(--shadow);
      border: 1px solid var(--border);
    }
    .chart-card h3 { margin: 0 0 16px; font-size: 1rem; color: var(--text-secondary); font-weight: 700; }
    .chart-card.wide { }
    .chart-wrap { position: relative; height: 260px; }

    .computer-stats h2 { font-size: 1.3rem; font-weight: 700; color: var(--text-heading); margin-bottom: 16px; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 14px;
    }
    .stat-detail-card {
      background: var(--bg-card);
      border-radius: 14px;
      padding: 18px;
      border: 1px solid var(--border);
      box-shadow: var(--shadow);
    }
    .stat-detail-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }
    .stat-name {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      font-size: 0.95rem;
      color: var(--text-heading);
    }
    .stat-status {
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .stat-status.online { background: #ecfdf5; color: #065f46; }
    .stat-status.offline { background: #fef2f2; color: #991b1b; }
    .stat-metrics {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    .metric { display: flex; flex-direction: column; }
    .metric-value { font-size: 1.15rem; font-weight: 700; color: var(--text-primary); }
    .metric-label { font-size: 0.73rem; color: var(--text-muted); margin-top: 2px; }
    .metric-bar {
      height: 4px;
      background: var(--loader-track);
      border-radius: 2px;
      margin-top: 6px;
      overflow: hidden;
    }
    .metric-fill {
      height: 100%;
      border-radius: 2px;
      transition: width 0.5s ease;
    }

    @media (max-width: 768px) {
      .page-header { flex-direction: column; align-items: stretch; }
      .period-selector { justify-content: stretch; }
      .period-btn { flex: 1; text-align: center; }
      .charts-row { grid-template-columns: 1fr; }
      .chart-wrap { height: 220px; }
      .stats-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class StatisticsComponent implements OnInit, AfterViewInit {
  @ViewChild('pieChart') pieChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barChart') barChartRef!: ElementRef<HTMLCanvasElement>;

  stats: StatEntry[] = [];
  loading = true;
  selectedPeriod = 7;
  periods = [
    { label: '24h', days: 1 },
    { label: '7d', days: 7 },
    { label: '30d', days: 30 },
    { label: '90d', days: 90 }
  ];

  private pieChart: Chart | null = null;
  private barChart: Chart | null = null;

  get onlineCount(): number { return this.stats.filter(s => s.current_status === 'online').length; }
  get totalWol(): number { return this.stats.reduce((sum, s) => sum + s.wol_count, 0); }
  get totalShutdowns(): number { return this.stats.reduce((sum, s) => sum + s.shutdown_count, 0); }
  get avgUptime(): string {
    if (!this.stats.length) return '0';
    return (this.stats.reduce((sum, s) => sum + s.uptime_pct, 0) / this.stats.length).toFixed(1);
  }

  constructor(private api: ApiService, private notify: NotificationService) {}

  ngOnInit(): void {
    this.loadStats(this.selectedPeriod);
  }

  ngAfterViewInit(): void {}

  loadStats(days: number): void {
    this.selectedPeriod = days;
    this.loading = true;

    this.api.getStatistics(days).subscribe({
      next: (res) => {
        if (res.success) {
          this.stats = res.stats;
          this.loading = false;
          setTimeout(() => this.renderCharts(), 100);
        }
      },
      error: () => {
        this.notify.error('Failed to load statistics');
        this.loading = false;
      }
    });
  }

  private renderCharts(): void {
    this.renderPieChart();
    this.renderBarChart();
  }

  private renderPieChart(): void {
    if (!this.pieChartRef?.nativeElement) return;
    this.pieChart?.destroy();

    const online = this.stats.filter(s => s.current_status === 'online').length;
    const offline = this.stats.filter(s => s.current_status === 'offline').length;
    const unknown = this.stats.filter(s => s.current_status === 'unknown').length;
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();

    this.pieChart = new Chart(this.pieChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Online', 'Offline', 'Unknown'],
        datasets: [{
          data: [online, offline, unknown],
          backgroundColor: ['#10b981', '#ef4444', '#94a3b8'],
          borderWidth: 0,
          borderRadius: 4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'bottom', labels: { padding: 16, color: textColor } }
        },
        cutout: '65%'
      }
    });
  }

  private renderBarChart(): void {
    if (!this.barChartRef?.nativeElement) return;
    this.barChart?.destroy();
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#94a3b8';
    const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || '#1e293b';

    const truncate = (name: string) => name.length > 12 ? name.substring(0, 10) + '…' : name;
    const labels = this.stats.map(s => truncate(s.name));

    this.barChart = new Chart(this.barChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            type: 'bar' as any,
            label: 'WoL Sent',
            data: this.stats.map(s => s.wol_count),
            backgroundColor: 'rgba(59,130,246,0.85)',
            borderRadius: 5,
            yAxisID: 'y',
            order: 2,
          },
          {
            type: 'bar' as any,
            label: 'Shutdowns',
            data: this.stats.map(s => s.shutdown_count),
            backgroundColor: 'rgba(239,68,68,0.85)',
            borderRadius: 5,
            yAxisID: 'y',
            order: 2,
          },
          {
            type: 'line' as any,
            label: 'Uptime %',
            data: this.stats.map(s => s.uptime_pct),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16,185,129,0.12)',
            borderWidth: 2.5,
            pointRadius: 4,
            pointBackgroundColor: '#10b981',
            fill: true,
            tension: 0.35,
            yAxisID: 'y1',
            order: 1,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: 16, color: textColor, boxWidth: 14, font: { size: 12 } }
          },
          tooltip: {
            callbacks: {
              title: (items: any[]) => this.stats[items[0].dataIndex]?.name || '',
              label: (item: any) => {
                if (item.dataset.label === 'Uptime %') return ` ${item.dataset.label}: ${(item.raw as number).toFixed(1)}%`;
                return ` ${item.dataset.label}: ${item.raw}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: textColor, maxRotation: 40, minRotation: 0, font: { size: 11 } }
          },
          y: {
            position: 'left',
            beginAtZero: true,
            grid: { color: gridColor },
            ticks: { color: textColor, precision: 0, font: { size: 11 } },
            title: { display: true, text: 'Count', color: textColor, font: { size: 11 } }
          },
          y1: {
            position: 'right',
            beginAtZero: true,
            max: 100,
            grid: { drawOnChartArea: false },
            ticks: { color: '#10b981', callback: (v: any) => v + '%', font: { size: 11 } },
            title: { display: true, text: 'Uptime %', color: '#10b981', font: { size: 11 } }
          }
        }
      }
    });
  }
}
