// ============================================================
// PENLIVE - Drawing Engine
// Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.
//
// Implements:
//   - Pen, Highlighter, Eraser
//   - Shapes: Line, Rectangle, Circle, Arrow, Triangle
//   - Text tool
//   - Sticky notes (delegated to SmartBoard)
//   - Color picker, brush size, opacity
//   - Undo/Redo with history stack
//   - Multi-page support (delegated to SmartBoard)
//   - Screenshot export (PNG/JPG)
// ============================================================

export class DrawingEngine {
  constructor(app) {
    this.app = app;
    this.canvas = document.getElementById('board-canvas');
    this.ctx = this.canvas?.getContext('2d');
    this.previewCanvas = document.getElementById('preview-canvas');
    this.previewCtx = this.previewCanvas?.getContext('2d');

    // Drawing state
    this.tool = 'pen';
    this.color = '#1a73e8';
    this.size = 4;
    this.opacity = 1.0;
    this.isDrawing = false;
    this.startX = 0;
    this.startY = 0;
    this.lastX = 0;
    this.lastY = 0;
    this.currentStroke = null;

    // History (undo/redo)
    this.history = [];
    this.historyIndex = -1;
    this.maxHistory = 50;

    // Text input element
    this.textInput = document.getElementById('text-input');
  }

  async init() {
    if (!this.canvas) return;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.bindCanvasEvents();
    this.bindToolbarEvents();
    this.saveState(); // Initial blank state
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.parentElement.getBoundingClientRect();

    // BUGFIX: Preserve content correctly across resize.
    // Save the current canvas as an image at its display size, then restore.
    let savedDataUrl = null;
    if (this.canvas.width > 0 && this.canvas.height > 0) {
      try { savedDataUrl = this.canvas.toDataURL('image/png'); } catch (e) {}
    }

    // Resize main canvas (setting width/height resets all transforms)
    this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    // Apply DPR scale so we can draw using logical (CSS) pixel coordinates
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Resize preview canvas
    this.previewCanvas.width = Math.max(1, Math.floor(rect.width * dpr));
    this.previewCanvas.height = Math.max(1, Math.floor(rect.height * dpr));
    this.previewCanvas.style.width = `${rect.width}px`;
    this.previewCanvas.style.height = `${rect.height}px`;
    this.previewCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Restore previous content at new logical size
    if (savedDataUrl) {
      const img = new Image();
      img.onload = () => {
        this.ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = savedDataUrl;
    }
  }

  bindCanvasEvents() {
    if (!this.canvas) return;

    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
      return { x, y };
    };

    const onStart = (e) => {
      e.preventDefault();
      const pos = getPos(e);

      if (this.tool === 'text') {
        this.startTextInput(pos.x, pos.y);
        return;
      }

      if (this.tool === 'sticky') {
        this.app.modules.smartboard?.addSticky(pos.x, pos.y);
        return;
      }

      if (this.tool === 'stamp') {
        const stamp = this.app.modules.advancedDrawing?.activeStamp || 'star';
        this.app.modules.advancedDrawing?.drawStamp(
          this.ctx, stamp, pos.x, pos.y, this.color, Math.max(20, this.size * 5)
        );
        this.saveState();
        return;
      }

      if (this.tool === 'step') {
        this.app.modules.advancedDrawing?.drawStep(
          this.ctx, pos.x, pos.y, this.color, Math.max(20, this.size * 4)
        );
        this.saveState();
        return;
      }

      if (this.tool === 'fill') {
        this.app.modules.advancedDrawing?.fillBucket(this.ctx, pos.x, pos.y, this.color);
        this.saveState();
        return;
      }

      this.isDrawing = true;
      this.startX = pos.x;
      this.startY = pos.y;
      this.lastX = pos.x;
      this.lastY = pos.y;

      // Reset stroke for smoothing
      this.app.modules.advancedDrawing?.resetStroke();
      this.app.modules.advancedDrawing?.addPoint(pos.x, pos.y, e.pressure || 1);

      if (this.tool === 'pen' || this.tool === 'highlighter' || this.tool === 'eraser' || this.tool === 'fading') {
        this.ctx.globalCompositeOperation =
          this.tool === 'eraser' ? 'destination-out' : 'source-over';
        this.ctx.strokeStyle = this.color;
        this.ctx.fillStyle = this.color;
        this.ctx.lineWidth = this.tool === 'highlighter' ? this.size * 3 : this.size;
        // Pressure sensitivity
        const pressure = e.pressure || 1;
        if (this.app.modules.advancedDrawing?.pressureEnabled && pressure !== 1) {
          this.ctx.lineWidth *= pressure;
        }
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.globalAlpha =
          this.tool === 'highlighter' ? Math.min(this.opacity * 0.4, 0.5) : this.opacity;

        // Draw a dot for single click
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, this.ctx.lineWidth / 2, 0, Math.PI * 2);
        this.ctx.fill();
      }
    };

