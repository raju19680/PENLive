// ============================================================
// PENLIVE - Main Application Entry
// Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.
// ============================================================

import { DrawingEngine } from './modules/drawing.js';
import { SmartBoard } from './modules/smartboard.js';
import { RecordingStudio } from './modules/recording.js';
import { WebcamManager } from './modules/webcam.js';
import { AudioDevices } from './modules/audio.js';
import { Hotkeys } from './modules/hotkeys.js';
import { OverlayMode } from './modules/overlay.js';
import { AutoSave } from './modules/autosave.js';
import { VideoDropZone } from './modules/videodrop.js';
import { Toast } from './modules/toast.js';
import { SystemInfo } from './modules/sysinfo.js';
import { ThemeManager } from './modules/theme.js';
import { SnippingTool } from './modules/snipping.js';
import { CursorEffects } from './modules/cursorfx.js';
import { AdvancedDrawing } from './modules/advanced-drawing.js';
import { AudioMixer } from './modules/audio-mixer.js';
import { ScenesManager } from './modules/scenes.js';
import { Statistics } from './modules/statistics.js';
import { I18n } from './modules/i18n.js';
import { Templates } from './modules/templates.js';
import { PDFExport } from './modules/pdfexport.js';
import { ImageImport, TouchGestures } from './modules/imageimport.js';
import { RecordingEnhancements } from './modules/recording-enhancements.js';
import { UXModule } from './modules/ux.js';
import { BrowserModule } from './modules/browser.js';
import { LiveClass } from './modules/liveclass.js';
import { FileViewer } from './modules/fileviewer.js';
import { BoardColor } from './modules/boardcolor.js';
import { WindowControls } from './modules/windowcontrols.js';
import { DynamicToolbar } from './modules/dynamic-toolbar.js';
import { DockableSidebar } from './modules/dockable.js';
import { SplashScreen } from './modules/splash.js';
import { CommandPalette } from './modules/command-palette.js';

// Detect if running in Tauri or browser
const isTauri = window.__TAURI_INTERNALS__ !== undefined;
const isOverlayMode = new URLSearchParams(window.location.search).get('mode') === 'overlay';

class PenLive {
  constructor() {
    this.toast = new Toast();
    this.isOverlayMode = isOverlayMode;
    this.isTauri = isTauri;
    this.modules = {};
  }

  async init() {
    console.log('[PENLIVE] Initializing v1.0.0...', { isTauri, isOverlayMode });

    if (this.isOverlayMode) {
      await this.initOverlayMode();
      return;
    }

    // Initialize all modules in order (theme/i18n first, then UI modules)
    this.modules.theme = new ThemeManager(this);
    this.modules.i18n = new I18n(this);
    this.modules.drawing = new DrawingEngine(this);
    this.modules.advancedDrawing = new AdvancedDrawing(this);
    this.modules.smartboard = new SmartBoard(this);
    this.modules.webcam = new WebcamManager(this);
    this.modules.audio = new AudioDevices(this);
    this.modules.audioMixer = new AudioMixer(this);
    this.modules.recording = new RecordingStudio(this);
    this.modules.recEnhancements = new RecordingEnhancements(this);
    this.modules.hotkeys = new Hotkeys(this);
    this.modules.overlay = new OverlayMode(this);
    this.modules.autosave = new AutoSave(this);
    this.modules.videodrop = new VideoDropZone(this);
    this.modules.sysinfo = new SystemInfo(this);
    this.modules.snipping = new SnippingTool(this);
    this.modules.cursorfx = new CursorEffects(this);
    this.modules.templates = new Templates(this);
    this.modules.scenes = new ScenesManager(this);
    this.modules.statistics = new Statistics(this);
    this.modules.pdfexport = new PDFExport(this);
    this.modules.imageimport = new ImageImport(this);
    this.modules.touchGestures = new TouchGestures(this);
    this.modules.ux = new UXModule(this);
    this.modules.browser = new BrowserModule(this);
    this.modules.liveclass = new LiveClass(this);
    this.modules.fileviewer = new FileViewer(this);
    this.modules.boardcolor = new BoardColor(this);
    this.modules.windowcontrols = new WindowControls(this);
    this.modules.dynamicToolbar = new DynamicToolbar(this);
    this.modules.dockable = new DockableSidebar(this);
    this.modules.splash = new SplashScreen(this);
    this.modules.commandPalette = new CommandPalette(this);

    // Initialize splash first (visual feedback)
    if (this.modules.splash && this.modules.splash.init) {
      try { await this.modules.splash.init(); } catch (e) { console.error('Splash failed:', e); }
    }

    // Initialize each module
    for (const [name, mod] of Object.entries(this.modules)) {
      try {
        if (mod.init) await mod.init();
        console.log(`[PENLIVE] ${name} module ready`);
      } catch (err) {
        console.error(`[PENLIVE] ${name} init failed:`, err);
        this.toast.show(`${name} failed: ${err.message}`, 'error');
      }
    }

    // Wire up UI events after all modules ready
    this.wireGlobalUI();

    // Show welcome toast
    this.toast.show('PENLIVE v1.0.0 ready — © Er. Raju Kumawat', 'success');

    // Load auto-saved canvas if available
    if (this.modules.autosave) {
      setTimeout(() => this.modules.autosave.loadLast(), 800);
    }
  }

