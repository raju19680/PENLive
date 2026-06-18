// ============================================================
// PENLIVE - Dockable Floating Sidebar Module
// Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.
//
// Transforms the left toolbar and right panel into fully
// dockable, floating panels that can be:
//   - Dragged to any screen edge (left/right/top/bottom)
//   - Set to floating mode (free position anywhere on screen)
//   - Auto-hidden (slides off when not in use, returns on hover)
//   - Pinned/unpinned (toggle auto-hide)
//   - Collapsed to icon-only mode (expands on hover)
//   - Individual tools can be dragged OUT onto canvas as
//     floating buttons that float over the drawing area
// ============================================================

export class DockableSidebar {
  constructor(app) {
    this.app = app;
    this.toolbar = document.querySelector('.toolbar--left');
    this.panel = document.querySelector('.panel--right');
    this.canvasArea = document.getElementById('canvas-area');

    // State
    this.toolbarDock = 'left'; // 'left' | 'right' | 'top' | 'bottom' | 'floating'
    this.panelDock = 'right';
    this.toolbarPinned = true;
    this.panelPinned = true;
    this.toolbarAutoHide = false;
    this.panelAutoHide = false;
    this.toolbarCollapsed = false; // icon-only mode
    this.floatingTools = []; // tools dragged out onto canvas

    // Drag state
    this.dragging = null;
    this.dragOffset = { x: 0, y: 0 };
    this.snapIndicator = null;
  }

  async init() {
    this.loadState();
    this.applyState();
    this.bindDragHeader();
    this.bindPinButtons();
    this.bindAutoHide();
    this.bindToolDragOut();
    this.bindEdgeSnap();
    this.bindContextMenu();
    this.bindKeyboardShortcuts();
  }

  // ============================================================
  // STATE PERSISTENCE
  // ============================================================

  loadState() {
    try {
      const saved = localStorage.getItem('penlive-dockable');
      if (saved) {
        const s = JSON.parse(saved);
        this.toolbarDock = s.toolbarDock || 'left';
        this.panelDock = s.panelDock || 'right';
        this.toolbarPinned = s.toolbarPinned !== false;
        this.panelPinned = s.panelPinned !== false;
        this.toolbarAutoHide = !!s.toolbarAutoHide;
        this.panelAutoHide = !!s.panelAutoHide;
        this.toolbarCollapsed = !!s.toolbarCollapsed;
      }
    } catch (e) {}
  }

  saveState() {
    try {
      localStorage.setItem('penlive-dockable', JSON.stringify({
        toolbarDock: this.toolbarDock,
        panelDock: this.panelDock,
        toolbarPinned: this.toolbarPinned,
        panelPinned: this.panelPinned,
        toolbarAutoHide: this.toolbarAutoHide,
        panelAutoHide: this.panelAutoHide,
        toolbarCollapsed: this.toolbarCollapsed,
      }));
    } catch (e) {}
  }

  // ============================================================
  // APPLY STATE TO DOM
  // ============================================================

  applyState() {
    this.applyToolbarState();
    this.applyPanelState();
  }

  applyToolbarState() {
    if (!this.toolbar) return;

    // Add dockable class for styling
    this.toolbar.classList.add('dockable');
    this.toolbar.classList.remove('dock-left', 'dock-right', 'dock-top', 'dock-bottom', 'dock-floating');
    this.toolbar.classList.add(`dock-${this.toolbarDock}`);

    // Add header if not present
    if (!this.toolbar.querySelector('.dock-header')) {
      this.addHeader(this.toolbar, 'toolbar');
    }

    if (this.toolbarDock === 'floating') {
      this.toolbar.style.position = 'absolute';
      this.toolbar.style.zIndex = '90';
      // Position from saved or default
      const pos = this.getFloatingPosition('toolbar');
      this.toolbar.style.left = pos.x + 'px';
      this.toolbar.style.top = pos.y + 'px';
      this.toolbar.style.right = 'auto';
      this.toolbar.style.bottom = 'auto';
    } else {
      this.toolbar.style.position = '';
      this.toolbar.style.left = '';
      this.toolbar.style.top = '';
      this.toolbar.style.right = '';
      this.toolbar.style.bottom = '';
      this.toolbar.style.zIndex = '';
    }

    // Pinned/auto-hide
    this.toolbar.classList.toggle('auto-hide', this.toolbarAutoHide && !this.toolbarPinned);
    this.toolbar.classList.toggle('collapsed-mode', this.toolbarCollapsed);

    // Update pin button icon
    const pinBtn = this.toolbar.querySelector('.dock-pin');
    if (pinBtn) {
      pinBtn.classList.toggle('pinned', this.toolbarPinned);
      pinBtn.title = this.toolbarPinned ? 'Unpin (auto-hide)' : 'Pin (keep visible)';
    }
  }

