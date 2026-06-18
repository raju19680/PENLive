// ============================================================
// PENLIVE - Audio Mixer Module
// Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.
//
// Real-time audio peak meters, volume controls per channel,
// noise suppression toggle, push-to-talk, audio ducking,
// background music with auto-duck, voice effects.
// ============================================================

export class AudioMixer {
  constructor(app) {
    this.app = app;
    this.micStream = null;
    this.sysStream = null;
    this.micAnalyser = null;
    this.sysAnalyser = null;
    this.micGain = 1.0;
    this.sysGain = 0.8;
    this.micMuted = false;
    this.sysMuted = false;
    this.bgMusic = null;
    this.bgMusicVolume = 0.3;
    this.pttEnabled = false;
    this.pttActive = false;
    this.voiceFx = 'none';
    this.duckingEnabled = false;
    this.audioContext = null;
  }

  async init() {
    this.bindUI();
    // Start meter polling
    this.updateMeters();
  }

  bindUI() {
    // Volume sliders
    document.getElementById('mic-volume')?.addEventListener('input', (e) => {
      this.micGain = parseInt(e.target.value, 10) / 100;
      document.getElementById('mic-volume-value').textContent = e.target.value;
      this.applyMicGain();
    });
    document.getElementById('sys-volume')?.addEventListener('input', (e) => {
      this.sysGain = parseInt(e.target.value, 10) / 100;
      document.getElementById('sys-volume-value').textContent = e.target.value;
    });

    // Mute toggles
    document.getElementById('mic-mute')?.addEventListener('change', (e) => {
      this.micMuted = e.target.checked;
      this.applyMicGain();
      this.app.toast.show(this.micMuted ? 'Mic muted' : 'Mic unmuted', 'info');
    });
    document.getElementById('sys-mute')?.addEventListener('change', (e) => {
      this.sysMuted = e.target.checked;
    });

    // Push-to-talk
    document.getElementById('ptt-enable')?.addEventListener('change', (e) => {
      this.pttEnabled = e.target.checked;
      this.setupPTT();
    });

    // Background music
    document.getElementById('bgm-browse')?.addEventListener('click', () => {
      document.getElementById('bgm-file')?.click();
    });
    document.getElementById('bgm-file')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) this.loadBgMusic(file);
    });
    document.getElementById('bgm-volume')?.addEventListener('input', (e) => {
      this.bgMusicVolume = parseInt(e.target.value, 10) / 100;
      document.getElementById('bgm-volume-value').textContent = e.target.value;
      if (this.bgMusic) this.bgMusic.volume = this.bgMusicVolume;
    });

    // Voice FX
    document.getElementById('voice-fx')?.addEventListener('change', (e) => {
      this.voiceFx = e.target.value;
      this.applyVoiceFx();
    });

    // Ducking toggle
    document.getElementById('mic-ducking')?.addEventListener('change', (e) => {
      this.duckingEnabled = e.target.checked;
    });
  }

  // Called when recording starts — wire up analysers
  async setupAnalysers(micStream, sysStream) {
    this.micStream = micStream;
    this.sysStream = sysStream;

    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (micStream) {
      const src = this.audioContext.createMediaStreamSource(micStream);
      this.micAnalyser = this.audioContext.createAnalyser();
      this.micAnalyser.fftSize = 256;
      src.connect(this.micAnalyser);
    }

    if (sysStream) {
      const src = this.audioContext.createMediaStreamSource(sysStream);
      this.sysAnalyser = this.audioContext.createAnalyser();
      this.sysAnalyser.fftSize = 256;
      src.connect(this.sysAnalyser);
    }
  }

  applyMicGain() {
    // Note: actual gain applied via Web Audio API gain node would go here.
    // For now we just track state; the recording module uses micStream directly.
    // Real implementation would route through GainNode.
  }

  applyVoiceFx() {
    // Real implementation would use AudioWorklet or BiquadFilterNode
    this.app.toast.show(`Voice FX: ${this.voiceFx}`, 'info');
  }

  loadBgMusic(file) {
    if (this.bgMusic) {
      this.bgMusic.pause();
      this.bgMusic = null;
    }
    const url = URL.createObjectURL(file);
    this.bgMusic = new Audio(url);
    this.bgMusic.volume = this.bgMusicVolume;
    this.bgMusic.loop = true;
    this.bgMusic.play();
    this.app.toast.show(`Playing: ${file.name}`, 'success');
  }

  setupPTT() {
    if (this.pttEnabled) {
      document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !e.repeat) {
          this.pttActive = true;
          this.micMuted = false;
        }
      });
      document.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
          this.pttActive = false;
          this.micMuted = true;
        }
      });
      this.app.toast.show('Push-to-talk: hold Space to speak', 'info');
    }
  }

  updateMeters() {
    if (this.micAnalyser) {
      const data = new Uint8Array(this.micAnalyser.frequencyBinCount);
      this.micAnalyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      const pct = Math.min(100, (avg / 128) * 100 * (this.micMuted ? 0 : 1));
      const bar = document.getElementById('mic-peak-bar');
      if (bar) bar.style.width = `${pct}%`;

      // Ducking — if mic is loud, lower bg music
      if (this.duckingEnabled && this.bgMusic && pct > 30) {
        this.bgMusic.volume = this.bgMusicVolume * 0.3;
      } else if (this.bgMusic) {
        this.bgMusic.volume = this.bgMusicVolume;
      }
    }

    if (this.sysAnalyser) {
      const data = new Uint8Array(this.sysAnalyser.frequencyBinCount);
      this.sysAnalyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      const pct = Math.min(100, (avg / 128) * 100 * (this.sysMuted ? 0 : 1));
      const bar = document.getElementById('sys-peak-bar');
      if (bar) bar.style.width = `${pct}%`;
    }

    requestAnimationFrame(() => this.updateMeters());
  }

  // Apply mic constraints based on settings
  getMicConstraints() {
    const deviceId = this.app.modules.audio?.getSelectedMicId();
    return {
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: document.getElementById('mic-echo-cancel')?.checked ?? true,
        noiseSuppression: document.getElementById('mic-noise-suppress')?.checked ?? true,
        autoGainControl: document.getElementById('mic-agc')?.checked ?? true,
      },
      video: false,
    };
  }
}
