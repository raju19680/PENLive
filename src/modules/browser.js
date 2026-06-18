// ============================================================
// PENLIVE - Built-in Browser Module
// Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.
//
// Embeds a browser in a draggable/resizable panel so users can
// surf the web while teaching/drawing on the board. Supports
// URL bar, back/forward/refresh/home, opens external when blocked.
// ============================================================

export class BrowserModule {
  constructor(app) {
    this.app = app;
    this.panel = document.getElementById('browser-panel');
    this.iframe = document.getElementById('browser-iframe');
    this.urlInput = document.getElementById('browser-url');
    this.blockedNotice = document.getElementById('browser-blocked-notice');
    this.history = ['https://en.wikipedia.org/wiki/Main_Page'];
    this.historyIndex = 0;
    this.homePage = 'https://en.wikipedia.org/wiki/Main_Page';
  }

  async init() {
    this.bindUI();
    // Default to Wikipedia (allows embedding)
    this.navigate(this.homePage, true);
    // Splash is now handled by dedicated splash.js module
  }

  bindUI() {
    // Bottom toolbar button
    document.getElementById('btb-browser')?.addEventListener('click', () => this.toggle());

    // Browser controls
    document.getElementById('browser-back')?.addEventListener('click', () => this.back());
    document.getElementById('browser-forward')?.addEventListener('click', () => this.forward());
    document.getElementById('browser-refresh')?.addEventListener('click', () => this.refresh());
    document.getElementById('browser-home')?.addEventListener('click', () => this.navigate(this.homePage));
    document.getElementById('browser-go')?.addEventListener('click', () => this.navigate(this.urlInput.value));
    document.getElementById('browser-close')?.addEventListener('click', () => this.hide());
    document.getElementById('browser-open-external')?.addEventListener('click', () => this.openExternal());
    document.getElementById('browser-open-external-2')?.addEventListener('click', () => this.openExternal());

    // Enter key in URL bar
    this.urlInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.navigate(this.urlInput.value);
    });

    // Alternative URLs in blocked notice
    document.querySelectorAll('.browser-blocked-notice__inner a').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigate(a.dataset.url);
      });
    });

    // Detect iframe load failures (X-Frame-Options)
    this.iframe?.addEventListener('load', () => {
      try {
        // Try to access iframe content - if blocked, will throw
        const doc = this.iframe.contentDocument || this.iframe.contentWindow?.document;
        if (doc) {
          this.blockedNotice.hidden = true;
        }
      } catch (e) {
        // Cross-origin — page loaded successfully
        this.blockedNotice.hidden = true;
      }
    });

    // After 3 seconds, if iframe still blank, show blocked notice
    this.iframe?.addEventListener('loadstart', () => {
      setTimeout(() => {
        try {
          const doc = this.iframe.contentDocument;
          if (!doc || doc.body?.innerHTML === '' || doc.URL === 'about:blank') {
            // Page blocked
          } else {
            this.blockedNotice.hidden = true;
          }
        } catch (e) {
          this.blockedNotice.hidden = true; // cross-origin = success
        }
      }, 2500);
    });

    // Make panel draggable
    this.makeDraggable();
    this.makeResizable();
  }

  toggle() {
    if (!this.panel) return;
    this.panel.hidden = !this.panel.hidden;
    if (!this.panel.hidden) {
      this.app.toast.show('Browser opened — surf while you draw!', 'info');
    }
  }

  hide() {
    if (this.panel) this.panel.hidden = true;
  }

  navigate(url, replace = false) {
    if (!url) return;
    // Normalize URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      // Check if it's a domain or a search query
      if (/^[\w-]+\.\w{2,}/.test(url)) {
        url = 'https://' + url;
      } else {
        url = 'https://www.bing.com/search?q=' + encodeURIComponent(url);
      }
    }

    this.urlInput.value = url;
    this.iframe.src = url;
    this.blockedNotice.hidden = true;

    if (!replace) {
      this.history = this.history.slice(0, this.historyIndex + 1);
      this.history.push(url);
      this.historyIndex = this.history.length - 1;
    }

    // Show blocked notice after delay if site refuses to load
    setTimeout(() => {
      try {
        const doc = this.iframe.contentDocument;
        if (doc && (doc.URL === 'about:blank' || doc.body?.innerHTML === '')) {
          this.blockedNotice.hidden = false;
        }
      } catch (e) {
        // Cross-origin access blocked = the site loaded
        this.blockedNotice.hidden = true;
      }
    }, 3500);
  }

  back() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.navigate(this.history[this.historyIndex], true);
    }
  }

  forward() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.navigate(this.history[this.historyIndex], true);
    }
  }

  refresh() {
    this.iframe.src = this.iframe.src;
  }

  openExternal() {
    const url = this.urlInput.value;
    if (this.app.isTauri) {
      import('@tauri-apps/plugin-shell').then(({ open }) => open(url));
    } else {
      window.open(url, '_blank');
    }
  }

  makeDraggable() {
    if (!this.panel) return;
    const header = this.panel.querySelector('.browser-panel__header');
    if (!header) return;
    let offsetX = 0, offsetY = 0, dragging = false;

    header.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
      dragging = true;
      const rect = this.panel.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const parent = this.panel.parentElement.getBoundingClientRect();
      let x = e.clientX - parent.left - offsetX;
      let y = e.clientY - parent.top - offsetY;
      x = Math.max(0, Math.min(x, parent.width - this.panel.offsetWidth));
      y = Math.max(0, Math.min(y, parent.height - this.panel.offsetHeight));
      this.panel.style.left = `${x}px`;
      this.panel.style.top = `${y}px`;
      this.panel.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => { dragging = false; });
  }

  makeResizable() {
    const handle = this.panel?.querySelector('.browser-panel__resize');
    if (!handle) return;
    let startX, startY, startW, startH;

    handle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      startX = e.clientX; startY = e.clientY;
      startW = this.panel.offsetWidth;
      startH = this.panel.offsetHeight;
      const onMove = (ev) => {
        this.panel.style.width = `${Math.max(320, startW + ev.clientX - startX)}px`;
        this.panel.style.height = `${Math.max(240, startH + ev.clientY - startY)}px`;
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }
}
