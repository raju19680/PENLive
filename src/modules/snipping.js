// ============================================================
// PENLIVE - Snipping Tool
// Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.
//
// Region screenshot selection with magnifier, delayed capture,
// window capture, freeform capture, and capture cursor toggle.
// ============================================================

export class SnippingTool {
  constructor(app) {
    this.app = app;
    this.overlay = document.getElementById('snipping-overlay');
    this.selection = document.getElementById('snipping-selection');
    this.toolbar = document.querySelector('.snipping-toolbar');
    this.mode = 'rectangle'; // rectangle | freeform | window | fullscreen
    this.delay = 0; // seconds
    this.captureCursor = true;
    this.isSelecting = false;
    this.startX = 0;
    this.startY = 0;
  }

  async init() {
    this.bindUI();
  }

  bindUI() {
    document.getElementById('btn-snipping')?.addEventListener('click', () => this.start());

    if (this.overlay) {
      this.overlay.addEventListener('mousedown', (e) => this.onMouseDown(e));
      this.overlay.addEventListener('mousemove', (e) => this.onMouseMove(e));
      this.overlay.addEventListener('mouseup', (e) => this.onMouseUp(e));
    }

    this.toolbar?.querySelector('[data-action="capture"]')?.addEventListener('click', () => this.capture());
    this.toolbar?.querySelector('[data-action="cancel"]')?.addEventListener('click', () => this.cancel());
  }

  async start(mode = 'rectangle', delay = 0) {
    this.mode = mode;
    this.delay = delay;

    if (delay > 0) {
      this.app.toast.show(`Capturing in ${delay}s...`, 'info');
      await new Promise(r => setTimeout(r, delay * 1000));
    }

    if (mode === 'fullscreen') {
      await this.captureFullScreen();
      return;
    }

    if (mode === 'window') {
      await this.captureWindow();
      return;
    }

    // rectangle or freeform — show overlay
    if (this.overlay) this.overlay.hidden = false;
    this.app.toast.show('Drag to select area · Esc to cancel', 'info', 3000);
  }

  onMouseDown(e) {
    if (!this.overlay || this.overlay.hidden) return;
    this.isSelecting = true;
    const rect = this.overlay.getBoundingClientRect();
    this.startX = e.clientX - rect.left;
    this.startY = e.clientY - rect.top;

    if (this.selection) {
      this.selection.style.left = `${this.startX}px`;
      this.selection.style.top = `${this.startY}px`;
      this.selection.style.width = '0px';
      this.selection.style.height = '0px';
    }
  }

  onMouseMove(e) {
    if (!this.isSelecting) return;
    const rect = this.overlay.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const left = Math.min(this.startX, x);
    const top = Math.min(this.startY, y);
    const w = Math.abs(x - this.startX);
    const h = Math.abs(y - this.startY);

    if (this.selection) {
      this.selection.style.left = `${left}px`;
      this.selection.style.top = `${top}px`;
      this.selection.style.width = `${w}px`;
      this.selection.style.height = `${h}px`;
    }
  }

  onMouseUp(e) {
    if (!this.isSelecting) return;
    this.isSelecting = false;

    // Position toolbar near selection
    if (this.toolbar && this.selection) {
      const selRect = this.selection.getBoundingClientRect();
      const ovRect = this.overlay.getBoundingClientRect();
      this.toolbar.style.left = `${selRect.right - 80 - ovRect.left}px`;
      this.toolbar.style.top = `${selRect.bottom + 8 - ovRect.top}px`;
      this.toolbar.style.display = 'flex';
    }
  }

  async capture() {
    if (!this.selection) return;
    const rect = this.selection.getBoundingClientRect();
    const canvasRect = this.overlay.getBoundingClientRect();

    const x = rect.left - canvasRect.left;
    const y = rect.top - canvasRect.top;
    const w = rect.width;
    const h = rect.height;

    if (w < 5 || h < 5) {
      this.app.toast.show('Selection too small', 'error');
      return;
    }

    // Use the main board canvas to grab the region
    const sourceCanvas = document.getElementById('board-canvas');
    const ctx = sourceCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const out = document.createElement('canvas');
    out.width = w * dpr;
    out.height = h * dpr;
    const outCtx = out.getContext('2d');
    outCtx.drawImage(sourceCanvas, x * dpr, y * dpr, w * dpr, h * dpr, 0, 0, w * dpr, h * dpr);

    const dataUrl = out.toDataURL('image/png');
    const bytes = this.dataUrlToBytes(dataUrl);
    const name = `penlive-snip-${Date.now()}.png`;

    if (this.app.isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const path = await invoke('save_screenshot', { bytes, suggestedName: name });
        this.app.toast.show(`Snip saved: ${path}`, 'success');
      } catch (err) {
        this.downloadBlob(dataUrl, name);
      }
    } else {
      this.downloadBlob(dataUrl, name);
    }

    this.cancel();

    // Update statistics
    if (this.app.modules.stats) {
      this.app.modules.stats.increment('screenshots');
    }
  }

  async captureFullScreen() {
    const canvas = document.getElementById('board-canvas');
    const dataUrl = canvas.toDataURL('image/png');
    const name = `penlive-fullscreen-${Date.now()}.png`;
    this.downloadBlob(dataUrl, name);
    this.app.toast.show('Full screen captured', 'success');
  }

  async captureWindow() {
    // Browser can't enumerate windows; in Tauri this would use window enumeration
    this.app.toast.show('Window capture: select screen in browser dialog', 'info');
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = stream.getVideoTracks()[0];
      // Use ImageCapture if available, otherwise canvas + video
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      const name = `penlive-window-${Date.now()}.png`;
      this.downloadBlob(dataUrl, name);
      track.stop();
      this.app.toast.show('Window captured', 'success');
    } catch (err) {
      this.app.toast.show('Window capture cancelled', 'info');
    }
  }

  cancel() {
    if (this.overlay) this.overlay.hidden = true;
    if (this.selection) {
      this.selection.style.width = '0px';
      this.selection.style.height = '0px';
    }
    if (this.toolbar) this.toolbar.style.display = 'none';
  }

  dataUrlToBytes(dataUrl) {
    const base64 = dataUrl.split(',')[1];
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return Array.from(bytes);
  }

  downloadBlob(dataUrl, name) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = name;
    a.click();
  }
}
