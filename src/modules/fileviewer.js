// ============================================================
// PENLIVE - Universal File Viewer
// Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.
//
// Opens ANY file type in a draggable/resizable viewer panel:
//   - Images: PNG, JPG, GIF, WebP, SVG, BMP
//   - Videos: MP4, WebM, MOV, AVI
//   - Audio: MP3, WAV, OGG, FLAC
//   - PDF: embedded viewer
//   - Text/Code: TXT, JS, PY, HTML, CSS, JSON, MD, etc.
//   - Office: opens in system viewer (DOCX, XLSX, PPTX)
//   - Other: download prompt
// ============================================================

export class FileViewer {
  constructor(app) {
    this.app = app;
    this.panel = document.getElementById('file-viewer');
    this.body = document.getElementById('file-viewer-body');
    this.zoomLevel = 100;
    this.currentFile = null;
    this.currentUrl = null;
  }

  async init() {
    this.bindUI();
  }

  bindUI() {
    document.getElementById('btb-open-file')?.addEventListener('click', () => this.openPicker());

    document.getElementById('file-viewer-close')?.addEventListener('click', () => this.close());
    document.getElementById('file-viewer-zoom-in')?.addEventListener('click', () => this.zoom(10));
    document.getElementById('file-viewer-zoom-out')?.addEventListener('click', () => this.zoom(-10));
    document.getElementById('file-viewer-download')?.addEventListener('click', () => this.download());

    // Drag-drop files anywhere on canvas
    const canvasArea = document.getElementById('canvas-area');
    canvasArea?.addEventListener('drop', (e) => {
      const file = e.dataTransfer?.files?.[0];
      if (file && !file.type.startsWith('video/')) {
        // Video files handled by VideoDropZone; we handle others
        e.preventDefault();
        e.stopPropagation();
        this.openFile(file);
      }
    });

    canvasArea?.addEventListener('dragover', (e) => {
      if (e.dataTransfer?.types?.includes('Files')) {
        e.preventDefault();
      }
    });

    this.makeDraggable();
    this.makeResizable();
  }

