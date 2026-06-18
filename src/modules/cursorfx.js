// ============================================================
// PENLIVE - Cursor Effects Module
// Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.
//
// Cursor highlight, spotlight, click ripple, click sound.
// Laser pointer trail with auto-fade.
// Magnifier lens following cursor.
// ============================================================

export class CursorEffects {
  constructor(app) {
    this.app = app;
    this.fxLayer = document.getElementById('cursor-fx-layer');
    this.laserCanvas = document.getElementById('laser-canvas');
    this.laserCtx = this.laserCanvas?.getContext('2d');
    this.magnifier = document.getElementById('magnifier-lens');
    this.magnifierCanvas = document.getElementById('magnifier-canvas');
    this.spotlightOverlay = document.getElementById('spotlight-overlay');
    this.spotlightHole = document.getElementById('spotlight-hole');

    this.settings = {
      highlight: false,
      spotlight: false,
      clickRipple: false,
      clickSound: false,
      size: 30,
      color: '#ffd60a',
    };

    this.laserActive = false;
    this.laserTrail = [];
    this.magnifierActive = false;
    this.spotlightActive = false;

    this.highlightEl = null;
  }

  async init() {
    this.bindUI();
    this.resizeLaserCanvas();
    window.addEventListener('resize', () => this.resizeLaserCanvas());

    // Animate laser trail
    this.animateLaser();
    // Animate magnifier
    this.animateMagnifier();
  }

