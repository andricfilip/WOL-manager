import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-os-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Windows: 4-pane grid, brand blue -->
    <svg *ngIf="type === 'windows'" class="icon os-icon" viewBox="0 0 15 15" width="18" height="18" fill="#0078d4" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="7" height="7"/>
      <rect x="8" y="0" width="7" height="7"/>
      <rect x="0" y="8" width="7" height="7"/>
      <rect x="8" y="8" width="7" height="7"/>
    </svg>

    <!-- Linux: Tux penguin (real mascot style) -->
    <svg *ngIf="type === 'linux'" class="icon os-icon tux-icon" viewBox="0 0 80 96" width="20" height="24" xmlns="http://www.w3.org/2000/svg">
      <!-- Body (black, rounded) -->
      <ellipse cx="40" cy="68" rx="28" ry="26" fill="#111"/>
      <!-- White belly -->
      <ellipse cx="40" cy="72" rx="17" ry="19" fill="#f5f0e0"/>
      <!-- Head (black circle) -->
      <circle cx="40" cy="28" r="22" fill="#111"/>
      <!-- Left white eye patch -->
      <ellipse cx="31" cy="23" rx="8" ry="9" fill="white"/>
      <!-- Right white eye patch -->
      <ellipse cx="49" cy="23" rx="8" ry="9" fill="white"/>
      <!-- Left pupil -->
      <circle cx="33" cy="24" r="4.5" fill="#111"/>
      <!-- Right pupil -->
      <circle cx="51" cy="24" r="4.5" fill="#111"/>
      <!-- Left eye shine -->
      <circle cx="35" cy="22" r="1.8" fill="white"/>
      <!-- Right eye shine -->
      <circle cx="53" cy="22" r="1.8" fill="white"/>
      <!-- Beak (wide orange / golden-yellow, duck-style) -->
      <path d="M32,36 Q40,47 48,36 Q44,32 40,33 Q36,32 32,36Z" fill="#e8a020" stroke="#c07010" stroke-width="0.8"/>
      <!-- Left wing (black, curved against body) -->
      <path d="M13,55 Q6,68 10,80 Q18,88 22,82 Q16,72 18,60Z" fill="#111"/>
      <!-- Right wing (black, curved against body) -->
      <path d="M67,55 Q74,68 70,80 Q62,88 58,82 Q64,72 62,60Z" fill="#111"/>
      <!-- Left foot (large golden-orange) -->
      <ellipse cx="29" cy="92" rx="14" ry="6" fill="#e8a020" stroke="#c07010" stroke-width="0.8"/>
      <!-- Right foot -->
      <ellipse cx="51" cy="92" rx="14" ry="6" fill="#e8a020" stroke="#c07010" stroke-width="0.8"/>
    </svg>

    <!-- macOS: Apple logo -->
    <svg *ngIf="type === 'macos'" class="icon os-icon" viewBox="0 0 24 24" width="18" height="18" fill="#888" xmlns="http://www.w3.org/2000/svg">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-1.8 1.09-2.68 2.62-2.67 4.57.01 1.53.57 2.8 1.67 3.8.5.47 1.05.84 1.67 1.1-.13.38-.27.75-.43 1.1zM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.37 1.05-3.11z"/>
    </svg>

    <!-- Unknown/Other: monitor icon -->
    <svg *ngIf="type !== 'windows' && type !== 'linux' && type !== 'macos'" class="icon os-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  `,
  styles: [`
    :host { display: inline-flex; align-items: center; vertical-align: middle; }
    .os-icon { flex-shrink: 0; }
    .tux-icon { display: block; }
  `]
})
export class OsIconComponent {
  @Input() type: string = 'unknown';
}
