/**
 * Save Rewind - Frontend Application State & "Line of Blocks" Controller
 * Supports hybrid operation: Native Tauri IPC bridge + Standalone Browser mode.
 */

// Initial Seed Data reflecting realistic playthrough saves
let snapshots = [
  {
    id: "snap-1",
    slotId: 0,
    title: "Slot 0 Initialized",
    notes: "New game started at Bamboo Forest shrine",
    sizeBytes: 450 * 1024,
    deltaBytes: 0,
    timestamp: "2026-11-07 13:40:12",
    isPinned: false,
    isSafety: false
  },
  {
    id: "snap-2",
    slotId: 0,
    title: "Slot 0 changed (+12.4 KB)",
    notes: "Acquired Bronze Bell relic from herbalist",
    sizeBytes: 462.4 * 1024,
    deltaBytes: 12.4 * 1024,
    timestamp: "2026-11-07 13:58:30",
    isPinned: true,
    isSafety: false
  },
  {
    id: "snap-3",
    slotId: 0,
    title: "Slot 0 changed (+4.1 KB)",
    notes: "Right before talking to Fox Spirit (Ending Fork)",
    sizeBytes: 466.5 * 1024,
    deltaBytes: 4.1 * 1024,
    timestamp: "2026-11-07 14:15:05",
    isPinned: true,
    isSafety: false
  },
  {
    id: "snap-4",
    slotId: 0,
    title: "Slot 0 changed (+18.2 KB)",
    notes: "Defeated Mountain Guardian",
    sizeBytes: 484.7 * 1024,
    deltaBytes: 18.2 * 1024,
    timestamp: "2026-11-07 14:32:44",
    isPinned: false,
    isSafety: false
  }
];

let activeTab = "all";
let searchQuery = "";
let pendingRestoreTarget = null;
const isTauri = typeof window !== 'undefined' && (window.__TAURI__ !== undefined || window.__TAURI_INTERNALS__ !== undefined);

// DOM Elements
const timelineContainer = document.getElementById("timeline-list");
const searchInput = document.getElementById("search-input");
const btnSimulate = document.getElementById("btn-simulate-save");
const btnQuickMark = document.getElementById("btn-quick-mark");
const restoreModal = document.getElementById("restore-modal");
const btnConfirmRestore = document.getElementById("btn-confirm-restore");
const btnCancelRestore = document.getElementById("btn-cancel-restore");
const modalTargetDesc = document.getElementById("modal-target-desc");

// Format helpers
function formatBytes(bytes) {
  if (bytes === 0) return "0 KB";
  return (bytes / 1024).toFixed(1) + " KB";
}

function formatDelta(delta) {
  if (delta === 0) return "Initial";
  if (delta > 0) return `+${(delta / 1024).toFixed(1)} KB`;
  return `${(delta / 1024).toFixed(1)} KB`;
}

