// PENLIVE - Library Core
// Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use sysinfo::{System, Disks};
use tauri::{Manager, WebviewWindowBuilder, WebviewUrl, Emitter};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Code, Modifiers, Shortcut};

// ============================================================
//  APP STATE
// ============================================================

#[derive(Default)]
pub struct AppState {
    pub autosave_dir: Option<PathBuf>,
}

// ============================================================
//  COMMANDS
// ============================================================

#[tauri::command]
fn get_system_info() -> SystemInfo {
    let mut sys = System::new_all();
    sys.refresh_all();

    let cpu_usage = sys.global_cpu_info().cpu_usage();
    let total_memory = sys.total_memory();
    let used_memory = sys.used_memory();

    let disks: Vec<DiskInfo> = Disks::new_with_refreshed_list()
        .iter()
        .map(|d| DiskInfo {
            name: d.name().to_string_lossy().to_string(),
            mount_point: d.mount_point().to_string_lossy().to_string(),
            total_space: d.total_space(),
            available_space: d.available_space(),
        })
        .collect();

    SystemInfo {
        cpu_brand: sys
            .cpus()
            .first()
            .map(|c| c.brand().to_string())
            .unwrap_or_default(),
        cpu_cores: sys.cpus().len() as u32,
        cpu_usage,
        total_memory_mb: (total_memory / 1024 / 1024) as u64,
        used_memory_mb: (used_memory / 1024 / 1024) as u64,
        disks,
    }
}

#[tauri::command]
fn setup_autosave_dir(app: tauri::AppHandle) -> Result<String, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("autosave");

    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.to_string_lossy().to_string())
}

#[tauri::command]
fn save_recording(
    window: tauri::WebviewWindow,
    bytes: Vec<u8>,
    suggested_name: String,
) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;

    let path = window
        .dialog()
        .file()
        .add_filter("Video", &["webm", "mp4", "gif"])
        .set_file_name(&suggested_name)
        .blocking_save_file()
        .ok_or("Save cancelled")?;

    let path_str = path.to_string();
    fs::write(&path_str, &bytes).map_err(|e| e.to_string())?;
    Ok(path_str)
}

#[tauri::command]
fn save_screenshot(
    window: tauri::WebviewWindow,
    bytes: Vec<u8>,
    suggested_name: String,
) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;

    let path = window
        .dialog()
        .file()
        .add_filter("Image", &["png", "jpg", "jpeg"])
        .set_file_name(&suggested_name)
        .blocking_save_file()
        .ok_or("Save cancelled")?;

    let path_str = path.to_string();
    fs::write(&path_str, &bytes).map_err(|e| e.to_string())?;
    Ok(path_str)
}

#[tauri::command]
fn save_canvas_state(app: tauri::AppHandle, json: String, name: String) -> Result<String, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("autosave");

    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let path = dir.join(format!("{}.json", name));
    fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
