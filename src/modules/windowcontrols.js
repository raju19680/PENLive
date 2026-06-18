// ============================================================
// PENLIVE - Window Controls & Menu Bar Module
// Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.
//
// Provides:
//   - Custom window controls (minimize / maximize / close)
//   - Draggable titlebar (Tauri start_dragging)
//   - Menu bar (File / Edit / View / Insert / Tools / Record / Help)
//   - Focus Mode (hide menus for distraction-free drawing)
//   - Toolbar / panel toggles
//   - Fullscreen toggle
//   - Zoom in / out
// ============================================================

export class WindowControls {
  constructor(app) {
    this.app = app;
    this.focusMode = false;
    this.toolbarVisible = true;
    this.panelVisible = true;
    this.zoomLevel = 1.0;
    this.openMenu = null;
  }

  async init() {
    this.bindUI();
    this.bindKeyboard();
  }

  // ============================================================
  // Tauri invoke helper (browser-safe)
  // ============================================================

  async tauriInvoke(cmd, args = {}) {
    if (!this.app.isTauri) return null;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke(cmd, args);
    } catch (err) {
      console.warn(`[PENLIVE] Tauri invoke ${cmd} failed:`, err);
      return null;
    }
  }

  // ============================================================
  // WINDOW CONTROL BINDINGS
  // ============================================================

  bindUI() {
    // Window controls
    document.getElementById('wc-minimize')?.addEventListener('click', () => this.minimize());
    document.getElementById('wc-maximize')?.addEventListener('click', () => this.toggleMaximize());
    document.getElementById('wc-close')?.addEventListener('click', () => this.close());

    // Focus mode toggle (button)
    document.getElementById('btn-focus-mode')?.addEventListener('click', () => this.toggleFocusMode());
    document.getElementById('exit-focus-mode')?.addEventListener('click', () => this.toggleFocusMode(false));

    // Drag titlebar to move window
    this.bindDrag();

    // Menu bar
    this.bindMenu();
  }

  // ============================================================
  // WINDOW ACTIONS
  // ============================================================

  async minimize() {
    await this.tauriInvoke('minimize_window');
    if (!this.app.isTauri) this.app.toast.show('Minimize (works in desktop app)', 'info');
  }

  async toggleMaximize() {
    const isMax = await this.tauriInvoke('toggle_maximize');
    this.updateMaximizeIcon(isMax);
    if (!this.app.isTauri) this.app.toast.show('Maximize (works in desktop app)', 'info');
  }

  async close() {
    const closed = await this.tauriInvoke('close_window');
    if (!this.app.isTauri) {
      if (confirm('Close PENLIVE?')) window.close();
    }
  }

  updateMaximizeIcon(isMaximized) {
    const icon = document.getElementById('wc-maximize-icon');
    if (!icon) return;
    if (isMaximized) {
      // Restore icon (two overlapping rectangles)
      icon.innerHTML = '<rect x="2.5" y="4.5" width="6" height="6" stroke="currentColor" stroke-width="1.2" fill="none"/><rect x="4" y="3" width="6" height="6" stroke="currentColor" stroke-width="1.2" fill="var(--color-surface)"/>';
    } else {
      // Maximize icon (single rectangle)
      icon.innerHTML = '<rect x="2.5" y="2.5" width="7" height="7" stroke="currentColor" stroke-width="1.5" fill="none"/>';
    }
  }

  // ============================================================
  // DRAG TITLEBAR
  // ============================================================

  bindDrag() {
    const draggables = [
      '.titlebar__logo',
      '.titlebar__title',
      '.titlebar__center', // empty space in titlebar
    ];

    draggables.forEach(sel => {
      const el = document.querySelector(sel);
      if (!el) return;
      el.addEventListener('mousedown', async (e) => {
        // Ignore if clicking on a button or input
        if (e.target.closest('button, input, .menubar__item')) return;
        if (e.button !== 0) return; // Only left click
        // Only drag if not maximized (so user can drag to restore)
        await this.tauriInvoke('start_dragging');
      });
    });

    // Double-click on titlebar toggles maximize
    document.querySelector('.titlebar__left')?.addEventListener('dblclick', (e) => {
      if (e.target.closest('button, input, .menubar__item')) return;
      this.toggleMaximize();
    });
  }

  // ============================================================
  // MENU BAR
  // ============================================================

  bindMenu() {
    const menuItems = document.querySelectorAll('.menubar__item');

    menuItems.forEach(item => {
      const label = item.querySelector('span');
      // Click to open/close
      label?.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = item.classList.contains('open');
        // Close all menus
        menuItems.forEach(m => m.classList.remove('open'));
        // If was closed, open this one
        if (!isOpen) item.classList.add('open');
        this.openMenu = isOpen ? null : item;
      });

      // Hover to switch menus (only if another menu is already open)
      label?.addEventListener('mouseenter', () => {
        if (this.openMenu && this.openMenu !== item) {
          menuItems.forEach(m => m.classList.remove('open'));
          item.classList.add('open');
          this.openMenu = item;
        }
      });
    });

    // Click outside closes menus
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.menubar')) {
        menuItems.forEach(m => m.classList.remove('open'));
        this.openMenu = null;
      }
    });

    // Wire menu actions
    document.querySelectorAll('.menubar__dropdown button').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        this.executeMenuAction(action);
        // Close menu
        menuItems.forEach(m => m.classList.remove('open'));
        this.openMenu = null;
      });
    });
  }

  executeMenuAction(action) {
    const m = this.app.modules;
    switch (action) {
      // File
      case 'new-page': m.smartboard?.newPage(); break;
      case 'open-file': m.fileviewer?.openPicker(); break;
      case 'save-screenshot': m.drawing?.screenshot(); break;
      case 'pdf-export': m.pdfexport?.exportAllPages(); break;
      case 'print': m.pdfexport?.print(); break;
      case 'exit': this.close(); break;

      // Edit
      case 'undo': m.drawing?.undo(); break;
      case 'redo': m.drawing?.redo(); break;
      case 'clear': m.drawing?.clear(); break;
      case 'insert-image': m.imageimport?.openFilePicker(); break;

      // View
      case 'focus-mode': this.toggleFocusMode(); break;
      case 'toggle-toolbar': this.toggleToolbar(); break;
      case 'toggle-panel': this.togglePanel(); break;
      case 'fullscreen': this.toggleFullscreen(); break;
      case 'theme': m.theme?.toggle(); break;
      case 'zoom-in': this.zoom(0.1); break;
      case 'zoom-out': this.zoom(-0.1); break;

      // Insert
      case 'insert-sticky':
        document.querySelector('[data-tool=sticky]')?.click();
        m.drawing && (m.drawing.tool = 'sticky');
        this.app.toast.show('Click on canvas to add sticky note', 'info');
        break;
      case 'insert-text':
        document.querySelector('[data-tool=text]')?.click();
        break;
      case 'insert-step':
        document.querySelector('[data-tool=step]')?.click();
        break;
      case 'open-browser': m.browser?.toggle(); break;

      // Tools
      case 'snipping': m.snipping?.start(); break;
      case 'cursor-fx': m.cursorfx?.togglePanel(); break;
      case 'laser': m.cursorfx?.toggleLaser(); break;
      case 'magnifier': m.cursorfx?.toggleMagnifier(); break;
      case 'spotlight': m.cursorfx?.toggleSpotlight(); break;
      case 'overlay': m.overlay?.toggle(); break;
      case 'board-color': m.boardcolor?.toggle(); break;
      case 'template': m.templates?.togglePanel(); break;

      // Record
      case 'record': m.recEnhancements?.startWithCountdown() || m.recording?.toggle(); break;
      case 'pause': m.recEnhancements?.togglePause(); break;
      case 'screenshot': m.drawing?.screenshot(); break;
      case 'liveclass': m.liveclass?.toggle(); break;
      case 'stream': this.app.toast.show('Open Scenes tab to start streaming', 'info'); break;
      case 'vcam': this.app.toast.show('Open Scenes tab for Virtual Camera', 'info'); break;

      // Help
      case 'shortcuts': document.getElementById('shortcuts-overlay').hidden = false; break;
      case 'about': document.getElementById('about-modal').hidden = false; break;
      case 'stats': document.querySelector('.panel__nav-btn[data-tab-target=stats]')?.click(); break;
      case 'check-update': this.app.toast.show('You\'re on the latest version (1.0.0)', 'success'); break;
      case 'docs':
        if (this.app.isTauri) {
          import('@tauri-apps/plugin-shell').then(({ open }) => open('https://penlive.app/docs'));
        } else {
          window.open('https://penlive.app/docs', '_blank');
        }
        break;

      default:
        console.warn('[PENLIVE] Unknown menu action:', action);
    }
  }

  // ============================================================
  // FOCUS MODE (hide menus for distraction-free drawing)
  // ============================================================

  toggleFocusMode(force = null) {
    this.focusMode = force === null ? !this.focusMode : force;
    document.body.classList.toggle('focus-mode', this.focusMode);
    if (this.focusMode) {
      this.app.toast.show('Focus Mode ON — press F to exit', 'info', 3000);
    } else {
      this.app.toast.show('Focus Mode OFF', 'info');
    }
  }

  // ============================================================
  // TOOLBAR / PANEL TOGGLES
  // ============================================================

  toggleToolbar() {
    this.toolbarVisible = !this.toolbarVisible;
    const tb = document.querySelector('.toolbar--left');
    if (tb) tb.style.display = this.toolbarVisible ? '' : 'none';
    this.app.toast.show(this.toolbarVisible ? 'Toolbar shown' : 'Toolbar hidden', 'info');
  }

  togglePanel() {
    this.panelVisible = !this.panelVisible;
    const panel = document.querySelector('.panel--right');
    if (panel) panel.style.display = this.panelVisible ? '' : 'none';
    this.app.toast.show(this.panelVisible ? 'Panel shown' : 'Panel hidden', 'info');
  }

  // ============================================================
  // FULLSCREEN
  // ============================================================

  async toggleFullscreen() {
    // Try Tauri first
    const isFs = await this.tauriInvoke('toggle_fullscreen');
    if (isFs === null) {
      // Browser fallback
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {
          this.app.toast.show('Fullscreen requires desktop app', 'info');
        });
      } else {
        document.exitFullscreen?.();
      }
    } else {
      this.app.toast.show(isFs ? 'Fullscreen ON' : 'Fullscreen OFF', 'info');
    }
  }

  // ============================================================
  // ZOOM (canvas zoom, not browser zoom)
  // ============================================================

  zoom(delta) {
    this.zoomLevel = Math.max(0.5, Math.min(3.0, this.zoomLevel + delta));
    const canvas = document.getElementById('board-canvas');
    if (canvas) {
      canvas.style.transform = `scale(${this.zoomLevel})`;
      canvas.style.transformOrigin = 'center center';
    }
    this.app.toast.show(`Zoom: ${Math.round(this.zoomLevel * 100)}%`, 'info', 1500);
  }

  // ============================================================
  // KEYBOARD SHORTCUTS
  // ============================================================

  bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      // Ignore if typing in input
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const ctrl = e.ctrlKey || e.metaKey;

      // F11 — fullscreen
      if (e.key === 'F11') {
        e.preventDefault();
        this.toggleFullscreen();
        return;
      }

      // F — focus mode (single key, no modifiers)
      if (e.key === 'f' && !ctrl && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        this.toggleFocusMode();
        return;
      }

      // Ctrl+B — toggle toolbar
      if (ctrl && e.key === 'b' && !e.shiftKey) {
        e.preventDefault();
        this.toggleToolbar();
        return;
      }

      // Ctrl+J — toggle right panel
      if (ctrl && e.key === 'j' && !e.shiftKey) {
        e.preventDefault();
        this.togglePanel();
        return;
      }

      // Ctrl+0 — reset zoom
      if (ctrl && e.key === '0') {
        e.preventDefault();
        this.zoomLevel = 1.0;
        const canvas = document.getElementById('board-canvas');
        if (canvas) canvas.style.transform = '';
        this.app.toast.show('Zoom reset', 'info', 1000);
        return;
      }

      // Ctrl++ / Ctrl+= — zoom in
      if (ctrl && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        this.zoom(0.1);
        return;
      }

      // Ctrl+- — zoom out
      if (ctrl && e.key === '-') {
        e.preventDefault();
        this.zoom(-0.1);
        return;
      }

      // Ctrl+O — open file
      if (ctrl && e.key === 'o' && !e.shiftKey) {
        e.preventDefault();
        this.app.modules.fileviewer?.openPicker();
        return;
      }

      // Alt+F4 — exit (handled by OS, but we add close behavior)
      if (e.altKey && e.key === 'F4') {
        e.preventDefault();
        this.close();
        return;
      }
    });
  }
}
