import {
  Component, forwardRef, HostListener, Input, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-datepicker',
  standalone: true,
  imports: [CommonModule],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => DatePickerComponent),
    multi: true
  }],
  template: `
    <div class="dp-wrapper" [class.open]="isOpen" [class.has-value]="!!value">
      <!-- Trigger input -->
      <div class="dp-trigger" (click)="toggleOpen()">
        <span class="dp-icon">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </span>
        <span class="dp-value" [class.placeholder]="!value">
          {{ displayValue || placeholder }}
        </span>
        <span class="dp-clear" *ngIf="value" (click)="clear($event)" title="Clear">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </span>
      </div>

      <!-- Calendar dropdown -->
      <div class="dp-panel" *ngIf="isOpen" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="dp-header">
          <button class="dp-nav" (click)="prevYear()" title="Previous year">«</button>
          <button class="dp-nav" (click)="prevMonth()" title="Previous month">‹</button>
          <div class="dp-title">
            <span class="dp-month-name">{{ monthNames[viewMonth] }}</span>
            <span class="dp-year">{{ viewYear }}</span>
          </div>
          <button class="dp-nav" (click)="nextMonth()" title="Next month">›</button>
          <button class="dp-nav" (click)="nextYear()" title="Next year">»</button>
        </div>
        <!-- Day names -->
        <div class="dp-week-header">
          <span *ngFor="let d of dayNames">{{ d }}</span>
        </div>
        <!-- Days grid -->
        <div class="dp-grid">
          <button *ngFor="let cell of calendarCells"
                  class="dp-cell"
                  [class.empty]="!cell.day"
                  [class.today]="cell.isToday"
                  [class.selected]="cell.isSelected"
                  [class.other-month]="cell.otherMonth"
                  [disabled]="!cell.day"
                  (click)="selectDay(cell)">
            {{ cell.day || '' }}
          </button>
        </div>
        <!-- Footer -->
        <div class="dp-footer">
          <button class="dp-footer-btn" (click)="selectToday()">Today</button>
          <button class="dp-footer-btn dp-footer-clear" (click)="clear($event)">Clear</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: inline-block; position: relative; }

    .dp-wrapper { position: relative; }

    .dp-trigger {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: var(--bg-input);
      border: 2px solid var(--border);
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.85rem;
      color: var(--text-primary);
      transition: border-color 0.2s, box-shadow 0.2s;
      min-width: 150px;
      user-select: none;
    }
    .dp-trigger:hover { border-color: var(--accent); }
    .dp-wrapper.open .dp-trigger {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent);
    }
    .dp-icon { color: var(--accent); flex-shrink: 0; display: flex; align-items: center; }
    .dp-value { flex: 1; }
    .dp-value.placeholder { color: var(--text-muted); }
    .dp-clear {
      display: flex;
      align-items: center;
      color: var(--text-muted);
      opacity: 0.7;
      flex-shrink: 0;
    }
    .dp-clear:hover { opacity: 1; color: var(--danger); }

    /* Panel */
    .dp-panel {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 14px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.18);
      z-index: 9999;
      padding: 14px;
      width: 280px;
      animation: dp-slide 0.15s ease;
    }
    @keyframes dp-slide {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* Header */
    .dp-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      gap: 4px;
    }
    .dp-nav {
      width: 28px; height: 28px;
      border: 1px solid var(--border);
      border-radius: 7px;
      background: var(--bg-input);
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      transition: all 0.15s;
      flex-shrink: 0;
    }
    .dp-nav:hover { background: var(--accent); color: white; border-color: var(--accent); }
    .dp-title {
      display: flex;
      gap: 5px;
      align-items: center;
      font-weight: 700;
      font-size: 0.9rem;
      color: var(--text-primary);
      flex: 1;
      justify-content: center;
    }
    .dp-month-name { color: var(--accent); }
    .dp-year { color: var(--text-secondary); }

    /* Week header */
    .dp-week-header {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      margin-bottom: 6px;
    }
    .dp-week-header span {
      text-align: center;
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.4px;
      padding: 4px 0;
    }

    /* Grid */
    .dp-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 2px;
    }
    .dp-cell {
      aspect-ratio: 1;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: var(--text-primary);
      font-size: 0.82rem;
      cursor: pointer;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }
    .dp-cell:hover:not(:disabled):not(.empty):not(.selected) {
      background: var(--bg-row-hover);
      color: var(--accent);
    }
    .dp-cell.empty { cursor: default; pointer-events: none; }
    .dp-cell.other-month { color: var(--text-muted); opacity: 0.5; }
    .dp-cell.today {
      background: color-mix(in srgb, var(--accent) 12%, transparent);
      color: var(--accent);
      font-weight: 700;
      border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
    }
    .dp-cell.selected {
      background: var(--accent);
      color: white;
      font-weight: 700;
      box-shadow: 0 2px 8px color-mix(in srgb, var(--accent) 40%, transparent);
    }
    .dp-cell:disabled { pointer-events: none; }

    /* Footer */
    .dp-footer {
      display: flex;
      justify-content: space-between;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid var(--border);
    }
    .dp-footer-btn {
      border: none;
      background: none;
      color: var(--accent);
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 6px;
      transition: background 0.15s;
    }
    .dp-footer-btn:hover { background: var(--bg-row-hover); }
    .dp-footer-clear { color: var(--danger); }
  `]
})
export class DatePickerComponent implements ControlValueAccessor, OnInit {
  @Input() placeholder = 'Pick date';

