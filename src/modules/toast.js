// ============================================================
// PENLIVE - Toast Notifications
// Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.
// ============================================================

export class Toast {
  constructor() {
    this.container = document.getElementById('toast-container');
    this.duration = 3000;
  }

  show(message, type = 'info', duration = null) {
    if (!this.container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    this.container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      setTimeout(() => toast.remove(), 200);
    }, duration || this.duration);
  }

  success(msg, dur) { this.show(msg, 'success', dur); }
  error(msg, dur)   { this.show(msg, 'error', dur); }
  info(msg, dur)    { this.show(msg, 'info', dur); }
}
