// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_log::{Target, TargetKind};

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
    .plugin(tauri_plugin_path::init())
    .plugin(tauri_plugin_sql::Builder::default().build())
    .setup(|app| {
      log::info!("Application is starting up...");
      log::info!("Identifier: {}", app.package_info().name);
      log::info!("Version: {}", app.package_info().version);
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
