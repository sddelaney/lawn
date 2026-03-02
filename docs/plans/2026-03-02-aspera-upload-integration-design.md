# Aspera Upload Integration Design

**Date:** 2026-03-02
**Status:** Approved
**Approach:** A — Aspera Upload Plugin (keep SaaS architecture, add FASP upload path)

## Context

Lawn is a video review platform (Frame.io replacement). PacGenesis customers in M&E already use IBM Aspera for high-speed file transfer and many also use Frame.io for video review. This integration lets them use their existing Aspera infrastructure for accelerated uploads into Lawn, consolidating their tooling.

**Target customers:** M&E companies running Aspera HSTS who currently use Frame.io alongside Aspera. WWE, National Geographic, CBS, post-production houses.

**Companion product:** Fetch (PacGenesis MFT portal) handles bulk file transfer. Lawn handles video review and collaboration. They share Aspera infrastructure and can share S3 storage.

## Architecture

Both upload paths converge at the same S3 bucket. Everything downstream (Mux transcoding, playback, comments, sharing) is unchanged.

```
                    ┌─ [S3 Direct]  XHR PUT → presigned URL → S3 ─┐
Browser selects ────┤                                              ├── markUploadComplete → Mux
  upload method     └─ [Aspera]    HSTS Node API upload → S3 ─────┘
```

### Why this works

`markUploadComplete` in `convex/videoActions.ts` doesn't care how bytes arrived. It runs `HeadObjectCommand` to verify the file exists in S3, reconciles metadata, then triggers Mux ingest via signed URL. The S3 key format (`videos/{videoId}/{timestamp}.{ext}`) is set before upload begins regardless of transport.

## Backend Changes

### New file: `convex/hsts.ts`

HSTS Node API client:
- Authenticates with HSTS Node API (basic auth or access key)
- Creates transfer specs for upload to specific S3 key paths
- Uses HSTS `/files/upload_setup` endpoint for transfer tokens
- HSTS must be configured with the same S3 bucket as lawn's direct upload

### New action: `convex/videoActions.ts` — `getAsperaUploadSpec`

Parallel to existing `getUploadUrl`:
- Validates file size/type (same checks)
- Generates S3 key (same pattern: `videos/{videoId}/{timestamp}.{ext}`)
- Calls `setUploadInfo` mutation (same as S3 path)
- Returns `{ transferSpec, s3Key }` instead of `{ url, uploadId }`

### No database changes

Video record already tracks `s3Key`, `status`, `fileSize`, `contentType`. The transport method is transparent.

## Frontend Changes

### Modified: `useVideoUploadManager.ts`

Add `uploadMethod: 's3-direct' | 'aspera'` parameter:
- S3 direct: unchanged (XHR PUT to presigned URL)
- Aspera: call `getAsperaUploadSpec`, use Connect SDK or HTTP fallback
- Progress events map to existing `ManagedUploadItem` interface
- Completion calls same `markUploadComplete`

### New file: `src/lib/aspera-connect.ts`

Thin wrapper around Aspera Connect SDK (`AW4.Connect`):
- `isConnectAvailable()` — detect browser extension
- `startTransfer(transferSpec, callbacks)` — initiate FASP transfer
- `cancelTransfer(transferId)` — cancel in-flight
- Progress callback shape: `{ percentage, bytesPerSecond, estimatedSecondsRemaining }`

### Upload UI

- If `ASPERA_ENABLED`, show upload method toggle in drop zone
- Auto-detect: Connect installed → default Aspera; otherwise → S3 direct
- Existing progress UI (speed, ETA, cancel) works for both paths

## Configuration

New Convex environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `HSTS_NODE_URL` | HSTS Node API endpoint | `https://hsts.example.com:9092` |
| `HSTS_NODE_USER` | Node API username | `node_admin` |
| `HSTS_NODE_PASSWORD` | Node API password or access key | (secret) |
| `ASPERA_ENABLED` | Feature flag | `true` |

### HSTS requirements

- HSTS instance with S3 storage pointing to the same bucket lawn uses
- HSTS docroot maps so files land at expected S3 key paths
- Network: Connect SDK talks directly to HSTS (not proxied through Convex)

## What doesn't change

- Video creation mutations
- Mux transcoding pipeline
- Video playback (HLS)
- Comments and collaboration
- Share links
- Clerk authentication
- Stripe billing
- Vercel deployment
- Database schema

## Estimated scope

~500 lines of new code:
- `convex/hsts.ts` (~100 lines)
- `getAsperaUploadSpec` action (~50 lines)
- `src/lib/aspera-connect.ts` (~150 lines)
- `useVideoUploadManager.ts` changes (~100 lines)
- Upload UI toggle (~100 lines)

## Future evolution

This is step 1. Possible next steps (not in scope now):
- Replace Clerk with Fetch's auth (SAML/OIDC)
- Replace Mux with self-hosted FFmpeg transcoding (Fetch already has on-demand HLS)
- Self-hosted deployment option (replace Convex with Postgres)
- Shared storage between Fetch and Lawn (files uploaded via Fetch appear in Lawn for review)