    const onMove = (e) => {
      if (!this.isDrawing) return;
      e.preventDefault();
      const pos = getPos(e);
      const pressure = e.pressure || 1;
      this.app.modules.advancedDrawing?.addPoint(pos.x, pos.y, pressure);

      if (this.tool === 'pen' || this.tool === 'highlighter' || this.tool === 'eraser' || this.tool === 'fading') {
        // Pressure-sensitive width
        if (this.app.modules.advancedDrawing?.pressureEnabled && pressure !== 1) {
          const baseWidth = this.tool === 'highlighter' ? this.size * 3 : this.size;
          this.ctx.lineWidth = baseWidth * pressure;
        }

        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
        this.ctx.lineTo(pos.x, pos.y);
        this.ctx.stroke();
        this.lastX = pos.x;
        this.lastY = pos.y;
      } else if (this.tool === 'blur') {
        // Live pixelation as you drag
        const w = Math.abs(pos.x - this.lastX) + this.size * 2;
        const h = this.size * 2;
        this.app.modules.advancedDrawing?.applyBlur(
          this.ctx, Math.min(this.lastX, pos.x) - this.size,
          Math.min(this.lastY, pos.y) - this.size,
          w, h, Math.max(4, this.size / 2)
        );
        this.lastX = pos.x;
        this.lastY = pos.y;
      } else if (this.tool === 'lasso') {
        // Free-form selection — just draw outline on preview
        this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
        this.previewCtx.strokeStyle = '#1a73e8';
        this.previewCtx.lineWidth = 2;
        this.previewCtx.setLineDash([5, 5]);
        this.previewCtx.beginPath();
        this.previewCtx.moveTo(this.startX, this.startY);
        this.previewCtx.lineTo(pos.x, pos.y);
        this.previewCtx.stroke();
        this.lastX = pos.x;
        this.lastY = pos.y;
      } else if (this.tool === 'callout') {
        // Show callout preview
        this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
        this.previewCtx.strokeStyle = this.color;
        this.previewCtx.fillStyle = this.color;
        this.previewCtx.lineWidth = 2;
        this.previewCtx.beginPath();
        this.previewCtx.moveTo(this.startX, this.startY);
        this.previewCtx.lineTo(pos.x, pos.y);
        this.previewCtx.stroke();
      } else {
        // Shape preview
        this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
        this.drawShape(this.previewCtx, this.startX, this.startY, pos.x, pos.y);
      }
    };

