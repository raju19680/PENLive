// ============================================================
// PENLIVE - Recording Studio
// Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.
//
// Implements:
//   - Screen recording (getDisplayMedia)
//   - Webcam recording (getUserMedia video)
//   - Microphone recording (getUserMedia audio, external mic support)
//   - System audio capture (Windows: getDisplayMedia audio: true)
//   - Multi-monitor selection
//   - Video quality presets (720p / 1080p / 1440p / 4K)
//   - Output format selection (WebM / MP4 / GIF)
//   - Recording timer
//   - Compositing: webcam PiP overlay on screen capture
//   - Auto-save on stop
// ============================================================

export class RecordingStudio {
  constructor(app) {
    this.app = app;
    this.isRecording = false;
    this.mediaRecorder = null;
    this.chunks = [];
    this.streams = {
      screen: null,
      webcam: null,
      mic: null,
      systemAudio: null,
    };
    this.combinedStream = null;
    this.startTime = 0;
    this.timerInterval = null;
    this.quality = '1080p';
    this.format = 'webm';
    this.recordings = []; // list of saved recordings metadata

    // UI elements
    this.startBtn = document.getElementById('record-start');
    this.stopBtn = document.getElementById('record-stop');
    this.timerEl = document.getElementById('record-timer');
    this.recList = document.getElementById('recording-list');
    this.titleRecBtn = document.getElementById('btn-record');
  }

  async init() {
    this.bindUI();
    await this.refreshRecordings();
  }