  applyPanelState() {
    if (!this.panel) return;
    this.panel.classList.add('dockable');
    this.panel.classList.remove('dock-left', 'dock-right', 'dock-top', 'dock-bottom', 'dock-floating');
    this.panel.classList.add(`dock-${this.panelDock}`);

    if (!this.panel.querySelector('.dock-header')) {
      this.addHeader(this.panel, 'panel');
    }

    if (this.panelDock === 'floating') {
      this.panel.style.position = 'absolute';
      this.panel.style.zIndex = '90';
      const pos = this.getFloatingPosition('panel');
      this.panel.style.left = pos.x + 'px';
      this.panel.style.top = pos.y + 'px';
      this.panel.style.right = 'auto';
      this.panel.style.bottom = 'auto';
    } else {
      this.panel.style.position = '';
      this.panel.style.left = '';
      this.panel.style.top = '';
      this.panel.style.right = '';
      this.panel.style.bottom = '';
      this.panel.style.zIndex = '';
    }

    this.panel.classList.toggle('auto-hide', this.panelAutoHide && !this.panelPinned);

    const pinBtn = this.panel.querySelector('.dock-pin');
    if (pinBtn) {
      pinBtn.classList.toggle('pinned', this.panelPinned);
      pinBtn.title = this.panelPinned ? 'Unpin (auto-hide)' : 'Pin (keep visible)';
    }
  }