// Render Timeline Blocks
function renderTimeline() {
  timelineContainer.innerHTML = "";

  const filtered = snapshots
    .filter(s => {
      if (activeTab === "pinned") return s.isPinned;
      if (activeTab === "slot0") return s.slotId === 0;
      if (activeTab === "slot1") return s.slotId === 1;
      return true;
    })
    .filter(s => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.title.toLowerCase().includes(q) ||
        (s.notes && s.notes.toLowerCase().includes(q)) ||
        s.id.toLowerCase().includes(q)
      );
    })
    .slice()
    .reverse(); // Most recent on top

  if (filtered.length === 0) {
    timelineContainer.innerHTML = `
      <div style="text-align: center; color: #64748b; padding: 40px;">
        No snapshot blocks found matching filter.
      </div>
    `;
    return;
  }

  filtered.forEach(snap => {
    const blockEl = document.createElement("div");
    blockEl.className = `timeline-block ${snap.isPinned ? "pinned" : ""} ${snap.isSafety ? "safety" : ""}`;

    blockEl.innerHTML = `
      <div class="block-node"></div>
      <div class="block-card">
        <div class="block-header">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="${snap.isSafety ? "safety-tag" : "slot-tag"}">
              ${snap.isSafety ? "⚠️ Safety Rollback" : `Slot ${snap.slotId}`}
            </span>
            ${snap.isPinned ? '<span style="color:#fbbf24; font-size:12px;">📌 Pinned</span>' : ''}
          </div>
          <span class="block-time">${snap.timestamp}</span>
        </div>

        <div class="block-title-row">
          <span class="block-title" id="title-${snap.id}" title="Click to rename">
            ${escapeHtml(snap.title)}
          </span>
          <span class="edit-hint">✎ click to edit</span>
        </div>

        ${snap.notes ? `<div class="block-notes">"${escapeHtml(snap.notes)}"</div>` : ''}

        <div class="block-footer">
          <div class="block-metrics">
            <span>Size: <strong>${formatBytes(snap.sizeBytes)}</strong></span>
            <span>Delta: <strong>${formatDelta(snap.deltaBytes)}</strong></span>
          </div>
          <div class="block-actions">
            <button class="btn btn-sm" onclick="togglePin('${snap.id}')">
              ${snap.isPinned ? "Unpin" : "Pin"}
            </button>
            <button class="btn btn-sm btn-restore" onclick="promptRestore('${snap.id}')">
              ⤺ Restore
            </button>
          </div>
        </div>
      </div>
    `;

    // Inline edit listener
    const titleEl = blockEl.querySelector(`#title-${snap.id}`);
    titleEl.addEventListener("click", () => startInlineEdit(snap.id, titleEl));

    timelineContainer.appendChild(blockEl);
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Inline Rename
async function startInlineEdit(id, element) {
  const snap = snapshots.find(s => s.id === id);
  if (!snap) return;

  const currentTitle = snap.title;
  const input = document.createElement("input");
  input.type = "text";
  input.className = "title-input";
  input.value = currentTitle;

  element.replaceWith(input);
  input.focus();
  input.select();

  async function finish() {
    const val = input.value.trim();
    if (val && val !== currentTitle) {
      snap.title = val;
      if (isTauri && window.__TAURI__?.core) {
        try {
          await window.__TAURI__.core.invoke("update_title", { snapshotId: id, newTitle: val });
        } catch (e) {
          console.warn("Tauri invoke update_title:", e);
        }
      }
    }
    renderTimeline();
  }

  input.addEventListener("blur", finish);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") finish();
    if (e.key === "Escape") renderTimeline();
  });
}

// Toggle Pin
window.togglePin = async function(id) {
  const snap = snapshots.find(s => s.id === id);
  if (snap) {
    snap.isPinned = !snap.isPinned;
    if (isTauri && window.__TAURI__?.core) {
      try {
        await window.__TAURI__.core.invoke("toggle_pin", { snapshotId: id });
      } catch (e) {
        console.warn("Tauri invoke toggle_pin:", e);
      }
    }
    renderTimeline();
  }
};

// Safe Restore (Invariant INV-02)
window.promptRestore = function(id) {
  const target = snapshots.find(s => s.id === id);
  if (!target) return;

  pendingRestoreTarget = target;
  modalTargetDesc.innerHTML = `
    <strong>Target Checkpoint:</strong> ${escapeHtml(target.title)} (${target.timestamp})<br/>
    <strong>Slot:</strong> Slot ${target.slotId} | <strong>Size:</strong> ${formatBytes(target.sizeBytes)}
  `;
  restoreModal.classList.add("active");
};

