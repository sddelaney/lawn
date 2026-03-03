# Phase 1: Greenfield Unified Frontend — Design

**Date:** 2026-03-03
**Status:** Approved
**Author:** Steven Delaney / PacGenesis
**Supersedes:** `2026-03-03-phase1-foundation-plan.md` (migration approach, now abandoned)

---

## Summary

Build the unified platform frontend from scratch on a `unified-platform` branch in the Fetch repo. Replace `web/` contents with a greenfield React app using TanStack Router, Radix UI + CVA, and a dual-aesthetic design system. Port Fetch's file browser as the proof that the entire stack works end-to-end. No backend changes. No review features yet.

**Phase 1 ships:** Login, spaces list, file browser (FASP + HTTP), admin panel (users/storage/branding), dual-aesthetic theme system, all on the new stack.

---

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Repo strategy | `unified-platform` branch in `~/dev/fetch/`, replace `web/` | Isolation via branch. Revert = switch to main. Phase 2+ backend changes happen naturally in same repo. |
| Package manager | bun | Greenfield — cleanest time to switch. Faster installs. Lawn already uses it. |
| Router | TanStack Router (file-based) | Type-safe params, file-based codegen, TanStack Query integration, search param validation. Greenfield — no migration cost. |
| Data layer | React Query 5 + Zustand 5 | Already used by Fetch. Proven patterns. Port hooks directly. |
| Components | Radix UI + CVA | Accessible primitives, variant system, aesthetic-variable-driven. Replaces all custom UI components. |
| CSS | Tailwind CSS 4 | Already used by Fetch (v4.1.13). No migration. |
| Design system | Dual-aesthetic (Brutalist + Clean) + 8 palettes | Two CSS variable layers (geometric + chromatic). Components reference variables, never hardcoded values. |
| Workspace model | Space = workspace. No new table. | `review_enabled` flag on spaces (Phase 2 migration). Routes: `/spaces/:slug/files`. |
| Fonts | Bundled locally in `web/public/fonts/` | Self-hosted product can't depend on CDNs. Air-gapped deployments must work. |
| Permissions | Add boolean columns in Phase 2+ | `can_review`, `can_approve`, `can_assign_reviewer`, `can_manage_automation` on `space_memberships`. Not Phase 1. |
| FFmpeg | Bundle in Docker image (Phase 3) | Zero-config for customers. Detect system FFmpeg for dev/local. |

---

## Repo Setup

**Branch:** `unified-platform` off `main` in `~/dev/fetch/`

**Action:** Clear `web/` contents on the branch, scaffold fresh.

**Stack:**
- bun
- Vite 7 + React 19 + TypeScript (strict)
- TanStack Router (file-based, Vite plugin)
- TanStack React Query 5
- Zustand 5
- Radix UI primitives
- CVA + tailwind-merge + clsx
- Tailwind CSS 4
- Lucide React (icons)
- hls.js (video — carried from Fetch)
- zod (validation — carried from Fetch)
- Vitest + Playwright

**Ported as-is (infrastructure, not UI):**
- `src/api/client.ts` — fetch wrapper with CSRF, auth redirect, error handling (394 lines)
- `src/api/types.ts` + `src/api/schemas.ts` — TypeScript interfaces and Zod validators
- Domain API modules (`spaces.ts`, `files.ts`, `members.ts`, `admin*.ts`, etc.)
- `src/hooks/useAuth.tsx` — session-based auth context (adapted for TanStack Router redirect)
- `src/stores/transferStore.ts` — Zustand store for Aspera SDK state
- `src/components/transfers/TransferProvider.tsx` — Aspera SDK initialization
- `src/lib/asperaSdk.ts` — SDK wrapper

**Rebuilt from scratch:**
- All UI components (Radix + CVA)
- All layout components (shell, sidebar, topbar, user dropdown)
- All page components (spaces, file browser, login, admin)
- Route definitions (TanStack Router file-based)
- Theme/aesthetic system (dual-layer CSS variables)

---

## Design System

Two independent CSS variable layers on `<html>`:

### Aesthetic Layer (`data-aesthetic`)

Controls geometry. Zero color information.

