// ============================================================
// PENLIVE - Audio Device Manager
// Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.
//
// Enumerates audio input devices (microphones) for external
// mic support. Populates the mic-select dropdown.
// Also enumerates audio output devices (speakers).
// ============================================================

export class AudioDevices {
  constructor(app) {
    this.app = app;
    this.mics = [];
    this.outputs = [];
    this.micSelect = document.getElementById('mic-select');
  }

  async init() {
    await this.enumerate();
    // Re-enumerate when devices change (USB plug/unplug)
    navigator.mediaDevices?.addEventListener?.('devicechange', () => this.enumerate());
  }

  async enumerate() {
    try {
      // Need permission first
      try {
        const tmp = await navigator.mediaDevices.getUserMedia({ audio: true });
        tmp.getTracks().forEach(t => t.stop());
      } catch (e) {
        // Permission denied — still show devices without labels
      }

      const all = await navigator.mediaDevices.enumerateDevices();
      this.mics = all.filter(d => d.kind === 'audioinput');
      this.outputs = all.filter(d => d.kind === 'audiooutput');

      this.populateMicSelect();
    } catch (err) {
      console.warn('[PENLIVE] Audio enumeration failed:', err);
    }
  }

  populateMicSelect() {
    if (!this.micSelect) return;
    this.micSelect.innerHTML = '';
    if (this.mics.length === 0) {
      this.micSelect.innerHTML = '<option value="">No microphone detected</option>';
      return;
    }
    this.mics.forEach((m, i) => {
      const opt = document.createElement('option');
      opt.value = m.deviceId;
      opt.textContent = m.label || `Microphone ${i + 1}`;
      this.micSelect.appendChild(opt);
    });

    // Hint user about external mics
    if (this.mics.length > 1) {
      this.app.toast.show(`${this.mics.length} microphones detected (external mic supported)`, 'info', 4000);
    }
  }

  getSelectedMicId() {
    return this.micSelect?.value || '';
  }
}
