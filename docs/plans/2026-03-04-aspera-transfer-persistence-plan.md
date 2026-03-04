# Aspera Transfer Persistence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reconnect to active Aspera FASP transfers after page reload so the uploads panel shows progress for transfers still running in Connect.

**Architecture:** SDK owns transfer truth. localStorage persists a thin `{transferUuid -> videoId, uploadId, createdAt}` mapping as a reconnect bridge. On init, `getAllTransfers()` + localStorage rebuild the in-memory `asperaMapRef`, and the existing activity callback picks them up. `reconcileProcessingStatus` is the safety net for transfers that complete while no tab is listening.

**Tech Stack:** IBM Aspera SDK JS (`window.asperaSdk`), React hooks, localStorage

---

### Task 1: Add `getAllTransfers()` to SDK facade

**Files:**
- Modify: `src/lib/asperaSdk.ts:6-22` (Window type) and add new export after `registerActivityCallback`

**Step 1: Add `getAllTransfers` to the Window type declaration**

In `src/lib/asperaSdk.ts`, add to the `window.asperaSdk` interface (after `registerActivityCallback`):

```ts
      getAllTransfers(): Promise<unknown>;
```

**Step 2: Add the wrapper function**

After the `registerActivityCallback` export (~line 97), add:

```ts
export async function getAllTransfers(): Promise<TransferInfo[]> {
  try {
    const raw = await withTimeout(sdk().getAllTransfers(), 3000, "getAllTransfers");
    return parseAllTransfers(raw);
  } catch {
    return [];
  }
}
```

**Step 3: Verify typecheck passes**

Run: `bun run typecheck`
Expected: no errors

**Step 4: Commit**

```bash
git add src/lib/asperaSdk.ts
git commit -m "feat: expose getAllTransfers in Aspera SDK facade"
```

---

### Task 2: Add localStorage transfer map helpers

**Files:**
- Create: `src/lib/asperaTransferMap.ts`

**Step 1: Create the transfer map module**

```ts
import type { Id } from "@convex/_generated/dataModel";

const STORAGE_KEY = "lawn.asperaTransferMap";
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface TransferMapEntry {
  videoId: string; // serialized Id<"videos">
  uploadId: string;
  createdAt: number;
}

type TransferMap = Record<string, TransferMapEntry>;

function readMap(): TransferMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as TransferMap;
  } catch {
    return {};
  }
}

function writeMap(map: TransferMap): void {
  if (typeof window === "undefined") return;
  const keys = Object.keys(map);
  if (keys.length === 0) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

/** Purge entries older than 24h, return the rest. */
export function readAndPurgeTransferMap(): Map<string, { videoId: Id<"videos">; uploadId: string }> {
  const raw = readMap();
  const now = Date.now();
  const result = new Map<string, { videoId: Id<"videos">; uploadId: string }>();
  const cleaned: TransferMap = {};

  for (const [uuid, entry] of Object.entries(raw)) {
    if (now - entry.createdAt > TTL_MS) continue;
    cleaned[uuid] = entry;
    result.set(uuid, {
      videoId: entry.videoId as Id<"videos">,
      uploadId: entry.uploadId,
    });
  }

  writeMap(cleaned);
  return result;
}

/** Save a new transfer mapping. */
export function saveTransferMapping(
  transferUuid: string,
  videoId: Id<"videos">,
  uploadId: string,
): void {
  const map = readMap();
  map[transferUuid] = { videoId: videoId as string, uploadId, createdAt: Date.now() };
  writeMap(map);
}

/** Remove a transfer mapping (on completed/failed). */
export function removeTransferMapping(transferUuid: string): void {
  const map = readMap();
  delete map[transferUuid];
  writeMap(map);
}
```

**Step 2: Verify typecheck passes**

Run: `bun run typecheck`
Expected: no errors

**Step 3: Commit**

```bash
git add src/lib/asperaTransferMap.ts
git commit -m "feat: add localStorage helpers for Aspera transfer reconnect mapping"
```

---

### Task 3: Persist mapping on transfer start

**Files:**
- Modify: `app/routes/dashboard/-useVideoUploadManager.ts`

**Step 1: Add import**

At the top of the file, add:

```ts
import { saveTransferMapping, removeTransferMapping } from "@/lib/asperaTransferMap";
```

**Step 2: Save to localStorage after startTransfer**

In `asperaUploadToProject`, after `asperaMapRef.current.set(asperaTransferId, ...)` (~line 349), add:

```ts
          saveTransferMapping(asperaTransferId, createdVideoId, uploadId);
```

**Step 3: Remove from localStorage on completed/failed**

