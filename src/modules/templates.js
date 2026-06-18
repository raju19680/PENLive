// ============================================================
// PENLIVE - Background Templates Module
// Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.
//
// Switches canvas background patterns:
// blank, grid, lined, dotted, music sheet, isometric, dark, blackboard
// ============================================================

export class Templates {
  constructor(app) {
    this.app = app;
    this.current = 'blank';
    this.canvas = document.getElementById('board-canvas');
  }

  async init() {
    this.bindUI();
    this.apply('blank');
  }

  bindUI() {
    document.getElementById('btn-template')?.addEventListener('click', () => this.togglePanel());
    document.querySelectorAll('.template-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.apply(btn.dataset.template);
        document.querySelectorAll('.template-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('template-panel').hidden = true;
      });
    });
    document.getElementById('btn-board-mode')?.addEventListener('click', () => {
      this.apply(this.current === 'blackboard' ? 'blank' : 'blackboard');
      this.app.toast.show(this.current === 'blackboard' ? 'Blackboard mode' : 'Whiteboard mode', 'info');
    });
  }

  togglePanel() {
    const panel = document.getElementById('template-panel');
    if (panel) panel.hidden = !panel.hidden;
  }

  apply(template) {
    this.current = template;
    if (!this.canvas) return;

    const dark = template === 'dark' || template === 'blackboard';

    if (dark) {
      this.canvas.style.background = template === 'blackboard' ? '#1a2818' : '#1a1a1a';
      this.canvas.style.backgroundImage = '';
      return;
    }

    this.canvas.style.background = '#ffffff';

    switch (template) {
      case 'blank':
        this.canvas.style.backgroundImage = '';
        break;
      case 'grid':
        this.canvas.style.backgroundImage = `
          linear-gradient(rgba(180, 195, 215, 0.4) 1px, transparent 1px),
          linear-gradient(90deg, rgba(180, 195, 215, 0.4) 1px, transparent 1px)
        `;
        this.canvas.style.backgroundSize = '20px 20px';
        break;
      case 'lined':
        this.canvas.style.backgroundImage = `linear-gradient(rgba(180, 195, 215, 0.4) 1px, transparent 1px)`;
        this.canvas.style.backgroundSize = '100% 28px';
        break;
      case 'dotted':
        this.canvas.style.backgroundImage = `radial-gradient(circle, rgba(180, 195, 215, 0.6) 1.5px, transparent 1.5px)`;
        this.canvas.style.backgroundSize = '20px 20px';
        break;
      case 'music':
        this.canvas.style.backgroundImage = `
          linear-gradient(#000 1px, transparent 1px),
          linear-gradient(#000 1px, transparent 1px),
          linear-gradient(#000 1px, transparent 1px),
          linear-gradient(#000 1px, transparent 1px),
          linear-gradient(#000 1px, transparent 1px)
        `;
        this.canvas.style.backgroundSize = '100% 80px';
        this.canvas.style.backgroundPosition = '0 0, 0 20px, 0 40px, 0 60px, 0 80px';
        break;
      case 'isometric':
        this.canvas.style.backgroundImage = `
          linear-gradient(60deg, rgba(180, 195, 215, 0.3) 25%, transparent 25.5%, transparent 75%, rgba(180, 195, 215, 0.3) 75%),
          linear-gradient(-60deg, rgba(180, 195, 215, 0.3) 25%, transparent 25.5%, transparent 75%, rgba(180, 195, 215, 0.3) 75%),
          linear-gradient(rgba(180, 195, 215, 0.3) 1px, transparent 1px)
        `;
        this.canvas.style.backgroundSize = '30px 52px, 30px 52px, 30px 52px';
        break;
    }
  }
}