  resizeLaserCanvas() {
    if (!this.laserCanvas) return;
    const rect = this.laserCanvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.laserCanvas.width = rect.width * dpr;
    this.laserCanvas.height = rect.height * dpr;
    this.laserCanvas.style.width = `${rect.width}px`;
    this.laserCanvas.style.height = `${rect.height}px`;
    this.laserCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  bindUI() {
    // Cursor FX panel toggles
    document.getElementById('btn-cursor-fx')?.addEventListener('click', () => this.togglePanel());
    document.getElementById('fx-highlight')?.addEventListener('change', (e) => {
      this.settings.highlight = e.target.checked;
      this.updateHighlight();
    });
    document.getElementById('fx-spotlight')?.addEventListener('change', (e) => {
      this.settings.spotlight = e.target.checked;
      this.updateSpotlight();
    });
    document.getElementById('fx-click-ripple')?.addEventListener('change', (e) => {
      this.settings.clickRipple = e.target.checked;
    });
    document.getElementById('fx-click-sound')?.addEventListener('change', (e) => {
      this.settings.clickSound = e.target.checked;
    });
    document.getElementById('fx-size')?.addEventListener('input', (e) => {
      this.settings.size = parseInt(e.target.value, 10);
      this.updateHighlight();
    });
    document.getElementById('fx-color')?.addEventListener('input', (e) => {
      this.settings.color = e.target.value;
      this.updateHighlight();
    });

    // Laser pointer
    document.getElementById('btn-laser')?.addEventListener('click', () => this.toggleLaser());

    // Magnifier
    document.getElementById('btn-magnifier')?.addEventListener('click', () => this.toggleMagnifier());

    // Spotlight
    document.getElementById('btn-spotlight')?.addEventListener('click', () => this.toggleSpotlight());

    // Global mouse tracking
    document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    document.addEventListener('click', (e) => this.onClick(e));

    // Esc to exit any mode
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.disableAll();
      }
    });
  }

  onMouseMove(e) {
    // Highlight cursor
    if (this.settings.highlight && this.highlightEl) {
      this.highlightEl.style.left = `${e.clientX}px`;
      this.highlightEl.style.top = `${e.clientY}px`;
    }

    // Spotlight
    if (this.spotlightActive && this.spotlightHole) {
      const parent = this.spotlightOverlay.parentElement.getBoundingClientRect();
      this.spotlightHole.style.left = `${e.clientX - parent.left}px`;
      this.spotlightHole.style.top = `${e.clientY - parent.top}px`;
    }

    // Laser trail
    if (this.laserActive && this.laserCtx) {
      const parent = this.laserCanvas.parentElement.getBoundingClientRect();
      const x = e.clientX - parent.left;
      const y = e.clientY - parent.top;
      this.laserTrail.push({ x, y, time: Date.now() });
      if (this.laserTrail.length > 30) this.laserTrail.shift();
    }

    // Magnifier
    if (this.magnifierActive && this.magnifier) {
      const parent = this.magnifier.parentElement.getBoundingClientRect();
      this.magnifier.style.left = `${e.clientX - parent.left - 100}px`;
      this.magnifier.style.top = `${e.clientY - parent.top - 100}px`;
      this.lastMagX = e.clientX - parent.left;
      this.lastMagY = e.clientY - parent.top;
    }
  }

  onClick(e) {
    if (this.settings.clickRipple) {
      this.spawnRipple(e.clientX, e.clientY);
    }
    if (this.settings.clickSound) {
      this.playClickSound();
    }
  }

  spawnRipple(x, y) {
    if (!this.fxLayer) return;
    const ripple = document.createElement('div');
    ripple.className = 'cursor-click-ripple';
    const parent = this.fxLayer.getBoundingClientRect();
    ripple.style.left = `${x - parent.left}px`;
    ripple.style.top = `${y - parent.top}px`;
    this.fxLayer.appendChild(ripple);
    setTimeout(() => ripple.remove(), 700);
  }

  playClickSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 800;
      gain.gain.value = 0.1;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.stop(ctx.currentTime + 0.05);
    } catch (err) {}
  }

  togglePanel() {
    const panel = document.getElementById('cursor-fx-panel');
    if (panel) panel.hidden = !panel.hidden;
  }

  updateHighlight() {
    if (this.settings.highlight) {
      if (!this.highlightEl) {
        this.highlightEl = document.createElement('div');
        this.highlightEl.className = 'cursor-highlight';
        this.fxLayer?.appendChild(this.highlightEl);
      }
      this.highlightEl.style.width = `${this.settings.size * 2}px`;
      this.highlightEl.style.height = `${this.settings.size * 2}px`;
      this.highlightEl.style.background = this.hexToRgba(this.settings.color, 0.3);
      this.highlightEl.style.borderColor = this.hexToRgba(this.settings.color, 0.6);
    } else {
      this.highlightEl?.remove();
      this.highlightEl = null;
    }
  }

  updateSpotlight() {
    if (this.settings.spotlight) {
      this.spotlightActive = true;
      this.spotlightOverlay.hidden = false;
    } else {
      this.spotlightActive = false;
      this.spotlightOverlay.hidden = true;
    }
  }

  toggleLaser() {
    this.laserActive = !this.laserActive;
    if (this.laserActive) {
      this.laserTrail = [];
      this.app.toast.show('Laser pointer ON (press Esc to exit)', 'info');
    } else {
      this.laserTrail = [];
      this.laserCtx?.clearRect(0, 0, this.laserCanvas.width, this.laserCanvas.height);
      this.app.toast.show('Laser pointer OFF', 'info');
    }
  }

  animateLaser() {
    if (this.laserCtx && this.laserCanvas) {
      const rect = this.laserCanvas.getBoundingClientRect();
      this.laserCtx.clearRect(0, 0, rect.width, rect.height);

      const now = Date.now();
      // Filter out old points (older than 500ms)
      this.laserTrail = this.laserTrail.filter(p => now - p.time < 500);

      if (this.laserTrail.length > 1) {
        // Draw glowing laser trail
        for (let i = 1; i < this.laserTrail.length; i++) {
          const p1 = this.laserTrail[i - 1];
          const p2 = this.laserTrail[i];
          const age = (now - p2.time) / 500;
          const alpha = 1 - age;

          this.laserCtx.strokeStyle = `rgba(255, 0, 0, ${alpha})`;
          this.laserCtx.lineWidth = 8 * (1 - age * 0.5);
          this.laserCtx.lineCap = 'round';
          this.laserCtx.shadowColor = 'rgba(255, 0, 0, 0.8)';
          this.laserCtx.shadowBlur = 15;
          this.laserCtx.beginPath();
          this.laserCtx.moveTo(p1.x, p1.y);
          this.laserCtx.lineTo(p2.x, p2.y);
          this.laserCtx.stroke();
        }

        // Laser dot at current position
        const last = this.laserTrail[this.laserTrail.length - 1];
        this.laserCtx.fillStyle = '#ff0000';
        this.laserCtx.shadowColor = 'rgba(255, 0, 0, 1)';
        this.laserCtx.shadowBlur = 20;
        this.laserCtx.beginPath();
        this.laserCtx.arc(last.x, last.y, 6, 0, Math.PI * 2);
        this.laserCtx.fill();
      }
    }
    requestAnimationFrame(() => this.animateLaser());
  }

  toggleMagnifier() {
    this.magnifierActive = !this.magnifierActive;
    if (this.magnifier) this.magnifier.hidden = !this.magnifierActive;
    this.app.toast.show(this.magnifierActive ? 'Magnifier ON' : 'Magnifier OFF', 'info');
  }

  animateMagnifier() {
    if (this.magnifierActive && this.magnifierCanvas && this.lastMagX !== undefined) {
      const ctx = this.magnifierCanvas.getContext('2d');
      const sourceCanvas = document.getElementById('board-canvas');
      const zoom = 2;
      const size = 200;

      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, size, size);

      try {
        ctx.drawImage(
          sourceCanvas,
          (this.lastMagX - size / (2 * zoom)) * (window.devicePixelRatio || 1),
          (this.lastMagY - size / (2 * zoom)) * (window.devicePixelRatio || 1),
          size / zoom * (window.devicePixelRatio || 1),
          size / zoom * (window.devicePixelRatio || 1),
          0, 0, size, size
        );
      } catch (err) {}
    }
    requestAnimationFrame(() => this.animateMagnifier());
  }

  toggleSpotlight() {
    this.spotlightActive = !this.spotlightActive;
    if (this.spotlightOverlay) this.spotlightOverlay.hidden = !this.spotlightActive;
    this.app.toast.show(this.spotlightActive ? 'Spotlight ON' : 'Spotlight OFF', 'info');
  }

  disableAll() {
    if (this.laserActive) this.toggleLaser();
    if (this.magnifierActive) this.toggleMagnifier();
    if (this.spotlightActive) this.toggleSpotlight();
  }

  hexToRgba(hex, alpha) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = (num >> 16) & 0xff;
    const g = (num >> 8) & 0xff;
    const b = num & 0xff;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
