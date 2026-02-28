import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';
import { StatEntry } from '../../models/api.model';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="statistics-page">
      <div class="page-header">
        <h1>📈 Statistics</h1>
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
            <div class="stat-icon online">🟢</div>
            <div class="stat-info">
              <span class="stat-value">{{ onlineCount }}</span>
              <span class="stat-label">Currently Online</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon wol">⚡</div>
            <div class="stat-info">
              <span class="stat-value">{{ totalWol }}</span>
              <span class="stat-label">WoL Packets</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon shutdown">🔌</div>
            <div class="stat-info">
              <span class="stat-value">{{ totalShutdowns }}</span>
              <span class="stat-label">Shutdowns</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon uptime">📊</div>
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
            <canvas #barChart></canvas>
          </div>
        </div>

        <!-- Per-computer stats -->
        <div class="computer-stats">
          <h2>Computer Details</h2>
          <div class="stats-grid">
            <div *ngFor="let stat of stats" class="stat-detail-card">
              <div class="stat-detail-header">
                <div class="stat-name">
                  <span class="os-icon">{{ stat.os_type === 'windows' ? '🪟' : stat.os_type === 'linux' ? '🐧' : '💻' }}</span>
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
    .page-header h1 { font-size: 2rem; font-weight: 800; color: #1a365d; margin: 0; }
    .period-selector { display: flex; gap: 4px; background: #f1f5f9; border-radius: 12px; padding: 4px; }
    .period-btn {
      padding: 8px 16px;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: #64748b;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 0.85rem;
    }
    .period-btn.active { background: white; color: #0066cc; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .period-btn:hover:not(.active) { color: #334155; }

    .loading-state { text-align: center; padding: 80px 20px; color: #64748b; }
    .loader {
      width: 48px; height: 48px;
      border: 4px solid #e2e8f0;
      border-top-color: #0066cc;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .stats-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .stat-card {
      background: white;
      border-radius: 16px;
      padding: 24px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      border: 1px solid #e2e8f0;
    }
    .stat-icon { font-size: 2rem; }
    .stat-info { display: flex; flex-direction: column; }
    .stat-value { font-size: 1.8rem; font-weight: 800; color: #1e293b; }
    .stat-label { font-size: 0.85rem; color: #64748b; margin-top: 2px; }

    .charts-row {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 16px;
      margin-bottom: 32px;
    }
    .chart-card {
      background: white;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      border: 1px solid #e2e8f0;
    }
    .chart-card h3 { margin: 0 0 16px; font-size: 1rem; color: #334155; }
    .chart-card.wide { }
    .chart-card canvas { max-height: 300px; }

    .computer-stats h2 { font-size: 1.3rem; font-weight: 700; color: #1e293b; margin-bottom: 16px; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
    }
    .stat-detail-card {
      background: white;
      border-radius: 14px;
      padding: 20px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    .stat-detail-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .stat-name {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      font-size: 1rem;
      color: #1e293b;
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
    .metric-value { font-size: 1.2rem; font-weight: 700; color: #334155; }
    .metric-label { font-size: 0.75rem; color: #94a3b8; margin-top: 2px; }
    .metric-bar {
      height: 4px;
      background: #f1f5f9;
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
          legend: { position: 'bottom', labels: { padding: 16 } }
        },
        cutout: '65%'
      }
    });
  }

  private renderBarChart(): void {
    if (!this.barChartRef?.nativeElement) return;
    this.barChart?.destroy();

    this.barChart = new Chart(this.barChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: this.stats.map(s => s.name),
        datasets: [
          {
            label: 'WoL Sent',
            data: this.stats.map(s => s.wol_count),
            backgroundColor: '#3b82f6',
            borderRadius: 6,
          },
          {
            label: 'Shutdowns',
            data: this.stats.map(s => s.shutdown_count),
            backgroundColor: '#ef4444',
            borderRadius: 6,
          },
          {
            label: 'Uptime %',
            data: this.stats.map(s => s.uptime_pct),
            backgroundColor: '#10b981',
            borderRadius: 6,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'bottom', labels: { padding: 16 } }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
          x: { grid: { display: false } }
        }
      }
    });
  }
}
