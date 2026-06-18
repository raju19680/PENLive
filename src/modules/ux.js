// ============================================================
// PENLIVE - UX Module
// Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.
//
// Handles:
//   - Welcome / onboarding (first-time users)
//   - Keyboard shortcuts overlay (? key)
//   - Right-click context menu
//   - Empty-state hint management
//   - Auto-label form controls for accessibility
//   - Toolbar button grouping / collapsible sections
// ============================================================

export class UXModule {
  constructor(app) {
    this.app = app;
    this.welcomeShown = false;
    this.contextMenu = null;
  }

  async init() {
    // CRITICAL: Ensure [hidden] attribute always hides elements.
    // CSS minifier mangles [hidden] selector, so we enforce via JS.
    const style = document.createElement('style');
    style.textContent = `
      [hidden] { display: none !important; }
      .welcome-overlay[hidden],
      .shortcuts-overlay[hidden],
      .modal[hidden],
      .video-player[hidden],
      .text-input[hidden],
      .floating-panel[hidden],
      .dropzone:not(.active)[hidden],
      .context-menu[hidden],
      .countdown-display[hidden],
      .snipping-overlay[hidden],
      .spotlight-overlay[hidden],
      .magnifier-lens[hidden],
      .panel__tab[hidden] { display: none !important; }
    `;
    document.head.appendChild(style);

    this.bindWelcome();
    this.bindShortcuts();
    this.bindContextMenu();
    this.autoLabelControls();
    this.makeSettingsCollapsible();
    this.trackEmptyState();
    this.maybeShowWelcome();
  }

  // ============================================================
  // WELCOME / ONBOARDING
  // ============================================================

  maybeShowWelcome() {
    const shown = localStorage.getItem('penlive-welcomed');
    if (!shown) {
      setTimeout(() => {
        const overlay = document.getElementById('welcome-overlay');
        if (overlay) overlay.hidden = false;
      }, 800);
    }
  }

  bindWelcome() {
    document.getElementById('welcome-start')?.addEventListener('click', () => this.dismissWelcome(true));
    document.getElementById('welcome-skip')?.addEventListener('click', () => this.dismissWelcome(false));
    document.getElementById('welcome-tour')?.addEventListener('click', () => {
      this.dismissWelcome(true);
      this.startTour();
    });
  }

  dismissWelcome(remember) {
    const overlay = document.getElementById('welcome-overlay');
    if (overlay) overlay.hidden = true;
    if (remember) localStorage.setItem('penlive-welcomed', '1');
    this.welcomeShown = true;
  }

  startTour() {
    const steps = [
      { selector: '.toolbar', title: 'Left Toolbar', text: 'Pick drawing tools here — Pen, Highlighter, Eraser, Shapes, Text, and more.' },
      { selector: '#btn-record', title: 'Record Button', text: 'Click to start screen + webcam + mic recording. Pick quality (720p/1080p/4K) on the right.' },
      { selector: '.panel--right', title: 'Right Panel', text: 'Recording Studio, Audio Mixer, Scenes, Statistics, and Settings — switch via the bottom tabs.' },
      { selector: '#board-canvas', title: 'Canvas', text: 'Draw here! Pick a tool and click anywhere to start. Press ? anytime to see shortcuts.' },
    ];

    let i = 0;
    const next = () => {
      if (i >= steps.length) {
        this.app.toast.show('Tour complete! Start drawing — press ? for shortcuts.', 'success', 5000);
        return;
      }
      const step = steps[i++];
      const el = document.querySelector(step.selector);
      if (el) {
        // Highlight element
        el.style.boxShadow = '0 0 0 4px var(--color-primary), 0 0 24px rgba(26,115,232,0.6)';
        el.style.zIndex = '9999';
        el.style.position = el.style.position || 'relative';
        this.app.toast.show(`${step.title}: ${step.text}`, 'info', 5000);
        setTimeout(() => {
          el.style.boxShadow = '';
          el.style.zIndex = '';
          setTimeout(next, 500);
        }, 4500);
      } else {
        next();
      }
    };
    next();
  }

  // ============================================================
  // KEYBOARD SHORTCUTS OVERLAY
  // ============================================================