In the activity callback, after each `asperaMapRef.current.delete(info.uuid)` call:

- After the completed delete (~line 191), add:
```ts
          removeTransferMapping(info.uuid);
```

- After the failed delete (~line 222), add:
```ts
          removeTransferMapping(info.uuid);
```

**Step 4: Verify typecheck passes**

Run: `bun run typecheck`
Expected: no errors

**Step 5: Commit**

```bash
git add app/routes/dashboard/-useVideoUploadManager.ts
git commit -m "feat: persist Aspera transfer mappings to localStorage"
```

---

### Task 4: Reconnect to active transfers on init

**Files:**
- Modify: `app/routes/dashboard/-useVideoUploadManager.ts`

**Step 1: Add imports**

Add to existing imports:

```ts
import { getAllTransfers } from "@/lib/asperaSdk";
import { readAndPurgeTransferMap } from "@/lib/asperaTransferMap";
```

(Note: `getAllTransfers` is new; `readAndPurgeTransferMap` may already be imported from Task 3 — just add `readAndPurgeTransferMap` to the existing import if so.)

**Step 2: Add reconnect logic to the asperaAvailable useEffect**

The existing `useEffect` at ~line 165 registers the activity callback when `asperaAvailable` becomes true. Add reconnect logic **after** the `registerActivityCallback` call but still inside the effect:

```ts
    // Reconnect to active FASP transfers from previous session
    void (async () => {
      const persistedMap = readAndPurgeTransferMap();
      if (persistedMap.size === 0) return;

      const activeTransfers = await getAllTransfers();
      const activeUuids = new Set(
        activeTransfers
          .filter((t) => t.status === "running" || t.status === "queued")
          .map((t) => t.uuid),
      );

      for (const [uuid, entry] of persistedMap) {
        // Skip if already tracked (e.g., started in this session)
        if (asperaMapRef.current.has(uuid)) continue;
        // Skip if SDK no longer knows about this transfer
        if (!activeUuids.has(uuid)) continue;

        // Reconnect: add to in-memory map
        asperaMapRef.current.set(uuid, entry);

        // Find the SDK snapshot for initial progress
        const snapshot = activeTransfers.find((t) => t.uuid === uuid);
        const pct = snapshot ? Math.min(Math.round(
          snapshot.percentage > 0 && snapshot.percentage <= 1
            ? snapshot.percentage * 100
            : snapshot.bytesExpected > 0 && snapshot.bytesWritten > 0
              ? (snapshot.bytesWritten / snapshot.bytesExpected) * 100
              : 0
        ), 100) : 0;

        // Inject into uploads list
        setUploads((prev) => {
          // Don't add if already in the list
          if (prev.some((u) => u.id === entry.uploadId)) return prev;
          return [
            ...prev,
            {
              id: entry.uploadId,
              projectId: "" as Id<"projects">, // unknown after reload, not needed for progress display
              file: new File([], "Reconnected transfer"),
              videoId: entry.videoId,
              progress: pct,
              status: "uploading" as UploadStatus,
              transferMethod: "aspera" as UploadMethod,
              asperaTransferId: uuid,
              totalBytes: snapshot?.bytesExpected ?? undefined,
              bytesPerSecond: snapshot ? snapshot.speedKbps * 1000 : undefined,
            },
          ];
        });
      }
    })();
```

**Step 3: Verify typecheck passes**

Run: `bun run typecheck`
Expected: no errors

**Step 4: Test manually**

1. Start a FASP upload of a large file
2. While uploading, reload the page
3. After reload, the uploads panel should show the transfer with current progress
4. Transfer should complete normally and video should process

**Step 5: Commit**

```bash
git add app/routes/dashboard/-useVideoUploadManager.ts
git commit -m "feat: reconnect to active Aspera transfers after page reload"
```

---

### Task 5: Clean up stale localStorage entries on cancel

**Files:**
- Modify: `app/routes/dashboard/-useVideoUploadManager.ts`

**Step 1: Clean up on cancel**

In the `cancelUpload` callback (~line 536), after the existing `asperaMapRef.current.delete(upload.asperaTransferId)` logic, add:

```ts
      if (upload?.asperaTransferId) {
        removeTransferMapping(upload.asperaTransferId);
```

This line should be added right after the existing `asperaMapRef.current.delete` call inside the `if (upload?.asperaTransferId)` block. Since `removeTransferMapping` is already imported from Task 3, just add the call.

**Step 2: Verify typecheck passes**

Run: `bun run typecheck`
Expected: no errors

**Step 3: Commit**

```bash
git add app/routes/dashboard/-useVideoUploadManager.ts
git commit -m "feat: clean up localStorage mapping on transfer cancel"
```