    const onEnd = (e) => {
      if (!this.isDrawing) return;
      this.isDrawing = false;
      const pos = e.changedTouches ? getPos({ touches: e.changedTouches }) : getPos(e);

      // Commit shape to main canvas
      if (['line', 'rectangle', 'circle', 'arrow', 'triangle'].includes(this.tool)) {
        // Check for ink-to-shape recognition
        const advanced = this.app.modules.advancedDrawing;
        if (advanced && advanced.currentStroke.length > 0) {
          // Try shape recognition (only if not a recognized shape tool already)
        }
        this.drawShape(this.ctx, this.startX, this.startY, pos.x, pos.y);
        this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
      } else if (this.tool === 'callout') {
        const text = prompt('Callout text:', '');
        if (text) {
          this.app.modules.advancedDrawing?.drawCallout(
            this.ctx, this.startX, this.startY, pos.x, pos.y, text, this.color
          );
        }
        this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
      } else if (this.tool === 'lasso') {
        // Clear lasso preview
        this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
        this.app.toast.show('Selection area captured (not yet implemented for stroke selection)', 'info');
      } else if (this.tool === 'fading') {
        // Schedule fade-out of the drawn region
        const bbox = {
          x: Math.min(this.startX, this.lastX) - this.size,
          y: Math.min(this.startY, this.lastY) - this.size,
          w: Math.abs(this.lastX - this.startX) + this.size * 2,
          h: Math.abs(this.lastY - this.startY) + this.size * 2,
        };
        this.app.modules.advancedDrawing?.scheduleFading(
          this.ctx, bbox.x, bbox.y, bbox.w, bbox.h, 5000
        );
      }

      // Reset composite mode & opacity
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.globalAlpha = 1.0;
      this.app.modules.advancedDrawing?.resetStroke();

      this.saveState();
    };

    this.canvas.addEventListener('mousedown', onStart);
    this.canvas.addEventListener('mousemove', onMove);
    this.canvas.addEventListener('mouseup', onEnd);
    this.canvas.addEventListener('mouseleave', onEnd);

