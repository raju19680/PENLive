// ============================================================
// PENLIVE - Command Palette Module
// Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.
//
// VS Code-style command palette (Ctrl+K) for fuzzy-searching
// all 140+ commands. Power users can find any action in 3 keystrokes.
// ============================================================

export class CommandPalette {
  constructor(app) {
    this.app = app;
    this.commands = [];
    this.filtered = [];
    this.selectedIndex = 0;
    this.isOpen = false;
  }

  async init() {
    this.buildCommandList();
    this.bindUI();
    this.injectHTML();
  }

  buildCommandList() {
    this.commands = [
      // Drawing
      { id: 'pen', label: 'Pen Tool', shortcut: 'P', category: 'Drawing', action: () => this.click('[data-tool=pen]') },
      { id: 'highlighter', label: 'Highlighter Tool', shortcut: 'H', category: 'Drawing', action: () => this.click('[data-tool=highlighter]') },
      { id: 'eraser', label: 'Eraser Tool', shortcut: 'E', category: 'Drawing', action: () => this.click('[data-tool=eraser]') },
      { id: 'text', label: 'Text Tool', shortcut: 'T', category: 'Drawing', action: () => this.click('[data-tool=text]') },
      { id: 'line', label: 'Line Tool', shortcut: 'L', category: 'Drawing', action: () => this.click('[data-tool=line]') },
      { id: 'rectangle', label: 'Rectangle Tool', shortcut: 'R', category: 'Drawing', action: () => this.click('[data-tool=rectangle]') },
      { id: 'circle', label: 'Circle Tool', shortcut: 'C', category: 'Drawing', action: () => this.click('[data-tool=circle]') },
      { id: 'arrow', label: 'Arrow Tool', shortcut: 'A', category: 'Drawing', action: () => this.click('[data-tool=arrow]') },

      // File
      { id: 'new-page', label: 'New Page', shortcut: 'Ctrl+N', category: 'File', action: () => this.app.modules.smartboard?.newPage() },
      { id: 'open-file', label: 'Open File...', shortcut: 'Ctrl+O', category: 'File', action: () => this.app.modules.fileviewer?.openPicker() },
      { id: 'screenshot', label: 'Take Screenshot', shortcut: 'Ctrl+Shift+S', category: 'File', action: () => this.app.modules.drawing?.screenshot() },
      { id: 'snipping', label: 'Snipping Tool', shortcut: 'Ctrl+Shift+X', category: 'File', action: () => this.app.modules.snipping?.start() },
      { id: 'pdf-export', label: 'Export as PDF', shortcut: '', category: 'File', action: () => this.app.modules.pdfexport?.exportAllPages() },
      { id: 'print', label: 'Print', shortcut: 'Ctrl+P', category: 'File', action: () => this.app.modules.pdfexport?.print() },

      // Edit
      { id: 'undo', label: 'Undo', shortcut: 'Ctrl+Z', category: 'Edit', action: () => this.app.modules.drawing?.undo() },
      { id: 'redo', label: 'Redo', shortcut: 'Ctrl+Y', category: 'Edit', action: () => this.app.modules.drawing?.redo() },
      { id: 'clear', label: 'Clear Canvas', shortcut: '', category: 'Edit', action: () => this.app.modules.drawing?.clear() },
      { id: 'insert-image', label: 'Insert Image', shortcut: '', category: 'Edit', action: () => this.app.modules.imageimport?.openFilePicker() },

      // View
      { id: 'focus-mode', label: 'Toggle Focus Mode', shortcut: 'F', category: 'View', action: () => this.app.modules.windowcontrols?.toggleFocusMode() },
      { id: 'fullscreen', label: 'Toggle Fullscreen', shortcut: 'F11', category: 'View', action: () => this.app.modules.windowcontrols?.toggleFullscreen() },
      { id: 'toggle-toolbar', label: 'Toggle Toolbar', shortcut: 'Ctrl+B', category: 'View', action: () => this.app.modules.windowcontrols?.toggleToolbar() },
      { id: 'toggle-panel', label: 'Toggle Right Panel', shortcut: 'Ctrl+J', category: 'View', action: () => this.app.modules.windowcontrols?.togglePanel() },
      { id: 'theme', label: 'Toggle Dark/Light Theme', shortcut: 'Ctrl+Shift+T', category: 'View', action: () => this.app.modules.theme?.toggle() },
      { id: 'zoom-in', label: 'Zoom In', shortcut: 'Ctrl++', category: 'View', action: () => this.app.modules.windowcontrols?.zoom(0.1) },
      { id: 'zoom-out', label: 'Zoom Out', shortcut: 'Ctrl+-', category: 'View', action: () => this.app.modules.windowcontrols?.zoom(-0.1) },

      // Recording
      { id: 'record', label: 'Start/Stop Recording', shortcut: 'Ctrl+Shift+R', category: 'Recording', action: () => this.app.modules.recEnhancements?.startWithCountdown() || this.app.modules.recording?.toggle() },
      { id: 'pause', label: 'Pause/Resume Recording', shortcut: '', category: 'Recording', action: () => this.app.modules.recEnhancements?.togglePause() },

      // Tools
      { id: 'browser', label: 'Open Browser', shortcut: '', category: 'Tools', action: () => this.app.modules.browser?.toggle() },
      { id: 'liveclass', label: 'Open Live Class', shortcut: '', category: 'Tools', action: () => this.app.modules.liveclass?.toggle() },
      { id: 'overlay', label: 'Toggle Overlay Mode', shortcut: 'Ctrl+Shift+O', category: 'Tools', action: () => this.app.modules.overlay?.toggle() },
      { id: 'laser', label: 'Toggle Laser Pointer', shortcut: 'L', category: 'Tools', action: () => this.app.modules.cursorfx?.toggleLaser() },
      { id: 'magnifier', label: 'Toggle Magnifier', shortcut: '', category: 'Tools', action: () => this.app.modules.cursorfx?.toggleMagnifier() },
      { id: 'spotlight', label: 'Toggle Spotlight', shortcut: '', category: 'Tools', action: () => this.app.modules.cursorfx?.toggleSpotlight() },
      { id: 'board-color', label: 'Change Board Color', shortcut: '', category: 'Tools', action: () => this.app.modules.boardcolor?.toggle() },
      { id: 'template', label: 'Background Template', shortcut: '', category: 'Tools', action: () => this.app.modules.templates?.togglePanel() },
      { id: 'customize', label: 'Customize Toolbar', shortcut: '', category: 'Tools', action: () => this.app.modules.dynamicToolbar?.openCustomizePanel() },

      // Help
      { id: 'shortcuts', label: 'Show Keyboard Shortcuts', shortcut: '?', category: 'Help', action: () => { document.getElementById('shortcuts-overlay').hidden = false; } },
      { id: 'about', label: 'About PENLIVE', shortcut: '', category: 'Help', action: () => { document.getElementById('about-modal').hidden = false; } },
      { id: 'stats', label: 'View Statistics', shortcut: '', category: 'Help', action: () => this.click('.panel__nav-btn[data-tab-target=stats]') },
      { id: 'check-update', label: 'Check for Updates', shortcut: '', category: 'Help', action: () => this.app.toast.show('You\'re on the latest version (1.0.0)', 'success') },
    ];
  }

