# Aspera Transfer Persistence Across Page Reloads

## Problem

Page reload loses all in-progress FASP transfer state. The SDK's `getAllTransfers()` can return active transfers, but the upload manager has no way to map them back to Convex video records. The activity callback fires but `asperaMapRef` is empty, so progress events are ignored.

## Approach

SDK owns transfer truth. localStorage is the reconnect bridge. `reconcileProcessingStatus` is the safety net.

## Design

### 1. SDK Facade — add `getAllTransfers()`

Add to `window.asperaSdk` type declaration and expose wrapper in `asperaSdk.ts`:

```ts
getAllTransfers(): Promise<unknown>;
```

Wrapper: `sdk().getAllTransfers()` with timeout, returns `TransferInfo[]` via `parseAllTransfers()`.

### 2. localStorage mapping

Key: `lawn.asperaTransferMap`
Value: JSON object `{ [transferUuid]: { videoId, uploadId, createdAt } }`

- **Write** entry after `startTransfer` resolves with UUID
- **Delete** entry on completed/failed (same places we already delete from `asperaMapRef`)
- **Read** on SDK init to rebuild `asperaMapRef`
- **TTL** 24 hours — entries older than this are purged on read regardless of state

### 3. Reconnect flow

In the `useEffect` that fires when `asperaAvailable` becomes true:

1. Read localStorage mapping, purge entries older than 24h
2. Call `getAllTransfers()`
3. For each active SDK transfer that has a localStorage entry:
   - Add to `asperaMapRef`
   - Inject a `ManagedUploadItem` into `uploads[]` with current progress from SDK snapshot
4. For localStorage entries with NO matching SDK transfer:
   - Query Convex video status — if no longer `"uploading"`, delete entry (transfer finished while page was closed)
   - If still `"uploading"`, leave it — `reconcileProcessingStatus` will handle it
5. Existing activity callback picks up reconnected transfers naturally

### 4. Multi-tab behavior

localStorage is per-origin, shared across tabs. The activity callback from Connect fires globally to all tabs. The existing `asperaMapRef.has(info.uuid)` guard (upload manager line 171) prevents a tab from acting on transfers it didn't start or reconnect to.

On reconnect, only the FIRST tab to initialize will claim orphaned transfers (add them to its `asperaMapRef`). Subsequent tabs will find those transfers already have their localStorage entries but won't double-claim because:
- The reconnect flow only adds to `asperaMapRef` if the entry isn't already being tracked
- Each tab's `asperaMapRef` is independent in-memory state

### 5. Edge cases

| Scenario | Handling |
|----------|----------|
| Transfer completes during reload | Not in `getAllTransfers()`. `reconcileProcessingStatus` catches it. Stale localStorage entry cleaned on next init. |
| Transfer fails during reload | Same — `reconcileProcessingStatus` marks failed. |
| Tab close mid-upload, new tab opened | localStorage survives. New tab reconnects via `getAllTransfers()`. |
| Connect quit mid-transfer | SDK transfer gone, Convex still shows `"uploading"`. `reconcileProcessingStatus` polling + 24h TTL on localStorage entry. |
| Stale entries accumulate | 24h TTL purge on every read. Cross-check against SDK + Convex on reconnect. |

### 6. Files to change

- `src/lib/asperaSdk.ts` — add `getAllTransfers()` to type + wrapper
- `app/routes/dashboard/-useVideoUploadManager.ts` — localStorage read/write, reconnect logic in init effect
- No backend changes needed

## Scope

FASP transfers only. S3 direct uploads use XHR and cannot survive reload — they require restart.
