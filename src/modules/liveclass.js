// ============================================================
// PENLIVE - Live Class Module
// Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.
//
// Create/join a class session with a unique code, share invite link,
// participant list, in-class chat, and quick-launch buttons for
// Zoom / Meet / Teams / YouTube Live.
// ============================================================

export class LiveClass {
  constructor(app) {
    this.app = app;
    this.panel = document.getElementById('liveclass-panel');
    this.isActive = false;
    this.classCode = null;
    this.participants = [];
    this.messages = [];
    this.userName = localStorage.getItem('penlive-username') || 'Host';
  }

  async init() {
    this.bindUI();
  }

  bindUI() {
    document.getElementById('btb-liveclass')?.addEventListener('click', () => this.toggle());

    document.getElementById('liveclass-close')?.addEventListener('click', () => this.hide());

    document.getElementById('liveclass-create')?.addEventListener('click', () => this.createClass());

    document.getElementById('liveclass-join')?.addEventListener('click', () => this.joinClass());

    document.getElementById('liveclass-copy')?.addEventListener('click', () => this.copyLink());

    document.getElementById('liveclass-chat-send')?.addEventListener('click', () => this.sendChat());
    document.getElementById('liveclass-chat-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.sendChat();
    });

    // Platform launch buttons
    document.querySelectorAll('.platform-btn').forEach(btn => {
      btn.addEventListener('click', () => this.launchPlatform(btn.dataset.platform));
    });
  }

  toggle() {
    if (!this.panel) return;
    this.panel.hidden = !this.panel.hidden;
    if (!this.panel.hidden) {
      this.app.toast.show('Live Class — start or join a session', 'info');
    }
  }

  hide() {
    if (this.panel) this.panel.hidden = true;
  }

  generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No 0, O, 1, I
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  createClass() {
    this.classCode = this.generateCode();
    this.isActive = true;
    this.participants = [{ name: this.userName + ' (Host)', role: 'host' }];
    this.messages = [{
      name: 'System',
      text: `Class ${this.classCode} created. Share the code with your students.`,
      time: new Date().toLocaleTimeString(),
      system: true,
    }];

    document.getElementById('liveclass-code-input').value = this.classCode;
    this.updateStatus(true);
    this.renderParticipants();
    this.renderMessages();
    this.app.toast.show(`Class created! Code: ${this.classCode}`, 'success', 5000);
    this.app.modules.statistics?.logActivity();
  }

  joinClass() {
    const code = document.getElementById('liveclass-code-input').value.trim().toUpperCase();
    if (!code || code.length < 6) {
      this.app.toast.show('Enter a 6-character class code', 'error');
      return;
    }
    this.classCode = code;
    this.isActive = true;
    this.participants = [{ name: this.userName, role: 'guest' }];
    this.messages = [{
      name: 'System',
      text: `Joined class ${code}`,
      time: new Date().toLocaleTimeString(),
      system: true,
    }];
    this.updateStatus(true);
    this.renderParticipants();
    this.renderMessages();
    this.app.toast.show(`Joined class ${code}`, 'success');
  }

  copyLink() {
    if (!this.classCode) {
      this.app.toast.show('Create or join a class first', 'error');
      return;
    }
    const link = `penlive://class/${this.classCode}`;
    navigator.clipboard?.writeText(link).then(() => {
      this.app.toast.show('Invite link copied!', 'success');
    }).catch(() => {
      // Fallback
      const input = document.createElement('input');
      input.value = link;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
      this.app.toast.show('Invite link copied!', 'success');
    });
  }

  sendChat() {
    const input = document.getElementById('liveclass-chat-input');
    const text = input.value.trim();
    if (!text) return;
    if (!this.isActive) {
      this.app.toast.show('Join a class first', 'error');
      return;
    }
    this.messages.push({
      name: this.userName,
      text,
      time: new Date().toLocaleTimeString(),
    });
    input.value = '';
    this.renderMessages();
  }

  updateStatus(active) {
    const status = document.getElementById('liveclass-status');
    if (!status) return;
    if (active) {
      status.classList.add('active');
      status.querySelector('.liveclass-status__icon').textContent = '🟢';
      status.querySelector('.liveclass-status__title').textContent = 'Live: ' + this.classCode;
      status.querySelector('.liveclass-status__sub').textContent = `${this.participants.length} participant(s)`;
    } else {
      status.classList.remove('active');
      status.querySelector('.liveclass-status__icon').textContent = '🔴';
      status.querySelector('.liveclass-status__title').textContent = 'Not Connected';
      status.querySelector('.liveclass-status__sub').textContent = 'Start or join a class session';
    }
  }

  renderParticipants() {
    const list = document.getElementById('liveclass-list');
    const count = document.getElementById('liveclass-count');
    if (count) count.textContent = this.participants.length;
    if (!list) return;
    if (this.participants.length === 0) {
      list.innerHTML = '<li class="liveclass-empty">No participants yet</li>';
      return;
    }
    list.innerHTML = this.participants.map(p => `
      <li>${p.name}</li>
    `).join('');
  }

  renderMessages() {
    const container = document.getElementById('liveclass-messages');
    if (!container) return;
    if (this.messages.length === 0) {
      container.innerHTML = '<div class="liveclass-chat__placeholder">Messages will appear here</div>';
      return;
    }
    container.innerHTML = this.messages.map(m => `
      <div style="padding:4px 0;border-bottom:1px solid var(--color-border);font-size:11px;">
        <div style="font-weight:600;color:${m.system ? 'var(--color-text-tertiary)' : 'var(--color-primary)'};">
          ${m.name} <span style="color:var(--color-text-tertiary);font-weight:400;font-size:9px;">${m.time}</span>
        </div>
        <div style="color:var(--color-text);">${this.escape(m.text)}</div>
      </div>
    `).join('');
    container.scrollTop = container.scrollHeight;
  }

  launchPlatform(platform) {
    const urls = {
      zoom: 'https://zoom.us/start',
      meet: 'https://meet.google.com/new',
      teams: 'https://teams.microsoft.com/meeting/new',
      youtube: 'https://www.youtube.com/live_dashboard',
    };
    const url = urls[platform];
    if (!url) return;

    if (this.app.isTauri) {
      import('@tauri-apps/plugin-shell').then(({ open }) => open(url));
    } else {
      window.open(url, '_blank');
    }
    this.app.toast.show(`Launching ${platform}...`, 'info');
  }

  escape(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