```css
[data-aesthetic="brutalist"] {
  --aesthetic-radius: 0px;
  --aesthetic-radius-lg: 0px;
  --aesthetic-border-width: 2px;
  --aesthetic-shadow: 4px 4px 0px 0px var(--color-shadow);
  --aesthetic-shadow-lg: 8px 8px 0px 0px var(--color-shadow);
  --aesthetic-shadow-elevated: 12px 12px 0px 0px var(--color-shadow);
  --aesthetic-text-transform: uppercase;
  --aesthetic-letter-spacing: 0.05em;
  --aesthetic-letter-spacing-label: 0.08em;
  --aesthetic-font-weight-label: 700;
  --aesthetic-font-sans: "Geist", system-ui, sans-serif;
  --aesthetic-font-mono: "Geist Mono", ui-monospace, monospace;
  --aesthetic-font-serif: "Instrument Serif", Georgia, serif;
}

[data-aesthetic="clean"] {
  --aesthetic-radius: 8px;
  --aesthetic-radius-lg: 12px;
  --aesthetic-border-width: 1px;
  --aesthetic-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  --aesthetic-shadow-lg: 0 4px 6px rgba(0, 0, 0, 0.1);
  --aesthetic-shadow-elevated: 0 8px 24px rgba(0, 0, 0, 0.12);
  --aesthetic-text-transform: none;
  --aesthetic-letter-spacing: 0;
  --aesthetic-letter-spacing-label: 0;
  --aesthetic-font-weight-label: 500;
  --aesthetic-font-sans: "DM Sans", system-ui, sans-serif;
  --aesthetic-font-mono: "JetBrains Mono", ui-monospace, monospace;
  --aesthetic-font-serif: Georgia, serif;
}
```

Brutalist-specific hover behaviors via CSS rules:
```css
[data-aesthetic="brutalist"] .shadow-aesthetic:hover {
  transform: translate(2px, 2px);
}
[data-aesthetic="brutalist"] .shadow-aesthetic:active {
  transform: translate(4px, 4px);
  box-shadow: none;
}
```

### Palette Layer (`data-theme`)

8 palettes using Fetch's existing `--color-*` convention:

