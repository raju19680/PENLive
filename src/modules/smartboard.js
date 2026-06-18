// ============================================================
// PENLIVE - Smart Board Module
// Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.
//
// Implements multi-page canvas management:
//   - Add / remove / navigate pages
//   - Sticky notes (draggable, editable)
//   - Whiteboard / blackboard mode toggle
//   - Page persistence (saves each page's canvas state)
// ============================================================

export class SmartBoard {
  constructor(app) {
    this.app = app;
    this.pages = [null]; // each entry holds dataURL of canvas state
    this.currentPage = 0;
    this.stickies = [];
    this.stickyContainer = document.getElementById('sticky-container');
  }

  async init() {
    this.updatePageIndicator();
  }

  // ============================================================
  // PAGES
  // ============================================================

  newPage() {
    // Save current page state
    this.saveCurrentPage();

    // Add new blank page
    this.pages.push(null);
    this.currentPage = this.pages.length - 1;

    // Clear canvas
    const canvas = document.getElementById('board-canvas');
    const ctx = canvas?.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Clear stickies for new page
    this.clearStickies();

    this.updatePageIndicator();
    this.app.modules.drawing?.saveState();
    this.app.toast.show(`Page ${this.currentPage + 1} created`, 'success');
  }

  prevPage() {
    if (this.currentPage <= 0) {
      this.app.toast.show('Already on first page', 'info');
      return;
    }
    this.saveCurrentPage();
    this.currentPage--;
    this.loadPage(this.currentPage);
    this.updatePageIndicator();
  }

  nextPage() {
    if (this.currentPage >= this.pages.length - 1) {
      this.app.toast.show('Already on last page', 'info');
      return;
    }
    this.saveCurrentPage();
    this.currentPage++;
    this.loadPage(this.currentPage);
    this.updatePageIndicator();
  }

  saveCurrentPage() {
    if (this.app.modules.drawing) {
      this.pages[this.currentPage] = this.app.modules.drawing.getPageData();
    }
    // Save stickies state for current page (simplified: keep on page 1 for now)
  }

  loadPage(idx) {
    const data = this.pages[idx];
    if (this.app.modules.drawing) {
      this.app.modules.drawing.setPageData(data);
    }
    if (idx === 0) {
      this.renderStickies();
    } else {
      this.clearStickies();
    }
  }

  updatePageIndicator() {
    const el = document.getElementById('page-indicator');
    if (el) el.textContent = `Page ${this.currentPage + 1} / ${this.pages.length}`;
  }

  // ============================================================
  // STICKY NOTES
  // ============================================================

  addSticky(x, y) {
    const colors = ['#fff9c4', '#c8e6c9', '#bbdefb', '#f8bbd0', '#ffe0b2'];
    const color = colors[this.stickies.length % colors.length];

    const sticky = {
      id: `sticky-${Date.now()}`,
      x, y,
      text: '',
      color,
    };
    this.stickies.push(sticky);
    this.renderSticky(sticky);
    this.app.modules.drawing?.saveState();
  }

  renderSticky(sticky) {
    const el = document.createElement('div');
    el.className = 'sticky-note';
    el.id = sticky.id;
    el.style.left = `${sticky.x}px`;
    el.style.top = `${sticky.y}px`;
    el.style.background = sticky.color;

    const textarea = document.createElement('textarea');
    textarea.className = 'sticky-note__textarea';
    textarea.placeholder = 'Type here...';
    textarea.value = sticky.text;
    textarea.addEventListener('input', (e) => {
      sticky.text = e.target.value;
    });
    el.appendChild(textarea);

    const close = document.createElement('button');
    close.className = 'sticky-note__close';
    close.textContent = '×';
    close.addEventListener('click', (e) => {
      e.stopPropagation();
      el.remove();
      this.stickies = this.stickies.filter(s => s.id !== sticky.id);
    });
    el.appendChild(close);

    this.makeDraggable(el, sticky);
    this.stickyContainer?.appendChild(el);
  }

  makeDraggable(el, sticky) {
    let offsetX = 0;
    let offsetY = 0;
    let dragging = false;

    el.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'TEXTAREA' || e.target.classList.contains('sticky-note__close')) return;
      dragging = true;
      const rect = el.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      el.style.zIndex = '100';
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const parentRect = this.stickyContainer.getBoundingClientRect();
      sticky.x = e.clientX - parentRect.left - offsetX;
      sticky.y = e.clientY - parentRect.top - offsetY;
      el.style.left = `${sticky.x}px`;
      el.style.top = `${sticky.y}px`;
    });

    document.addEventListener('mouseup', () => {
      if (dragging) {
        dragging = false;
        el.style.zIndex = '';
      }
    });
  }

  clearStickies() {
    this.stickyContainer?.querySelectorAll('.sticky-note').forEach(el => el.remove());
  }

  renderStickies() {
    this.clearStickies();
    this.stickies.forEach(s => this.renderSticky(s));
  }

  // ============================================================
  // WHITEBOARD / BLACKBOARD TOGGLE
  // ============================================================

  toggleBoardMode() {
    const canvas = document.getElementById('board-canvas');
    if (!canvas) return;
    const isDark = canvas.style.background.includes('#1a1a1a') ||
                   canvas.style.background.includes('#000');
    if (isDark) {
      canvas.style.background = '#ffffff';
      canvas.style.backgroundImage = '';
      this.app.toast.show('Whiteboard mode', 'info');
    } else {
      canvas.style.background = '#1a1a1a';
      this.app.toast.show('Blackboard mode', 'info');
    }
  }

  // ============================================================
  // EXPORT ALL PAGES (for auto-save)
  // ============================================================

  serialize() {
    this.saveCurrentPage();
    return {
      pages: this.pages,
      currentPage: this.currentPage,
      stickies: this.stickies,
    };
  }

  deserialize(data) {
    if (!data) return;
    this.pages = data.pages || [null];
    this.currentPage = data.currentPage || 0;
    this.stickies = data.stickies || [];
    this.loadPage(this.currentPage);
    this.renderStickies();
    this.updatePageIndicator();
  }
}
