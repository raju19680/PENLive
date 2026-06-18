# 🚀 PENLIVE ko GitHub pe Upload karke EXE Download karna — Step by Step

**Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.**

Bhai, yeh complete guide hai. Bas follow karo — 30 minute me EXE download ready hoga!

---

## 📋 Requirements (Sirf Ek Baar)

1. **GitHub account** — aapka already hai ✅
2. **PENLIVE source code ZIP** — `/home/z/my-project/download/PENLIVE-FINAL-source-code.zip`
3. **Internet connection**

Bas! Koi Rust, Node.js, ya Visual Studio install karne ki zaroorat nahi — GitHub sab khud karega!

---

## 🎯 Step 1: ZIP File Download Karein

```
File location: /home/z/my-project/download/PENLIVE-FINAL-source-code.zip
```

Is ZIP ko apne computer pe download karein aur extract karein.

---

## 🎯 Step 2: GitHub pe New Repository Banayein

1. **GitHub.com** pe login karein
2. Top-right corner me **"+"** icon pe click karein → **"New repository"**
3. Form bharein:
   - **Repository name**: `penlive`
   - **Description**: `PENLIVE - Professional Drawing, Recording & Whiteboard Software by Er. Raju Kumawat`
   - **Visibility**: **Private** (recommended) ya **Public**
   - ☐ Add a README file — **unchecked** (hum apna README daalenge)
   - ☐ .gitignore — **unchecked** (hum apna daalenge)
   - ☐ License — **unchecked** (proprietary hai)
4. **"Create repository"** button pe click karein

---

## 🎯 Step 3: ZIP ko GitHub pe Upload Karein

### Option A: Browser se Upload (Easy — No Git Install)

1. Apne new GitHub repository me jayein
2. **"uploading an existing file"** link pe click karein (jo "Or create a new repository on the command line" wale section me hota hai)
3. ZIP extract karke jo `penlive` folder mile, uske andar ke **saare files** drag-drop karein browser me
   - **Important**: `penlive` folder ke ANDAR ke files upload karein, folder ko nahi
   - Yeh files honi chahiye:
     ```
     .github/
     .gitignore
     build-windows.bat
     package.json
     QUICK_START.md
     README.md
     vite.config.js
     src/
     src-tauri/
     ```
4. Bottom me **"Commit changes"** pe click karein
5. Commit message: `Initial PENLIVE v1.0.0 release` likhein
6. **"Commit changes"** button pe click karein

### Option B: Git Command Line se (Agar Git installed hai)

```bash
# ZIP extract karein
unzip PENLIVE-FINAL-source-code.zip
cd penlive

# Git initialize karein
git init
git add .
git commit -m "PENLIVE v1.0.0 - Initial release"

# GitHub remote add karein (apne repo URL se replace karein)
git branch -M main
git remote add origin https://github.com/APNA-USERNAME/penlive.git
git push -u origin main
```

---

## 🎯 Step 4: GitHub Actions Auto-Build Trigger Hoga

Jaise hi aap files upload karenge:

1. GitHub **automatically** build start karega
2. Repository me **"Actions"** tab pe click karein (top me)
3. Aapko **"Build PENLIVE Windows EXE"** workflow chalte hua dikhega
4. **Yellow dot** 🟡 = build chal raha hai (10-15 minute lagenge)
5. **Green check** ✅ = build successful!
6. **Red X** ❌ = build fail — log check karein

---

## 🎯 Step 5: EXE Download Karein

Build complete hone ke baad:

1. **"Actions"** tab me successful run pe click karein
2. Bottom me scroll karein — **"Artifacts"** section dikhega
3. Yeh 3 files milengi:
   - 📦 **PENLIVE-portable-exe** — Standalone EXE (no install needed)
   - 📦 **PENLIVE-installer-nsis** — NSIS installer (recommended)
   - 📦 **PENLIVE-installer-msi** — MSI installer (enterprise)
4. Jo chahiye, uspe click karein → **ZIP download** ho jayegi
5. ZIP extract karein → **PENLIVE.exe** milega!

---

## 🎯 Step 6 (Optional): Proper Release Banayein

Agar aap chahte hain ki EXE permanently download link ke saath available ho (90 days ke baad Actions artifacts delete ho jate hain):

1. Apne computer me `penlive` folder kholen
2. Git tag create karein:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
3. GitHub automatically **"Releases"** section me EXE upload kar dega
4. Releases section me jayein → **"PENLIVE v1.0.0"** dikhega
5. Wahan se EXE permanently download kar sakte hain

---

## 🔧 Troubleshooting

### Problem: Build Fail Ho Gaya
**Solution**: 
1. Actions tab me failed run pe click karein
2. Red X wale step pe click karein
3. Error log padhein
4. Common errors:
   - `npm ci` fails → `package-lock.json` missing — `npm install` use karein workflow me
   - Rust compile error → code check karein
   - Disk space — GitHub runner me 14GB limit hai

### Problem: EXE nahi mila
**Solution**:
- Check karein ki `src-tauri/tauri.conf.json` me `bundle.targets` me `nsis` aur `msi` hain
- Build logs me "bundle" search karein

### Problem: Actions tab nahi dikha
**Solution**:
- Repository settings me jayein → Actions → General → "Allow all actions" select karein

---

## 📞 Build Time Estimate

- **First build**: 15-20 minutes (Rust compile from scratch)
- **Subsequent builds**: 5-10 minutes (cached dependencies)
- **Free tier limit**: 2000 minutes/month (private repos) — ek build me ~20 min lagte hain, so ~100 builds/month free

---

## 🎉 Final Result

Build successful hone ke baad aapke paas:

1. **PENLIVE-portable.exe** (~15 MB) — Directly chalao, koi install nahi
2. **PENLIVE-Setup.exe** (~25 MB) — Installer (Start Menu shortcut bhi banega)
3. **PENLIVE.msi** — Enterprise deployment ke liye

Sab Windows 10/11 64-bit pe chalega!

---

## 📝 Future Updates

Agar future me code update karna ho:

1. Code change karein
2. GitHub pe naya version push karein (ya browser se upload karein)
3. GitHub Actions automatically naya EXE banayega
4. Naya tag push karein (`v1.1.0`) → naya Release automatically ban jayega

---

**Bhai, bas itna karna hai! 30 minute me aapke paas apna PENLIVE.exe hoga!** 🚀

Agar koi problem aaye to bata dena — main help kar dunga.

© Er. Raju Kumawat
