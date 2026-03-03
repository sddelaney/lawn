# Unified Platform Design: Fetch + Lawn

**Date:** 2026-03-03
**Status:** Approved
**Author:** Steven Delaney / PacGenesis
**Approach:** Full Migration (Approach A) — Fetch Rust backend + unified React frontend

---

## Summary

Merge Fetch (file management) and Lawn (video review) into a single platform. One Rust binary, one React SPA, three product modes (open source / enterprise / PacSend). Fetch's backend is the unification target. Lawn's frontend styling and component architecture (Radix + CVA) become the standard. Dual-aesthetic theme system preserves both design identities.

---

## Target Architecture

```
React SPA (Lawn design language, dual aesthetic)
  TanStack Router + React Query + Zustand + Tailwind 4 + Vite
  Radix UI + CVA components

  Surfaces:
    Files    — file browser, upload/download, folders (Fetch)
    Review   — HLS player, comments, review workflow (Lawn)
    Automation — rules config (enterprise/pacsend, Phase 5+)

  Data: React Query (server state) + Zustand (client state)
  Real-time: SSE + query invalidation
  Auth: Fetch's session-based auth (local + OIDC + SAML)
              │
              │ REST + SSE
              ▼
Fetch (Rust / Axum)
  Existing endpoints (spaces, files, users, transfers, shares)
  New endpoints (assets, comments, share-links, presence, transcode, automations)
  SeaORM + PostgreSQL (prod) / SQLite (dev)
  SSE broadcaster + webhook dispatcher + job queue
```

### Key Decisions