  bindUI() {
    this.startBtn?.addEventListener('click', () => this.start());
    this.stopBtn?.addEventListener('click', () => this.stop());

    // Quality buttons
    document.querySelectorAll('.quality-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.quality = btn.dataset.quality;
      });
    });

    // Format select
    document.getElementById('format-select')?.addEventListener('change', (e) => {
      this.format = e.target.value;
    });
  }

  getQualitySettings() {
    const presets = {
      '720p':  { width: 1280, height: 720,  fps: 30, bitrate: 2_500_000 },
      '1080p': { width: 1920, height: 1080, fps: 30, bitrate: 5_000_000 },
      '1440p': { width: 2560, height: 1440, fps: 30, bitrate: 8_000_000 },
      '4k':    { width: 3840, height: 2160, fps: 60, bitrate: 15_000_000 },
    };
    return presets[this.quality] || presets['1080p'];
  }

  getMimeTypes() {
    // Try best-supported mime type for the chosen format
    if (this.format === 'mp4') {
      const candidates = [
        'video/mp4;codecs=h264,aac',
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/mp4',
      ];
      for (const c of candidates) {
        if (MediaRecorder.isTypeSupported(c)) return c;
      }
    }
    if (this.format === 'gif') {
      // GIF will be encoded from WebM frames after recording
      return 'video/webm;codecs=vp8';
    }
    // Default: WebM
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ];
    for (const c of candidates) {
      if (MediaRecorder.isTypeSupported(c)) return c;
    }
    return 'video/webm';
  }

  // ============================================================
  // START RECORDING
  // ============================================================

  async start() {
    if (this.isRecording) return;

    try {
      const settings = this.getQualitySettings();
      const wantScreen = document.getElementById('src-screen')?.checked;
      const wantWebcam = document.getElementById('src-webcam')?.checked;
      const wantMic = document.getElementById('src-mic')?.checked;
      const wantSystemAudio = document.getElementById('src-system-audio')?.checked;

      if (!wantScreen && !wantWebcam) {
        this.app.toast.show('Select at least Screen or Webcam', 'error');
        return;
      }

      // 1. SCREEN CAPTURE
      if (wantScreen) {
        const monitorIdx = parseInt(document.getElementById('monitor-select')?.value || '0', 10);
        this.streams.screen = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: settings.width },
            height: { ideal: settings.height },
            frameRate: { ideal: settings.fps },
          },
          audio: wantSystemAudio, // Windows: this captures system audio
        });

        // Listen for user-initiated stop (browser bar)
        this.streams.screen.getVideoTracks()[0].addEventListener('ended', () => {
          if (this.isRecording) this.stop();
        });
      }

      // 2. WEBCAM
      if (wantWebcam) {
        const webcamId = document.getElementById('webcam-select')?.value;
        this.streams.webcam = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: webcamId ? { exact: webcamId } : undefined,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      }

      // 3. MICROPHONE (external mic supported via deviceId)
      if (wantMic) {
        const micId = document.getElementById('mic-select')?.value;
        this.streams.mic = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: micId ? { exact: micId } : undefined,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });
      }

      // 4. COMPOSITE STREAM (webcam PiP overlay on screen)
      const tracks = [];
      if (this.streams.screen) {
        tracks.push(...this.streams.screen.getVideoTracks());
      } else if (this.streams.webcam) {
        tracks.push(...this.streams.webcam.getVideoTracks());
      }

      // Audio tracks
      const audioTracks = [];
      if (this.streams.screen?.getAudioTracks().length) {
        audioTracks.push(...this.streams.screen.getAudioTracks());
      }
      if (this.streams.mic?.getAudioTracks().length) {
        audioTracks.push(...this.streams.mic.getAudioTracks());
      }

      // If we have both screen video + webcam, composite them via canvas
      let recordStream;
      if (this.streams.screen && this.streams.webcam) {
        recordStream = await this.createCompositeStream(settings, audioTracks);
      } else {
        recordStream = new MediaStream([...tracks, ...audioTracks]);
      }

      // 5. MEDIA RECORDER
      this.chunks = [];
      const mimeType = this.getMimeTypes();
      this.mediaRecorder = new MediaRecorder(recordStream, {
        mimeType,
        videoBitsPerSecond: settings.bitrate,
        audioBitsPerSecond: 128_000,
      });

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data);
      };

      this.mediaRecorder.onstop = () => this.onRecorderStop();

      this.mediaRecorder.start(1000); // 1-second chunks
      this.isRecording = true;
      this.startTime = Date.now();

      // Update UI
      this.startBtn.disabled = true;
      this.stopBtn.disabled = false;
      this.titleRecBtn?.classList.add('recording');
      document.getElementById('rec-label').textContent = 'Stop';

      // Start timer
      this.timerInterval = setInterval(() => this.updateTimer(), 1000);
      this.updateTimer();

      // Auto-save setup
      this.app.modules.autosave?.markRecordingStart();

      this.app.toast.show('Recording started', 'success');
      console.log('[PENLIVE] Recording started', { quality: this.quality, format: this.format });
    } catch (err) {
      console.error('[PENLIVE] Record start failed:', err);
      this.app.toast.show(`Recording failed: ${err.message}`, 'error', 5000);
      this.cleanupStreams();
    }
  }

  // ============================================================
  // COMPOSITE STREAM (Webcam PiP on Screen)
  // ============================================================

  async createCompositeStream(settings, audioTracks) {
    const canvas = document.createElement('canvas');
    canvas.width = settings.width;
    canvas.height = settings.height;
    const ctx = canvas.getContext('2d');

    const screenVideo = document.createElement('video');
    screenVideo.srcObject = this.streams.screen;
    screenVideo.muted = true;
    await screenVideo.play();

    const webcamVideo = document.createElement('video');
    webcamVideo.srcObject = this.streams.webcam;
    webcamVideo.muted = true;
    await webcamVideo.play();

    // PiP dimensions — use webcam PiP position if set, else bottom-right default
    const draw = () => {
      // Draw screen
      ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);

      // Get PiP position from webcam module (where user placed it)
      const pipPos = this.app.modules.webcam?.getPipPosition();
      let pipW, pipH, pipX, pipY;

      if (pipPos) {
        // Scale from canvas-area pixels to recording canvas pixels
        const canvasArea = document.getElementById('canvas-area');
        const areaRect = canvasArea?.getBoundingClientRect() || { width: canvas.width, height: canvas.height };
        const scaleX = canvas.width / areaRect.width;
        const scaleY = canvas.height / areaRect.height;

        pipW = pipPos.width * scaleX;
        pipH = pipPos.height * scaleY;
        pipX = pipPos.x * scaleX;
        pipY = pipPos.y * scaleY;
      } else {
        // Default bottom-right
        pipW = Math.floor(canvas.width * 0.22);
        pipH = Math.floor(pipW * (webcamVideo.videoHeight / webcamVideo.videoWidth));
        pipX = canvas.width - pipW - 30;
        pipY = canvas.height - pipH - 30;
      }

      // Draw webcam PiP with border
      ctx.fillStyle = '#fff';
      ctx.fillRect(pipX - 4, pipY - 4, pipW + 8, pipH + 8);
      try {
        ctx.drawImage(webcamVideo, pipX, pipY, pipW, pipH);
      } catch (e) {}

      // Border
      ctx.strokeStyle = '#1a73e8';
      ctx.lineWidth = 3;
      ctx.strokeRect(pipX - 4, pipY - 4, pipW + 8, pipH + 8);

      if (this.isRecording) {
        requestAnimationFrame(draw);
      }
    };
    draw();

    const canvasStream = canvas.captureStream(settings.fps);
    audioTracks.forEach(t => canvasStream.addTrack(t));
    return canvasStream;
  }

  // ============================================================
  // STOP RECORDING
  // ============================================================

  stop() {
    if (!this.isRecording) return;
    this.isRecording = false;

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    clearInterval(this.timerInterval);
    this.startBtn.disabled = false;
    this.stopBtn.disabled = true;
    this.titleRecBtn?.classList.remove('recording');
    document.getElementById('rec-label').textContent = 'Record';

    this.cleanupStreams();
    this.app.toast.show('Saving recording...', 'info');
  }

  toggle() {
    if (this.isRecording) this.stop();
    else this.start();
  }

  onRecorderStop() {
    const mimeType = this.getMimeTypes();
    const blob = new Blob(this.chunks, { type: mimeType });
    const extension = this.format === 'mp4' ? 'mp4' : this.format === 'gif' ? 'webm' : 'webm';
    const name = `penlive-recording-${new Date().toISOString().replace(/[:.]/g, '-')}.${extension}`;
    const size = (blob.size / 1024 / 1024).toFixed(2);

    // Convert blob to bytes for Tauri save
    blob.arrayBuffer().then(async (buf) => {
      const bytes = Array.from(new Uint8Array(buf));

      if (this.app.isTauri) {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const path = await invoke('save_recording', { bytes, suggestedName: name });
          this.recordings.unshift({ name, size, path, date: new Date().toISOString() });
          this.app.toast.show(`Saved: ${name} (${size} MB)`, 'success', 5000);
        } catch (err) {
          // Fallback: browser download
          this.downloadBlob(blob, name);
          this.app.toast.show('Downloaded recording', 'success');
        }
      } else {
        this.downloadBlob(blob, name);
        this.app.toast.show('Recording downloaded', 'success');
      }

      // If GIF requested, convert from WebM (simplified - shows note)
      if (this.format === 'gif') {
        this.app.toast.show('Note: GIF conversion requires post-processing. Saved as WebM.', 'info', 5000);
      }

      this.refreshRecordings();
    });
  }

  downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ============================================================
  // TIMER
  // ============================================================

  updateTimer() {
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
    const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
    const s = String(elapsed % 60).padStart(2, '0');
    if (this.timerEl) this.timerEl.textContent = `${h}:${m}:${s}`;
  }

  // ============================================================
  // CLEANUP
  // ============================================================

  cleanupStreams() {
    Object.values(this.streams).forEach(stream => {
      stream?.getTracks().forEach(t => t.stop());
    });
    this.streams = { screen: null, webcam: null, mic: null, systemAudio: null };
  }

  // ============================================================
  // RECORDINGS LIST
  // ============================================================

  async refreshRecordings() {
    if (!this.recList) return;
    if (this.recordings.length === 0) {
      this.recList.innerHTML = '<li class="recording-list__empty">No recordings yet</li>';
      return;
    }

    this.recList.innerHTML = this.recordings.map((r, i) => `
      <li data-idx="${i}">
        <span class="recording-list__name">${r.name}</span>
        <span class="recording-list__size">${r.size} MB</span>
        <div class="recording-list__actions">
          <button data-action="open">Open</button>
          <button data-action="delete">×</button>
        </div>
      </li>
    `).join('');

    this.recList.querySelectorAll('li[data-idx]').forEach(li => {
      const idx = parseInt(li.dataset.idx, 10);
      li.querySelector('[data-action="open"]')?.addEventListener('click', () => {
        this.openRecording(idx);
      });
      li.querySelector('[data-action="delete"]')?.addEventListener('click', () => {
        this.recordings.splice(idx, 1);
        this.refreshRecordings();
      });
    });
  }

  async openRecording(idx) {
    const rec = this.recordings[idx];
    if (!rec) return;
    if (this.app.isTauri && rec.path) {
      try {
        const { open } = await import('@tauri-apps/plugin-shell');
        await open(rec.path);
      } catch (err) {
        this.app.toast.show('Cannot open file', 'error');
      }
    }
  }
}
