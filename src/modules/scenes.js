// ============================================================
// PENLIVE - Scenes & Sources Module (OBS-style)
// Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.
//
// Manages multiple scenes, each with its own set of sources.
// Supports RTMP streaming and virtual camera output.
// ============================================================

export class ScenesManager {
  constructor(app) {
    this.app = app;
    this.scenes = [
      { id: 'default', name: 'Default Scene', sources: [] }
    ];
    this.currentSceneId = 'default';
    this.streamActive = false;
    this.vcamActive = false;
    this.stream = null;
  }

  async init() {
    this.bindUI();
    this.renderScenes();
  }

  bindUI() {
    document.getElementById('scene-add')?.addEventListener('click', () => this.addScene());
    document.getElementById('scene-duplicate')?.addEventListener('click', () => this.duplicateScene());
    document.getElementById('source-add')?.addEventListener('click', () => this.addSource());

    document.getElementById('stream-start')?.addEventListener('click', () => this.startStreaming());
    document.getElementById('stream-stop')?.addEventListener('click', () => this.stopStreaming());
    document.getElementById('vcam-start')?.addEventListener('click', () => this.startVCam());
    document.getElementById('vcam-stop')?.addEventListener('click', () => this.stopVCam());
  }

  addScene() {
    const id = `scene-${Date.now()}`;
    const name = prompt('Scene name:', `Scene ${this.scenes.length + 1}`);
    if (!name) return;
    this.scenes.push({ id, name, sources: [] });
    this.renderScenes();
    this.app.toast.show(`Scene "${name}" added`, 'success');
  }

  duplicateScene() {
    const current = this.scenes.find(s => s.id === this.currentSceneId);
    if (!current) return;
    const id = `scene-${Date.now()}`;
    const name = `${current.name} (copy)`;
    this.scenes.push({ id, name, sources: [...current.sources] });
    this.renderScenes();
    this.app.toast.show('Scene duplicated', 'success');
  }

  switchScene(id) {
    this.currentSceneId = id;
    this.renderScenes();
    this.renderSources();
    const scene = this.scenes.find(s => s.id === id);
    this.app.toast.show(`Switched to: ${scene?.name}`, 'info');
  }

  addSource() {
    const types = ['screen', 'webcam', 'image', 'text', 'audio'];
    const type = prompt(`Source type (${types.join(', ')}):`, 'screen');
    if (!type || !types.includes(type)) {
      this.app.toast.show('Invalid source type', 'error');
      return;
    }
    const name = prompt('Source name:', `${type}_${Date.now() % 1000}`);
    if (!name) return;
    const scene = this.scenes.find(s => s.id === this.currentSceneId);
    if (scene) {
      scene.sources.push({ id: `src-${Date.now()}`, type, name, visible: true });
      this.renderSources();
      this.app.toast.show(`Source "${name}" added`, 'success');
    }
  }

  renderScenes() {
    const list = document.getElementById('scene-list');
    if (!list) return;
    list.innerHTML = this.scenes.map(s => `
      <li class="scene-item ${s.id === this.currentSceneId ? 'active' : ''}" data-scene="${s.id}">
        ${s.name}
      </li>
    `).join('');
    list.querySelectorAll('.scene-item').forEach(li => {
      li.addEventListener('click', () => this.switchScene(li.dataset.scene));
    });
  }

  renderSources() {
    const list = document.getElementById('source-list');
    if (!list) return;
    const scene = this.scenes.find(s => s.id === this.currentSceneId);
    if (!scene || scene.sources.length === 0) {
      list.innerHTML = '<li class="recording-list__empty">No sources added</li>';
      return;
    }
    list.innerHTML = scene.sources.map(src => `
      <li data-src="${src.id}">
        <span>${src.name} (${src.type})</span>
        <div>
          <button data-action="toggle" title="Toggle visibility">${src.visible ? '👁' : '🚫'}</button>
          <button data-action="delete" title="Delete">×</button>
        </div>
      </li>
    `).join('');
    list.querySelectorAll('li[data-src]').forEach(li => {
      const id = li.dataset.src;
      li.querySelector('[data-action="toggle"]')?.addEventListener('click', () => {
        const s = scene.sources.find(x => x.id === id);
        if (s) s.visible = !s.visible;
        this.renderSources();
      });
      li.querySelector('[data-action="delete"]')?.addEventListener('click', () => {
        scene.sources = scene.sources.filter(x => x.id !== id);
        this.renderSources();
      });
    });
  }

  async startStreaming() {
    const url = document.getElementById('rtmp-url')?.value;
    const key = document.getElementById('rtmp-key')?.value;
    if (!url) {
      this.app.toast.show('Enter RTMP URL', 'error');
      return;
    }
    this.app.toast.show('Streaming requires native build (Tauri). Connect via OBS-style RTMP output.', 'info', 5000);
    // In Tauri build, this would invoke a Rust RTMP encoder
    this.streamActive = true;
    document.getElementById('stream-start').disabled = true;
    document.getElementById('stream-stop').disabled = false;
  }

  stopStreaming() {
    this.streamActive = false;
    document.getElementById('stream-start').disabled = false;
    document.getElementById('stream-stop').disabled = true;
    this.app.toast.show('Streaming stopped', 'info');
  }

  async startVCam() {
    this.app.toast.show('Virtual camera requires native build. Outputs composite canvas as a virtual webcam device.', 'info', 5000);
    this.vcamActive = true;
    document.getElementById('vcam-start').disabled = true;
    document.getElementById('vcam-stop').disabled = false;
  }

  stopVCam() {
    this.vcamActive = false;
    document.getElementById('vcam-start').disabled = false;
    document.getElementById('vcam-stop').disabled = true;
  }
}