  async initOverlayMode() {
    document.body.dataset.mode = 'overlay';
    this.modules.drawing = new DrawingEngine(this);
    this.modules.hotkeys = new Hotkeys(this);
    this.modules.overlay = new OverlayMode(this);

    if (this.modules.drawing.init) await this.modules.drawing.init();
    if (this.modules.hotkeys.init) await this.modules.hotkeys.init();
    if (this.modules.overlay.init) await this.modules.overlay.init();

    this.toast.show('Overlay mode active — press Esc to exit', 'info');
  }

  wireGlobalUI() {
    // Title bar buttons
    document.getElementById('btn-new-page')?.addEventListener('click', () => {
      this.modules.smartboard.newPage();
      this.modules.statistics?.addPage();
    });
    document.getElementById('btn-undo')?.addEventListener('click', () => {
      this.modules.drawing.undo();
    });
    document.getElementById('btn-redo')?.addEventListener('click', () => {
      this.modules.drawing.redo();
    });
    document.getElementById('btn-clear')?.addEventListener('click', () => {
      this.modules.drawing.clear();
    });
    document.getElementById('btn-record')?.addEventListener('click', () => {
      this.modules.recEnhancements?.startWithCountdown() ||
      this.modules.recording.toggle();
    });
    document.getElementById('btn-screenshot')?.addEventListener('click', () => {
      this.modules.drawing.screenshot();
      this.modules.statistics?.increment('screenshots');
    });
    document.getElementById('btn-overlay')?.addEventListener('click', () => {
      this.modules.overlay.toggle();
    });
    document.getElementById('btn-settings')?.addEventListener('click', () => {
      this.showAbout();
    });

    // Panel tab switching
    document.querySelectorAll('.panel__nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tabTarget;
        document.querySelectorAll('.panel__nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.panel__tab').forEach(tab => {
          tab.hidden = tab.dataset.tab !== target;
        });
      });
    });

    // Status bar pagination
    document.getElementById('page-prev')?.addEventListener('click', () => {
      this.modules.smartboard.prevPage();
    });
    document.getElementById('page-next')?.addEventListener('click', () => {
      this.modules.smartboard.nextPage();
    });
    document.getElementById('page-add')?.addEventListener('click', () => {
      this.modules.smartboard.newPage();
      this.modules.statistics?.addPage();
    });

    // Schedule add button
    document.getElementById('schedule-add')?.addEventListener('click', () => {
      this.modules.recEnhancements.addScheduled();
    });

    // Bottom toolbar — snapshot and fullscreen
    document.getElementById('btb-snapshot')?.addEventListener('click', () => {
      this.modules.drawing?.screenshot();
      this.modules.statistics?.increment('screenshots');
    });

    document.getElementById('btb-fullscreen')?.addEventListener('click', () => {
      this.toggleFullscreen();
    });

    // Esc to exit overlay
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOverlayMode) {
        window.close();
      }
    });

    // Cursor position tracking
    document.getElementById('board-canvas')?.addEventListener('mousemove', (e) => {
      const rect = e.target.getBoundingClientRect();
      const x = Math.round(e.clientX - rect.left);
      const y = Math.round(e.clientY - rect.top);
      const el = document.getElementById('cursor-pos');
      if (el) el.textContent = `x: ${x}, y: ${y}`;
    });

    // Click anywhere outside floating panels to close them
    document.addEventListener('click', (e) => {
      const panels = ['cursor-fx-panel', 'template-panel', 'stamp-panel'];
      panels.forEach(id => {
        const panel = document.getElementById(id);
        if (panel && !panel.hidden && !panel.contains(e.target) &&
            !e.target.closest(`#btn-${id.replace('-panel', '').replace('-fx', '')}`)) {
          // Don't auto-close if clicking the toggle button
        }
      });
    });
  }

  showAbout() {
    document.getElementById('about-modal').hidden = false;
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {
        this.toast.show('Fullscreen not supported in browser preview', 'info');
      });
    } else {
      document.exitFullscreen?.();
    }
  }
}

// Boot
window.addEventListener('DOMContentLoaded', async () => {
  const app = new PenLive();
  window.penlive = app;
  await app.init();

  // About modal close
  document.getElementById('about-close')?.addEventListener('click', () => {
    document.getElementById('about-modal').hidden = true;
  });

  document.getElementById('about-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'about-modal') {
      e.target.hidden = true;
    }
  });
});