**Brutalist-paired:**
- `lawn-light` — warm cream (#f0f0e8), forest green accent (#2d5a2d)
- `lawn-dark` — dark olive (#101410), soft green accent (#7cb87c)

**Clean-paired:**
- `deep-space`, `terminal`, `parchment`, `dracula`, `overcast`, `reef` — Fetch's existing 6 palettes

Each palette adds `--color-shadow` for brutalist offset shadows.

### Branding Layer (highest priority)

Admin-set accent color overrides `--color-accent-*`. Works with both aesthetics. Ported from Fetch's existing `useBranding` hook.

### Default

New users: Brutalist + Lawn Light.

### Fonts

Bundled in `web/public/fonts/`:
- Geist: 400, 500, 600, 700, 900
- Geist Mono: 400, 500
- Instrument Serif: 400
- DM Sans: 400, 500, 600, 700
- JetBrains Mono: 400, 500

Local `@font-face` declarations. No CDN dependencies.

---

## Component Library

~15 Radix + CVA components. All reference aesthetic CSS variables, never hardcoded values.

| Component | Base | Notes |
|-----------|------|-------|
| Button | Radix Slot | Variants: default, secondary, destructive, outline, ghost. Sizes: sm, md, lg. |
| Dialog | Radix Dialog | Replaces Fetch's Modal.tsx. |
| AlertDialog | Radix AlertDialog | Replaces Fetch's ConfirmDialog.tsx. Destructive confirmations. |
| DropdownMenu | Radix DropdownMenu | Replaces all manual popover/ref/click-outside patterns. |
| ContextMenu | Radix ContextMenu | Right-click menu in file browser. |
| Tabs | Radix Tabs | Files/Review surface switching. |
| Avatar | Radix Avatar | User initials/image. |
| Tooltip | Radix Tooltip | Toolbar labels, file info hovers. |
| Progress | Radix Progress | Upload/transfer progress. |
| ScrollArea | Radix ScrollArea | Sidebar, file lists. |
| Separator | Radix Separator | Topbar section dividers. |
| Badge | CVA only | Variants: default, secondary, destructive, outline, success, warning. |
| Card | CVA only | Space cards. |
| Input | CVA only | Text inputs, search fields. |
| Textarea | CVA only | Built now for completeness, used in Phase 2 (comments). |

**Not building yet:** Select/Combobox, Popover, Slider, Toast (Phase 2+).

**Pattern:** `border-[length:var(--aesthetic-border-width)] border-[var(--color-border-default)]` not `border-2 border-[#1a1a1a]`.

---

## Route Structure

TanStack Router file-based routing:

```
app/routes/
  __root.tsx              # Providers: Auth, QueryClient, Aesthetic, Branding, Transfer
  index.tsx               # Redirect → /spaces
  login.tsx               # Login (guest only guard)
  forgot-password.tsx
  reset-password.tsx
  spaces/
    index.tsx             # Spaces list (card grid)
    $slug/
      _layout.tsx         # Space shell: topbar + tabs, auth guard
      files.tsx           # File browser
      review.tsx          # Placeholder ("Coming in Phase 2")
  s/
    $token.tsx            # Share/guest link landing
  admin/
    _layout.tsx           # Admin guard + admin shell
    index.tsx             # Admin dashboard
    users.tsx
    storage.tsx
    branding.tsx
```

### Navigation Shell

```
┌──────────────────────────────────────────────┐
│ [≡] Space Name              [FASP] [🔔] [👤] │
├──────┬───────────────────────────────────────┤
│      │ [Files]  [Review]                     │
│ S    ├───────────────────────────────────────┤
│ P    │                                       │
│ A    │   Active surface content              │
│ C    │                                       │
│ E    │                                       │
│ S    │                                       │
└──────┴───────────────────────────────────────┘
```

- **Sidebar:** Spaces list from `useSpaces()`. Admin link if admin. Settings link. Collapsible mobile.
- **Topbar:** Space name, FASP indicator, notification bell (placeholder), user dropdown with aesthetic + palette picker.
- **Space tabs:** Files always visible. Review visible when `review_enabled` (hardcoded false until Phase 2 adds the column).
- **Auth guards:** `_layout.tsx` checks `useAuth()`, redirects to `/login?next=...`.

---

## File Browser

Port of Fetch's SpaceBrowser.tsx (1,067 lines). Keep logic, rebuild UI.

### Ported directly (logic):
- All API calls (browse, search, create, upload, delete, rename, download, content URL)
- React Query hooks with sort/search state
- Multi-select with Shift+click range selection
- Breadcrumb path computation
- Transfer integration (FASP + HTTP via `useTransferContext()`)
- Virtualization (`@tanstack/react-virtual`)

### Rebuilt with new components:
- Toolbar → Radix DropdownMenu for upload/download split buttons
- Context menu → Radix ContextMenu
- Confirm dialogs → Radix AlertDialog
- Members modal → Radix Dialog
- File preview panel → Card + ScrollArea
- Search bar → Input component
- Table → virtual table with aesthetic variable styling
- Breadcrumbs → rebuilt
- Loading states → Skeleton

### Simplified for v1:
- No endpoint browser (`/files/:endpointId/`). Admin concern, add later.
- File preview: image, video, text. PDF and advanced formats later.

### What this proves:
Auth, API calls, CSRF, file operations, FASP transfers, real-time transfer state — all working through the new design system in both aesthetic modes.

---

## Admin Panel (Phase 1 scope)

Three pages, enough to configure the system:

- **Users** — list, create, edit, delete users. Role assignment.
- **Storage** — storage endpoint configuration.
- **Branding** — product name, logo, accent color. Preview in both aesthetics.

**Deferred:** Operations/transfers monitoring, notifications config, SAML/OIDC config. These are complex and not needed to prove the unified frontend.

---

## Explicit Cut List

Phase 1 does NOT include:

- Review features (assets, comments, HLS player, share links) — Phase 2
- Backend changes (zero Rust code changes) — Phase 2+
- New API endpoints — Phase 2+
- `review_enabled` column on spaces — Phase 2
- Permission extensions (`can_review`, `can_approve`) — Phase 2+
- Operations/transfers monitoring page — deferred
- Send links page — deferred
- Connections page — deferred
- Activity page — deferred
- Notifications (bell links to placeholder) — Phase 2
- Automation surface — Phase 5+
- Email/invite flows — Phase 4
- Stripe/billing — Phase 6
- Mobile optimization — deferred
- Convex data migration — never

---

## Completion Criteria

- [ ] `unified-platform` branch exists with fresh `web/` on new stack
- [ ] Dual-aesthetic system working (Brutalist + Clean switch)
- [ ] 8 palettes (2 brutalist + 6 clean) all rendering correctly
- [ ] Aesthetic + palette picker in user dropdown
- [ ] TanStack Router with file-based routing, typed params
- [ ] ~15 Radix + CVA components built and working in both aesthetics
- [ ] Login flow working against Fetch's existing auth API
- [ ] Spaces list page showing real spaces from API
- [ ] File browser fully functional (browse, search, upload, download, create folder, rename, delete)
- [ ] FASP transfers working through new UI
- [ ] HTTP fallback transfers working
- [ ] Admin panel: users, storage, branding pages functional
- [ ] Branding overrides work in both aesthetic modes
- [ ] Fonts bundled locally, no CDN dependencies
- [ ] Build passes, types pass, lint passes
- [ ] Vitest unit tests for theme/aesthetic system
- [ ] Playwright smoke tests for login → browse → upload flow

---

## Phases 2–6 Summary (unchanged from unified platform design doc)

**Phase 2: Review Core (4-6 weeks)** — assets table, comments, HLS player, share links, `review_enabled` on spaces, ~35 new API endpoints, SSE real-time.

**Phase 3: Transcoding Pipeline (2-3 weeks)** — FFmpeg in Docker, webhook provider, Mux for PacSend, auto-proxy on upload.

**Phase 4: Auth + Permissions (2-3 weeks)** — review permission booleans, space invites, self-registration (PacSend), Clerk removal.

**Phase 5: Automation Engine (4-6 weeks)** — rules engine, triggers/conditions/actions, YAML config, run history.

**Phase 6: Visual Builder + PacSend (4-6 weeks)** — drag-drop builder, Stripe billing, quota enforcement, product mode gating.
