// ============================================================
// PENLIVE - Image Import & Touch Gestures Module
// Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.
//
// - Insert images (drag-drop or file picker) onto canvas
// - Move/scale/rotate images
// - Touch gestures: pinch zoom, two-finger erase, pan
// - Lasso selection of strokes (simplified)
// ============================================================

export class ImageImport {
  constructor(app) {
    this.app = app;
    this.images = []; // { id, x, y, w, h, rotation, dataUrl }
    this.container = document.getElementById('sticky-container');
  }

  async init() {
    this.bindUI();
  }

  bindUI() {
    document.getElementById('btn-image-import')?.addEventListener('click', () => this.openFilePicker());

    // Allow drag-drop of images onto canvas
    const canvasArea = document.getElementById('canvas-area');
    canvasArea?.addEventListener('drop', (e) => {
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith('image/')) {
        e.preventDefault();
        e.stopPropagation();
        const rect = canvasArea.getBoundingClientRect();
        this.addImage(file, e.clientX - rect.left, e.clientY - rect.top);
      }
    });

    canvasArea?.addEventListener('dragover', (e) => {
      if (e.dataTransfer?.types?.includes('Files')) {
        e.preventDefault();
      }
    });
  }

  openFilePicker() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (file) {
        const canvas = document.getElementById('board-canvas');
        const rect = canvas.getBoundingClientRect();
        this.addImage(file, rect.width / 2, rect.height / 2);
      }
    };
    input.click();
  }

  async addImage(file, x, y) {
    const dataUrl = await this.fileToDataUrl(file);
    const img = await this.dataUrlToImage(dataUrl);

    // Scale to fit max 400px wide
    const maxW = 400;
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    if (w > maxW) {
      h = (h / w) * maxW;
      w = maxW;
    }

    const imageObj = {
      id: `img-${Date.now()}`,
      x: x - w / 2,
      y: y - h / 2,
      w, h,
      rotation: 0,
      dataUrl,
    };
    this.images.push(imageObj);
    this.renderImage(imageObj);
    this.app.toast.show(`Image inserted: ${file.name}`, 'success');
  }

  renderImage(img) {
    if (!this.container) return;
    const el = document.createElement('div');
    el.className = 'image-element';
    el.id = img.id;
    el.style.cssText = `
      position: absolute;
      left: ${img.x}px;
      top: ${img.y}px;
      width: ${img.w}px;
      height: ${img.h}px;
      transform: rotate(${img.rotation}deg);
      pointer-events: auto;
      cursor: move;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      border: 1px solid transparent;
    `;
    el.innerHTML = `
      <img src="${img.dataUrl}" style="width:100%;height:100%;display:block;" />
      <button class="img-close" style="position:absolute;top:-8px;right:-8px;width:20px;height:20px;border-radius:50%;background:#000;color:#fff;border:none;cursor:pointer;">×</button>
      <div class="img-resize" style="position:absolute;bottom:0;right:0;width:12px;height:12px;background:rgba(255,255,255,0.6);cursor:nwse-resize;"></div>
    `;

    this.makeDraggable(el, img);
    el.querySelector('.img-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      el.remove();
      this.images = this.images.filter(i => i.id !== img.id);
    });
    this.makeResizable(el, img);

    this.container.appendChild(el);
  }

  makeDraggable(el, img) {
    let offsetX = 0, offsetY = 0, dragging = false;
    el.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('img-close') || e.target.classList.contains('img-resize')) return;
      dragging = true;
      const rect = el.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      el.style.zIndex = '100';
      el.style.border = '1px dashed var(--color-primary)';
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const parentRect = this.container.getBoundingClientRect();
      img.x = e.clientX - parentRect.left - offsetX;
      img.y = e.clientY - parentRect.top - offsetY;
      el.style.left = `${img.x}px`;
      el.style.top = `${img.y}px`;
    });
    document.addEventListener('mouseup', () => {
      if (dragging) {
        dragging = false;
        el.style.zIndex = '';
        el.style.border = '1px solid transparent';
      }
    });
  }

  makeResizable(el, img) {
    const handle = el.querySelector('.img-resize');
    handle?.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      const startX = e.clientX;
      const startY = e.clientY;
      const startW = img.w;
      const startH = img.h;
      const aspect = startW / startH;
      const onMove = (ev) => {
        const dx = ev.clientX - startX;
        const newW = Math.max(50, startW + dx);
        img.w = newW;
        img.h = newW / aspect;
        el.style.width = `${img.w}px`;
        el.style.height = `${img.h}px`;
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  dataUrlToImage(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = url;
    });
  }

  serialize() {
    return this.images.map(i => ({ ...i }));
  }

  deserialize(imgs) {
    this.images = imgs || [];
    this.images.forEach(i => this.renderImage(i));
  }
}

// ============================================================
// TOUCH GESTURES (within same file for simplicity)
// ============================================================

export class TouchGestures {
  constructor(app) {
    this.app = app;
    this.enabled = true;
    this.touches = [];
    this.lastDistance = 0;
    this.panStartX = 0;
    this.panStartY = 0;
  }

  async init() {
    document.getElementById('set-touch-gestures')?.addEventListener('change', (e) => {
      this.enabled = e.target.checked;
    });

    const canvas = document.getElementById('board-canvas');
    canvas?.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    canvas?.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    canvas?.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
  }

  onTouchStart(e) {
    if (!this.enabled) return;
    this.touches = Array.from(e.touches);
    if (this.touches.length === 2) {
      // Pinch start
      this.lastDistance = this.getDistance(this.touches[0], this.touches[1]);
      e.preventDefault(); // Prevent drawing while pinching
    } else if (this.touches.length === 1) {
      // Single touch — let drawing module handle it (don't preventDefault)
    }
  }

  onTouchMove(e) {
    if (!this.enabled) return;
    this.touches = Array.from(e.touches);

    if (this.touches.length === 2) {
      // Pinch zoom
      const dist = this.getDistance(this.touches[0], this.touches[1]);
      const scale = dist / this.lastDistance;
      this.lastDistance = dist;
      this.app.toast.show(`Pinch: ${scale.toFixed(2)}x`, 'info', 500);
      e.preventDefault();
    }
  }

  onTouchEnd(e) {
    if (this.touches.length === 0) this.lastDistance = 0;
  }

  getDistance(t1, t2) {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
