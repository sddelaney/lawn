# Aspera Upload Integration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add IBM Aspera FASP as an alternative upload transport in Lawn, so M&E customers can upload large video files at accelerated speeds through their existing HSTS infrastructure.

**Architecture:** Both upload paths (S3 direct and Aspera) write to the same S3 bucket using the same key pattern. Everything downstream (Mux ingest, playback, comments, sharing) is unchanged. The HSTS Node API provides a transfer spec; the Aspera Connect SDK in the browser handles the FASP transfer directly to HSTS.

**Tech Stack:** TypeScript, Convex (serverless backend), React 19, IBM Aspera SDK 0.2.30, HSTS Node API

**Reference implementation:** Fetch already has a working Aspera SDK integration. Key files to reference (DO NOT modify these, read-only):
- `~/dev/fetch/web/src/lib/asperaSdk.ts` — SDK facade (copy and adapt)
- `~/dev/fetch/web/src/lib/transferTypes.ts` — Type definitions (copy relevant types)
- `~/dev/fetch/web/public/aspera-sdk.js` — SDK bundle (copy as-is)
- `~/dev/fetch/crates/fetch-hsts/src/client.rs` — HSTS Node API patterns (lines 1139-1222 for upload_setup)

---

## Task 1: Download and vendor the Aspera SDK bundle

**Files:**
- Create: `public/aspera-sdk.js`
- Create: `scripts/bootstrap-aspera-sdk.sh`

**Step 1: Copy the SDK bundle from Fetch**

```bash
cp ~/dev/fetch/web/public/aspera-sdk.js ~/dev/lawn/public/aspera-sdk.js
```

**Step 2: Create bootstrap script for future updates**

Create `scripts/bootstrap-aspera-sdk.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
ASPERA_SDK_VERSION="${ASPERA_SDK_VERSION:-0.2.30}"
CDN="https://cdn.jsdelivr.net/npm/@ibm-aspera/sdk@${ASPERA_SDK_VERSION}/dist/js"
curl -fsSL "${CDN}/aspera-sdk.js" -o public/aspera-sdk.js
echo "Downloaded Aspera SDK v${ASPERA_SDK_VERSION}"
```

**Step 3: Add SDK script tag to index.html**

Modify: `app/root.tsx` or wherever the HTML shell is rendered.
Add before closing `</head>`:
```html
<script src="/aspera-sdk.js" defer></script>
```

Find the actual HTML shell by searching for `<head>` in the app directory.

**Step 4: Verify SDK loads**

Run: `bun run dev`
Open browser console, confirm `window.asperaSdk` is defined.

**Step 5: Commit**

```bash
git add public/aspera-sdk.js scripts/bootstrap-aspera-sdk.sh
git commit -m "chore: vendor Aspera SDK 0.2.30 bundle"
```

---

## Task 2: Create Aspera SDK facade and types

**Files:**
- Create: `src/lib/asperaSdk.ts`
- Create: `src/lib/asperaTypes.ts`

**Step 1: Create type definitions**

