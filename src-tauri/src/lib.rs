fn prevent_default_plugin() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    use tauri_plugin_prevent_default::Flags;

    let flags = if cfg!(debug_assertions) {
        Flags::all().difference(Flags::DEV_TOOLS | Flags::RELOAD)
    } else {
        Flags::all()
    };

    tauri_plugin_prevent_default::Builder::new()
        .with_flags(flags)
        .build()
}

#[cfg(target_os = "windows")]
fn disable_windows_browser_accelerator_keys(app: &tauri::App) {
    use tauri::Manager;
    use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2Settings3;
    use windows::core::Interface;

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.with_webview(|webview| {
            unsafe {
                if let Ok(core) = webview.controller().CoreWebView2() {
                    if let Ok(settings) = core.Settings() {
                        if let Ok(settings3) = settings.cast::<ICoreWebView2Settings3>() {
                            let _ = settings3.SetAreBrowserAcceleratorKeysEnabled(false);
                        }
                    }
                }
            }
        });
    }
}

#[cfg(not(target_os = "windows"))]
fn disable_windows_browser_accelerator_keys(_app: &tauri::App) {}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(prevent_default_plugin())
        .setup(|app| {
            disable_windows_browser_accelerator_keys(app);

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