fn load_canvas_state(app: tauri::AppHandle, name: String) -> Result<Option<String>, String> {
    let path = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("autosave")
        .join(format!("{}.json", name));

    if path.exists() {
        let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        Ok(Some(content))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn open_overlay_window(
    app: tauri::AppHandle,
    monitor_index: Option<usize>,
) -> Result<(), String> {
    let url = WebviewUrl::App("index.html?mode=overlay".into());
    let label = format!("overlay-{}", chrono::Local::now().timestamp_millis());

    let mut builder = WebviewWindowBuilder::new(&app, &label, url)
        .title("PENLIVE Overlay")
        .fullscreen(true)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false);

    if let Some(_idx) = monitor_index {
        builder = builder.position(0.0, 0.0);
    }

    builder
        .build()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn close_overlay_windows(app: tauri::AppHandle) -> Result<(), String> {
    let windows = app.webview_windows();
    for (label, window) in windows.iter() {
        if label.starts_with("overlay-") {
            let _ = window.close();
        }
    }
    Ok(())
}

#[tauri::command]
fn list_monitors(window: tauri::WebviewWindow) -> Vec<MonitorInfo> {
    window
        .available_monitors()
        .map(|monitors| {
            monitors
                .iter()
                .map(|m| MonitorInfo {
                    name: m.name()
                        .map(|s| s.to_string())
                        .unwrap_or_default(),
                    width: m.size().width,
                    height: m.size().height,
                    scale_factor: m.scale_factor(),
                    position_x: m.position().x,
                    position_y: m.position().y,
                })
                .collect()
        })
        .unwrap_or_else(|_| Vec::new())
}

#[tauri::command]
fn get_app_info() -> AppInfo {
    AppInfo {
        name: "PENLIVE".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        author: "Er. Raju Kumawat".to_string(),
        copyright: "Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.".to_string(),
    }
}

// ============================================================
//  WINDOW CONTROLS
// ============================================================

#[tauri::command]
fn minimize_window(window: tauri::WebviewWindow) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
fn toggle_maximize(window: tauri::WebviewWindow) -> Result<bool, String> {
    let is_max = window.is_maximized().unwrap_or(false);
    if is_max {
        window.unmaximize().map_err(|e| e.to_string())?;
        Ok(false)
    } else {
        window.maximize().map_err(|e| e.to_string())?;
        Ok(true)
    }
}

#[tauri::command]
fn close_window(window: tauri::WebviewWindow) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

#[tauri::command]
fn enter_fullscreen(window: tauri::WebviewWindow) -> Result<(), String> {
    window.set_fullscreen(true).map_err(|e| e.to_string())
}

#[tauri::command]
fn exit_fullscreen(window: tauri::WebviewWindow) -> Result<(), String> {
    window.set_fullscreen(false).map_err(|e| e.to_string())
}

#[tauri::command]
fn toggle_fullscreen(window: tauri::WebviewWindow) -> Result<bool, String> {
    let is_fs = window.is_fullscreen().unwrap_or(false);
    window.set_fullscreen(!is_fs).map_err(|e| e.to_string())?;
    Ok(!is_fs)
}

#[tauri::command]
fn start_dragging(window: tauri::WebviewWindow) -> Result<(), String> {
    window.start_dragging().map_err(|e| e.to_string())
}

// ============================================================
//  DATA TYPES
// ============================================================

#[derive(Serialize)]
struct SystemInfo {
    cpu_brand: String,
    cpu_cores: u32,
    cpu_usage: f32,
    total_memory_mb: u64,
    used_memory_mb: u64,
    disks: Vec<DiskInfo>,
}

#[derive(Serialize)]
struct DiskInfo {
    name: String,
    mount_point: String,
    total_space: u64,
    available_space: u64,
}

#[derive(Serialize, Deserialize)]
struct MonitorInfo {
    name: String,
    width: u32,
    height: u32,
    scale_factor: f64,
    position_x: i32,
    position_y: i32,
}

#[derive(Serialize)]
struct AppInfo {
    name: String,
    version: String,
    author: String,
    copyright: String,
}

// ============================================================
//  GLOBAL SHORTCUTS
// ============================================================

fn register_global_shortcuts(app: &tauri::AppHandle) -> Result<(), String> {
    let shortcuts = [
        (Code::KeyP, "toggle-pen"),
        (Code::KeyH, "toggle-highlighter"),
        (Code::KeyE, "toggle-eraser"),
        (Code::KeyR, "toggle-recording"),
        (Code::KeyS, "take-screenshot"),
        (Code::KeyO, "toggle-overlay"),
        (Code::KeyZ, "undo"),
        (Code::KeyY, "redo"),
    ];

    for (code, action) in shortcuts {
        let sc = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), code);
        let action_str = action.to_string();
        app.global_shortcut()
            .on_shortcut(sc, move |app_handle, _shortcut, _event| {
                let _ = app_handle.emit(&action_str, ());
            })
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ============================================================
//  MAIN RUN
// ============================================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(AppState::default())
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                if let Some(window) = app.get_webview_window("main") {
                    window.open_devtools();
                }
            }
            if let Err(e) = register_global_shortcuts(app.handle()) {
                eprintln!("Hotkey registration failed: {}", e);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_system_info,
            setup_autosave_dir,
            save_recording,
            save_screenshot,
            save_canvas_state,
            load_canvas_state,
            open_overlay_window,
            close_overlay_windows,
            list_monitors,
            get_app_info,
            minimize_window,
            toggle_maximize,
            close_window,
            enter_fullscreen,
            exit_fullscreen,
            toggle_fullscreen,
            start_dragging,
        ])
        .run(tauri::generate_context!())
        .expect("error while running PENLIVE");
}
