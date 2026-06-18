// ============================================================
// PENLIVE - Theme Manager
// Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.
//
// Manages light/dark/auto themes and accent color customization.
// Persists to localStorage.
// ============================================================

export class ThemeManager {
  constructor(app) {
    this.app = app;
    this.theme = 'light';
    this.accent = '#1a73e8';
  }

  async init() {
    // Load saved settings
    const saved = localStorage.getItem('penlive-theme');
    if (saved) {
      const data = JSON.parse(saved);
      this.theme = data.theme || 'light';
      this.accent = data.accent || '#1a73e8';
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.theme = 'auto';
    }

    this.apply();
    this.bindUI();

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.theme === 'auto') this.apply();
    });
  }

  apply() {
    let effective = this.theme;
    if (effective === 'auto') {
      effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(`theme-${effective}`);

    // Apply accent color
    document.documentElement.style.setProperty('--color-primary', this.accent);
    document.documentElement.style.setProperty('--color-primary-hover', this.darken(this.accent, 15));
    document.documentElement.style.setProperty('--color-primary-light', this.lighten(this.accent, 85));

    // Update active states
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === this.theme);
    });
    document.querySelectorAll('.accent-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.accent === this.accent);
    });
  }

  setTheme(theme) {
    this.theme = theme;
    this.save();
    this.apply();
    this.app.toast.show(`Theme: ${theme}`, 'info');
  }

  setAccent(color) {
    this.accent = color;
    this.save();
    this.apply();
  }

  toggle() {
    const effective = document.body.classList.contains('theme-dark') ? 'dark' : 'light';
    this.setTheme(effective === 'dark' ? 'light' : 'dark');
  }

  save() {
    localStorage.setItem('penlive-theme', JSON.stringify({
      theme: this.theme,
      accent: this.accent,
    }));
  }

  bindUI() {
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => this.setTheme(btn.dataset.theme));
    });
    document.querySelectorAll('.accent-btn').forEach(btn => {
      btn.addEventListener('click', () => this.setAccent(btn.dataset.accent));
    });
    document.getElementById('btn-theme')?.addEventListener('click', () => this.toggle());
  }

  // Color utilities
  darken(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - Math.round(255 * percent / 100));
    const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(255 * percent / 100));
    const b = Math.max(0, (num & 0xff) - Math.round(255 * percent / 100));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

  lighten(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (num >> 16) + Math.round(255 * percent / 100));
    const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * percent / 100));
    const b = Math.min(255, (num & 0xff) + Math.round(255 * percent / 100));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }
}
