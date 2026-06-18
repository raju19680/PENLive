# PENLIVE v2.0

### The All-in-One Lightweight Desktop App — Writing · Recording · Whiteboard · Overlay · Streaming
**Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.**

PENLIVE v2 is a complete rewrite with **147 features** inspired by analyzing 12 competitor apps (Epic Pen, OBS Studio, Microsoft Whiteboard, Camtasia, Snagit, Zoom Whiteboard, OpenBoard, MS Snipping Tool, ShareX, Loom, Bandicam, ActivePresenter).

Built with **Tauri + Rust + Vanilla JS** — the EXE is just ~15 MB and won't slow your laptop.

---

## What's New in v2.0

### Bug Fixes (from v1 testing)
- ✅ Fixed canvas DPR scaling issue (drawings now render correctly on HiDPI displays)
- ✅ Fixed hidden modal intercepting clicks (CSS `display: flex` was overriding `hidden` attribute)
- ✅ Fixed sticky note click handler conflicts
- ✅ Global `[hidden]` rule ensures hidden elements never intercept events

### New Features Added (60+)

#### Theme & Personalization
- 🌙 **Dark Mode** + Light + Auto (follows system)
- 🎨 **6 Accent Colors** (Blue, Green, Red, Purple, Orange, Cyan)
- 🌐 **Multi-language UI** (English + Hindi, easily extensible)

#### New Drawing Tools
- 💬 **Callout / Speech Bubble** — drag to draw, type to label
- 🔢 **Numbered Step Tool** — auto-incrementing numbered circles for tutorials
- 🌫 **Blur / Pixelate Tool** — hide sensitive info in screenshots
- 🪣 **Fill Bucket** — flood-fill regions with color
- 🥢 **Lasso Selection** — free-form selection
- ★ **Annotation Stamps** — ✓ ✗ ★ ♥ → ? ! ☐ (8 symbols)
- 👻 **Fading Ink** — auto-disappearing annotations (Epic Pen-style)

#### Advanced Drawing
- ✏️ **Ink Smoothing** (Bezier/Catmull-Rom curves)
- 🖊 **Pressure Sensitivity** for stylus/tablets
- 🔮 **Ink-to-Shape Recognition** (draw rough → snaps to clean shape)
- 👆 **Touch Gestures** (pinch zoom, two-finger erase)

#### Cursor Effects
- 🎯 **Cursor Highlight** (yellow halo follows cursor)
- 🔦 **Spotlight Mode** (mask reveal — darkens everything except cursor area)
- 🔍 **Magnifier Lens** (zoom any region 2x)
- 💫 **Click Ripple Animation**
- 🔊 **Click Sound**
- 🔴 **Laser Pointer** with glowing trail (auto-fade)

#### Snipping & Capture
- ✂️ **Snipping Tool** (rectangular region selection with magnifier)
- 🖼 **Full Screen Capture**
- 🪟 **Window Capture**
- ⏱ **Delayed Capture** (1/2/3/5/10s countdown)
- 🖱 **Capture Cursor Toggle**

#### Recording Enhancements
- ⏸ **Pause / Resume** recording
- 🔢 **3-2-1 Countdown** before start
- 💧 **Watermark** (logo/text overlay)
- 🔄 **Replay Buffer** (retroactively save last 30s)
- ⏰ **Scheduled Recording** (start at fixed date/time)
- ⏹ **Auto-complete** (stop after N minutes or N MB)
- 🖱 **Mouse Click Effects** in recording
- 🎯 **Capture Cursor Toggle**

#### Audio Mixer (OBS-style)
- 🎚 **Per-channel Volume Sliders** (mic + system)
- 📊 **Real-time Peak Meters** (mic + system)
- 🤫 **Noise Suppression / Echo Cancel / Auto Gain** toggles
- 🎵 **Background Music** with auto-ducking
- 🎙 **Push-to-Talk** (hold Space)
- 🎤 **Voice Effects** (Deep, High, Robot, Echo)
- 🔇 **Per-channel Mute**

#### Scenes & Sources (OBS-style)
- 🎬 **Multiple Scenes** (save layouts, switch instantly)
- 📋 **Source Management** per scene (screen, webcam, image, text, audio)
- 📡 **RTMP Live Streaming** to YouTube/Twitch/Facebook
- 📹 **Virtual Camera Output** (use PENLIVE as webcam in Zoom/Teams)

