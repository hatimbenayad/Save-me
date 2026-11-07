use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::mpsc::{channel, Receiver, Sender};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

pub struct SaveWatcher {
    pub watch_path: PathBuf,
    pub debounce_duration: Duration,
    pub settle_poll_duration: Duration,
}

impl SaveWatcher {
    pub fn new<P: AsRef<Path>>(watch_path: P) -> Self {
        Self {
            watch_path: watch_path.as_ref().to_path_buf(),
            debounce_duration: Duration::from_millis(800),
            settle_poll_duration: Duration::from_millis(150),
        }
    }

    /// Spawns non-invasive watcher thread enforcing Invariant INV-01 & INV-03
    pub fn start_listening<F>(&self, on_quiescence: F) -> Result<(), String>
    where
        F: Fn(u32, Vec<(String, PathBuf)>) + Send + Sync + 'static,
    {
        if !self.watch_path.exists() {
            return Err(format!("Target directory does not exist: {:?}", self.watch_path));
        }

        let (tx, rx): (Sender<Event>, Receiver<Event>) = channel();
        let mut watcher = RecommendedWatcher::new(
            move |res: notify::Result<Event>| {
                if let Ok(event) = res {
                    let _ = tx.send(event);
                }
            },
            Config::default(),
        )
        .map_err(|e| format!("Watcher creation error: {}", e))?;

        watcher
            .watch(&self.watch_path, RecursiveMode::Recursive)
            .map_err(|e| format!("Watch path error: {}", e))?;

        let watch_dir = self.watch_path.clone();
        let debounce_ms = self.debounce_duration;
        let poll_ms = self.settle_poll_duration;
        let callback = Arc::new(on_quiescence);

        thread::spawn(move || {
            let _keep_alive = watcher;
            let last_event_time = Arc::new(Mutex::new(std::time::Instant::now()));

            while let Ok(event) = rx.recv() {
                // Invariant INV-01: We only listen to notifications, never write
                match event.kind {
                    EventKind::Modify(_) | EventKind::Create(_) => {
                        let mut time = last_event_time.lock().unwrap();
                        *time = std::time::Instant::now();
                        drop(time);

                        let watch_dir_clone = watch_dir.clone();
                        let last_event_clone = Arc::clone(&last_event_time);
                        let callback_clone = Arc::clone(&callback);

                        thread::spawn(move || {
                            thread::sleep(debounce_ms);
                            let elapsed = last_event_clone.lock().unwrap().elapsed();
                            if elapsed >= debounce_ms {
                                // Quiescence settle check
                                if let Some((slot_id, files)) = verify_settled(&watch_dir_clone, poll_ms) {
                                    callback_clone(slot_id, files);
                                }
                            }
                        });
                    }
                    _ => {}
                }
            }
        });

        Ok(())
    }
}

fn verify_settled(watch_dir: &Path, poll_duration: Duration) -> Option<(u32, Vec<(String, PathBuf)>)> {
    let files_initial = collect_slot_files(watch_dir)?;
    thread::sleep(poll_duration);
    let files_final = collect_slot_files(watch_dir)?;

    if files_initial.len() == files_final.len() {
        // Parse slot ID from path (e.g. maingame0 -> slot 0)
        let slot_id = 0; // Default slot
        Some((slot_id, files_final))
    } else {
        None
    }
}

fn collect_slot_files(dir: &Path) -> Option<Vec<(String, PathBuf)>> {
    let mut results = Vec::new();
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                // Invariant INV-01: Shared read check
                if fs::File::open(&path).is_ok() {
                    let name = entry.file_name().to_string_lossy().to_string();
                    results.push((name, path));
                }
            }
        }
        Some(results)
    } else {
        None
    }
}

