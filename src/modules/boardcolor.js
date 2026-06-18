// ============================================================
// PENLIVE - Board Color Module
// Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.
//
// Lets users pick any background color for the whiteboard,
// including presets (white, cream, mint, sky, black, blackboard,
// sepia, pink) or a custom color picker. Persists to localStorage.
// ============================================================

export class BoardColor {
  constructor(app) {
    this.app = app;
    this.panel = document.getElementById('board-color-panel');
    this.canvas = document.getElementById('board-canvas');
    this.currentColor = '#ffffff';
  }

  async init() {
    this.bindUI();
    // Load saved color
    const saved = localStorage.getItem('penlive-board-color');
    if (saved) this.apply(saved, false);
  }

  bindUI() {
    document.getElementById('btb-board-color')?.addEventListener('click', () => this.toggle());

    document.querySelectorAll('.board-color-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const color = btn.dataset.boardColor;
        this.apply(color);
        document.querySelectorAll('.board-color-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('board-color-custom').value = color;
      });
    });

    document.getElementById('board-color-custom')?.addEventListener('input', (e) => {
      document.querySelectorAll('.board-color-btn').forEach(b => b.classList.remove('active'));
    });

    document.getElementById('board-color-apply')?.addEventListener('click', () => {
      const custom = document.getElementById('board-color-custom').value;
      this.apply(custom);
      this.app.toast.show(`Board color changed`, 'success');
      if (this.panel) this.panel.hidden = true;
    });
  }

  toggle() {
    if (!this.panel) return;
    this.panel.hidden = !this.panel.hidden;
  }

  apply(color, showToast = true) {
    this.currentColor = color;
    if (!this.canvas) return;
    this.canvas.style.background = color;
    this.canvas.style.backgroundImage = 'none';
    localStorage.setItem('penlive-board-color', color);

    // Adjust pen default color if background is dark
    const isDark = this.isDarkColor(color);
    if (isDark) {
      // Suggest white/light pen if currently dark
      const drawing = this.app.modules.drawing;
      if (drawing && this.isDarkColor(drawing.color)) {
        // Don't auto-change — let user decide
      }
    }

    // Deactivate template buttons since we're using custom color
    document.querySelectorAll('.template-btn').forEach(b => b.classList.remove('active'));

    if (showToast) this.app.toast.show(`Board color: ${color}`, 'info');
  }

  isDarkColor(hex) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = (num >> 16) & 0xff;
    const g = (num >> 8) & 0xff;
    const b = num & 0xff;
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
  }
}
