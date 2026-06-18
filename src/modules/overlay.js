// ============================================================
// PENLIVE - Overlay Mode (Epic Pen style)
// Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.
//
// Toggles the application into a transparent overlay mode where
// the user can draw on top of any other application's window.
// Uses Tauri's window transparency + always-on-top.
// ============================================================

export class OverlayMode {
  constructor(app) {
    this.app = app;
    this.active = false;
  }

  async init() {
    // For overlay windows spawned via Rust, just attach the floating toolbar
    if (this.app.isOverlayMode) {
      this.injectFloatingToolbar();
    }
  }

  async toggle() {
    if (this.app.isOverlayMode) {
      // Can't toggle from inside an overlay window — close it
      window.close();
      return;
    }

    if (this.active) {
      this.exitOverlay();
    } else {
      await this.enterOverlay();
    }
  }

  async enterOverlay() {
    this.active = true;

    if (this.app.isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const monitorIdx = parseInt(document.getElementById('monitor-select')?.value || '0', 10);
        await invoke('open_overlay_window', { monitorIndex: monitorIdx });
        this.app.toast.show('Overlay window opened on monitor — draw on any app!', 'success', 4000);
      } catch (err) {
        this.app.toast.show(`Overlay failed: ${err.message}`, 'error');
        this.fallbackBrowserOverlay();
      }
    } else {
      this.fallbackBrowserOverlay();
    }
  }

  fallbackBrowserOverlay() {
    // Browser fallback: just make the canvas background transparent
    document.body.dataset.mode = 'overlay';
    this.injectFloatingToolbar();
    this.app.toast.show('Browser overlay mode (limited) — press Esc to exit', 'info', 4000);
  }

  async exitOverlay() {
    this.active = false;
    if (this.app.isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('close_overlay_windows');
        this.app.toast.show('Overlay mode closed', 'info');
      } catch (err) {
        console.error(err);
      }
    } else {
      document.body.dataset.mode = 'main';
      document.querySelector('.overlay-floating-toolbar')?.remove();
      document.querySelector('.overlay-hint')?.remove();
    }
  }

  injectFloatingToolbar() {
    // Avoid double-injection
    if (document.querySelector('.overlay-floating-toolbar')) return;

    const tb = document.createElement('div');
    tb.className = 'overlay-floating-toolbar';
    tb.innerHTML = `
      <button data-tool="pen" class="active" title="Pen">✏️</button>
      <button data-tool="highlighter" title="Highlighter">🖍️</button>
      <button data-tool="eraser" title="Eraser">🧽</button>
      <div class="divider"></div>
      <input type="color" id="overlay-color" value="#e8392f" />
      <div class="divider"></div>
      <button id="overlay-clear" title="Clear">🗑️</button>
      <button id="overlay-exit" title="Exit Overlay">✕</button>
    `;
    document.body.appendChild(tb);

    const hint = document.createElement('div');
    hint.className = 'overlay-hint';
    hint.textContent = 'Click-through OFF · Press Esc to exit · © Er. Raju Kumawat';
    document.body.appendChild(hint);

    // Wire tool buttons
    tb.querySelectorAll('button[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        tb.querySelectorAll('button[data-tool]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.app.modules.drawing.tool = btn.dataset.tool;
        this.app.modules.drawing.color = document.getElementById('overlay-color').value;
      });
    });

    document.getElementById('overlay-color')?.addEventListener('input', (e) => {
      this.app.modules.drawing.color = e.target.value;
    });

    document.getElementById('overlay-clear')?.addEventListener('click', () => {
      this.app.modules.drawing.clear();
    });

    document.getElementById('overlay-exit')?.addEventListener('click', () => {
      window.close();
    });
  }
}
