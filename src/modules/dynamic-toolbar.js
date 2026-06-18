// ============================================================
// PENLIVE - Dynamic Toolbar Module
// Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.
//
// Makes the left toolbar fully dynamic:
//   - Tool groups can be collapsed/expanded (click label)
//   - Groups can be reordered via drag-and-drop
//   - Individual tools can be hidden/shown via Customize panel
//   - Layout persists to localStorage
//   - Right-click context menu on group labels
//   - Bottom toolbar items also drag-and-drop + customizable
// ============================================================

export class DynamicToolbar {
  constructor(app) {
    this.app = app;
    this.toolbar = document.querySelector('.toolbar--left');
    this.bottomToolbar = document.getElementById('bottom-toolbar');
    this.customizePanel = null;
    this.layout = this.loadLayout();
    this.draggedItem = null;
    this.draggedType = null; // 'group' | 'bottom-btn'
  }

  async init() {
    if (!this.toolbar) return;
    this.applyLayout();
    this.bindGroupToggles();
    this.bindDragAndDrop();
    this.bindContextMenu();
    this.bindCustomizePanel();
    this.bindBottomToolbarDrag();
    this.bindResetButton();
    // Re-apply layout when sections change
    this.observeChanges();
  }

  observeChanges() {
    // If sections are added/removed, re-bind events
    const observer = new MutationObserver(() => {
      // Don't recurse — just re-add collapse indicators if missing
      this.toolbar.querySelectorAll('.toolbar__group-label').forEach(label => {
        if (!label.querySelector('.group-collapse-icon')) {
          this.addCollapseIndicator(label);
        }
      });
    });
    observer.observe(this.toolbar, { childList: true, subtree: false });
  }

  // ============================================================
  // LAYOUT PERSISTENCE
  // ============================================================

  defaultLayout() {
    return {
      groups: ['draw', 'shapes', 'text', 'edit', 'colors', 'size'],
      hidden: {}, // { groupName: true }
      hiddenTools: {}, // { toolName: true }
      bottomOrder: ['browser', 'liveclass', 'open-file', 'board-color', 'webcam-pip', 'snapshot', 'fullscreen'],
      hiddenBottom: {}, // { btnId: true }
    };
  }