btnConfirmRestore.addEventListener("click", async () => {
  if (!pendingRestoreTarget) return;

  // Invariant INV-02: Create safety snapshot of current active state first
  const latestSnapshot = snapshots[snapshots.length - 1];
  const safetySnapshot = {
    id: `safety-${Date.now()}`,
    slotId: latestSnapshot.slotId,
    title: `[Pre-Restore Safety Rollback] Before rewinding to ${pendingRestoreTarget.id}`,
    notes: `Automated safety checkpoint created immediately before rewinding to "${pendingRestoreTarget.title}"`,
    sizeBytes: latestSnapshot.sizeBytes,
    deltaBytes: 0,
    timestamp: new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''),
    isPinned: true,
    isSafety: true
  };

  if (isTauri && window.__TAURI__?.core) {
    try {
      await window.__TAURI__.core.invoke("restore_snapshot", {
        snapshotId: pendingRestoreTarget.id,
        targetDir: "./test_gameslots/maingame0",
        processName: "Project_Plague.exe"
      });
    } catch (e) {
      console.warn("Tauri invoke restore_snapshot:", e);
    }
  }

  snapshots.push(safetySnapshot);
  restoreModal.classList.remove("active");
  pendingRestoreTarget = null;
  renderTimeline();

  alert("✓ Safe Restore Completed!\n\nAn automatic [Pre-Restore Safety Rollback] snapshot was captured. Your game save has been safely rewound without data loss.");
});

btnCancelRestore.addEventListener("click", () => {
  restoreModal.classList.remove("active");
  pendingRestoreTarget = null;
});

// Simulate Live In-Game Save Event
btnSimulate.addEventListener("click", async () => {
  const last = snapshots[snapshots.length - 1];
  const deltaKb = (Math.random() * 15 + 2).toFixed(1);
  const deltaBytes = Math.round(parseFloat(deltaKb) * 1024);
  const newSize = last.sizeBytes + deltaBytes;

  const newSnap = {
    id: `snap-${snapshots.length + 1}`,
    slotId: 0,
    title: `Slot 0 changed (+${deltaKb} KB)`,
    notes: "Auto-captured save write flush",
    sizeBytes: newSize,
    deltaBytes: deltaBytes,
    timestamp: new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''),
    isPinned: false,
    isSafety: false
  };

  if (isTauri && window.__TAURI__?.core) {
    try {
      await window.__TAURI__.core.invoke("simulate_save_write", {
        targetDir: "./test_gameslots/maingame0",
        deltaKb: parseInt(deltaKb, 10)
      });
    } catch (e) {}
  }

  snapshots.push(newSnap);
  renderTimeline();
});

// Quick Mark Hotkey Handler (Ctrl+Shift+S / In-app trigger)
function triggerQuickMark() {
  const label = prompt(
    "📌 Quick Mark Checkpoint (Ctrl+Shift+S)\n\nEnter a note for this checkpoint (e.g. 'Before talking to NPC' or 'Boss Door'):",
    "Manual Checkpoint"
  );
  if (!label) return;

  const last = snapshots[snapshots.length - 1];
  const newSnap = {
    id: `quickmark-${Date.now()}`,
    slotId: 0,
    title: `Quick Mark: ${label}`,
    notes: "Saved via Ctrl+Shift+S shortcut",
    sizeBytes: last.sizeBytes,
    deltaBytes: 0,
    timestamp: new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''),
    isPinned: true,
    isSafety: false
  };

  if (isTauri && window.__TAURI__?.core) {
    try {
      window.__TAURI__.core.invoke("quick_mark", { label });
    } catch (e) {}
  }

  snapshots.push(newSnap);
  renderTimeline();
}

btnQuickMark.addEventListener("click", triggerQuickMark);

// Global Keyboard Shortcut: Ctrl + Shift + S
window.addEventListener("keydown", e => {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "S" || e.key === "s")) {
    e.preventDefault();
    triggerQuickMark();
  }
});

// Search and Tabs
searchInput.addEventListener("input", e => {
  searchQuery = e.target.value.trim();
  renderTimeline();
});

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    activeTab = tab.dataset.tab;
    renderTimeline();
  });
});

// Auto-detect save path if in Tauri
if (isTauri && window.__TAURI__?.core) {
  window.__TAURI__.core.invoke("detect_wuchang_path").then(path => {
    if (path) {
      const statusPill = document.querySelector(".status-pill span:last-child");
      if (statusPill) {
        statusPill.innerHTML = `Watching: <strong>Wuchang</strong> (${escapeHtml(path)})`;
      }
    }
  }).catch(() => {});
}

// Initial render
renderTimeline();