- **Backend:** Fetch's Rust/Axum stack. Lawn's Convex layer retired.
- **Router:** TanStack Router (Lawn's choice). Fetch migrates from React Router v7.
- **Data layer:** React Query (Fetch's choice). Convex hooks replaced.
- **Auth:** Fetch's system (local + OIDC + SAML). Clerk removed. No social login.
- **Components:** Radix UI + CVA (Lawn's choice). Fetch's custom components rewritten.
- **Design:** Dual-aesthetic system — Brutalist (Lawn) and Clean (Fetch) modes.
- **Product modes:** Config-driven feature gating. `mode = "open" | "enterprise" | "pacsend"`.

---

## Design System: Dual Aesthetic Modes

Two independent layers: geometric (aesthetic) and chromatic (palette). Components reference CSS variables from both layers. No duplication of component code.

```
Theme = Aesthetic + Palette

AESTHETIC LAYER (geometric)
  --radius:               0px (brutalist) | 8px (clean)
  --shadow-style:         offset (brutalist) | soft (clean)
  --border-width:         2px (brutalist) | 1px (clean)
  --text-transform:       uppercase (brutalist) | none (clean)
  --font-sans:            Geist (brutalist) | DM Sans (clean)
  --font-weight-label:    700 (brutalist) | 500 (clean)
  --letter-spacing-label: 0.05em (brutalist) | 0 (clean)

COLOR LAYER (palette)
  --background, --foreground, --accent, --border, --surface
  ...semantic colors (success, warning, destructive)

BRANDING LAYER (admin override, highest priority)
  --accent (primary_color)
  product_name, logo_url
```

**Brutalist mode** ships with 2 palettes: Lawn Light (cream) and Lawn Dark (dark olive).
**Clean mode** ships with Fetch's 6 palettes: Deep Space, Terminal, Parchment, Dracula, Overcast, Reef.

Default for new users: Brutalist + Lawn Light.

Admin branding overrides accent color in either aesthetic mode.

**Fonts:**
- Brutalist: Geist (sans), Geist Mono (mono), Instrument Serif (serif accents)
- Clean: DM Sans (sans), JetBrains Mono (mono)

---

## Data Model

Fetch's existing schema unchanged. New tables for review features:

### New Tables

```sql
-- Replaces Lawn's "videos" table. Any file type; videos get proxy generation.
assets (
  id, space_id, uploaded_by_user_id,
  title, description, filename, content_type, file_size,
  s3_key, storage_endpoint_id,
  visibility (public | private),
  public_id (shareable slug),
  status (uploading | processing | ready | failed),
  review_status (none | review | rework | approved | rejected),
  duration, thumbnail_url,
  proxy_status (none | queued | processing | ready | failed),
  proxy_manifest_url (HLS m3u8),
  created_at, updated_at
)

asset_versions (
  id, asset_id, version_number,
  s3_key, file_size, content_type,
  uploaded_by_user_id, proxy_manifest_url,
  created_at
)

comments (
  id, asset_id, asset_version_id,
  user_id, user_name, user_avatar_url,
  text, timestamp_seconds,
  parent_id (self-ref for threading),
  resolved (boolean),
  created_at, updated_at
)

share_links (
  id, asset_id,
  token, created_by_user_id,
  expires_at, allow_download,
  password_hash,
  failed_access_attempts, locked_until,
  view_count,
  created_at
)

share_access_grants (
  id, share_link_id,
  token, expires_at, created_at
)

-- Phase 5+
automation_rules (
  id, space_id, name, enabled,
  trigger_type, trigger_config (JSON),
  conditions (JSON), actions (JSON),
  created_at, updated_at
)

automation_runs (
  id, rule_id, asset_id,
  status (running | completed | failed),
  trigger_event, actions_executed (JSON),
  started_at, completed_at, error
)
```

### Schema Extensions to Existing Tables

```sql
-- spaces table: add review context
ALTER TABLE spaces ADD review_enabled BOOLEAN DEFAULT false;
ALTER TABLE spaces ADD default_review_status TEXT DEFAULT 'none';

-- space_memberships: extend 8-bit to 12-bit permissions
ALTER TABLE space_memberships ADD can_review BOOLEAN DEFAULT false;
ALTER TABLE space_memberships ADD can_approve BOOLEAN DEFAULT false;
ALTER TABLE space_memberships ADD can_assign_reviewer BOOLEAN DEFAULT false;
ALTER TABLE space_memberships ADD can_manage_automation BOOLEAN DEFAULT false;

-- users: Clerk migration bridge (temporary)
ALTER TABLE users ADD clerk_id TEXT;
```

### Concept Mapping

| Lawn | Fetch | Notes |
|---|---|---|
| Team | Workspace (new grouping above spaces) | Add workspace table |
| Project | Space | Spaces gain review_enabled flag |
| Video | Asset | Assets handle any file type |
| Team member | Space membership | Existing 8-bit + 4 new review bits |
| Team invite | Space invite (new) | Port Lawn's invite-by-email |

### Permission Roles

| Role | Existing bits | New bits |
|---|---|---|
| Viewer | browse, download | -- |
| Contributor | browse, download, upload, create_folder, share | -- |
| Reviewer | browse, download | review |
| Manager | all existing | review, approve, assign_reviewer |
| Admin | all | all |

---

## API Surface

### Asset Endpoints (~15)

```
GET    /api/v1/assets?space_id=&status=&review_status=
GET    /api/v1/assets/:id
GET    /api/v1/assets/by-public-id/:public_id
POST   /api/v1/assets
PATCH  /api/v1/assets/:id
DELETE /api/v1/assets/:id

POST   /api/v1/assets/:id/upload-url
POST   /api/v1/assets/:id/upload-complete
POST   /api/v1/assets/:id/aspera-upload-spec
POST   /api/v1/assets/:id/aspera-download-spec
GET    /api/v1/assets/:id/download-url

PATCH  /api/v1/assets/:id/visibility
PATCH  /api/v1/assets/:id/review-status

GET    /api/v1/assets/:id/versions
POST   /api/v1/assets/:id/versions

GET    /api/v1/assets/:id/playback
```

### Comment Endpoints (~6)

```
GET    /api/v1/assets/:id/comments
GET    /api/v1/assets/:id/comments/threaded
POST   /api/v1/assets/:id/comments
PATCH  /api/v1/comments/:id
DELETE /api/v1/comments/:id
PATCH  /api/v1/comments/:id/resolve
```

### Share Link Endpoints (~9)

```
GET    /api/v1/assets/:id/share-links
POST   /api/v1/assets/:id/share-links
PATCH  /api/v1/share-links/:id
DELETE /api/v1/share-links/:id

GET    /api/v1/s/:token
POST   /api/v1/s/:token/access
GET    /api/v1/s/:token/playback?grant=
GET    /api/v1/s/:token/download?grant=
GET    /api/v1/s/:token/comments?grant=
POST   /api/v1/s/:token/comments?grant=
```

### Presence Endpoints (~3)

```
SSE    /api/v1/assets/:id/presence/stream
POST   /api/v1/assets/:id/presence/heartbeat
DELETE /api/v1/assets/:id/presence/heartbeat
```

### Transcode Endpoints (~4)

```
GET    /api/v1/transcode/jobs?asset_id=
GET    /api/v1/transcode/jobs/:id
POST   /api/v1/transcode/jobs
POST   /api/v1/webhooks/transcode-complete
```

### Automation Endpoints (~5, Phase 5+)

```
GET    /api/v1/automations?space_id=
POST   /api/v1/automations
PATCH  /api/v1/automations/:id
DELETE /api/v1/automations/:id
GET    /api/v1/automations/:id/runs
POST   /api/v1/automations/:id/test
```

### SSE Event Types (extends existing stream)

```
asset.created, asset.ready, asset.failed
asset.review_status_changed
comment.created, comment.resolved
presence.updated
transcode.started, transcode.completed, transcode.failed
automation.triggered, automation.completed
```

### Webhook Events (extends existing dispatcher)

```
asset.uploaded, asset.ready, asset.failed
asset.approved, asset.rejected
comment.created
automation.triggered
```

All existing Fetch endpoints unchanged.

---

## Auth Unification

Fetch's auth replaces Clerk. No social login buttons — OIDC covers Google/GitHub if configured as providers.

### What Changes

| From (Lawn/Clerk) | To (Fetch) |
|---|---|
| `useUser()` hook | `useAuth()` hook (Fetch's existing) |
| Clerk JWT sessions | axum-login sessions + CSRF |
| Clerk user management UI | Custom user profile page |
| `clerkId` as user identifier | Fetch `user.id` (with clerk_id bridge column for migration) |
| Clerk webhooks for user sync | Direct DB operations |

### What's Added

- `POST /api/auth/register` — self-service signup (PacSend mode only)
- Email verification flow (PacSend mode only)
- Space invites by email (port from Lawn's team invites)

### What's Removed

- Clerk dependency ($0.02/MAU)
- Social login buttons (OIDC redirect covers the use case if configured)
- Clerk's hosted user management

---

## Frontend Unification

### Route Structure

```
app/routes/
  __root.tsx                    # Shell: nav, theme, auth provider
  index.tsx                     # Landing / marketing
  login.tsx                     # Auth
  dashboard/
    -layout.tsx                 # Authenticated shell w/ sidebar
    index.tsx                   # Home (recent activity)
    $teamSlug/
      index.tsx                 # Team overview
      $spaceSlug/
        -layout.tsx             # Space layout (tabs)
        files.tsx               # Media Management surface
        review.tsx              # Content Review surface
        automation.tsx          # Automation rules (Phase 5+)
        $assetId.tsx            # Asset detail (player + comments)
    settings/
      index.tsx                 # User settings, theme picker
    admin/
      index.tsx                 # Admin panel
      users.tsx
      storage.tsx
      branding.tsx
      billing.tsx               # PacSend only
  share/
    $token.tsx                  # Guest review (no auth)
```

### Navigation

```
+------+-------------------------------------------+
| Logo | Space Name                        [User]  |
+------+-------------------------------------------+
|      | [Files]  [Review]  [Automation]            |
| S    +-------------------------------------------+
| P    |                                           |
| A    |   Active surface content                  |
| C    |                                           |
| E    |                                           |
| S    |                                           |
+------+-------------------------------------------+
```

### Data Layer Migration

```tsx
// Convex (before)
const videos = useQuery(api.videos.list, { projectId })

// React Query (after)
const { data: assets } = useQuery({
  queryKey: ['assets', spaceId],
  queryFn: () => api.assets.list(spaceId),
})
```

### Real-time: SSE + Query Invalidation

```tsx
function useAssetEvents(assetId: string) {
  useEffect(() => {
    const source = new EventSource(`/api/events/stream?asset=${assetId}`)
    source.addEventListener('comment.created', () => {
      queryClient.invalidateQueries(['comments', assetId])
    })
    return () => source.close()
  }, [assetId])
}
```

---

## External Integrations

### Transcoding (by product mode)

| Mode | Provider | Notes |
|---|---|---|
| Open source | FFmpeg (embedded) | Background job, HLS ladder (360p/720p/1080p) |
| Enterprise | Pluggable (FFmpeg default, webhook for Vantage/Elemental/custom) | `TranscodeProvider` trait |
| PacSend | Mux or MediaConvert (managed) | Cost absorbed by PacGenesis |

### Storage

Fetch's existing `storage_endpoints` (multi-backend S3/local). No changes.

### Aspera

Fetch's `fetch-hsts` crate (83KB typed HSTS client). Browser-side Connect SDK from Lawn's integration. Unified under one transport provider interface.

### Billing (PacSend only)

Port Lawn's Stripe integration to Rust. Enabled only in PacSend mode.

```
POST /api/billing/checkout
POST /api/billing/portal
POST /api/webhooks/stripe
```

Quota enforcement: storage, transfer, members per plan tier.

### Notifications

Fetch's existing SMTP + webhook dispatcher. Add review-specific email templates and Slack webhook integration.

---

## Migration Phases

### Phase 1: Foundation (4-6 weeks)

Unified codebase structure and shared design system.

- Fork Fetch's frontend into unified component library (Radix + CVA)
- Implement dual-aesthetic system (geometric + palette CSS variable layers)
- Port Lawn's UI components to new variable system
- Build navigation shell (sidebar + Files/Review/Automation tabs)
- Set up TanStack Router with unified route structure
- Branding system works with both aesthetics
- **Ships:** Fetch works as before with new design system. No review features yet.

### Phase 2: Review Core (4-6 weeks)

Port Lawn's review features into Fetch's backend.

- Add asset, comment, share_link, share_access_grant tables (SeaORM)
- Implement ~35 new API endpoints
- Port review UI to React Query
- HLS player with timestamped comments
- Threaded comments with resolve/unresolve
- Review workflow (review/rework/approved/rejected)
- Share links with password protection and guest access
- SSE events for real-time updates
- **Ships:** Unified platform with file management + video review.

### Phase 3: Transcoding Pipeline (2-3 weeks)

Auto-generate review proxies.

- FFmpeg provider (background job queue, HLS ladder)
- Webhook provider (POST location, receive callback)
- Mux provider (PacSend mode)
- `proxy_status` lifecycle on assets
- Review tab auto-populates when proxy is ready
- **Ships:** Upload video -> proxy auto-generates -> appears in review queue.

### Phase 4: Auth + Permissions (2-3 weeks)

Remove Clerk. Extend permissions.

- Add 4 review permission bits to existing model
- New predefined roles (Reviewer, Manager)
- Space invites by email
- Self-registration flow (PacSend mode)
- **Ships:** Complete auth. Enterprise SSO. Clerk removed.

**After Phase 4: both existing products fully merged. ~14-18 weeks.**

### Phase 5: Automation Engine (4-6 weeks)

- Rules engine: trigger + conditions + actions
- Triggers: asset_uploaded, review_status_changed, comment_resolved, deadline_reached
- Actions: move/copy, start Aspera transfer, webhook, notify (email/Slack), change status
- YAML config (import/export)
- Run history + error handling
- **Ships:** "Approve -> move + deliver + notify" works.

### Phase 6: Visual Builder + PacSend (4-6 weeks)

- Visual automation builder (drag-drop)
- Template library (common M&E workflows)
- Stripe billing (PacSend mode)
- Quota enforcement
- Product mode feature gating
- **Ships:** All three product tiers functional.

**Total: ~22-32 weeks (5-8 months) for full platform.**

### Cut List (if timeline compresses)

- Phase 6 visual builder -> YAML-only automation is fine for enterprise
- Asset versioning (Phase 2) -> ship v1-only, add version chain later
- Presence (Phase 2) -> nice-to-have, not critical for first release

---

## Unresolved Questions

1. **Aspera licensing for PacSend.** IBM has announced Connect end-of-support April 30, 2026. Desktop client distribution rights for PacSend need contract clarification before GA.

2. **Workspace table.** Fetch doesn't have a grouping above spaces today. Do we add a workspace/organization table, or do spaces remain flat with team context handled differently?

3. **FFmpeg deployment.** Embedding FFmpeg in the Fetch binary adds ~40MB+ and platform-specific builds. Alternative: require FFmpeg on PATH as a system dependency. Which approach for open-source distribution?

4. **Convex migration data.** Existing Lawn deployments have data in Convex. Do we build a one-time migration tool, or is this only relevant for PacGenesis's own instance?

5. **Mobile/tablet.** PWA-first is the stated strategy. Does the review player need touch-optimized controls for iPad review workflows?
