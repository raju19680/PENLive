# PENLIVE — Quick Start Build Guide

**Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.**

PENLIVE ko Windows EXE banane ke liye yeh steps follow karein:

---

## Step 1: Prerequisites Install Karein (Sirf Ek Baar)

### 1a. Rust Toolchain
Download: https://rustup.rs
- `rustup-init.exe` ko run karein
- Default installation select karein
- Terminal restart karein
- Verify: `rustc --version`

### 1b. Node.js 18+
Download: https://nodejs.org
- LTS version install karein
- Verify: `node --version`

### 1c. Visual Studio C++ Build Tools
Download: https://visualstudio.microsoft.com/visual-cpp-build-tools/
- Install karte time **"Desktop development with C++"** workload select karein
- Yeh Rust ko Windows pe compile karne ke liye zaroori hai

### 1d. WebView2 Runtime (Usually Pre-installed)
- Windows 11 me already installed hota hai
- Windows 10 ke liye: https://developer.microsoft.com/microsoft-edge/webview2/

---

## Step 2: Build Karein

### Option A: One-Click Build (Recommended)
```
Double-click: build-windows.bat
```
Yeh script automatically:
- npm dependencies install karega
- Tauri build chalayega
- EXE generate karega

### Option B: Manual Build
```bash
cd penlive
npm install
npm run tauri:build
```

Build time: **5-10 minutes** (first time, due to Rust compilation)
Subsequent builds: **30 seconds - 2 minutes**

---

## Step 3: EXE Location

Build complete hone ke baad yeh files milti hain:

```
penlive/src-tauri/target/release/
├── penlive.exe                                  ← Portable EXE (no install)
└── bundle/
    ├── nsis/
    │   └── PENLIVE_1.0.0_x64-setup.exe          ← Installer (recommended)
    └── msi/
        └── PENLIVE_1.0.0_x64_en-US.msi          ← MSI installer
```

---

## Step 4: Distribute / Use

### End Users ke liye:
- `PENLIVE_1.0.0_x64-setup.exe` de dein
- Yeh install karne ke baad Start Menu me "PENLIVE" appear hoga
- Desktop shortcut bhi ban jayega

### Portable use:
- `penlive.exe` directly kisi bhi folder me copy karke chala sakte hain
- Koi installation zaroorat nahi

---

## Troubleshooting

### "link.exe not found"
→ Visual Studio C++ Build Tools install karein with "Desktop development with C++" workload

### "cargo not found"
→ Rust install karein, terminal restart karein

### "vite not found"
→ `npm install` dobara run karein

### Build bahut slow hai
→ First build me 10 min lagte hain (Rust compile). Next time fast hoga.

### Webcam/Mic permission
→ Windows Settings → Privacy → Camera/Microphone → Allow apps to access

### EXE size bahut bada
→ Release build me strip = true aur lto = true already enabled hai (~10-15 MB final size)

---

## First Run Tips

1. **PENLIVE launch karein** — top bar me "PENLIVE by Er. Raju Kumawat" dikhega
2. **Drawing tools** — Left toolbar se Pen/Highlighter/Eraser/Shapes/Text select karein
3. **Recording** — Right panel me "Recording Studio" tab me sources check karein (Screen + Webcam + Mic) aur "Start Recording" press karein
4. **External Mic** — Right panel me "Microphone Device" dropdown se apna USB/Bluetooth mic select karein
5. **Overlay Mode** — Top bar me "Overlay" button press karein, kisi bhi app ke upar draw karein
6. **Hotkeys** — Ctrl+Shift+R = Record, Ctrl+Shift+P = Pen, etc.
7. **Video Drag-Drop** — Koi bhi video file canvas pe drag karein, player open ho jayega

---

## Support

**Author**: Er. Raju Kumawat
**Copyright**: © 2026 Er. Raju Kumawat. All rights reserved.

For any queries, contact the author.

---

*Made in India with pride.*
