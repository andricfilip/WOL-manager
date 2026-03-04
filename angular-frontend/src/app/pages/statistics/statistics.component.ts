import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
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
            <div class="stat-icon-wrap" style="background:rgba(16,185,129,0.12)">
              <svg viewBox="0 0 24 24" fill="currentColor" style="color:#10b981"><circle cx="12" cy="12" r="10"/></svg>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ onlineCount }}<span class="stat-denom">/{{ stats.length }}</span></span>
              <span class="stat-label">Online</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon-wrap" style="background:rgba(59,130,246,0.12)">
              <svg viewBox="0 0 24 24" fill="currentColor" style="color:#3b82f6"><path d="M13 2 4.09 12.97H11L9 22 19.91 10H13z"/></svg>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ totalWol }}</span>
              <span class="stat-label">WoL Sent</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon-wrap" style="background:rgba(239,68,68,0.12)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="color:#ef4444"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ totalShutdowns }}</span>
              <span class="stat-label">Shutdowns</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon-wrap" style="background:rgba(245,158,11,0.12)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="color:#f59e0b"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ avgUptime }}<span class="stat-denom">%</span></span>
              <span class="stat-label">Avg Uptime</span>
            </div>
          </div>
        </div>

        <!-- Charts -->
        <div class="charts-row">
          <div class="chart-card chart-pie">
            <h3>Status Distribution</h3>
            <div class="chart-wrap-pie">
              <canvas #pieChart></canvas>
            </div>
          </div>

          <!-- WoL & Shutdown Activity panel -->
          <div class="chart-card chart-activity">
            <h3>WoL &amp; Shutdown Activity</h3>
            <div class="activity-list">
              <div *ngFor="let stat of sortedByActivity" class="act-row">
                <div class="act-name-col">
                  <app-os-icon [type]="stat.os_type"></app-os-icon>
                  <span class="act-name">{{ stat.name }}</span>
                  <span class="act-dot" [class.dot-online]="stat.current_status === 'online'" [class.dot-offline]="stat.current_status === 'offline'"></span>
                </div>
                <div class="act-bars-col">
                  <div class="act-bar-wrap">
                    <span class="act-bar-label wol-label">WoL</span>
                    <div class="act-bar-track">
                      <div class="act-bar-fill wol-fill" [style.width.%]="getWolPct(stat)"></div>
                    </div>
                    <span class="act-bar-val">{{ stat.wol_count }}</span>
                  </div>
                  <div class="act-bar-wrap">
                    <span class="act-bar-label sd-label">Off</span>
                    <div class="act-bar-track">
                      <div class="act-bar-fill sd-fill" [style.width.%]="getSdPct(stat)"></div>
                    </div>
                    <span class="act-bar-val">{{ stat.shutdown_count }}</span>
                  </div>
                </div>
              </div>
              <div *ngIf="!stats.length" class="act-empty">No data available</div>
            </div>
          </div>
        </div>

        <!-- Per-computer stats with timeline -->
        <div class="computer-stats">
          <h2>Computer Details</h2>
          <div class="stats-grid">
            <div *ngFor="let stat of stats" class="stat-detail-card">
              <div class="stat-detail-header">
                <div class="stat-name">
                  <app-os-icon [type]="stat.os_type"></app-os-icon>
                  <span class="stat-name-text">{{ stat.name }}</span>
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
              <div class="timeline-wrapper" *ngIf="getTimeline(stat.id).length > 0">
                <div class="timeline-label-row">
                  <span class="timeline-label-text">Activity Timeline:</span>
                </div>
                <div class="timeline-progress-bar">
                  <div *ngFor="let segment of getTimeline(stat.id)"
                       class="timeline-segment"
                       [class.segment-online]="segment.status === 'online'"
                       [class.segment-offline]="segment.status === 'offline'"
                       [style.width.%]="segment.percent"
                       [title]="segment.tooltip">
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .statistics-page {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
      box-sizing: border-box;
      overflow-x: hidden;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .page-header h1 {
      font-size: 1.6rem;
      font-weight: 800;
      color: var(--text-heading);
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .page-header h1 .icon { width: 24px; height: 24px; flex-shrink: 0; }
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

    /* â”€â”€ Summary Cards â”€â”€ */
    .stats-summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: var(--bg-card);
      border-radius: 14px;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: var(--shadow);
      border: 1px solid var(--border);
      min-width: 0;
    }
    .stat-icon-wrap {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .stat-icon-wrap svg { width: 20px; height: 20px; }
    .stat-info { display: flex; flex-direction: column; min-width: 0; }
    .stat-value {
      font-size: 1.4rem;
      font-weight: 800;
      color: var(--text-heading);
      line-height: 1.1;
      white-space: nowrap;
    }
    .stat-denom { font-size: 0.9rem; font-weight: 600; color: var(--text-muted); }
    .stat-label { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; white-space: nowrap; }

    /* â”€â”€ Charts Row â”€â”€ */
    .charts-row {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 16px;
      margin-bottom: 28px;
    }
    .chart-card {
      background: var(--bg-card);
      border-radius: 16px;
      padding: 20px;
      box-shadow: var(--shadow);
      border: 1px solid var(--border);
      min-width: 0;
    }
    .chart-card h3 { margin: 0 0 14px; font-size: 0.95rem; color: var(--text-secondary); font-weight: 700; }
    .chart-wrap-pie {
      position: relative;
      height: 240px;
      transform: translateZ(0);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .chart-wrap-pie canvas { max-width: 100%; }

    /* Activity panel */
    .chart-activity { display: flex; flex-direction: column; }
    .activity-list { display: flex; flex-direction: column; gap: 8px; overflow-y: auto; max-height: 340px; }
    .activity-list::-webkit-scrollbar { width: 4px; }
    .activity-list::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 4px; }

    .act-row {
      display: grid;
      grid-template-columns: 140px 1fr;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      background: var(--bg-badge);
      border-radius: 10px;
      border: 1px solid var(--border);
      min-width: 0;
    }
    .act-name-col { display: flex; align-items: center; gap: 6px; min-width: 0; }
    .act-name {
      font-weight: 700;
      font-size: 0.85rem;
      color: var(--text-heading);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
      min-width: 0;
    }
    .act-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .dot-online { background: #10b981; box-shadow: 0 0 4px #10b981; }
    .dot-offline { background: #ef4444; }
    .act-bars-col { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
    .act-bar-wrap { display: flex; align-items: center; gap: 6px; }
    .act-bar-label { font-size: 0.68rem; font-weight: 700; width: 22px; flex-shrink: 0; }
    .wol-label { color: #3b82f6; }
    .sd-label { color: #ef4444; }
    .act-bar-track { flex: 1; height: 7px; background: var(--loader-track); border-radius: 4px; overflow: hidden; }
    .act-bar-fill { height: 100%; border-radius: 4px; transition: width 0.5s ease; min-width: 2px; }
    .wol-fill { background: #3b82f6; }
    .sd-fill { background: #ef4444; }
    .act-bar-val { font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); width: 20px; text-align: right; flex-shrink: 0; }
    .act-empty { color: var(--text-muted); text-align: center; padding: 24px; font-size: 0.9rem; }

    /* â”€â”€ Computer Details â”€â”€ */
    .computer-stats h2 { font-size: 1.2rem; font-weight: 700; color: var(--text-heading); margin-bottom: 14px; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 12px;
    }
    .stat-detail-card {
      background: var(--bg-card);
      border-radius: 14px;
      padding: 16px;
      border: 1px solid var(--border);
      box-shadow: var(--shadow);
      min-width: 0;
    }
    .stat-detail-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      gap: 8px;
    }
    .stat-name {
      display: flex;
      align-items: center;
      gap: 7px;
      font-weight: 700;
      font-size: 0.92rem;
      color: var(--text-heading);
      min-width: 0;
      flex: 1;
    }
    .stat-name-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .stat-status {
      padding: 3px 9px;
      border-radius: 12px;
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      flex-shrink: 0;
    }
    .stat-status.online { background: rgba(16,185,129,0.12); color: #059669; }
    .stat-status.offline { background: rgba(239,68,68,0.12); color: #dc2626; }
    .stat-metrics {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    .metric { display: flex; flex-direction: column; }
    .metric-value { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); }
    .metric-label { font-size: 0.72rem; color: var(--text-muted); margin-top: 2px; }
    .metric-bar {
      height: 4px;
      background: var(--loader-track);
      border-radius: 2px;
      margin-top: 5px;
      overflow: hidden;
    }
    .metric-fill { height: 100%; border-radius: 2px; transition: width 0.5s ease; }

    .timeline-wrapper { margin-top: 14px; padding-top: 10px; border-top: 1px solid var(--border); }
    .timeline-label-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .timeline-label-text { font-size: 0.76rem; color: var(--text-muted); font-weight: 600; }
    .timeline-progress-bar {
      display: flex;
      height: 16px;
      background: var(--bg-badge);
      border-radius: 5px;
      overflow: hidden;
    }
    .timeline-segment { height: 100%; transition: opacity 0.2s; cursor: pointer; }
    .timeline-segment.segment-online { background: linear-gradient(to right, #10b981, #059669); }
    .timeline-segment.segment-offline { background: linear-gradient(to right, #ef4444, #dc2626); }
    .timeline-segment:hover { opacity: 0.8; }

    /* â”€â”€ Mobile â”€â”€ */
    @media (max-width: 600px) {
      .statistics-page { padding: 12px; }
      .page-header { margin-bottom: 16px; }
      .page-header h1 { font-size: 1.3rem; }
      .period-selector { width: 100%; }
      .period-btn { flex: 1; text-align: center; padding: 6px 8px; }

      .stats-summary {
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
        margin-bottom: 14px;
      }
      .stat-card { padding: 10px 12px; gap: 8px; }
      .stat-icon-wrap { width: 34px; height: 34px; border-radius: 8px; }
      .stat-icon-wrap svg { width: 17px; height: 17px; }
      .stat-value { font-size: 1.2rem; }
      .stat-label { font-size: 0.7rem; }

      .charts-row { grid-template-columns: 1fr; gap: 12px; margin-bottom: 16px; }
      .chart-wrap-pie { height: 200px; }
      .activity-list { max-height: none; }
      .act-row { grid-template-columns: 110px 1fr; }
      .act-name { font-size: 0.8rem; }

      .stats-grid { grid-template-columns: 1fr; gap: 10px; }
      .stat-detail-card { padding: 14px; }
    }

    @media (min-width: 601px) and (max-width: 900px) {
      .statistics-page { padding: 16px; }
      .stats-summary { grid-template-columns: repeat(2, 1fr); }
      .charts-row { grid-template-columns: 1fr; }
      .chart-wrap-pie { height: 220px; }
      .activity-list { max-height: none; }
    }
  `]
})
export class StatisticsComponent implements OnInit, AfterViewInit {
  @ViewChild('pieChart') pieChartRef!: ElementRef<HTMLCanvasElement>;

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
  timelineSegments = new Map<number, { status: string, percent: number, tooltip: string }[]>();

  get onlineCount(): number { return this.stats.filter(s => s.current_status === 'online').length; }
  get totalWol(): number { return this.stats.reduce((sum, s) => sum + s.wol_count, 0); }
  get totalShutdowns(): number { return this.stats.reduce((sum, s) => sum + s.shutdown_count, 0); }
  get avgUptime(): string {
    if (!this.stats.length) return '0';
    return (this.stats.reduce((sum, s) => sum + s.uptime_pct, 0) / this.stats.length).toFixed(1);
  }
  get sortedByActivity(): StatEntry[] {
    return [...this.stats].sort((a, b) => (b.wol_count + b.shutdown_count) - (a.wol_count + a.shutdown_count));
  }

  get maxWol(): number { return Math.max(1, ...this.stats.map(s => s.wol_count)); }
  get maxSd(): number { return Math.max(1, ...this.stats.map(s => s.shutdown_count)); }

  getWolPct(stat: StatEntry): number { return Math.round((stat.wol_count / this.maxWol) * 100); }
  getSdPct(stat: StatEntry): number { return Math.round((stat.shutdown_count / this.maxSd) * 100); }

  constructor(private api: ApiService, private notify: NotificationService) {}

  ngOnInit(): void { this.loadStats(this.selectedPeriod); }
  ngAfterViewInit(): void {}

  loadStats(days: number): void {
    this.selectedPeriod = days;
    this.loading = true;
    this.timelineSegments.clear();

    this.api.getStatistics(days).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.stats = res.stats;
          this.calculateAllTimelines();
          this.loading = false;
          setTimeout(() => {
            try { this.renderPieChart(); } catch (e) { console.error('Chart error:', e); }
          }, 200);
        }
      },
      error: () => {
        this.notify.error('Failed to load statistics');
        this.loading = false;
      }
    });
  }

  private calculateAllTimelines(): void {
    for (const stat of this.stats) {
      this.timelineSegments.set(stat.id, this.buildTimeline(stat));
    }
  }

  private buildTimeline(stat: StatEntry): { status: string, percent: number, tooltip: string }[] {
    if (!stat.timeline || stat.timeline.length === 0) {
      return [{ status: 'offline', percent: 100, tooltip: 'No activity recorded' }];
    }
    const uptimePercent = stat.uptime_pct || 0;
    const offlinePercent = 100 - uptimePercent;
    const totalHours = this.selectedPeriod * 24;
    const onlineHours = stat.online_hours || 0;
    const offlineHours = totalHours - onlineHours;
    const segments: { status: string, percent: number, tooltip: string }[] = [];
    if (uptimePercent > 0) {
      segments.push({ status: 'online', percent: uptimePercent, tooltip: `Online: ${onlineHours.toFixed(1)}h (${uptimePercent.toFixed(1)}%)` });
    }
    if (offlinePercent > 0) {
      segments.push({ status: 'offline', percent: offlinePercent, tooltip: `Offline: ${offlineHours.toFixed(1)}h (${offlinePercent.toFixed(1)}%)` });
    }
    return segments.length > 0 ? segments : [{ status: 'offline', percent: 100, tooltip: 'No data' }];
  }

  getTimeline(statId: number): { status: string, percent: number, tooltip: string }[] {
    return this.timelineSegments.get(statId) || [];
  }

  private renderPieChart(): void {
    if (!this.pieChartRef?.nativeElement) return;
    this.pieChart?.destroy();
    const online = this.stats.filter(s => s.current_status === 'online').length;
    const offline = this.stats.filter(s => s.current_status === 'offline').length;
    const unknown = this.stats.filter(s => s.current_status === 'unknown').length;
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
    const isMobile = window.innerWidth <= 600;

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
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: isMobile ? 10 : 16, color: textColor, font: { size: isMobile ? 11 : 12 } }
          }
        },
        cutout: '65%'
      }
    });
  }
}
