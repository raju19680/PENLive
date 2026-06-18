// ============================================================
// PENLIVE - Video Drag-and-Drop Module
// Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.
//
// Allows users to drag video files from anywhere onto the canvas
// and play them in an embedded player. Also supports browsing
// via file picker.
// ============================================================

export class VideoDropZone {
  constructor(app) {
    this.app = app;
    this.dropzone = document.getElementById('video-dropzone');
    this.fileInput = document.getElementById('video-file-input');
    this.player = document.getElementById('video-player');
    this.video = document.getElementById('dropped-video');
    this.canvasArea = document.getElementById('canvas-area');
    this.currentUrl = null;
  }

  async init() {
    this.bindUI();
    // Show dropzone hint on app start, hide after 5s
    this.dropzone?.classList.add('active');
    setTimeout(() => {
      if (!this.currentUrl) this.dropzone?.classList.remove('active');
    }, 5000);
  }

  bindUI() {
    // Drag over the whole canvas area
    this.canvasArea?.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropzone?.classList.add('active', 'dragover');
    });

    this.canvasArea?.addEventListener('dragleave', (e) => {
      if (e.target === this.canvasArea) {
        this.dropzone?.classList.remove('dragover');
        if (!this.currentUrl) {
          setTimeout(() => this.dropzone?.classList.remove('active'), 200);
        }
      }
    });

    this.canvasArea?.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropzone?.classList.remove('dragover');
      const file = e.dataTransfer?.files?.[0];
      if (file) this.handleFile(file);
    });

    // Browse button
    document.querySelector('.dropzone__browse')?.addEventListener('click', () => {
      this.fileInput?.click();
    });

    this.fileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) this.handleFile(file);
    });

    // Close player
    document.getElementById('video-close')?.addEventListener('click', () => {
      this.closePlayer();
    });
  }

  handleFile(file) {
    if (!file.type.startsWith('video/')) {
      this.app.toast.show('Please drop a video file', 'error');
      return;
    }

    const maxSize = 2 * 1024 * 1024 * 1024; // 2 GB
    if (file.size > maxSize) {
      this.app.toast.show('File too large (max 2 GB)', 'error');
      return;
    }

    // Revoke previous URL
    if (this.currentUrl) URL.revokeObjectURL(this.currentUrl);

    this.currentUrl = URL.createObjectURL(file);
    if (this.video) this.video.src = this.currentUrl;
    if (this.player) this.player.hidden = false;
    this.dropzone?.classList.remove('active');

    const sizeMB = (file.size / 1024 / 1024).toFixed(1);
    this.app.toast.show(`Playing: ${file.name} (${sizeMB} MB)`, 'success', 4000);
  }

  closePlayer() {
    if (this.player) this.player.hidden = true;
    if (this.video) {
      this.video.pause();
      this.video.src = '';
    }
    if (this.currentUrl) {
      URL.revokeObjectURL(this.currentUrl);
      this.currentUrl = null;
    }
  }
}
