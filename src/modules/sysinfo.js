// ============================================================
// PENLIVE - System Info Module
// Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.
//
// Displays system info (CPU, memory, disk) and available monitors
// for multi-screen support. Uses Tauri commands when available.
// ============================================================

export class SystemInfo {
  constructor(app) {
    this.app = app;
    this.box = document.getElementById('sys-info-box');
    this.monitorSelect = document.getElementById('monitor-select');
  }

  async init() {
    await this.loadSystemInfo();
    await this.loadMonitors();
  }

  async loadSystemInfo() {
    if (!this.box) return;
    this.box.textContent = 'Loading...';

    if (this.app.isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const info = await invoke('get_system_info');
        const memUsage = ((info.used_memory_mb / info.total_memory_mb) * 100).toFixed(1);
        this.box.innerHTML = `
          <div><b>CPU:</b> ${info.cpu_brand} (${info.cpu_cores} cores)</div>
          <div><b>CPU Usage:</b> ${info.cpu_usage.toFixed(1)}%</div>
          <div><b>RAM:</b> ${(info.total_memory_mb / 1024).toFixed(1)} GB total</div>
          <div><b>RAM Used:</b> ${memUsage}%</div>
          ${info.disks.map(d => `<div><b>Disk ${d.mount_point}:</b> ${(d.available_space / 1024 / 1024 / 1024).toFixed(1)} / ${(d.total_space / 1024 / 1024 / 1024).toFixed(1)} GB free</div>`).join('')}
        `;
        this.warnIfLowPerf(info);
      } catch (err) {
        this.box.textContent = `Error: ${err.message}`;
      }
    } else {
      // Browser fallback — limited info
      const cores = navigator.hardwareConcurrency || '?';
      const mem = navigator.deviceMemory ? `${navigator.deviceMemory} GB` : 'unknown';
      this.box.innerHTML = `
        <div><b>CPU Cores:</b> ${cores}</div>
        <div><b>RAM (approx):</b> ${mem}</div>
        <div><b>Platform:</b> ${navigator.platform}</div>
        <div><b>Note:</b> Run as Tauri app for full system info</div>
      `;
    }
  }

  async loadMonitors() {
    if (!this.monitorSelect) return;

    let monitors = [];
    if (this.app.isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const win = getCurrentWindow();
        monitors = await invoke('list_monitors', { window: win });
      } catch (err) {
        console.warn('[PENLIVE] Monitor list via Tauri failed:', err);
      }
    }

    if (monitors.length === 0) {
      // Browser fallback
      // Note: getDisplayMedia will let user pick at record time
      monitors = [{
        name: 'Primary Display',
        width: window.screen.width,
        height: window.screen.height,
        scale_factor: 1,
      }];
    }

    this.monitorSelect.innerHTML = monitors.map((m, i) =>
      `<option value="${i}">${m.name || `Monitor ${i + 1}`} — ${m.width}×${m.height}</option>`
    ).join('');

    if (monitors.length > 1) {
      this.app.toast.show(`${monitors.length} monitors detected (multi-screen supported)`, 'info', 4000);
    }
  }

  warnIfLowPerf(info) {
    if (info.total_memory_mb < 4 * 1024) {
      this.app.toast.show('Low RAM detected — using 720p recording for performance', 'warning', 5000);
      const btn = document.querySelector('.quality-btn[data-quality="720p"]');
      btn?.click();
    }
    if (info.cpu_usage > 80) {
      this.app.toast.show('High CPU usage — close other apps for smooth recording', 'warning', 5000);
    }
  }
}