    this.canvas.addEventListener('touchstart', onStart, { passive: false });
    this.canvas.addEventListener('touchmove', onMove, { passive: false });
    this.canvas.addEventListener('touchend', onEnd);
  }

  drawShape(ctx, x1, y1, x2, y2) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = this.color;
    ctx.fillStyle = this.color;
    ctx.lineWidth = this.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = this.opacity;

    ctx.beginPath();

    switch (this.tool) {
      case 'line':
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        break;

      case 'rectangle':
        ctx.rect(x1, y1, x2 - x1, y2 - y1);
        ctx.stroke();
        break;

      case 'circle': {
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        const rx = Math.abs(x2 - x1) / 2;
        const ry = Math.abs(y2 - y1) / 2;
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }

      case 'arrow': {
        const headLen = Math.max(10, this.size * 3);
        const angle = Math.atan2(y2 - y1, x2 - x1);
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(
          x2 - headLen * Math.cos(angle - Math.PI / 6),
          y2 - headLen * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(x2, y2);
        ctx.lineTo(
          x2 - headLen * Math.cos(angle + Math.PI / 6),
          y2 - headLen * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
        break;
      }

      case 'triangle':
        ctx.moveTo(x1, y2);
        ctx.lineTo(x2, y2);
        ctx.lineTo((x1 + x2) / 2, y1);
        ctx.closePath();
        ctx.stroke();
        break;
    }

    ctx.globalAlpha = 1.0;
  }

  startTextInput(x, y) {
    if (!this.textInput) return;
    this.textInput.style.left = `${x}px`;
    this.textInput.style.top = `${y}px`;
    this.textInput.style.color = this.color;
    this.textInput.style.fontSize = `${Math.max(14, this.size * 4)}px`;
    this.textInput.hidden = false;
    this.textInput.value = '';
    this.textInput.focus();

    const finalize = () => {
      const text = this.textInput.value.trim();
      if (text) {
        this.ctx.font = `${Math.max(14, this.size * 4)}px 'Segoe UI', sans-serif`;
        this.ctx.fillStyle = this.color;
        this.ctx.globalAlpha = this.opacity;
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(text, x, y);
        this.ctx.globalAlpha = 1.0;
        this.saveState();
      }
      this.textInput.hidden = true;
      this.textInput.removeEventListener('blur', finalize);
      this.textInput.removeEventListener('keydown', onKey);
    };

    const onKey = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        finalize();
      } else if (e.key === 'Escape') {
        this.textInput.hidden = true;
        this.textInput.removeEventListener('blur', finalize);
        this.textInput.removeEventListener('keydown', onKey);
      }
    };

    this.textInput.addEventListener('blur', finalize);
    this.textInput.addEventListener('keydown', onKey);
  }

  bindToolbarEvents() {
    // Tool buttons
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.tool = btn.dataset.tool;
        this.updateCursor();
      });
    });

    // Color input
    const colorInput = document.getElementById('color-input');
    colorInput?.addEventListener('input', (e) => {
      this.color = e.target.value;
    });

    // Color swatches
    document.querySelectorAll('.swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        this.color = sw.dataset.color;
        colorInput.value = this.color;
      });
    });

    // Brush size
    const sizeInput = document.getElementById('brush-size');
    const sizeValue = document.getElementById('brush-size-value');
    sizeInput?.addEventListener('input', (e) => {
      this.size = parseInt(e.target.value, 10);
      sizeValue.textContent = this.size;
    });

    // Opacity
    const opInput = document.getElementById('brush-opacity');
    const opValue = document.getElementById('brush-opacity-value');
    opInput?.addEventListener('input', (e) => {
      this.opacity = parseInt(e.target.value, 10) / 100;
      opValue.textContent = e.target.value;
    });
  }

  updateCursor() {
    if (!this.canvas) return;
    if (this.tool === 'text') {
      this.canvas.style.cursor = 'text';
    } else if (this.tool === 'eraser') {
      this.canvas.style.cursor = 'cell';
    } else if (this.tool === 'sticky') {
      this.canvas.style.cursor = 'copy';
    } else {
      this.canvas.style.cursor = 'crosshair';
    }
  }

  // ============================================================
  // UNDO / REDO
  // ============================================================

  saveState() {
    if (!this.canvas) return;
    // Trim future states if we undid then drew again
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(this.canvas.toDataURL('image/png'));
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
    this.app.modules.autosave?.scheduleSave();
  }

  undo() {
    if (this.historyIndex <= 0) {
      this.app.toast.show('Nothing to undo', 'info');
      return;
    }
    this.historyIndex--;
    this.restoreState(this.history[this.historyIndex]);
  }

  redo() {
    if (this.historyIndex >= this.history.length - 1) {
      this.app.toast.show('Nothing to redo', 'info');
      return;
    }
    this.historyIndex++;
    this.restoreState(this.history[this.historyIndex]);
  }

  restoreState(dataUrl) {
    if (!this.canvas) return;
    const img = new Image();
    img.onload = () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.ctx.drawImage(img, 0, 0, rect.width, rect.height);
    };
    img.src = dataUrl;
  }

  clear() {
    if (!this.canvas) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.saveState();
    this.app.toast.show('Canvas cleared', 'info');
  }

  // ============================================================
  // SCREENSHOT EXPORT
  // ============================================================

  async screenshot() {
    if (!this.canvas) return;
    const dataUrl = this.canvas.toDataURL('image/png');
    const bytes = this.dataUrlToBytes(dataUrl);
    const name = `penlive-screenshot-${Date.now()}.png`;

    if (this.app.isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const path = await invoke('save_screenshot', {
          bytes,
          suggestedName: name,
        });
        this.app.toast.show(`Saved: ${path}`, 'success');
      } catch (err) {
        this.downloadBlob(dataUrl, name);
        this.app.toast.show('Downloaded screenshot', 'success');
      }
    } else {
      this.downloadBlob(dataUrl, name);
      this.app.toast.show('Screenshot downloaded', 'success');
    }
  }

  dataUrlToBytes(dataUrl) {
    const base64 = dataUrl.split(',')[1];
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return Array.from(bytes);
  }

  downloadBlob(dataUrl, name) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = name;
    a.click();
  }

  // ============================================================
  // PAGE SUPPORT (delegated to SmartBoard, called by saveState)
  // ============================================================

  getPageData() {
    return this.canvas?.toDataURL('image/png') || null;
  }

  setPageData(dataUrl) {
    if (!this.canvas || !dataUrl) return;
    const img = new Image();
    img.onload = () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.ctx.drawImage(img, 0, 0, rect.width, rect.height);
    };
    img.src = dataUrl;
  }
}
