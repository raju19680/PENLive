// ============================================================
// PENLIVE - Auto-Save Module
// Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.
//
// Periodically saves:
//   - Canvas state (current page)
//   - Smart board (all pages + stickies)
//   - Recording metadata list
// ============================================================

export class AutoSave {
  constructor(app) {
    this.app = app;
    this.enabled = true;
    this.intervalMs = 30_000; // 30 seconds
    this.timer = null;
    this.pending = false;
    this.statusEl = document.getElementById('autosave-status');
    this.recordingStart = null;
  }

  async init() {
    // Load setting
    const cb = document.getElementById('set-autosave');
    cb?.addEventListener('change', (e) => {
      this.enabled = e.target.checked;
      if (this.enabled) this.startTimer();
      else this.stopTimer();
    });

    if (this.enabled) this.startTimer();
  }

  startTimer() {
    this.stopTimer();
    this.timer = setInterval(() => this.save(), this.intervalMs);
  }

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  markRecordingStart() {
    this.recordingStart = Date.now();
  }

  scheduleSave() {
    this.pending = true;
  }

  async save() {
    if (!this.enabled) return;
    if (!this.app.modules.drawing || !this.app.modules.smartboard) return;

    try {
      const data = {
        version: '1.0.0',
        timestamp: Date.now(),
        smartboard: this.app.modules.smartboard.serialize(),
        recordingStart: this.recordingStart,
      };
      const json = JSON.stringify(data);

      if (this.app.isTauri) {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          await invoke('save_canvas_state', { json, name: 'session' });
        } catch (err) {
          console.warn('[PENLIVE] Tauri save failed, using localStorage:', err);
          this.saveLocal(json);
        }
      } else {
        this.saveLocal(json);
      }

      this.flashStatus();
      this.pending = false;
    } catch (err) {
      console.error('[PENLIVE] Auto-save error:', err);
    }
  }

  saveLocal(json) {
    try {
      localStorage.setItem('penlive-session', json);
    } catch (e) {
      console.warn('[PENLIVE] localStorage save failed:', e);
    }
  }

  async loadLast() {
    let json = null;

    if (this.app.isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        json = await invoke('load_canvas_state', { name: 'session' });
      } catch (err) {
        console.warn('[PENLIVE] Tauri load failed:', err);
      }
    }

    if (!json) {
      json = localStorage.getItem('penlive-session');
    }

    if (!json) return;

    try {
      const data = JSON.parse(json);
      if (data.smartboard && this.app.modules.smartboard) {
        this.app.modules.smartboard.deserialize(data.smartboard);
        this.app.toast.show('Previous session restored', 'success');
      }
    } catch (err) {
      console.warn('[PENLIVE] Session restore failed:', err);
    }
  }

  flashStatus() {
    if (this.statusEl) {
      this.statusEl.textContent = 'Saving...';
      setTimeout(() => {
        if (this.statusEl) this.statusEl.textContent = 'Auto-saved';
      }, 800);
    }
  }
}
