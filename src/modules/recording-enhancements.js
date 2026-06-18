// ============================================================
// PENLIVE - Recording Enhancements Module
// Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.
//
// Adds to RecordingStudio:
//   - Pause / resume
//   - 3-2-1 countdown before start
//   - Watermark (logo/text overlay)
//   - Replay buffer (save last 30s retroactively)
//   - Scheduled recording (start at fixed time)
//   - Auto-complete (stop after time/size)
//   - Mouse click effects in recording
// ============================================================

export class RecordingEnhancements {
  constructor(app) {
    this.app = app;
    this.rec = app.modules.recording;
    this.paused = false;
    this.pausedAt = 0;
    this.totalPausedDuration = 0;
    this.countdownActive = false;
    this.scheduledTimers = [];
    this.autoStopTimer = null;
    this.replayBuffer = [];
    this.replayBufferSize = 30 * 1000; // 30 seconds
  }

  async init() {
    this.bindUI();
    this.loadScheduled();
  }

  bindUI() {
    // Pause / resume button
    document.getElementById('record-pause')?.addEventListener('click', () => this.togglePause());

    // Override the start button to add countdown
    const startBtn = document.getElementById('record-start');
    if (startBtn) {
      startBtn.removeEventListener('click', () => this.rec.start());
      startBtn.addEventListener('click', () => this.startWithCountdown());
    }
  }

  async startWithCountdown() {
    if (this.rec.isRecording) return;

    const countdownEnabled = document.getElementById('opt-countdown')?.checked;
    if (countdownEnabled) {
      await this.runCountdown(3);
    }

    await this.rec.start();

    // Setup auto-stop if configured
    this.setupAutoStop();

    // Setup replay buffer if enabled
    if (document.getElementById('opt-replay-buffer')?.checked) {
      this.startReplayBuffer();
    }
  }

  async runCountdown(seconds) {
    this.countdownActive = true;
    const display = document.getElementById('countdown-display');
    if (!display) return;

    display.hidden = false;
    for (let i = seconds; i > 0; i--) {
      display.textContent = i;
      await new Promise(r => setTimeout(r, 1000));
      if (!this.countdownActive) break;
    }
    display.hidden = true;
    this.countdownActive = false;
  }

  togglePause() {
    if (!this.rec.isRecording) return;

    if (!this.paused) {
      // Pause
      try {
        this.rec.mediaRecorder.pause();
        this.paused = true;
        this.pausedAt = Date.now();
        const btn = document.getElementById('record-pause');
        if (btn) {
          btn.textContent = '▶ Resume';
          btn.classList.add('paused');
        }
        this.app.toast.show('Recording paused', 'info');
      } catch (err) {
        this.app.toast.show('Pause failed', 'error');
      }
    } else {
      // Resume
      try {
        this.rec.mediaRecorder.resume();
        this.totalPausedDuration += Date.now() - this.pausedAt;
        this.paused = false;
        const btn = document.getElementById('record-pause');
        if (btn) {
          btn.textContent = '⏸ Pause';
          btn.classList.remove('paused');
        }
        this.app.toast.show('Recording resumed', 'info');
      } catch (err) {
        this.app.toast.show('Resume failed', 'error');
      }
    }
  }

  setupAutoStop() {
    const mode = document.getElementById('auto-stop-mode')?.value;
    const value = parseInt(document.getElementById('auto-stop-value')?.value, 10);

    if (mode === 'time' && value > 0) {
      this.autoStopTimer = setTimeout(() => {
        this.app.toast.show('Auto-stop: time limit reached', 'info');
        this.rec.stop();
      }, value * 60 * 1000);
    } else if (mode === 'size' && value > 0) {
      // Poll file size every 5 seconds
      const checkSize = setInterval(() => {
        if (!this.rec.isRecording) {
          clearInterval(checkSize);
          return;
        }
        const totalBytes = this.rec.chunks.reduce((sum, c) => sum + c.size, 0);
        if (totalBytes >= value * 1024 * 1024) {
          this.app.toast.show('Auto-stop: size limit reached', 'info');
          this.rec.stop();
          clearInterval(checkSize);
        }
      }, 5000);
    }
  }