  getFloatingPosition(which) {
    const saved = localStorage.getItem(`penlive-float-pos-${which}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    // Default positions
    if (which === 'toolbar') return { x: 100, y: 100 };
    return { x: 400, y: 100 };
  }

  saveFloatingPosition(which, x, y) {
    localStorage.setItem(`penlive-float-pos-${which}`, JSON.stringify({ x, y }));
  }

  // ============================================================
  // HEADER WITH DRAG + PIN + CLOSE
  // ============================================================

  addHeader(el, type) {
    const header = document.createElement('div');
    header.className = 'dock-header';
    header.innerHTML = `
      <div class="dock-header__drag" title="Drag to move / dock to edge">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
          <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
          <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
        </svg>
        <span class="dock-header__title">${type === 'toolbar' ? 'Tools' : 'Panel'}</span>
      </div>
      <div class="dock-header__actions">
        <button class="dock-btn dock-collapse" title="Collapse to icons">
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="4 6 8 10 12 6"/>
          </svg>
        </button>
        <button class="dock-btn dock-pin pinned" title="Pin (keep visible)">
          <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
            <path d="M9.828 0.172a.586.586 0 0 1 .828 0l5.172 5.172a.586.586 0 0 1 0 .828L12 9.172V13l-2 2v-4l-3 3-1-1 3-3H5l2-2h3.828L9.828 0.172z"/>
          </svg>
        </button>
        <button class="dock-btn dock-close" title="Hide (right-click canvas to show)">
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/>
          </svg>
        </button>
      </div>
    `;
    el.insertBefore(header, el.firstChild);

    // Wire collapse button
    header.querySelector('.dock-collapse')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (type === 'toolbar') {
        this.toolbarCollapsed = !this.toolbarCollapsed;
        this.applyToolbarState();
        this.saveState();
      }
    });

    // Wire pin button
    header.querySelector('.dock-pin')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (type === 'toolbar') {
        this.toolbarPinned = !this.toolbarPinned;
        this.applyToolbarState();
        this.saveState();
      } else {
        this.panelPinned = !this.panelPinned;
        this.applyPanelState();
        this.saveState();
      }
    });

    // Wire close button
    header.querySelector('.dock-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      el.classList.add('fully-hidden');
      this.app.toast.show(`${type === 'toolbar' ? 'Toolbar' : 'Panel'} hidden — right-click canvas to restore`, 'info', 4000);
    });
  }

  // ============================================================
  // DRAG TO MOVE / DOCK
  // ============================================================

  bindDragHeader() {
    [this.toolbar, this.panel].forEach(el => {
      if (!el) return;
      const dragHandle = el.querySelector('.dock-header__drag');
      if (!dragHandle) return;

      dragHandle.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return;
        e.preventDefault();
        this.startDrag(el, e);
      });
    });
  }

  startDrag(el, e) {
    this.dragging = el;
    const type = el === this.toolbar ? 'toolbar' : 'panel';
    const rect = el.getBoundingClientRect();
    this.dragOffset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    // Make floating immediately if docked
    if (type === 'toolbar') {
      this.toolbarDock = 'floating';
    } else {
      this.panelDock = 'floating';
    }
    el.classList.remove('dock-left', 'dock-right', 'dock-top', 'dock-bottom');
    el.classList.add('dock-floating');
    el.style.position = 'absolute';
    el.style.zIndex = '200';
    el.style.left = (e.clientX - this.dragOffset.x) + 'px';
    el.style.top = (e.clientY - this.dragOffset.y) + 'px';
    el.style.right = 'auto';
    el.style.bottom = 'auto';

    document.body.style.userSelect = 'none';
    el.classList.add('dragging');

    const onMove = (ev) => this.onDrag(ev);
    const onUp = (ev) => {
      this.endDrag(ev);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  onDrag(e) {
    if (!this.dragging) return;
    const x = e.clientX - this.dragOffset.x;
    const y = e.clientY - this.dragOffset.y;
    this.dragging.style.left = x + 'px';
    this.dragging.style.top = y + 'px';

    // Check for edge snapping
    this.checkEdgeSnap(e.clientX, e.clientY);
  }

  endDrag(e) {
    if (!this.dragging) return;
    const type = this.dragging === this.toolbar ? 'toolbar' : 'panel';
    this.dragging.classList.remove('dragging');
    document.body.style.userSelect = '';

    // Determine if snapped to edge
    const dockPos = this.getEdgeSnap(e.clientX, e.clientY);

    if (dockPos && dockPos !== 'floating') {
      if (type === 'toolbar') {
        this.toolbarDock = dockPos;
      } else {
        this.panelDock = dockPos;
      }
      this.app.toast.show(`Docked to ${dockPos}`, 'success', 1500);
    } else {
      // Save floating position
      if (type === 'toolbar') {
        this.toolbarDock = 'floating';
      } else {
        this.panelDock = 'floating';
      }
      const x = parseInt(this.dragging.style.left, 10);
      const y = parseInt(this.dragging.style.top, 10);
      this.saveFloatingPosition(type, x, y);
      this.app.toast.show('Floating mode', 'info', 1000);
    }

    this.removeSnapIndicator();
    this.dragging = null;
    this.applyState();
    this.saveState();
  }

  // ============================================================
  // EDGE SNAPPING (visual feedback + auto-dock)
  // ============================================================

  bindEdgeSnap() {
    // Just a placeholder — actual snapping happens during drag
  }

  checkEdgeSnap(x, y) {
    const threshold = 30; // px from edge
    const w = window.innerWidth;
    const h = window.innerHeight;
    let snapTo = null;

    if (x < threshold) snapTo = 'left';
    else if (x > w - threshold) snapTo = 'right';
    else if (y < threshold + 48) snapTo = 'top'; // 48 = titlebar height
    else if (y > h - threshold) snapTo = 'bottom';

    if (snapTo) {
      this.showSnapIndicator(snapTo);
    } else {
      this.removeSnapIndicator();
    }
  }

  getEdgeSnap(x, y) {
    const threshold = 30;
    const w = window.innerWidth;
    const h = window.innerHeight;

    if (x < threshold) return 'left';
    if (x > w - threshold) return 'right';
    if (y < threshold + 48) return 'top';
    if (y > h - threshold) return 'bottom';
    return null;
  }

  showSnapIndicator(edge) {
    this.removeSnapIndicator();
    const ind = document.createElement('div');
    ind.className = `snap-indicator snap-${edge}`;
    ind.innerHTML = `<div class="snap-indicator__inner">Dock ${edge}</div>`;
    document.body.appendChild(ind);
    this.snapIndicator = ind;
  }

  removeSnapIndicator() {
    this.snapIndicator?.remove();
    this.snapIndicator = null;
  }

  // ============================================================
  // PIN BUTTONS (already wired in addHeader)
  // ============================================================

  bindPinButtons() {
    // Handled in addHeader
  }

  // ============================================================
  // AUTO-HIDE (slide off when not in use)
  // ============================================================

  bindAutoHide() {
    [this.toolbar, this.panel].forEach(el => {
      if (!el) return;
      el.addEventListener('mouseenter', () => {
        el.classList.add('hovered');
      });
      el.addEventListener('mouseleave', () => {
        el.classList.remove('hovered');
      });
    });
  }

  // ============================================================
  // DRAG TOOLS OUT ONTO CANVAS (floating tool buttons)
  // ============================================================

  bindToolDragOut() {
    if (!this.toolbar) return;
    const tools = this.toolbar.querySelectorAll('.tool-btn');
    tools.forEach(tool => {
      tool.setAttribute('draggable', 'true');

      tool.addEventListener('dragstart', (e) => {
        e.stopPropagation(); // Don't trigger group drag
        this.draggedTool = tool;
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', 'tool:' + (tool.dataset.tool || ''));
      });

      tool.addEventListener('dragend', () => {
        this.draggedTool = null;
      });
    });

    // Drop on canvas
    if (this.canvasArea) {
      this.canvasArea.addEventListener('dragover', (e) => {
        if (this.draggedTool) {
          e.preventDefault();
        }
      });

      this.canvasArea.addEventListener('drop', (e) => {
        if (!this.draggedTool) return;
        e.preventDefault();
        const toolName = this.draggedTool.dataset.tool;
        if (!toolName) return;
        const rect = this.canvasArea.getBoundingClientRect();
        this.createFloatingTool(toolName, e.clientX - rect.left, e.clientY - rect.top);
      });
    }
  }

  createFloatingTool(toolName, x, y) {
    // Don't create duplicates
    if (this.floatingTools.find(t => t.tool === toolName)) {
      this.app.toast.show(`${toolName} already on canvas`, 'info');
      return;
    }

    const original = this.toolbar.querySelector(`[data-tool="${toolName}"]`);
    if (!original) return;

    const float = document.createElement('button');
    float.className = 'floating-tool-btn';
    float.dataset.tool = toolName;
    float.title = `${toolName} (drag to move, double-click to remove)`;
    float.innerHTML = original.innerHTML;
    float.style.left = `${x - 20}px`;
    float.style.top = `${y - 20}px`;

    // Click to activate tool
    float.addEventListener('click', (e) => {
      e.stopPropagation();
      original.click();
    });

    // Drag to reposition
    let dragging = false;
    let offsetX = 0, offsetY = 0;
    float.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      dragging = true;
      offsetX = e.clientX - float.offsetLeft;
      offsetY = e.clientY - float.offsetTop;
      float.style.zIndex = '300';
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const parent = this.canvasArea.getBoundingClientRect();
      let x = e.clientX - parent.left - offsetX;
      let y = e.clientY - parent.top - offsetY;
      x = Math.max(0, Math.min(x, parent.width - 40));
      y = Math.max(0, Math.min(y, parent.height - 40));
      float.style.left = `${x}px`;
      float.style.top = `${y}px`;
    });
    document.addEventListener('mouseup', () => {
      if (dragging) {
        dragging = false;
        float.style.zIndex = '';
      }
    });

    // Double-click to remove
    float.addEventListener('dblclick', () => {
      float.remove();
      this.floatingTools = this.floatingTools.filter(t => t.el !== float);
      this.app.toast.show(`${toolName} removed from canvas`, 'info');
    });

    this.canvasArea.appendChild(float);
    this.floatingTools.push({ tool: toolName, el: float });
    this.app.toast.show(`${toolName} placed on canvas — drag to move, double-click to remove`, 'success', 3000);
  }

  // ============================================================
  // RIGHT-CLICK CONTEXT MENU
  // ============================================================

  bindContextMenu() {
    [this.toolbar, this.panel].forEach(el => {
      if (!el) return;
      const header = el.querySelector('.dock-header');
      header?.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const type = el === this.toolbar ? 'toolbar' : 'panel';
        this.showDockMenu(e.clientX, e.clientY, type);
      });
    });

    // Right-click on canvas to restore hidden toolbar/panel
    this.canvasArea?.addEventListener('contextmenu', (e) => {
      // Check if toolbar/panel is hidden
      const tbHidden = this.toolbar?.classList.contains('fully-hidden');
      const pnHidden = this.panel?.classList.contains('fully-hidden');
      if (tbHidden || pnHidden) {
        e.preventDefault();
        this.showRestoreMenu(e.clientX, e.clientY);
      }
    });
  }

  showDockMenu(x, y, type) {
    document.querySelectorAll('.dock-context-menu').forEach(m => m.remove());
    const current = type === 'toolbar' ? this.toolbarDock : this.panelDock;

    const menu = document.createElement('div');
    menu.className = 'context-menu dock-context-menu';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.innerHTML = `
      <div class="context-menu__header">Dock Position</div>
      <div class="context-menu__item ${current === 'left' ? 'active' : ''}" data-dock="left">
        <span class="context-menu__item-icon">←</span><span>Dock Left</span>
      </div>
      <div class="context-menu__item ${current === 'right' ? 'active' : ''}" data-dock="right">
        <span class="context-menu__item-icon">→</span><span>Dock Right</span>
      </div>
      <div class="context-menu__item ${current === 'top' ? 'active' : ''}" data-dock="top">
        <span class="context-menu__item-icon">↑</span><span>Dock Top</span>
      </div>
      <div class="context-menu__item ${current === 'bottom' ? 'active' : ''}" data-dock="bottom">
        <span class="context-menu__item-icon">↓</span><span>Dock Bottom</span>
      </div>
      <div class="context-menu__item ${current === 'floating' ? 'active' : ''}" data-dock="floating">
        <span class="context-menu__item-icon">⬚</span><span>Floating</span>
      </div>
      <div class="context-menu__separator"></div>
      <div class="context-menu__item" data-action="auto-hide">
        <span class="context-menu__item-icon">${(type === 'toolbar' ? this.toolbarAutoHide : this.panelAutoHide) ? '✓' : '○'}</span>
        <span>Auto-hide on hover away</span>
      </div>
      <div class="context-menu__item" data-action="hide">
        <span class="context-menu__item-icon">✕</span><span>Hide Panel</span>
      </div>
    `;
    document.body.appendChild(menu);

    menu.querySelectorAll('.context-menu__item').forEach(item => {
      item.addEventListener('click', () => {
        if (item.dataset.dock) {
          if (type === 'toolbar') this.toolbarDock = item.dataset.dock;
          else this.panelDock = item.dataset.dock;
          this.applyState();
          this.saveState();
        } else if (item.dataset.action === 'auto-hide') {
          if (type === 'toolbar') this.toolbarAutoHide = !this.toolbarAutoHide;
          else this.panelAutoHide = !this.panelAutoHide;
          this.applyState();
          this.saveState();
        } else if (item.dataset.action === 'hide') {
          if (type === 'toolbar') this.toolbar.classList.add('fully-hidden');
          else this.panel.classList.add('fully-hidden');
        }
        menu.remove();
      });
    });

    setTimeout(() => {
      document.addEventListener('click', function close(e) {
        if (!menu.contains(e.target)) {
          menu.remove();
          document.removeEventListener('click', close);
        }
      });
    }, 100);
  }

  showRestoreMenu(x, y) {
    document.querySelectorAll('.dock-context-menu').forEach(m => m.remove());
    const tbHidden = this.toolbar?.classList.contains('fully-hidden');
    const pnHidden = this.panel?.classList.contains('fully-hidden');

    const menu = document.createElement('div');
    menu.className = 'context-menu dock-context-menu';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.innerHTML = `
      <div class="context-menu__header">Restore Panels</div>
      ${tbHidden ? '<div class="context-menu__item" data-restore="toolbar"><span class="context-menu__item-icon">✓</span><span>Show Toolbar</span></div>' : ''}
      ${pnHidden ? '<div class="context-menu__item" data-restore="panel"><span class="context-menu__item-icon">✓</span><span>Show Panel</span></div>' : ''}
      ${!tbHidden && !pnHidden ? '<div class="context-menu__item"><span>All panels visible</span></div>' : ''}
    `;
    document.body.appendChild(menu);

    menu.querySelectorAll('[data-restore]').forEach(item => {
      item.addEventListener('click', () => {
        if (item.dataset.restore === 'toolbar') this.toolbar?.classList.remove('fully-hidden');
        if (item.dataset.restore === 'panel') this.panel?.classList.remove('fully-hidden');
        menu.remove();
      });
    });

    setTimeout(() => {
      document.addEventListener('click', function close(e) {
        if (!menu.contains(e.target)) {
          menu.remove();
          document.removeEventListener('click', close);
        }
      });
    }, 100);
  }

  // ============================================================
  // KEYBOARD SHORTCUTS
  // ============================================================

  bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const ctrl = e.ctrlKey || e.metaKey;

      // Ctrl+Shift+L — toggle toolbar visibility
      if (ctrl && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        this.toolbar?.classList.toggle('fully-hidden');
        this.app.toast.show('Toolbar toggled', 'info');
      }

      // Ctrl+Shift+P — toggle panel visibility
      if (ctrl && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        this.panel?.classList.toggle('fully-hidden');
        this.app.toast.show('Panel toggled', 'info');
      }
    });
  }
}
