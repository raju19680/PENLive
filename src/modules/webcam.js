// ============================================================
// PENLIVE - Webcam Manager
// Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.
//
// Enumerates webcams, shows live preview PiP, supports
// external webcams via deviceId selection.
// ============================================================

export class WebcamManager {
  constructor(app) {
    this.app = app;
    this.devices = [];
    this.activeStream = null;
    this.video = document.getElementById('webcam-video');
    this.pip = document.getElementById('webcam-pip');
    this.select = document.getElementById('webcam-select');
    this.previewActive = false;
  }

  async init() {
    await this.enumerate();
    this.bindUI();
  }

  async enumerate() {
    try {
      // Need permission first to get device labels
      const tmp = await navigator.mediaDevices.getUserMedia({ video: true });
      tmp.getTracks().forEach(t => t.stop());

      const all = await navigator.mediaDevices.getUserMedia({ video: true });
      all.getTracks().forEach(t => t.stop());

      this.devices = (await navigator.mediaDevices.enumerateDevices())
        .filter(d => d.kind === 'videoinput');

      this.populateSelect();
    } catch (err) {
      console.warn('[PENLIVE] Webcam enumeration failed:', err);
    }
  }

  populateSelect() {
    if (!this.select) return;
    this.select.innerHTML = '';
    if (this.devices.length === 0) {
      this.select.innerHTML = '<option value="">No webcam detected</option>';
      return;
    }
    this.devices.forEach((d, i) => {
      const opt = document.createElement('option');
      opt.value = d.deviceId;
      opt.textContent = d.label || `Webcam ${i + 1}`;
      this.select.appendChild(opt);
    });
  }

  bindUI() {
    // Show PiP preview when webcam is selected for recording
    document.getElementById('src-webcam')?.addEventListener('change', (e) => {
      if (e.target.checked) this.startPreview();
      else this.stopPreview();
    });

    this.select?.addEventListener('change', () => {
      if (this.previewActive) {
        this.stopPreview();
        this.startPreview();
      }
    });

    // Close button
    document.getElementById('webcam-close')?.addEventListener('click', () => {
      this.stopPreview();
      const cb = document.getElementById('src-webcam');
      if (cb) cb.checked = false;
    });

    // Bottom toolbar toggle
    document.getElementById('btb-webcam-pip')?.addEventListener('click', () => {
      if (this.previewActive) {
        this.stopPreview();
        const cb = document.getElementById('src-webcam');
        if (cb) cb.checked = false;
      } else {
        const cb = document.getElementById('src-webcam');
        if (cb) cb.checked = true;
        this.startPreview();
      }
    });

    // Snap-to-corner buttons
    ['tl', 'tr', 'bl', 'br'].forEach(corner => {
      document.getElementById(`webcam-pip-${corner}`)?.addEventListener('click', () => {
        this.snapToCorner(corner);
      });
    });

    // Make PiP draggable
    this.makeDraggable();
  }

  snapToCorner(corner) {
    if (!this.pip || !this.previewActive) return;
    const parent = this.pip.parentElement.getBoundingClientRect();
    const w = this.pip.offsetWidth;
    const h = this.pip.offsetHeight;
    const positions = {
      'tl': { x: 20, y: 20 },
      'tr': { x: parent.width - w - 20, y: 20 },
      'bl': { x: 20, y: parent.height - h - 60 },
      'br': { x: parent.width - w - 20, y: parent.height - h - 60 },
    };
    const pos = positions[corner];
    this.pip.style.left = `${pos.x}px`;
    this.pip.style.top = `${pos.y}px`;
    this.pip.style.right = 'auto';
    this.pip.classList.add('snapping');
    setTimeout(() => this.pip.classList.remove('snapping'), 300);
  }

  async startPreview() {
    if (this.previewActive) return;
    try {
      const deviceId = this.select?.value;
      this.activeStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: deviceId ? { exact: deviceId } : undefined },
        audio: false,
      });
      if (this.video) {
        this.video.srcObject = this.activeStream;
      }
      this.pip?.classList.add('active');
      this.previewActive = true;
    } catch (err) {
      this.app.toast.show(`Webcam error: ${err.message}`, 'error');
    }
  }

  stopPreview() {
    if (this.activeStream) {
      this.activeStream.getTracks().forEach(t => t.stop());
      this.activeStream = null;
    }
    if (this.video) this.video.srcObject = null;
    this.pip?.classList.remove('active');
    this.previewActive = false;
  }

  makeDraggable() {
    if (!this.pip) return;
    let offsetX = 0;
    let offsetY = 0;
    let dragging = false;

    this.pip.addEventListener('mousedown', (e) => {
      // Don't drag when clicking resize handle or close button
      if (e.target.classList.contains('webcam-pip__close') ||
          e.target.classList.contains('webcam-pip__resize') ||
          e.target.classList.contains('webcam-pip__controls') ||
          e.target.closest('.webcam-pip__controls')) return;
      dragging = true;
      const rect = this.pip.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      this.pip.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const parent = this.pip.parentElement.getBoundingClientRect();
      let x = e.clientX - parent.left - offsetX;
      let y = e.clientY - parent.top - offsetY;
      // Keep within bounds
      x = Math.max(0, Math.min(x, parent.width - this.pip.offsetWidth));
      y = Math.max(0, Math.min(y, parent.height - this.pip.offsetHeight));

      // Snap to corners (show indicator)
      const snapThreshold = 30;
      const corners = [
        { x: 0, y: 0, name: 'top-left' },
        { x: parent.width - this.pip.offsetWidth, y: 0, name: 'top-right' },
        { x: 0, y: parent.height - this.pip.offsetHeight, name: 'bottom-left' },
        { x: parent.width - this.pip.offsetWidth, y: parent.height - this.pip.offsetHeight, name: 'bottom-right' },
      ];
      let snapped = false;
      for (const c of corners) {
        if (Math.abs(x - c.x) < snapThreshold && Math.abs(y - c.y) < snapThreshold) {
          x = c.x; y = c.y;
          this.pip.classList.add('snapping');
          snapped = true;
          break;
        }
      }
      if (!snapped) this.pip.classList.remove('snapping');

      this.pip.style.left = `${x}px`;
      this.pip.style.top = `${y}px`;
      this.pip.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
      if (dragging) {
        dragging = false;
        this.pip.style.cursor = 'move';
        this.pip.classList.remove('snapping');
      }
    });

    // Resize handle
    const resize = this.pip.querySelector('.webcam-pip__resize');
    resize?.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      let startX = e.clientX;
      let startY = e.clientY;
      let startW = this.pip.offsetWidth;
      let startH = this.pip.offsetHeight;
      const onMove = (ev) => {
        this.pip.style.width = `${Math.max(120, startW + (ev.clientX - startX))}px`;
        this.pip.style.height = `${Math.max(90, startH + (ev.clientY - startY))}px`;
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  // Get current PiP position (for recording module to composite)
  getPipPosition() {
    if (!this.pip || !this.previewActive) return null;
    const parent = this.pip.parentElement.getBoundingClientRect();
    const rect = this.pip.getBoundingClientRect();
    return {
      x: rect.left - parent.left,
      y: rect.top - parent.top,
      width: rect.width,
      height: rect.height,
    };
  }
}
