// PENLIVE - Main Entry Point
// Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.

// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    penlive_lib::run()
}
