// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_log::{Target, TargetKind};
use tauri::Manager;
use std::fs;

#[tauri::command]
async fn get_temp_dir(app: tauri::AppHandle) -> Result<String, String> {
  app.path()
    .temp_dir()
    .map(|p| p.to_string_lossy().to_string())
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_temp_file(app: tauri::AppHandle, bytes: Vec<u8>, file_name: String) -> Result<String, String> {
  let temp_dir = app.path().temp_dir().map_err(|e| e.to_string())?;
  let file_path = temp_dir.join(file_name);
  fs::write(&file_path, bytes).map_err(|e| e.to_string())?;
  Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
async fn native_open(path: String) -> Result<(), String> {
  #[cfg(target_os = "windows")]
  {
    std::process::Command::new("explorer")
      .arg(&path)
      .spawn()
      .map_err(|e| e.to_string())?;
  }
  #[cfg(target_os = "macos")]
  {
    std::process::Command::new("open")
      .arg(&path)
      .spawn()
      .map_err(|e| e.to_string())?;
  }
  #[cfg(target_os = "linux")]
  {
    std::process::Command::new("xdg-open")
      .arg(&path)
      .spawn()
      .map_err(|e| e.to_string())?;
  }
  Ok(())
}

fn main() {
  tauri::Builder::default()
    .plugin(
      tauri_plugin_log::Builder::default()
        .targets([
          Target::new(TargetKind::Stdout),
          Target::new(TargetKind::LogDir { file_name: None }),
          Target::new(TargetKind::Webview),
        ])
        .build(),
    )
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_clipboard_manager::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_sql::Builder::default().build())
    .invoke_handler(tauri::generate_handler![get_temp_dir, save_temp_file, native_open])
    .setup(|app| {
      log::info!("Application is starting up...");
      log::info!("Identifier: {}", app.package_info().name);
      log::info!("Version: {}", app.package_info().version);
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