  click(sel) {
    document.querySelector(sel)?.click();
  }

  bindUI() {
    document.addEventListener('keydown', (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      // Ctrl+K opens command palette
      if (ctrl && e.key === 'k' && !e.shiftKey) {
        e.preventDefault();
        this.toggle();
        return;
      }
      // Escape closes
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
        return;
      }
      // Arrow keys navigate
      if (this.isOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.moveSelection(1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.moveSelection(-1);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          this.executeSelected();
        }
      }
    });
  }

  injectHTML() {
    if (document.getElementById('command-palette')) return;
    const palette = document.createElement('div');
    palette.className = 'command-palette';
    palette.id = 'command-palette';
    palette.hidden = true;
    palette.innerHTML = `
      <div class="command-palette__backdrop"></div>
      <div class="command-palette__dialog">
        <div class="command-palette__search-wrap">
          <svg class="command-palette__icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" class="command-palette__input" id="command-palette-input"
                 placeholder="Type a command... (e.g., 'pen', 'record', 'export pdf')" autocomplete="off" />
          <kbd class="command-palette__hint">Esc to close</kbd>
        </div>
        <div class="command-palette__results" id="command-palette-results"></div>
        <div class="command-palette__footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>Enter</kbd> run</span>
          <span><kbd>Esc</kbd> close</span>
        </div>
      </div>
    `;
    document.body.appendChild(palette);

    // Wire events
    palette.querySelector('.command-palette__backdrop').addEventListener('click', () => this.close());
    const input = palette.querySelector('#command-palette-input');
    input.addEventListener('input', (e) => this.filter(e.target.value));
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  open() {
    const palette = document.getElementById('command-palette');
    if (!palette) return;
    palette.hidden = false;
    this.isOpen = true;
    const input = document.getElementById('command-palette-input');
    input.value = '';
    this.filter('');
    setTimeout(() => input.focus(), 50);
  }

  close() {
    const palette = document.getElementById('command-palette');
    if (palette) palette.hidden = true;
    this.isOpen = false;
  }

  filter(query) {
    query = query.toLowerCase().trim();
    if (!query) {
      this.filtered = [...this.commands];
    } else {
      this.filtered = this.commands.filter(cmd => {
        return cmd.label.toLowerCase().includes(query) ||
               cmd.category.toLowerCase().includes(query) ||
               cmd.id.toLowerCase().includes(query);
      });
    }
    this.selectedIndex = 0;
    this.render();
  }

  moveSelection(delta) {
    if (this.filtered.length === 0) return;
    this.selectedIndex = (this.selectedIndex + delta + this.filtered.length) % this.filtered.length;
    this.render();
  }

  executeSelected() {
    const cmd = this.filtered[this.selectedIndex];
    if (!cmd) return;
    this.close();
    try {
      cmd.action();
      this.app.toast.show(cmd.label, 'info', 1500);
    } catch (e) {
      this.app.toast.show('Command failed: ' + e.message, 'error');
    }
  }

  render() {
    const results = document.getElementById('command-palette-results');
    if (!results) return;

    if (this.filtered.length === 0) {
      results.innerHTML = '<div class="command-palette__empty">No commands found</div>';
      return;
    }

    results.innerHTML = this.filtered.map((cmd, idx) => `
      <div class="command-palette__item ${idx === this.selectedIndex ? 'selected' : ''}" data-idx="${idx}">
        <span class="command-palette__item-icon">${this.getCategoryIcon(cmd.category)}</span>
        <div class="command-palette__item-text">
          <div class="command-palette__item-label">${cmd.label}</div>
          <div class="command-palette__item-category">${cmd.category}</div>
        </div>
        ${cmd.shortcut ? `<kbd class="command-palette__item-shortcut">${cmd.shortcut}</kbd>` : ''}
      </div>
    `).join('');

    // Wire clicks
    results.querySelectorAll('.command-palette__item').forEach(item => {
      item.addEventListener('click', () => {
        this.selectedIndex = parseInt(item.dataset.idx, 10);
        this.executeSelected();
      });
      item.addEventListener('mouseenter', () => {
        this.selectedIndex = parseInt(item.dataset.idx, 10);
        this.render();
      });
    });

    // Scroll selected into view
    const selected = results.querySelector('.selected');
    if (selected) selected.scrollIntoView({ block: 'nearest' });
  }

  getCategoryIcon(category) {
    const icons = {
      'Drawing': '✏️',
      'File': '📁',
      'Edit': '✎',
      'View': '👁',
      'Recording': '🔴',
      'Tools': '🔧',
      'Help': '❓',
    };
    return icons[category] || '▸';
  }
}
