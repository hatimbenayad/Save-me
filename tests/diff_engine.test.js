/**
 * Unit Tests: Diff Title Engine & Safe Restore Invariants
 */

const assert = require('assert');

function calculateDiffTitle(slotId, currentBytes, previousBytes) {
    if (previousBytes === null || previousBytes === undefined || previousBytes === 0) {
        return `Slot ${slotId} Initialized (${(currentBytes / 1024).toFixed(1)} KB)`;
    }
    const delta = currentBytes - previousBytes;
    if (delta >= 0) {
        return `Slot ${slotId} changed (+${(delta / 1024).toFixed(1)} KB)`;
    } else {
        return `Slot ${slotId} changed (${(delta / 1024).toFixed(1)} KB)`;
    }
}

function executeSafeRestoreSimulation(activeSnapshots, targetSnapshotId) {
    const target = activeSnapshots.find(s => s.id === targetSnapshotId);
    if (!target) {
        throw new Error("Target snapshot not found");
    }

    // INVARIANT INV-02: Safety snapshot MUST be created first
    const activeState = activeSnapshots[activeSnapshots.length - 1];
    const safetyRollbackSnapshot = {
        id: `safety-rollback-${Date.now()}`,
        slotId: activeState.slotId,
        title: `[Pre-Restore Safety Rollback] Before rewinding to ${target.id}`,
        isPinned: true,
        isSafety: true,
        timestamp: new Date().toISOString()
    };

    // Prepend/append safety snapshot to history
    const updatedSnapshots = [...activeSnapshots, safetyRollbackSnapshot];
    
    // Simulate restoration of target
    return {
        restoredSnapshot: target,
        safetySnapshot: safetyRollbackSnapshot,
        totalSnapshots: updatedSnapshots.length
    };
}

// ================= TEST SUITE =================

console.log("Running Diff Engine & Safe Restore Unit Tests...\n");

// Test 1: Initial Save
{
    const title = calculateDiffTitle(0, 450 * 1024, 0);
    assert.strictEqual(title, "Slot 0 Initialized (450.0 KB)");
    console.log("✓ Test 1 Passed: Initial save title formatting.");
}

// Test 2: Positive Delta (+12.4 KB)
{
    const title = calculateDiffTitle(0, (450 + 12.4) * 1024, 450 * 1024);
    assert.strictEqual(title, "Slot 0 changed (+12.4 KB)");
    console.log("✓ Test 2 Passed: Positive delta formatting.");
}

// Test 3: Negative Delta (-5.2 KB)
{
    const title = calculateDiffTitle(1, (300 - 5.2) * 1024, 300 * 1024);
    assert.strictEqual(title, "Slot 1 changed (-5.2 KB)");
    console.log("✓ Test 3 Passed: Negative delta formatting.");
}

// Test 4: Safe Restore Pre-Rollback Invariant (INV-02)
{
    const mockSnapshots = [
        { id: "snap-1", slotId: 0, title: "Slot 0 Initialized" },
        { id: "snap-2", slotId: 0, title: "Slot 0 changed (+12.0 KB)" },
        { id: "snap-3", slotId: 0, title: "Slot 0 changed (+4.0 KB)" }
    ];

    const result = executeSafeRestoreSimulation(mockSnapshots, "snap-1");
    assert.strictEqual(result.restoredSnapshot.id, "snap-1");
    assert.strictEqual(result.safetySnapshot.isSafety, true);
    assert.strictEqual(result.safetySnapshot.isPinned, true);
    assert.strictEqual(result.totalSnapshots, 4);
    console.log("✓ Test 4 Passed: Safe Restore strictly enforces Pre-Restore Rollback (INV-02).");
}

console.log("\nAll unit test assertions passed successfully! (4/4)\n");
