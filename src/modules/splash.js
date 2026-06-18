// ============================================================
// PENLIVE - Splash Screen Controller
// Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.
//
// Shows a professional splash screen with the PENLIVE logo,
// "Er. Raju Kumawat" branding, and rotating loading messages.
// ============================================================

export class SplashScreen {
  constructor(app) {
    this.app = app;
    this.element = document.getElementById('splash-screen');
    this.loadingText = document.getElementById('splash-loading-text');
    this.progressBar = document.getElementById('splash-progress-bar');
    this.messages = [
      'Initializing PENLIVE...',
      'Loading drawing engine...',
      'Setting up tools...',
      'Preparing canvas...',
      'Loading recording studio...',
      'Connecting audio devices...',
      'Initializing browser...',
      'Loading smart board...',
      'Almost ready...',
    ];
    this.currentIndex = 0;
    this.progress = 0;
    this.interval = null;
  }

  async init() {
    if (!this.element) return;
    this.startProgress();
    this.rotateMessages();
    // Auto-hide after 3 seconds
    setTimeout(() => this.hide(), 3000);
  }

  startProgress() {
    if (!this.progressBar) return;
    this.interval = setInterval(() => {
      this.progress = Math.min(100, this.progress + Math.random() * 12 + 4);
      this.progressBar.style.width = `${this.progress}%`;
      if (this.progress >= 100) {
        clearInterval(this.interval);
      }
    }, 200);
  }

  rotateMessages() {
    if (!this.loadingText) return;
    setInterval(() => {
      this.currentIndex = (this.currentIndex + 1) % this.messages.length;
      this.loadingText.style.opacity = '0';
      setTimeout(() => {
        this.loadingText.textContent = this.messages[this.currentIndex];
        this.loadingText.style.opacity = '1';
      }, 200);
    }, 400);
  }

  hide() {
    if (!this.element) return;
    if (this.interval) clearInterval(this.interval);
    this.element.style.opacity = '0';
    this.element.style.transition = 'opacity 400ms ease-out';
    setTimeout(() => {
      this.element.style.display = 'none';
    }, 400);
  }
}
