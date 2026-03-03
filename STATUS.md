# STATUS — Lawn (PacGenesis Fork)

**Last updated:** 2026-03-02
**Branch:** main (uncommitted changes)

## Current State

18 files changed across two workstreams: Aspera upload integration (committed) and bugfixes (uncommitted).

### Committed — Aspera Upload Integration (5 commits on main)
Working upload path: Browser → Aspera Connect SDK → FASP → HSTS → S3 → Mux.
Falls back to S3 direct if Connect not installed. Upload method toggle in DropZone.

### Uncommitted — Bugfixes (4 fixes, ready to commit)

#### Fix 1: `getMuxAssetErrorMessage` crash → videos stuck in "processing"
- **File:** `convex/videoActions.ts:65`
- **Root cause:** Mux API returns `errors` as non-array truthy value. `asset.errors?.find()` throws `t.errors?.find is not a function` because `?.` only guards null/undefined, not non-array types.
- **Fix:** Added `Array.isArray()` guard, matching existing pattern for `playback_ids`.
- **Impact:** `reconcileProcessingStatus` was crashing every 15s in a loop. Videos never transitioned from "processing" to "ready" or "failed". After fix, stuck videos will properly resolve.

#### Fix 2: Download does nothing (no error, no network request)
- **File:** `src/lib/download.ts`
- **Root cause:** `triggerDownload()` used `target="_blank"` on a programmatic `anchor.click()`. The click happens after `await getDownloadUrl()`, so the user-gesture context has expired — browser popup blocker silently swallows it.
- **Fix:** Removed `target="_blank"` and `rel="noopener"`. Presigned S3 URL has `Content-Disposition: attachment` so browser downloads without navigating away.

#### Fix 3: Download button shown for non-ready videos
- **File:** `app/routes/dashboard/-project.tsx`
- **Root cause:** `canDownload` allowed "processing" status, but `getDownloadUrl` action rejects anything not "ready". Mismatch = button shows but action throws.
- **Fix:** Tightened guard to `video.status === "ready"`.

#### Fix 4: All dropdown menu actions (download, share, delete) silently broken on project page
- **File:** `app/routes/dashboard/-project.tsx`
- **Root cause:** DropdownMenuItems used `onClick` with `e.stopPropagation()`. Radix DropdownMenu renders items in a portal and uses its own selection event system — `onClick` + `stopPropagation` interfered with Radix's internal handlers. The video detail page (`-video.tsx`) already used `onSelect` correctly.
- **Fix:** Changed all DropdownMenuItem handlers from `onClick` to `onSelect`, removed unnecessary `stopPropagation`.

## HSTS Server Status
- `asperanoded` running on `aew-hsts.pacgenesis.com`
- Bandwidth activity logging disabled (benign — `/ops/transfers/bandwidth` returns error but doesn't affect transfers)
- No recent transfer logs (no successful FASP transfers yet)
- SSH: `ssh -i ~/.ssh/Steven-KeyPair.cer ec2-user@aew-hsts.pacgenesis.com`

## Next Steps

### Immediate
- [ ] Commit the 4 bugfixes
- [ ] Test download + delete on project page after HMR picks up changes
- [ ] Verify stuck "processing" videos transition after reconcile fix

### Planned — Aspera Download Path
Add FASP download as option alongside S3 presigned URL download:
- Call HSTS `POST /files/download_setup` (mirror of upload_setup)
- Pass transfer spec to Connect SDK with direction "receive"
- Toggle UI same as upload: default S3, option for FASP when Connect detected
- Biggest win for large files (50GB+ ProRes over distance)
- See design doc: `docs/plans/2026-03-02-aspera-upload-integration-design.md`

### Other
- [ ] Aspera SDK source map 404 (`aspera-sdk.js.map`) — cosmetic, SDK doesn't ship one
- [ ] S3 CORS — verify bucket allows PUT/OPTIONS from dev origin (may explain OpaqueResponseBlocking)
- [ ] Enable HSTS bandwidth activity logging if transfer monitoring needed