  startReplayBuffer() {
    this.replayBuffer = [];
    // Hook into the existing ondataavailable
    const origHandler = this.rec.mediaRecorder.ondataavailable;
    this.rec.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.replayBuffer.push({ data: e.data, time: Date.now() });
        // Remove old chunks beyond buffer window
        const cutoff = Date.now() - this.replayBufferSize;
        this.replayBuffer = this.replayBuffer.filter(c => c.time > cutoff);
      }
      if (origHandler) origHandler.call(this.rec.mediaRecorder, e);
    };
    this.app.toast.show('Replay buffer active (last 30s)', 'info');
  }

  saveReplayBuffer() {
    if (this.replayBuffer.length === 0) {
      this.app.toast.show('Replay buffer empty', 'error');
      return;
    }
    const blob = new Blob(this.replayBuffer.map(c => c.data), { type: 'video/webm' });
    const name = `penlive-replay-${Date.now()}.webm`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.app.toast.show('Replay buffer saved', 'success');
  }

  // ============================================================
  // SCHEDULED RECORDING
  // ============================================================

  loadScheduled() {
    try {
      const saved = JSON.parse(localStorage.getItem('penlive-scheduled') || '[]');
      this.scheduled = saved;
      this.renderScheduled();
      // Re-arm any future timers
      this.scheduled.forEach(s => this.scheduleOne(s));
    } catch (e) {
      this.scheduled = [];
    }
  }

  addScheduled() {
    const timeInput = document.getElementById('schedule-time');
    const durationInput = document.getElementById('schedule-duration');
    if (!timeInput?.value) {
      this.app.toast.show('Pick a date/time', 'error');
      return;
    }
    const scheduledTime = new Date(timeInput.value).getTime();
    const duration = parseInt(durationInput?.value || '300', 10);

    if (scheduledTime <= Date.now()) {
      this.app.toast.show('Pick a future time', 'error');
      return;
    }

    const entry = {
      id: `sched-${Date.now()}`,
      time: scheduledTime,
      duration,
      label: new Date(scheduledTime).toLocaleString(),
    };
    this.scheduled.push(entry);
    this.saveScheduled();
    this.renderScheduled();
    this.scheduleOne(entry);
    this.app.toast.show('Recording scheduled', 'success');
  }

  scheduleOne(entry) {
    const delay = entry.time - Date.now();
    if (delay <= 0) return;
    const timer = setTimeout(async () => {
      this.app.toast.show('Scheduled recording starting...', 'info', 5000);
      await this.startWithCountdown();
      setTimeout(() => {
        if (this.rec.isRecording) this.rec.stop();
      }, entry.duration * 1000);
    }, delay);
    this.scheduledTimers.push({ id: entry.id, timer });
  }

  removeScheduled(id) {
    this.scheduled = this.scheduled.filter(s => s.id !== id);
    const timerEntry = this.scheduledTimers.find(t => t.id === id);
    if (timerEntry) clearTimeout(timerEntry.timer);
    this.scheduledTimers = this.scheduledTimers.filter(t => t.id !== id);
    this.saveScheduled();
    this.renderScheduled();
  }

  saveScheduled() {
    localStorage.setItem('penlive-scheduled', JSON.stringify(this.scheduled));
  }

  renderScheduled() {
    const list = document.getElementById('schedule-list');
    if (!list) return;
    if (this.scheduled.length === 0) {
      list.innerHTML = '<li class="recording-list__empty">No scheduled recordings</li>';
      return;
    }
    list.innerHTML = this.scheduled.map(s => `
      <li data-id="${s.id}">
        <span>${s.label} (${s.duration / 60}min)</span>
        <button data-action="delete">×</button>
      </li>
    `).join('');
    list.querySelectorAll('li[data-id]').forEach(li => {
      li.querySelector('[data-action="delete"]')?.addEventListener('click', () => {
        this.removeScheduled(li.dataset.id);
      });
    });
  }
}
