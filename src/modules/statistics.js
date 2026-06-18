// ============================================================
// PENLIVE - Statistics Dashboard Module
// Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.
//
// Tracks usage: total recordings, time, storage, pages,
// screenshots, sessions. Persists to localStorage.
// ============================================================

export class Statistics {
  constructor(app) {
    this.app = app;
    this.data = this.load();
  }

  async init() {
    // Increment session count on each launch
    this.data.sessions = (this.data.sessions || 0) + 1;
    this.save();
    this.render();
    this.bindUI();
  }

  load() {
    try {
      const raw = localStorage.getItem('penlive-stats');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {
      recordings: 0,
      totalTime: 0, // seconds
      storage: 0, // bytes
      pages: 1,
      screenshots: 0,
      sessions: 0,
      activity: [], // array of daily activity counts
    };
  }

  save() {
    localStorage.setItem('penlive-stats', JSON.stringify(this.data));
  }

  increment(key, amount = 1) {
    this.data[key] = (this.data[key] || 0) + amount;
    this.save();
    this.render();
  }

  addRecording(durationSec, sizeBytes) {
    this.data.recordings++;
    this.data.totalTime += durationSec;
    this.data.storage += sizeBytes;
    this.logActivity();
    this.save();
    this.render();
  }

  addPage() {
    this.data.pages++;
    this.save();
    this.render();
  }

  logActivity() {
    const today = new Date().toISOString().slice(0, 10);
    if (!this.data.activity) this.data.activity = [];
    const todayEntry = this.data.activity.find(a => a.date === today);
    if (todayEntry) todayEntry.count++;
    else this.data.activity.push({ date: today, count: 1 });
    // Keep last 30 days
    this.data.activity = this.data.activity.slice(-30);
  }

  render() {
    const fmt = {
      recordings: () => this.data.recordings,
      time: () => this.formatTime(this.data.totalTime),
      storage: () => this.formatSize(this.data.storage),
      pages: () => this.data.pages,
      screenshots: () => this.data.screenshots,
      sessions: () => this.data.sessions,
    };
    Object.keys(fmt).forEach(key => {
      const el = document.getElementById(`stat-${key}`);
      if (el) el.textContent = fmt[key]();
    });

    // Render activity chart
    const chart = document.getElementById('activity-chart');
    if (chart) {
      const days = 7;
      const recent = (this.data.activity || []).slice(-days);
      // Pad to 7 days
      while (recent.length < days) recent.unshift({ count: 0 });
      const max = Math.max(1, ...recent.map(a => a.count));
      chart.innerHTML = recent.map(a =>
        `<div class="activity-bar" style="height: ${Math.max(4, (a.count / max) * 100)}%" title="${a.date}: ${a.count}"></div>`
      ).join('');
    }
  }

  formatTime(sec) {
    if (sec < 60) return `${sec}s`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m`;
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}h ${m}m`;
  }

  formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }

  bindUI() {
    document.getElementById('stats-reset')?.addEventListener('click', () => {
      if (confirm('Reset all statistics?')) {
        this.data = {
          recordings: 0, totalTime: 0, storage: 0,
          pages: 1, screenshots: 0, sessions: 0, activity: []
        };
        this.save();
        this.render();
        this.app.toast.show('Statistics reset', 'success');
      }
    });

    document.getElementById('btn-stats')?.addEventListener('click', () => {
      document.querySelector('.panel__nav-btn[data-tab-target="stats"]')?.click();
    });
  }
}