  loadLayout() {
    try {
      const saved = localStorage.getItem('penlive-toolbar-layout');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults so new groups appear
        const def = this.defaultLayout();
        return { ...def, ...parsed };
      }
    } catch (e) {}
    return this.defaultLayout();
  }

  saveLayout() {
    try {
      localStorage.setItem('penlive-toolbar-layout', JSON.stringify(this.layout));
    } catch (e) {}
  }

  applyLayout() {
    // Reorder groups in DOM based on layout.groups
    if (!this.toolbar) return;
    const sections = Array.from(this.toolbar.querySelectorAll('.toolbar__section'));
    const sectionMap = {};
    sections.forEach(s => {
      const labelEl = s.querySelector('.toolbar__group-label');
      const label = labelEl?.textContent?.replace(/[▼▶]/g, '').trim().toLowerCase();
      if (label) sectionMap[label] = s;
    });

    // Detach sections and dividers (but keep customize-btn and other elements)
    const customizeBtn = this.toolbar.querySelector('.customize-btn');
    sections.forEach(s => s.remove());
    this.toolbar.querySelectorAll('.tool-divider').forEach(d => d.remove());

    // Find the insertion point (before customize-btn if exists, else at end)
    const insertBefore = customizeBtn || null;

    this.layout.groups.forEach((groupName, idx) => {
      const section = sectionMap[groupName];
      if (section) {
        // Apply hidden state
        if (this.layout.hidden[groupName]) {
          section.classList.add('group-hidden');
        } else {
          section.classList.remove('group-hidden');
        }

        // Apply hidden tools within group
        const tools = section.querySelectorAll('.tool-btn, .swatch');
        tools.forEach(t => {
          const toolName = t.dataset.tool || t.dataset.color || '';
          if (toolName && this.layout.hiddenTools[toolName]) {
            t.style.display = 'none';
          } else {
            t.style.display = '';
          }
        });

        // Insert before customize button (or at end)
        if (insertBefore) {
          this.toolbar.insertBefore(section, insertBefore);
        } else {
          this.toolbar.appendChild(section);
        }

        // Add divider after (except for last)
        if (idx < this.layout.groups.length - 1) {
          const divider = document.createElement('div');
          divider.className = 'tool-divider';
          if (insertBefore) {
            this.toolbar.insertBefore(divider, insertBefore);
          } else {
            this.toolbar.appendChild(divider);
          }
        }
      }
    });

    // Apply bottom toolbar order
    if (this.bottomToolbar) {
      const btns = Array.from(this.bottomToolbar.querySelectorAll('.btb-btn, .btb-divider, .btb-info'));
      const btnMap = {};
      btns.forEach(b => {
        const id = b.id?.replace('btb-', '');
        if (id) btnMap[id] = b;
      });
      // Re-append in correct order
      const info = this.bottomToolbar.querySelector('.btb-info');
      this.layout.bottomOrder.forEach(btnId => {
        const btn = btnMap[btnId];
        if (btn) {
          if (this.layout.hiddenBottom[btnId]) {
            btn.style.display = 'none';
          } else {
            btn.style.display = '';
          }
          this.bottomToolbar.insertBefore(btn, info);
        }
      });
    }
  }

  // ============================================================
  // GROUP COLLAPSE / EXPAND
  // ============================================================

  bindGroupToggles() {
    if (!this.toolbar) return;
    // Use event delegation so it works even after sections are re-attached
    this.toolbar.addEventListener('click', (e) => {
      const label = e.target.closest('.toolbar__group-label');
      if (!label) return;
      e.stopPropagation();
      const section = label.closest('.toolbar__section');
      if (section) this.toggleGroup(section);
    });

    // Add collapse indicators to all existing labels
    this.toolbar.querySelectorAll('.toolbar__group-label').forEach(label => {
      this.addCollapseIndicator(label);
    });
  }

  addCollapseIndicator(label) {
    if (label.querySelector('.group-collapse-icon')) return;
    const icon = document.createElement('span');
    icon.className = 'group-collapse-icon';
    icon.textContent = '▼';
    label.appendChild(icon);

    const groupName = label.textContent.replace('▼', '').trim().toLowerCase();
    const section = label.closest('.toolbar__section');
    if (section && this.layout.hidden[groupName]) {
      section.classList.add('collapsed');
      icon.textContent = '▶';
    }
  }

  toggleGroup(section) {
    const label = section.querySelector('.toolbar__group-label');
    if (!label) return;
    const groupName = label.textContent.replace('▼', '').replace('▶', '').trim().toLowerCase();
    const icon = label.querySelector('.group-collapse-icon');

    section.classList.toggle('collapsed');
    const isCollapsed = section.classList.contains('collapsed');

    if (icon) icon.textContent = isCollapsed ? '▶' : '▼';

    // Persist
    this.layout.hidden[groupName] = isCollapsed;
    this.saveLayout();
  }

  // ============================================================
  // DRAG-AND-DROP GROUP REORDERING
  // ============================================================

  bindDragAndDrop() {
    if (!this.toolbar) return;
    this.rebindDragHandlers();

    // Re-bind when sections change
    const observer = new MutationObserver(() => this.rebindDragHandlers());
    observer.observe(this.toolbar, { childList: true });
  }

  rebindDragHandlers() {
    const labels = this.toolbar.querySelectorAll('.toolbar__group-label');
    labels.forEach(label => {
      if (label.dataset.dragBound === '1') return;
      label.dataset.dragBound = '1';
      label.setAttribute('draggable', 'true');

      label.addEventListener('dragstart', (e) => {
        const section = label.closest('.toolbar__section');
        this.draggedItem = section;
        this.draggedType = 'group';
        section.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', 'group');
      });

      label.addEventListener('dragend', () => {
        if (this.draggedItem) this.draggedItem.classList.remove('dragging');
        this.draggedItem = null;
        this.draggedType = null;
        this.toolbar.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(el => {
          el.classList.remove('drag-over-top', 'drag-over-bottom');
        });
      });
    });

    // Make sections drop targets
    const sections = this.toolbar.querySelectorAll('.toolbar__section');
    sections.forEach(section => {
      if (section.dataset.dropBound === '1') return;
      section.dataset.dropBound = '1';

      section.addEventListener('dragover', (e) => {
        if (this.draggedType !== 'group') return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const rect = section.getBoundingClientRect();
        const middle = rect.top + rect.height / 2;
        section.classList.remove('drag-over-top', 'drag-over-bottom');
        if (e.clientY < middle) {
          section.classList.add('drag-over-top');
        } else {
          section.classList.add('drag-over-bottom');
        }
      });

      section.addEventListener('dragleave', () => {
        section.classList.remove('drag-over-top', 'drag-over-bottom');
      });

      section.addEventListener('drop', (e) => {
        e.preventDefault();
        if (this.draggedType !== 'group' || !this.draggedItem) return;
        const rect = section.getBoundingClientRect();
        const middle = rect.top + rect.height / 2;
        const insertBefore = e.clientY < middle;

        if (insertBefore) {
          this.toolbar.insertBefore(this.draggedItem, section);
        } else {
          this.toolbar.insertBefore(this.draggedItem, section.nextSibling);
        }
        this.refreshDividers();
        this.saveGroupOrder();

        section.classList.remove('drag-over-top', 'drag-over-bottom');
      });
    });
  }

  refreshDividers() {
    // Remove all existing dividers
    this.toolbar.querySelectorAll('.tool-divider').forEach(d => d.remove());
    // Re-add between sections
    const sections = Array.from(this.toolbar.querySelectorAll('.toolbar__section'));
    sections.forEach((s, idx) => {
      if (idx < sections.length - 1) {
        const divider = document.createElement('div');
        divider.className = 'tool-divider';
        this.toolbar.insertBefore(divider, s.nextSibling);
      }
    });
  }

  saveGroupOrder() {
    const sections = Array.from(this.toolbar.querySelectorAll('.toolbar__section'));
    this.layout.groups = sections.map(s =>
      s.querySelector('.toolbar__group-label')?.textContent.replace('▼', '').replace('▶', '').trim().toLowerCase()
    ).filter(Boolean);
    this.saveLayout();
  }

  // ============================================================
  // RIGHT-CLICK CONTEXT MENU ON GROUP LABELS
  // ============================================================

  bindContextMenu() {
    if (!this.toolbar) return;
    // Use event delegation for right-click
    this.toolbar.addEventListener('contextmenu', (e) => {
      const label = e.target.closest('.toolbar__group-label');
      if (!label) return;
      e.preventDefault();
      const section = label.closest('.toolbar__section');
      const groupName = label.textContent.replace(/[▼▶]/g, '').trim().toLowerCase();
      this.showGroupContextMenu(e.clientX, e.clientY, section, groupName);
    });
  }

  showGroupContextMenu(x, y, section, groupName) {
    // Remove any existing context menu
    document.querySelectorAll('.group-context-menu').forEach(m => m.remove());

    const menu = document.createElement('div');
    menu.className = 'context-menu group-context-menu';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    const isHidden = section.classList.contains('group-hidden');

    menu.innerHTML = `
      <div class="context-menu__header">${groupName.toUpperCase()} Group</div>
      <div class="context-menu__item" data-action="toggle-collapse">
        <span class="context-menu__item-icon">${section.classList.contains('collapsed') ? '▶' : '▼'}</span>
        <span>${section.classList.contains('collapsed') ? 'Expand' : 'Collapse'}</span>
      </div>
      <div class="context-menu__item" data-action="hide">
        <span class="context-menu__item-icon">👁</span>
        <span>${isHidden ? 'Show Group' : 'Hide Group'}</span>
      </div>
      <div class="context-menu__separator"></div>
      <div class="context-menu__item" data-action="move-top">
        <span class="context-menu__item-icon">⬆</span>
        <span>Move to Top</span>
      </div>
      <div class="context-menu__item" data-action="move-bottom">
        <span class="context-menu__item-icon">⬇</span>
        <span>Move to Bottom</span>
      </div>
      <div class="context-menu__separator"></div>
      <div class="context-menu__item" data-action="customize">
        <span class="context-menu__item-icon">⚙</span>
        <span>Customize Tools...</span>
      </div>
      <div class="context-menu__item" data-action="reset">
        <span class="context-menu__item-icon">↺</span>
        <span>Reset Layout</span>
      </div>
    `;

    document.body.appendChild(menu);

    // Wire actions
    menu.querySelectorAll('.context-menu__item').forEach(item => {
      item.addEventListener('click', () => {
        const action = item.dataset.action;
        this.executeGroupAction(action, section, groupName);
        menu.remove();
      });
    });

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', function closeMenu(e) {
        if (!menu.contains(e.target)) {
          menu.remove();
          document.removeEventListener('click', closeMenu);
        }
      });
    }, 100);
  }

  executeGroupAction(action, section, groupName) {
    switch (action) {
      case 'toggle-collapse':
        this.toggleGroup(section);
        break;
      case 'hide':
        section.classList.toggle('group-hidden');
        this.layout.hidden[groupName] = section.classList.contains('group-hidden');
        this.saveLayout();
        this.app.toast.show(`${groupName} ${this.layout.hidden[groupName] ? 'hidden' : 'shown'}`, 'info');
        break;
      case 'move-top':
        this.toolbar.insertBefore(section, this.toolbar.firstChild);
        this.refreshDividers();
        this.saveGroupOrder();
        this.app.toast.show(`${groupName} moved to top`, 'info');
        break;
      case 'move-bottom':
        this.toolbar.appendChild(section);
        this.refreshDividers();
        this.saveGroupOrder();
        this.app.toast.show(`${groupName} moved to bottom`, 'info');
        break;
      case 'customize':
        this.openCustomizePanel();
        break;
      case 'reset':
        if (confirm('Reset toolbar layout to default?')) {
          this.layout = this.defaultLayout();
          this.saveLayout();
          location.reload();
        }
        break;
    }
  }

  // ============================================================
  // CUSTOMIZE PANEL (show/hide groups & individual tools)
  // ============================================================

  bindCustomizePanel() {
    // Add a "Customize" button at the bottom of toolbar
    if (!this.toolbar) return;
    const customizeBtn = document.createElement('button');
    customizeBtn.className = 'tool-btn customize-btn';
    customizeBtn.title = 'Customize Toolbar';
    customizeBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1m17.5-6.5L15 7m-6 6l-3.5 3.5M19.5 19.5L16 16m-7-7L5.5 5.5"/>
      </svg>
    `;
    customizeBtn.addEventListener('click', () => this.openCustomizePanel());
    this.toolbar.appendChild(customizeBtn);
  }

  openCustomizePanel() {
    // Remove existing
    document.getElementById('customize-panel')?.remove();

    const panel = document.createElement('div');
    panel.className = 'floating-panel customize-panel';
    panel.id = 'customize-panel';
    panel.innerHTML = `
      <h4>⚙️ Customize Toolbar</h4>
      <p class="hint-text">Drag groups to reorder · Toggle to show/hide</p>

      <div class="customize-section">
        <strong>Tool Groups</strong>
        <div class="customize-list" id="customize-groups"></div>
      </div>

      <div class="customize-section">
        <strong>Individual Tools</strong>
        <div class="customize-list" id="customize-tools"></div>
      </div>

      <div class="customize-section">
        <strong>Bottom Bar Items</strong>
        <div class="customize-list" id="customize-bottom"></div>
      </div>

      <div class="customize-actions">
        <button class="record-btn" id="customize-reset" style="background: var(--color-danger); padding: 6px;">Reset All</button>
        <button class="record-btn" id="customize-done" style="background: var(--color-primary); padding: 6px;">Done</button>
      </div>
    `;

    document.body.appendChild(panel);
    this.renderCustomizeList();
    this.bindCustomizePanelActions();
  }

  renderCustomizeList() {
    const groupsContainer = document.getElementById('customize-groups');
    if (!groupsContainer) return;

    const groupLabels = {
      'draw': '✏️ Draw',
      'shapes': '▭ Shapes',
      'text': 'T Text',
      'edit': '✎ Edit',
      'colors': '🎨 Colors',
      'size': '⚙ Size',
    };

    groupsContainer.innerHTML = this.layout.groups.map(g => `
      <label class="customize-item">
        <input type="checkbox" data-group="${g}" ${this.layout.hidden[g] ? '' : 'checked'} />
        <span class="customize-drag">⠿</span>
        <span>${groupLabels[g] || g}</span>
      </label>
    `).join('');

    // Toggle group visibility
    groupsContainer.querySelectorAll('input[type=checkbox]').forEach(cb => {
      cb.addEventListener('change', () => {
        const g = cb.dataset.group;
        this.layout.hidden[g] = !cb.checked;
        this.saveLayout();
        this.applyLayout();
      });
    });

    // Individual tools
    const toolsContainer = document.getElementById('customize-tools');
    if (toolsContainer) {
      const allTools = [
        { name: 'pen', label: '✏️ Pen' },
        { name: 'highlighter', label: '🖍️ Highlighter' },
        { name: 'eraser', label: '🧽 Eraser' },
        { name: 'fading', label: '👻 Fading Ink' },
        { name: 'line', label: '／ Line' },
        { name: 'rectangle', label: '▭ Rectangle' },
        { name: 'circle', label: '○ Circle' },
        { name: 'arrow', label: '→ Arrow' },
        { name: 'triangle', label: '△ Triangle' },
        { name: 'text', label: 'T Text' },
        { name: 'sticky', label: '📝 Sticky Note' },
        { name: 'callout', label: '💬 Callout' },
        { name: 'step', label: '🔢 Numbered Step' },
        { name: 'blur', label: '🌫️ Blur' },
        { name: 'fill', label: '🪣 Fill' },
        { name: 'lasso', label: '🥢 Lasso' },
        { name: 'stamp', label: '★ Stamp' },
      ];
      toolsContainer.innerHTML = allTools.map(t => `
        <label class="customize-item">
          <input type="checkbox" data-tool="${t.name}" ${this.layout.hiddenTools[t.name] ? '' : 'checked'} />
          <span>${t.label}</span>
        </label>
      `).join('');
      toolsContainer.querySelectorAll('input[type=checkbox]').forEach(cb => {
        cb.addEventListener('change', () => {
          const t = cb.dataset.tool;
          this.layout.hiddenTools[t] = !cb.checked;
          this.saveLayout();
          this.applyLayout();
        });
      });
    }

    // Bottom bar items
    const bottomContainer = document.getElementById('customize-bottom');
    if (bottomContainer) {
      const bottomLabels = {
        'browser': '🌐 Browser',
        'liveclass': '🎓 Live Class',
        'open-file': '📂 Open File',
        'board-color': '🎨 Board Color',
        'webcam-pip': '📹 Webcam',
        'snapshot': '📸 Snapshot',
        'fullscreen': '⛶ Fullscreen',
      };
      bottomContainer.innerHTML = this.layout.bottomOrder.map(b => `
        <label class="customize-item">
          <input type="checkbox" data-bottom="${b}" ${this.layout.hiddenBottom[b] ? '' : 'checked'} />
          <span class="customize-drag">⠿</span>
          <span>${bottomLabels[b] || b}</span>
        </label>
      `).join('');
      bottomContainer.querySelectorAll('input[type=checkbox]').forEach(cb => {
        cb.addEventListener('change', () => {
          const b = cb.dataset.bottom;
          this.layout.hiddenBottom[b] = !cb.checked;
          this.saveLayout();
          this.applyLayout();
        });
      });
    }
  }

  bindCustomizePanelActions() {
    document.getElementById('customize-done')?.addEventListener('click', () => {
      document.getElementById('customize-panel')?.remove();
    });
    document.getElementById('customize-reset')?.addEventListener('click', () => {
      if (confirm('Reset all toolbar customizations?')) {
        this.layout = this.defaultLayout();
        this.saveLayout();
        this.applyLayout();
        this.renderCustomizeList();
        this.app.toast.show('Toolbar reset to default', 'success');
      }
    });
  }

  bindResetButton() {
    // Already handled in customize panel
  }

  // ============================================================
  // BOTTOM TOOLBAR DRAG-AND-DROP
  // ============================================================

  bindBottomToolbarDrag() {
    if (!this.bottomToolbar) return;
    const btns = this.bottomToolbar.querySelectorAll('.btb-btn');

    btns.forEach(btn => {
      btn.setAttribute('draggable', 'true');

      btn.addEventListener('dragstart', (e) => {
        this.draggedItem = btn;
        this.draggedType = 'bottom-btn';
        btn.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', 'bottom-btn');
      });

      btn.addEventListener('dragend', () => {
        btn.classList.remove('dragging');
        this.draggedItem = null;
        this.draggedType = null;
        this.bottomToolbar.querySelectorAll('.drag-over-left, .drag-over-right').forEach(el => {
          el.classList.remove('drag-over-left', 'drag-over-right');
        });
      });
    });

    // Drop targets
    btns.forEach(btn => {
      btn.addEventListener('dragover', (e) => {
        if (this.draggedType !== 'bottom-btn') return;
        e.preventDefault();
        const rect = btn.getBoundingClientRect();
        const middle = rect.left + rect.width / 2;
        btn.classList.remove('drag-over-left', 'drag-over-right');
        if (e.clientX < middle) btn.classList.add('drag-over-left');
        else btn.classList.add('drag-over-right');
      });

      btn.addEventListener('dragleave', () => {
        btn.classList.remove('drag-over-left', 'drag-over-right');
      });

      btn.addEventListener('drop', (e) => {
        e.preventDefault();
        if (this.draggedType !== 'bottom-btn' || !this.draggedItem) return;
        const rect = btn.getBoundingClientRect();
        const middle = rect.left + rect.width / 2;
        const insertBefore = e.clientX < middle;
        if (insertBefore) {
          this.bottomToolbar.insertBefore(this.draggedItem, btn);
        } else {
          this.bottomToolbar.insertBefore(this.draggedItem, btn.nextSibling);
        }
        // Save new order
        const newOrder = Array.from(this.bottomToolbar.querySelectorAll('.btb-btn'))
          .map(b => b.id?.replace('btb-', ''))
          .filter(Boolean);
        this.layout.bottomOrder = newOrder;
        this.saveLayout();
        btn.classList.remove('drag-over-left', 'drag-over-right');
      });
    });
  }
}