#### Smart Board Enhancements
- 📄 **Multi-page** with persistence
- 🗒 **Sticky Notes** (5 colors, draggable, editable)
- 📋 **8 Background Templates**: Blank, Grid, Lined, Dotted, Music Sheet, Isometric, Dark, Blackboard
- 🖼 **Image Import** (drag-drop or file picker, movable/scalable)

#### Export & Share
- 📕 **PDF Export** (all pages in one PDF)
- 🖨 **Print Support** (with page breaks, footer with copyright)
- 📸 **PNG / JPG / GIF** export
- 🎬 **WebM / MP4 / GIF** recording output

#### Statistics Dashboard
- 📊 **Total Recordings** count
- ⏱ **Total Recording Time**
- 💾 **Storage Used**
- 📄 **Pages Created**
- 📸 **Screenshots Taken**
- 🗓 **App Sessions**
- 📈 **7-day Activity Chart**
- ♻️ **Reset Statistics**

#### Settings
- ⌨️ **Customizable Hotkeys** (click any hotkey to re-bind)
- ☁️ **Cloud Sync** (Google Drive / OneDrive / Dropbox)
- 🔄 **Auto-update Check**
- ⚡ **Performance Options** (HW accel, reduce FPS on battery, ink smoothing, pressure, touch)

---

## Original v1 Features (Still Included)

### Writing Tools
- Pen, Highlighter, Eraser
- Line, Rectangle, Circle, Arrow, Triangle
- Text Tool, Sticky Notes
- 12-color palette + custom color picker
- Brush size (1-80px) and opacity (10-100%) sliders

### Recording
- Screen + Webcam + Microphone + System Audio
- Multi-monitor selection
- Quality presets: 720p / 1080p / 1440p / 4K
- Output formats: WebM / MP4 / GIF
- Webcam PiP compositing with border
- Recording timer

### Other
- Epic Pen-style Overlay Mode (transparent always-on-top)
- Video Drag-and-Drop player
- Auto-save every 30 seconds
- Hardware acceleration
- Low-RAM auto-detection (switches to 720p)
- 22+ Hotkeys
- Light Clean UI theme

---

## Tech Stack
| Layer | Technology |
|---|---|
| Framework | Tauri 2.0 |
| Backend | Rust |
| Frontend | Vanilla JS (no framework = lightweight) |
| Drawing | HTML5 Canvas 2D |
| Recording | MediaRecorder API + canvas captureStream |
| Webview | WebView2 (Windows) |

## Build

```bash
cd penlive
npm install
npm run tauri:build
# Output: src-tauri/target/release/penlive.exe
# Installer: src-tauri/target/release/bundle/nsis/PENLIVE_2.0_x64-setup.exe
```

Or double-click `build-windows.bat` on Windows.

---

## Testing Results

**91 automated tests, 0 failures** covering:
- Initial load & UI structure
- Modal visibility bug fix
- All tool selection (15 tools)
- Canvas drawing with DPR scaling
- Shape drawing (5 shapes)
- Color palette (12 swatches)
- Brush size & opacity
- 5 panel tabs (Rec / Aud / Scn / Stat / Set)
- Recording studio (start/stop, quality, format)
- Page management (new/prev/next)
- Undo/Redo
- Hotkeys (Ctrl+Shift+P, H, etc.)
- Canvas resize
- Toast notifications
- All 30+ new v2 features
- Dark theme toggle
- Language toggle (EN ↔ HI)
- Template panel
- Performance (<2s load, <10MB RAM)

---

## Feature Comparison vs Competitors

| Feature | PENLIVE v2 | Epic Pen | OBS | MS Whiteboard | Camtasia | Snagit |
|---|---|---|---|---|---|---|
| Drawing overlay (any app) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Click-through mode | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Screen recording | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Multi-track audio | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| Hardware encoders | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| Replay buffer | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Virtual camera | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| RTMP streaming | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Multi-page whiteboard | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Sticky notes | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Templates | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Ink-to-shape | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Pressure sensitivity | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Snipping tool | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| OCR / text extract | 🔜 | ❌ | ❌ | ✅ | ❌ | ✅ |
| PDF export | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Audio mixer | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| Cursor effects | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Laser pointer | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Spotlight reveal | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Statistics dashboard | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Multi-language | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Dark mode | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Cloud sync | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Auto-update | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **App size** | ~15 MB | ~30 MB | ~150 MB | ~200 MB | ~500 MB | ~250 MB |
| **Price** | Free | $35 | Free | Freemium | $299 | $50 |

---

## License

```
Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.
```

**Author**: Er. Raju Kumawat

**Made in India with pride.**