  bindShortcuts() {
    document.getElementById('shortcuts-close')?.addEventListener('click', () => {
      document.getElementById('shortcuts-overlay').hidden = true;
    });

    document.getElementById('shortcuts-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'shortcuts-overlay') {
        e.target.hidden = true;
      }
    });

    // ? key shows shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        const tag = e.target.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          e.preventDefault();
          const overlay = document.getElementById('shortcuts-overlay');
          if (overlay) overlay.hidden = !overlay.hidden;
        }
      }
      // Escape closes any overlay
      if (e.key === 'Escape') {
        document.getElementById('shortcuts-overlay').hidden = true;
        document.getElementById('welcome-overlay').hidden = true;
        const ctx = document.getElementById('context-menu');
        if (ctx) ctx.hidden = true;
      }
    });
  }

  // ============================================================
  // CONTEXT MENU (right-click on canvas)
  // ============================================================

  bindContextMenu() {
    const canvas = document.getElementById('board-canvas');
    const menu = document.getElementById('context-menu');
    if (!canvas || !menu) return;

    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showContextMenu(e.clientX, e.clientY);
    });

    // Hide menu on any click outside
    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target)) menu.hidden = true;
    });

    // Wire menu items
    menu.querySelectorAll('.context-menu__item').forEach(item => {
      item.addEventListener('click', () => {
        const action = item.dataset.action;
        this.executeAction(action);
        menu.hidden = true;
      });
    });
  }

  showContextMenu(x, y) {
    const menu = document.getElementById('context-menu');
    if (!menu) return;
    menu.hidden = false;
    menu.style.left = `${Math.min(x, window.innerWidth - 200)}px`;
    menu.style.top = `${Math.min(y, window.innerHeight - 300)}px`;
  }

  executeAction(action) {
    const m = this.app.modules;
    switch (action) {
      case 'undo': m.drawing?.undo(); break;
      case 'redo': m.drawing?.redo(); break;
      case 'pen': document.querySelector('[data-tool=pen]')?.click(); break;
      case 'highlighter': document.querySelector('[data-tool=highlighter]')?.click(); break;
      case 'eraser': document.querySelector('[data-tool=eraser]')?.click(); break;
      case 'text': document.querySelector('[data-tool=text]')?.click(); break;
      case 'screenshot': m.drawing?.screenshot(); break;
      case 'snipping': m.snipping?.start(); break;
      case 'record': m.recEnhancements?.startWithCountdown() || m.recording?.toggle(); break;
      case 'clear': m.drawing?.clear(); break;
      case 'shortcuts': document.getElementById('shortcuts-overlay').hidden = false; break;
    }
  }

  // ============================================================
  // AUTO-LABEL FORM CONTROLS (accessibility)
  // ============================================================

  autoLabelControls() {
    // Find all checkboxes/radios without labels and try to associate them
    const controls = document.querySelectorAll('input[type="checkbox"], input[type="radio"], input[type="range"], select');
    controls.forEach((ctrl, idx) => {
      if (!ctrl.id) {
        // Generate an ID based on nearby text or use index
        const parent = ctrl.closest('label, .switch, .switch-inline, .panel__section');
        const nearbyText = parent?.textContent?.trim().slice(0, 30) || `control-${idx}`;
        const id = `ctrl-${idx}-${nearbyText.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 20)}`;
        ctrl.id = id;
      }
      if (!ctrl.getAttribute('aria-label')) {
        const parent = ctrl.closest('label, .switch, .switch-inline');
        const text = parent?.textContent?.trim();
        if (text) {
          ctrl.setAttribute('aria-label', text.slice(0, 60));
        }
      }
    });

    // Add titles to all buttons without titles
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
      if (!btn.title) {
        const text = btn.textContent?.trim();
        const aria = btn.getAttribute('aria-label');
        if (text) btn.title = text.slice(0, 40);
        else if (aria) btn.title = aria;
      }
    });
  }

  // ============================================================
  // COLLAPSIBLE SETTINGS SECTIONS
  // ============================================================

  makeSettingsCollapsible() {
    // Convert each .panel__section inside settings AND recording tabs into collapsible blocks
    const tabsToCollapse = [
      '.panel__tab[data-tab=settings]',
      '.panel__tab[data-tab=recording]',
      '.panel__tab[data-tab=audio]',
      '.panel__tab[data-tab=scenes]',
    ];

    tabsToCollapse.forEach(selector => {
      const tab = document.querySelector(selector);
      if (!tab) return;
      const sections = tab.querySelectorAll('.panel__section');
      sections.forEach((section, idx) => {
        // Skip if already collapsible
        if (section.parentElement?.classList.contains('collapse-section')) return;

        const label = section.querySelector('.panel__label');
        if (!label) return;
        const title = label.textContent.trim();

        const wrapper = document.createElement('div');
        // First section expanded, rest collapsed
        wrapper.className = 'collapse-section' + (idx === 0 ? '' : ' collapsed');
        wrapper.innerHTML = `
          <div class="collapse-section__header">
            <span>${title}</span>
            <span class="collapse-section__toggle">▼</span>
          </div>
          <div class="collapse-section__body"></div>
        `;
        // Move section's children (except label) into body
        const body = wrapper.querySelector('.collapse-section__body');
        Array.from(section.children).forEach(child => {
          if (child !== label) body.appendChild(child);
        });
        // Replace section with wrapper
        section.parentNode.insertBefore(wrapper, section);
        section.remove();

        // Toggle on header click
        wrapper.querySelector('.collapse-section__header').addEventListener('click', () => {
          wrapper.classList.toggle('collapsed');
        });
      });
    });
  }

  // ============================================================
  // EMPTY-STATE HINT MANAGEMENT
  // ============================================================

  trackEmptyState() {
    const canvas = document.getElementById('board-canvas');
    const hint = document.getElementById('canvas-empty-hint');
    if (!canvas || !hint) return;

    const check = () => {
      try {
        const ctx = canvas.getContext('2d');
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let count = 0;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] > 0) { count++; if (count > 20) break; }
        }
        if (count > 20) hint.classList.add('hidden');
        else hint.classList.remove('hidden');
      } catch (e) {}
    };

    // Check on every mouseup (drawing completes)
    canvas.addEventListener('mouseup', () => setTimeout(check, 100));
    canvas.addEventListener('touchend', () => setTimeout(check, 100));
    document.getElementById('btn-clear')?.addEventListener('click', () => {
      setTimeout(() => hint.classList.remove('hidden'), 200);
    });
    // Initial check after a moment
    setTimeout(check, 1500);
  }
}
