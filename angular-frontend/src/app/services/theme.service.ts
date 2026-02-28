import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private renderer: Renderer2;
  private _theme$ = new BehaviorSubject<Theme>(this.getSavedTheme());
  theme$ = this._theme$.asObservable();

  constructor(factory: RendererFactory2) {
    this.renderer = factory.createRenderer(null, null);
    this.apply(this._theme$.value);
  }

  get isDark(): boolean { return this._theme$.value === 'dark'; }

  toggle(): void {
    this.set(this.isDark ? 'light' : 'dark');
  }

  set(theme: Theme): void {
    this._theme$.next(theme);
    localStorage.setItem('wol-theme', theme);
    this.apply(theme);
  }

  private apply(theme: Theme): void {
    if (theme === 'dark') {
      this.renderer.addClass(document.documentElement, 'dark');
    } else {
      this.renderer.removeClass(document.documentElement, 'dark');
    }
  }

  private getSavedTheme(): Theme {
    const saved = localStorage.getItem('wol-theme') as Theme;
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
