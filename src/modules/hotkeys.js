// ============================================================
// PENLIVE - Hotkeys Module
// Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.
//
// In-app keyboard shortcuts. (Global system-wide shortcuts are
// registered in Rust via tauri-plugin-global-shortcut.)
// ============================================================

export class Hotkeys {
  constructor(app) {
    this.app = app;
  }

  async init() {
    document.addEventListener('keydown', (e) => this.handle(e));
  }

  handle(e) {
    // Ignore if typing in an input/textarea
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      // Only allow Esc to blur
      if (e.key === 'Escape') e.target.blur();
      return;
    }

    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    const key = e.key.toLowerCase();

    // Ctrl+Shift+ combos (global shortcut mirrors)
    if (ctrl && shift) {
      switch (key) {
        case 'p': e.preventDefault(); this.activateTool('pen'); break;
        case 'h': e.preventDefault(); this.activateTool('highlighter'); break;
        case 'e': e.preventDefault(); this.activateTool('eraser'); break;
        case 'r': e.preventDefault(); this.app.modules.recording?.toggle(); break;
        case 's': e.preventDefault(); this.app.modules.drawing?.screenshot(); break;
        case 'o': e.preventDefault(); this.app.modules.overlay?.toggle(); break;
        case 'z': e.preventDefault(); this.app.modules.drawing?.undo(); break;
        case 'y': e.preventDefault(); this.app.modules.drawing?.redo(); break;
      }
      return;
    }

    // Ctrl-only combos
    if (ctrl && !shift) {
      switch (key) {
        case 'z': e.preventDefault(); this.app.modules.drawing?.undo(); break;
        case 'y': e.preventDefault(); this.app.modules.drawing?.redo(); break;
        case 'n': e.preventDefault(); this.app.modules.smartboard?.newPage(); break;
        case 's': e.preventDefault(); this.app.modules.drawing?.screenshot(); break;
      }
      return;
    }

    // Single key tools
    switch (key) {
      case 'p': this.activateTool('pen'); break;
      case 'h': this.activateTool('highlighter'); break;
      case 'e': this.activateTool('eraser'); break;
      case 't': this.activateTool('text'); break;
      case 'l': this.activateTool('line'); break;
      case 'r': this.activateTool('rectangle'); break;
      case 'c': this.activateTool('circle'); break;
      case 'a': this.activateTool('arrow'); break;
      case 'n': this.app.modules.smartboard?.newPage(); break;
      case 'delete':
      case 'backspace':
        this.app.modules.drawing?.clear();
        break;
    }
  }

  activateTool(toolName) {
    const btn = document.querySelector(`.tool-btn[data-tool="${toolName}"]`);
    btn?.click();
  }
}