  value = '';        // YYYY-MM-DD
  isOpen = false;
  viewYear = 0;
  viewMonth = 0;

  dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  monthNames = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

  calendarCells: {day: number|null; isToday: boolean; isSelected: boolean; otherMonth: boolean}[] = [];

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  ngOnInit(): void {
    const now = new Date();
    this.viewYear  = now.getFullYear();
    this.viewMonth = now.getMonth();
    this.buildCalendar();
  }

  get displayValue(): string {
    if (!this.value) return '';
    const [y, m, d] = this.value.split('-');
    return `${d}/${m}/${y}`;
  }

  toggleOpen(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) this.buildCalendar();
  }

  clear(e: Event): void {
    e.stopPropagation();
    this.value = '';
    this.onChange('');
    this.onTouched();
    this.isOpen = false;
  }

  prevMonth(): void { if (this.viewMonth === 0) { this.viewMonth = 11; this.viewYear--; } else this.viewMonth--; this.buildCalendar(); }
  nextMonth(): void { if (this.viewMonth === 11) { this.viewMonth = 0; this.viewYear++; } else this.viewMonth++; this.buildCalendar(); }
  prevYear(): void  { this.viewYear--; this.buildCalendar(); }
  nextYear(): void  { this.viewYear++; this.buildCalendar(); }

  selectToday(): void {
    const now = new Date();
    this.viewYear = now.getFullYear();
    this.viewMonth = now.getMonth();
    const d = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    this.writeValue(d);
    this.onChange(d);
    this.onTouched();
    this.isOpen = false;
  }

  selectDay(cell: {day: number|null; otherMonth: boolean}): void {
    if (!cell.day) return;
    const m = String(this.viewMonth + 1).padStart(2, '0');
    const d = String(cell.day).padStart(2, '0');
    const val = `${this.viewYear}-${m}-${d}`;
    this.writeValue(val);
    this.onChange(val);
    this.onTouched();
    this.isOpen = false;
  }

  buildCalendar(): void {
    const today = new Date();
    const selectedDate = this.value ? new Date(this.value + 'T00:00:00') : null;
    const firstDay = new Date(this.viewYear, this.viewMonth, 1).getDay();
    const daysInMonth = new Date(this.viewYear, this.viewMonth + 1, 0).getDate();

    this.calendarCells = [];
    // Leading empty cells
    for (let i = 0; i < firstDay; i++) {
      this.calendarCells.push({ day: null, isToday: false, isSelected: false, otherMonth: false });
    }
    // Days
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = today.getFullYear() === this.viewYear && today.getMonth() === this.viewMonth && today.getDate() === d;
      const isSelected = !!selectedDate && selectedDate.getFullYear() === this.viewYear &&
                         selectedDate.getMonth() === this.viewMonth && selectedDate.getDate() === d;
      this.calendarCells.push({ day: d, isToday, isSelected, otherMonth: false });
    }
    // Trailing to fill 6 rows if needed
    const rem = this.calendarCells.length % 7;
    if (rem !== 0) {
      for (let i = 0; i < 7 - rem; i++) {
        this.calendarCells.push({ day: null, isToday: false, isSelected: false, otherMonth: true });
      }
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    const el = e.target as HTMLElement;
    if (!el.closest('.dp-wrapper')) { this.isOpen = false; }
  }

  writeValue(val: string): void {
    this.value = val || '';
    if (val) {
      const d = new Date(val + 'T00:00:00');
      this.viewYear = d.getFullYear();
      this.viewMonth = d.getMonth();
    }
    this.buildCalendar();
  }
  registerOnChange(fn: (v: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
}