  openPicker() {
    const input = document.createElement('input');
    input.type = 'file';
    // Accept all file types
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (file) this.openFile(file);
    };
    input.click();
  }

  openFile(file) {
    this.currentFile = file;
    if (this.currentUrl) URL.revokeObjectURL(this.currentUrl);
    this.currentUrl = URL.createObjectURL(file);

    // Update header
    document.getElementById('file-viewer-name').textContent = file.name;
    document.getElementById('file-viewer-size').textContent = `(${this.formatSize(file.size)})`;
    document.getElementById('file-viewer-icon').textContent = this.getIcon(file.type, file.name);
    document.getElementById('file-viewer-zoom-level').textContent = '100%';
    this.zoomLevel = 100;

    // Render content based on type
    this.renderContent(file);

    // Show panel
    if (this.panel) this.panel.hidden = false;
    this.app.toast.show(`Opened: ${file.name}`, 'success');
  }

  renderContent(file) {
    if (!this.body) return;
    this.body.innerHTML = '';

    const ext = file.name.split('.').pop().toLowerCase();
    const type = file.type;

    // Images
    if (type.startsWith('image/') || ['png','jpg','jpeg','gif','webp','svg','bmp','ico'].includes(ext)) {
      const img = document.createElement('img');
      img.src = this.currentUrl;
      img.alt = file.name;
      this.body.appendChild(img);
      return;
    }

    // Videos
    if (type.startsWith('video/') || ['mp4','webm','mov','avi','mkv','ogv'].includes(ext)) {
      const video = document.createElement('video');
      video.src = this.currentUrl;
      video.controls = true;
      video.style.maxWidth = '100%';
      video.style.maxHeight = '100%';
      this.body.appendChild(video);
      return;
    }

    // Audio
    if (type.startsWith('audio/') || ['mp3','wav','ogg','flac','m4a','aac'].includes(ext)) {
      const audio = document.createElement('audio');
      audio.src = this.currentUrl;
      audio.controls = true;
      audio.style.width = '100%';
      audio.style.marginTop = '40px';
      this.body.appendChild(audio);
      return;
    }

    // PDF
    if (type === 'application/pdf' || ext === 'pdf') {
      const iframe = document.createElement('iframe');
      iframe.src = this.currentUrl;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      this.body.appendChild(iframe);
      return;
    }

    // Text/Code files
    const textExts = ['txt','md','json','js','ts','py','html','css','xml','yml','yaml','csv','log','java','c','cpp','cs','rb','go','rs','php','sh','bat','sql','ini','conf','toml','env'];
    if (type.startsWith('text/') || textExts.includes(ext)) {
      const reader = new FileReader();
      reader.onload = () => {
        const pre = document.createElement('pre');
        pre.className = 'file-text';
        pre.textContent = reader.result;
        this.body.appendChild(pre);
      };
      reader.readAsText(file);
      return;
    }

    // Office documents — open externally
    const officeExts = ['doc','docx','xls','xlsx','ppt','pptx','odt','ods','odp'];
    if (officeExts.includes(ext)) {
      this.body.innerHTML = `
        <div class="file-unsupported">
          <h3>📄 Office Document</h3>
          <p>${file.name}</p>
          <p>Office files open in your system's default app.</p>
          <button onclick="window.penlive.modules.fileviewer.download()">Download &amp; Open</button>
        </div>
      `;
      return;
    }

    // Unknown / binary
    this.body.innerHTML = `
      <div class="file-unsupported">
        <h3>❓ Unsupported File Type</h3>
        <p>${file.name}</p>
        <p>Type: ${type || 'Unknown'} · Size: ${this.formatSize(file.size)}</p>
        <button onclick="window.penlive.modules.fileviewer.download()">Download File</button>
      </div>
    `;
  }

  zoom(delta) {
    this.zoomLevel = Math.max(25, Math.min(400, this.zoomLevel + delta));
    document.getElementById('file-viewer-zoom-level').textContent = `${this.zoomLevel}%`;
    const img = this.body.querySelector('img');
    if (img) {
      img.style.transform = `scale(${this.zoomLevel / 100})`;
    }
  }

  download() {
    if (!this.currentFile) return;
    const a = document.createElement('a');
    a.href = this.currentUrl;
    a.download = this.currentFile.name;
    a.click();
  }

  close() {
    if (this.panel) this.panel.hidden = true;
    if (this.currentUrl) {
      URL.revokeObjectURL(this.currentUrl);
      this.currentUrl = null;
    }
    this.currentFile = null;
    if (this.body) this.body.innerHTML = '';
  }

  getIcon(type, name) {
    const ext = name.split('.').pop().toLowerCase();
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('video/')) return '🎬';
    if (type.startsWith('audio/')) return '🎵';
    if (type === 'application/pdf' || ext === 'pdf') return '📕';
    if (['doc','docx'].includes(ext)) return '📘';
    if (['xls','xlsx'].includes(ext)) return '📗';
    if (['ppt','pptx'].includes(ext)) return '📙';
    if (['zip','rar','7z','tar','gz'].includes(ext)) return '🗜️';
    if (['txt','md'].includes(ext)) return '📝';
    if (['js','py','html','css','json','java','c','cpp'].includes(ext)) return '💻';
    return '📄';
  }

  formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }

  makeDraggable() {
    if (!this.panel) return;
    const header = this.panel.querySelector('.file-viewer__header');
    if (!header) return;
    let offsetX = 0, offsetY = 0, dragging = false;

    header.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
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
      this.panel.style.transform = 'none';
    });

    document.addEventListener('mouseup', () => { dragging = false; });
  }

  makeResizable() {
    const handle = this.panel?.querySelector('.file-viewer__resize');
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