Create `src/lib/asperaTypes.ts` (adapted from Fetch's `transferTypes.ts`):
```typescript
export type TransferStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "paused"
  | "canceled";

export interface TransferInfo {
  uuid: string;
  status: TransferStatus;
  fileName: string;
  percentage: number;
  speedKbps: number;
  bytesWritten: number;
  bytesExpected: number;
  remainingUsec: number;
  isHttpGateway: boolean;
  direction: "send" | "receive";
  errorCode?: number;
  errorMessage?: string;
}

export interface AsperaInitOptions {
  appId: string;
  httpGatewaySettings?: { url: string };
  forceGateway?: boolean;
}
```

**Step 2: Create SDK facade**

Create `src/lib/asperaSdk.ts`. Copy the core from `~/dev/fetch/web/src/lib/asperaSdk.ts` but keep only what Lawn needs:
- `isSdkAvailable()`
- `initSdk(options)`
- `testConnection()`
- `startTransfer(spec, asperaSpec)`
- `stopTransfer(id)`
- `registerActivityCallback(cb)`
- `parseTransferInfo(val)` and `parseAllTransfers(activity)`
- The `Window` global declaration for `asperaSdk`

Strip out: `showSelectFileDialog`, `showSelectFolderDialog`, `initDragDrop`, `launchDesktop`, `resumeTransfer`, `removeTransfer`, dialog cancellation helpers. Lawn doesn't need file picker dialogs — it uses its own DropZone.

**Step 3: Verify types compile**

Run: `bun run typecheck`
Expected: PASS (no errors from new files)

**Step 4: Commit**

```bash
git add src/lib/asperaSdk.ts src/lib/asperaTypes.ts
git commit -m "feat: add Aspera SDK facade and transfer types"
```

---

## Task 3: Create HSTS Node API client in Convex

**Files:**
- Create: `convex/hsts.ts`

**Step 1: Create the HSTS client module**

Create `convex/hsts.ts`:
```typescript
"use node";

/**
 * HSTS Node API client for Aspera transfer spec generation.
 *
 * The HSTS Node API uses basic auth and returns transfer specs that the
 * browser-side Aspera SDK uses to initiate FASP transfers directly to HSTS.
 *
 * Reference: ~/dev/fetch/crates/fetch-hsts/src/client.rs (lines 1139-1222)
 */

export function isAsperaEnabled(): boolean {
  return process.env.ASPERA_ENABLED === "true";
}

function getHstsConfig() {
  const nodeUrl = process.env.HSTS_NODE_URL;
  const nodeUser = process.env.HSTS_NODE_USER;
  const nodePassword = process.env.HSTS_NODE_PASSWORD;

  if (!nodeUrl || !nodeUser || !nodePassword) {
    throw new Error(
      "Missing HSTS configuration. Set HSTS_NODE_URL, HSTS_NODE_USER, HSTS_NODE_PASSWORD."
    );
  }

  return { nodeUrl: nodeUrl.replace(/\/+$/, ""), nodeUser, nodePassword };
}

function buildAuthHeader(user: string, password: string): string {
  const encoded = Buffer.from(`${user}:${password}`).toString("base64");
  return `Basic ${encoded}`;
}

/**
 * Call POST /files/upload_setup on HSTS Node API.
 * Returns the transfer spec JSON that gets passed directly to the Aspera SDK.
 *
 * The destination path should map to where the file should land in S3.
 * HSTS must be configured with the same S3 bucket as Lawn's direct upload.
 */
export async function getUploadTransferSpec(
  destinationPath: string
): Promise<Record<string, unknown>> {
  const { nodeUrl, nodeUser, nodePassword } = getHstsConfig();

  const response = await fetch(`${nodeUrl}/files/upload_setup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: buildAuthHeader(nodeUser, nodePassword),
    },
    body: JSON.stringify({
      transfer_requests: [
        {
          transfer_request: {
            paths: [{ destination: destinationPath }],
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `HSTS upload_setup failed: ${response.status} ${response.statusText}${text ? ` — ${text}` : ""}`
    );
  }

  const body = (await response.json()) as {
    transfer_specs?: Array<{
      transfer_spec?: Record<string, unknown>;
      error?: { code?: number; reason?: string; user_message?: string };
    }>;
  };

  const wrapper = body.transfer_specs?.[0];
  if (!wrapper) {
    throw new Error("HSTS returned empty transfer_specs array");
  }

  if (wrapper.error) {
    const e = wrapper.error;
    throw new Error(
      `HSTS upload_setup error: ${e.user_message ?? e.reason ?? `code ${e.code}`}`
    );
  }

  if (!wrapper.transfer_spec) {
    throw new Error("HSTS returned transfer_specs entry without transfer_spec");
  }

  return wrapper.transfer_spec;
}
```

**Step 2: Verify Convex types compile**

Run: `bun run typecheck:convex`
Expected: PASS

**Step 3: Commit**

```bash
git add convex/hsts.ts
git commit -m "feat: add HSTS Node API client for upload transfer specs"
```

---

## Task 4: Add `getAsperaUploadSpec` Convex action

**Files:**
- Modify: `convex/videoActions.ts` (add new action, ~40 lines)

**Step 1: Add the new action**

At the bottom of `convex/videoActions.ts`, before the closing of the file, add:

```typescript
import { isAsperaEnabled, getUploadTransferSpec } from "./hsts";

export const getAsperaUploadSpec = action({
  args: {
    videoId: v.id("videos"),
    filename: v.string(),
    fileSize: v.number(),
    contentType: v.string(),
  },
  returns: v.object({
    transferSpec: v.any(),
    s3Key: v.string(),
  }),
  handler: async (ctx, args) => {
    if (!isAsperaEnabled()) {
      throw new Error("Aspera uploads are not enabled");
    }

    await requireVideoMemberAccess(ctx, args.videoId);
    const normalizedContentType = validateUploadRequestOrThrow({
      fileSize: args.fileSize,
      contentType: args.contentType,
    });

    // Generate the same S3 key pattern as the S3 direct path
    const ext = getExtensionFromKey(args.filename);
    const key = `videos/${args.videoId}/${Date.now()}.${ext}`;

    // Record upload info (same as S3 direct path)
    await ctx.runMutation(internal.videos.setUploadInfo, {
      videoId: args.videoId,
      s3Key: key,
      fileSize: args.fileSize,
      contentType: normalizedContentType,
    });

    // Get transfer spec from HSTS — destination is the S3 key path
    const transferSpec = await getUploadTransferSpec(`/${key}`);

    return { transferSpec, s3Key: key };
  },
});
```

Note: The import for `isAsperaEnabled` and `getUploadTransferSpec` goes at the top of the file with other imports.

**Step 2: Verify Convex types compile**

Run: `bun run typecheck:convex`
Expected: PASS

**Step 3: Commit**

```bash
git add convex/videoActions.ts
git commit -m "feat: add getAsperaUploadSpec Convex action"
```

---

## Task 5: Add Aspera feature flag query

**Files:**
- Create: `convex/aspera.ts`

**Step 1: Create feature flag query**

The frontend needs to know whether Aspera is enabled to show/hide the upload method toggle. Create `convex/aspera.ts`:

```typescript
"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { isSdkAvailable as isSdkAvailableCheck } from "./hsts";

// Action (not query) because it reads env vars which require "use node"
export const isEnabled = action({
  args: {},
  returns: v.boolean(),
  handler: async () => {
    return isSdkAvailableCheck();
  },
});
```

Wait — `isAsperaEnabled` is the correct name from hsts.ts. Fix the import:

```typescript
"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { isAsperaEnabled } from "./hsts";

export const isEnabled = action({
  args: {},
  returns: v.boolean(),
  handler: async () => {
    return isAsperaEnabled();
  },
});
```

**Step 2: Verify**

Run: `bun run typecheck:convex`
Expected: PASS

**Step 3: Commit**

```bash
git add convex/aspera.ts
git commit -m "feat: add Aspera feature flag query"
```

---

## Task 6: Modify upload manager to support Aspera path

**Files:**
- Modify: `app/routes/dashboard/-useVideoUploadManager.ts`

**Step 1: Add Aspera upload path to the manager**

This is the core integration. The upload manager currently has one path (S3 presigned PUT). Add a second path that uses the Aspera SDK.

Key changes to `useVideoUploadManager.ts`:

1. Add `uploadMethod` state: `'s3-direct' | 'aspera'`
2. Import the Aspera SDK facade and Convex action
3. In the upload loop, branch on `uploadMethod`:
   - `s3-direct`: existing XHR PUT flow (unchanged)
   - `aspera`: call `getAsperaUploadSpec`, then `startTransfer` with the returned spec
4. For Aspera transfers, register an activity callback to update progress
5. `markUploadComplete` is called after either path succeeds

The Aspera path flow:
```
createVideo → getAsperaUploadSpec → SDK.startTransfer(spec) → activity callbacks update progress → on "completed" status → markUploadComplete
```

Changes to the hook's return value:
- Add `uploadMethod` and `setUploadMethod` to the return
- Add `asperaAvailable: boolean` (from `isSdkAvailable()`)

**Important SDK integration detail:** The Aspera SDK's `startTransfer` is async and returns a UUID. Progress comes through `registerActivityCallback` which fires for ALL transfers. Match the UUID to the correct `ManagedUploadItem`.

The activity callback fires with a `transfers` array. Each entry has fields: `uuid`, `status`, `percentage`, `calculated_rate_kbps`, `bytes_written`, `bytes_expected`, `remaining_usec`. Use `parseTransferInfo` from the SDK facade to normalize these.

**Step 2: Verify types compile**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Test manually**

1. Start dev: `bun run dev`
2. Without ASPERA_ENABLED=true, confirm existing S3 upload still works
3. With ASPERA_ENABLED=true (set in Convex dashboard), confirm the Aspera path is available

**Step 4: Commit**

```bash
git add app/routes/dashboard/-useVideoUploadManager.ts
git commit -m "feat: add Aspera upload path to video upload manager"
```

---

## Task 7: Add upload method toggle to DropZone UI

**Files:**
- Modify: `src/components/upload/DropZone.tsx`

**Step 1: Add upload method selector**

When Aspera is enabled, show a small toggle above or below the drop zone:

```
[S3 Direct] [Aspera ⚡] ← toggle, Aspera highlighted when active
```

Props change for DropZone:
```typescript
interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
  // New:
  asperaAvailable?: boolean;
  uploadMethod?: "s3-direct" | "aspera";
  onUploadMethodChange?: (method: "s3-direct" | "aspera") => void;
}
```

The toggle should follow the brutalist design language:
- Two buttons side by side, 2px black border
- Active method: `bg-[#1a1a1a] text-[#f0f0e8]` (inverted)
- Inactive: `bg-[#f0f0e8] text-[#1a1a1a]`
- Only rendered when `asperaAvailable` is true

The supported formats text should update: when Aspera is selected, add "(accelerated)" to the subtitle.

**Step 2: Verify visually**

Run: `bun run dev`, confirm the toggle renders when Aspera is enabled, and the styling matches the brutalist design language.

**Step 3: Commit**

```bash
git add src/components/upload/DropZone.tsx
git commit -m "feat: add upload method toggle to DropZone"
```

---

## Task 8: Update UploadProgress to show transfer method

**Files:**
- Modify: `src/components/upload/UploadProgress.tsx`

**Step 1: Add method indicator**

Small change: when a transfer is using Aspera, show a label next to the speed indicator. Add an optional `transferMethod` prop:

```typescript
interface UploadProgressProps {
  // ... existing props
  transferMethod?: "s3-direct" | "aspera";
}
```

In the speed display line (around line 76-84), prepend a method badge:
```
[FASP] 245 MB/s · 12% · 3m left     ← Aspera transfer
[HTTP] 12 MB/s · 45% · 8m left       ← S3 direct transfer
```

Badge styling:
- FASP: `bg-[#2d5a2d] text-[#f0f0e8] px-1.5 py-0.5 text-[10px] font-bold font-mono`
- HTTP: `bg-[#e8e8e0] text-[#888] px-1.5 py-0.5 text-[10px] font-bold font-mono`

**Step 2: Verify visually**

Confirm the badge renders and doesn't break the layout.

**Step 3: Commit**

```bash
git add src/components/upload/UploadProgress.tsx
git commit -m "feat: show transfer method badge in upload progress"
```

---

## Task 9: Wire everything together in the dashboard

**Files:**
- Modify: The dashboard route file that renders DropZone + UploadProgress (find via `grep -r "DropZone" app/`)

**Step 1: Find the parent component**

Search for where `useVideoUploadManager` is called and where `DropZone` and `UploadProgress` are rendered. This is the integration point.

**Step 2: Wire new props**

- Call the Aspera feature flag action to get `asperaEnabled`
- Initialize SDK if available: call `initSdk({ appId: "lawn" })` on mount
- Pass `asperaAvailable`, `uploadMethod`, `onUploadMethodChange` to DropZone
- Pass `transferMethod` to each UploadProgress item
- Register the activity callback for Aspera transfers on mount

**Step 3: Test end-to-end**

1. Without Aspera: upload works exactly as before (regression test)
2. With Aspera enabled but no Connect installed: toggle visible, defaults to S3 direct
3. With Aspera enabled and Connect installed: toggle defaults to Aspera, transfer goes through FASP

**Step 4: Commit**

```bash
git add app/routes/dashboard/...
git commit -m "feat: wire Aspera upload toggle into dashboard"
```

---

## Task 10: Add SDK initialization to app root

**Files:**
- Modify: App root or layout component (find via `grep -r "asperaSdk\|aspera" app/`)

**Step 1: Initialize SDK on app load**

The SDK needs to be initialized once. Add to the app's root layout or a provider:

```typescript
import { useEffect, useState } from "react";
import { isSdkAvailable, initSdk, testConnection } from "@/lib/asperaSdk";

// In the root component or a provider:
const [asperaReady, setAsperaReady] = useState(false);

useEffect(() => {
  if (!isSdkAvailable()) return;

  initSdk({ appId: "lawn" })
    .then(() => testConnection())
    .then((connected) => {
      setAsperaReady(connected);
    })
    .catch((err) => {
      console.warn("Aspera SDK init failed:", err);
      setAsperaReady(false);
    });
}, []);
```

Pass `asperaReady` down via context or prop drilling to the dashboard.

**Step 2: Verify**

Open browser with Connect installed → `asperaReady` should be `true`.
Open browser without Connect → `asperaReady` should be `false`.

**Step 3: Commit**

```bash
git add app/...
git commit -m "feat: initialize Aspera SDK on app load"
```

---

## Task 11: Final integration test and cleanup

**Files:**
- All modified files

**Step 1: Run all quality checks**

```bash
bun run typecheck
bun run typecheck:convex
bun run lint
```

Expected: All PASS with zero errors.

**Step 2: Test the complete flow**

1. **S3 direct (no Aspera config):** Upload a video → presigned PUT → S3 → Mux processes → ready. Unchanged behavior.
2. **S3 direct (Aspera enabled, Connect not installed):** Toggle visible but defaults to S3. Upload works via presigned PUT.
3. **Aspera (Aspera enabled, Connect installed):** Toggle defaults to Aspera. Upload goes through HSTS Node API → FASP → S3. `markUploadComplete` fires, Mux ingests, video becomes ready.
4. **Cancel:** Cancel an in-flight Aspera transfer. Verify it stops and the video is marked failed.
5. **Large file:** Upload a 2GB+ file via Aspera. Verify progress updates, speed display, and completion.

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete Aspera upload integration"
```

---

## Environment Setup Checklist

Before testing, these Convex env vars must be set:

| Variable | Value | Where to set |
|----------|-------|-------------|
| `ASPERA_ENABLED` | `true` | Convex dashboard → Environment Variables |
| `HSTS_NODE_URL` | `https://aew-hsts.pacgenesis.com:9092` | Convex dashboard |
| `HSTS_NODE_USER` | (from secrets/INFRA.md) | Convex dashboard |
| `HSTS_NODE_PASSWORD` | (from secrets/INFRA.md) | Convex dashboard |

**HSTS requirement:** The HSTS instance must have S3 storage configured pointing to the same bucket Lawn uses (the Railway/S3-compatible bucket). The HSTS docroot must map so that writing to `/videos/{videoId}/{timestamp}.ext` lands at the correct S3 key.

---

## File Summary

| File | Action | Task |
|------|--------|------|
| `public/aspera-sdk.js` | Create (copy from Fetch) | 1 |
| `scripts/bootstrap-aspera-sdk.sh` | Create | 1 |
| `src/lib/asperaTypes.ts` | Create | 2 |
| `src/lib/asperaSdk.ts` | Create (adapt from Fetch) | 2 |
| `convex/hsts.ts` | Create | 3 |
| `convex/videoActions.ts` | Modify (add action) | 4 |
| `convex/aspera.ts` | Create | 5 |
| `app/routes/dashboard/-useVideoUploadManager.ts` | Modify (add Aspera path) | 6 |
| `src/components/upload/DropZone.tsx` | Modify (add toggle) | 7 |
| `src/components/upload/UploadProgress.tsx` | Modify (add badge) | 8 |
| Dashboard route (TBD) | Modify (wire props) | 9 |
| App root/layout | Modify (SDK init) | 10 |
