@echo off
REM ============================================================
REM  PENLIVE - Windows Build Script
REM  Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.
REM ============================================================
REM  Double-click this file to build PENLIVE.exe on Windows.
REM  Prerequisites: Node.js, Rust, Visual Studio C++ Build Tools.
REM ============================================================

title PENLIVE Build Script
color 0A

echo.
echo  ============================================================
echo   PENLIVE - Build Script
echo   Copyright (c) 2026 Er. Raju Kumawat
echo  ============================================================
echo.

REM Check Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Node.js not found.
    echo  Install from: https://nodejs.org
    pause
    exit /b 1
)
echo  [OK] Node.js found: 
node --version

REM Check Rust
where cargo >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Rust not found.
    echo  Install from: https://rustup.rs
    pause
    exit /b 1
)
echo  [OK] Rust found:
rustc --version

REM Install dependencies
echo.
echo  [INFO] Installing npm dependencies...
call npm install
if errorlevel 1 (
    echo  [ERROR] npm install failed.
    pause
    exit /b 1
)

REM Build
echo.
echo  [INFO] Building PENLIVE.exe (this may take 5-10 minutes)...
echo.
call npm run tauri:build
if errorlevel 1 (
    echo.
    echo  [ERROR] Build failed. Check the error messages above.
    echo  Common fixes:
    echo    - Install "Desktop development with C++" in Visual Studio Build Tools
    echo    - Restart terminal after installing Rust
    echo    - Run as Administrator if permission errors
    pause
    exit /b 1
)

echo.
echo  ============================================================
echo   BUILD SUCCESSFUL!
echo  ============================================================
echo.
echo  Your PENLIVE installer and EXE are at:
echo.
echo  src-tauri\target\release\penlive.exe              (portable)
echo  src-tauri\target\release\bundle\nsis\PENLIVE_1.0.0_x64-setup.exe  (installer)
echo.
echo  Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.
echo.
pause
