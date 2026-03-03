# Unified Platform: Fetch + Lawn

**Date:** 2026-03-03
**Status:** Exploratory
**Author:** Steven Delaney / PacGenesis
**Last researched:** 2026-03-03

---

## Thesis

Fetch and Lawn are two halves of the same product. Fetch moves files. Lawn reviews them. Neither alone replaces what M&E customers cobble together from Aspera Shares + Frame.io + email + Dropbox. Combined, they do.

One platform. Three surfaces:

1. **Media Management** — ingest, browse, organize, deliver (Fetch's file portal)
2. **Content Review** — watch, comment, approve (Lawn's review UI)
3. **Automation** — what happens after approval (move, deliver, notify, route)

The automation layer is the glue. Without it, you have two tools duct-taped together. With it, you have a workflow platform.

---

## Product Lines (One Codebase, Three Modes)

Open-core model. Same binary, different configuration.

| Product | Customer | Deployment | Billing | Aspera | Automation |
|---------|----------|------------|---------|--------|------------|
| **Lawn** (open source) | Community, self-hosters | Self-hosted | None | No | Basic (manual status) |
| **Fetch** (enterprise) | Large M&E (WWE, CBS, NatGeo) | Self-hosted / on-prem | License key (PO/invoice) | Yes | Full (visual builder + YAML) |
| **PacSend** (hosted SaaS) | Small post houses, freelancers | PacGenesis-hosted | Stripe subscription | Yes | Full |

```toml
# fetch.toml — mode determines what's enabled
[product]
mode = "pacsend"  # "open" | "enterprise" | "pacsend"
```

### Lawn (Open Source)

MIT licensed. The community edition. No Aspera, no billing, FFmpeg transcoding. Review workflow works out of the box. Funnel for enterprise and PacSend leads.

What ships: file browser + video review + comments + share links + team/project organization.

### Fetch (Enterprise)

Self-hosted. Everything in open source plus: Aspera transport, pluggable transcoding, automation rules, SAML/OIDC SSO, audit logging, multi-endpoint storage, admin panel. Licensed per-server or per-user, sold via PO. This is the product for customers who already have HSTS, Vantage, and IT teams.

### PacSend (Hosted SaaS)

PacGenesis-hosted. Everything in enterprise, fully managed. Customer signs up, uploads, reviews — no infrastructure to deploy. PacGenesis runs the HSTS, transcoding, and storage. Stripe subscription billing.

Target: the 2-10 person post house that uses Frame.io + WeTransfer today. They don't have HSTS. They don't have IT. They need "upload big files fast, get client feedback, deliver."

**Pricing (proposed):**

| Tier | Price | Storage | Transfer/mo | Members | Target |
|------|-------|---------|-------------|---------|--------|
| Starter | $29/mo | 250 GB | 500 GB | 3 | Freelancer, tiny post house |
| Pro | $99/mo | 1 TB | 2 TB | Unlimited | Small post house |
| Studio | $249/mo | 5 TB | 10 TB | Unlimited | Mid-size facility |
| Enterprise | Custom | Custom | Custom | Unlimited | Large broadcaster |

Per-seat pricing is wrong for this market. Frame.io's current published pricing is $15/member/month (Pro) and $25/member/month (Team). PacSend Pro at $99/mo undercuts Team at 4+ members and Pro at 7+ members while adding high-speed transfer as part of the base plan.

Transfer limits are the key differentiator. You're not just hosting videos — you're providing Aspera-speed delivery. That's worth real money to a post house sending 50GB ProRes files to clients.

---

## Architecture

### Three Pillars

```
┌─────────────────────────────────────────────────────────┐
│                    UNIFIED PLATFORM                      │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │    MEDIA      │  │   CONTENT    │  │  AUTOMATION  │  │
│  │  MANAGEMENT   │  │   REVIEW     │  │              │  │
│  │              │  │              │  │              │  │
│  │ Upload/ingest│  │ HLS player   │  │ Rules engine │  │
│  │ File browser │  │ Timestamped  │  │ Visual builder│  │
│  │ Folder org   │  │  comments    │  │ YAML export  │  │
│  │ Download/    │  │ Threaded     │  │ Webhook fire │  │
│  │  deliver     │  │  discussion  │  │ Move/copy    │  │
│  │ Share links  │  │ Review/      │  │ Notify       │  │
│  │ Search       │  │  rework/done │  │ Route to     │  │
│  │              │  │ Guest review │  │  next queue  │  │
│  │              │  │ Versions     │  │              │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                 │          │
│  ───────┴─────────────────┴─────────────────┴────────  │
│                    SHARED LAYER                         │
│                                                         │
│  Auth (local + OIDC + SAML)    Asset model (unified)   │
│  Storage (S3 / local / HSTS)   Roles & permissions     │
│  Transport providers           Audit logging           │
│  Transcode providers           API (REST + webhooks)   │
└─────────────────────────────────────────────────────────┘
```

### Role-Based Surfaces

Users don't see "Fetch" and "Lawn." They see surfaces based on their role:

| Role | Sees | Primary Action |
|------|------|----------------|
| **Contributor** | Upload portal, file browser | Ingest content |
| **Reviewer** | Review queue, video player | Watch, comment, approve/reject |
| **Manager** | Both + automation rules | Configure workflows, monitor |
| **Client** (guest) | Single review link | Comment, approve (no account) |
| **Admin** | Everything + settings | Users, storage, billing, config |

A producer might have both Contributor and Reviewer roles. A client gets a guest link with no account required. The surfaces are the same app — just different views gated by permissions.

### What's Already Built

| Capability | Source | Status | Gap |
|------------|--------|--------|-----|
| File upload/browse/download | Fetch | Production | None |
| Aspera FASP transport | Fetch + Lawn (new) | Production | Needs unified provider |
| HTTP chunked transfer | Fetch data plane | Production | None |
| S3/local storage | Fetch | Production | None |
| HLS video playback | Lawn (Mux) + Fetch (FFmpeg) | Production | Need pluggable transcoder |
| Timestamped comments | Lawn | Production | Port to Fetch backend |
| Review workflow (status) | Lawn | Production | Port to Fetch backend |
| Share/guest links | Lawn | Production | Port to Fetch backend |
| Auth (local + OIDC + SAML) | Fetch | Production | None |
| Role-based permissions | Fetch (7-bit spaces) | Production | Extend for review roles |
| Stripe billing | Lawn | Built (bypassed) | Re-enable for PacSend mode |
| Audit logging | Fetch | Production | Extend for review events |
| REST API | Fetch (26 endpoints) | Production | Add review endpoints |
| Automation rules | Neither | Not started | New build |

**Estimate: ~60% of the unified platform exists across the two codebases.** The main gaps are the shared asset model, pluggable transcoding, and the automation layer.

---

## Pluggable Transport

Abstracted behind a provider interface. The platform doesn't care how bytes move — it cares that they arrived.

```
TransportProvider
  ├── AsperaProvider     (FASP via HSTS Node API)
  ├── S3DirectProvider   (presigned URL PUT/GET)
  ├── HttpChunkedProvider (Fetch data plane)
  ├── LocalFsProvider    (direct filesystem — on-prem)
  ├── SftpProvider       (legacy integration)
  └── WebhookProvider    (customer triggers their own transfer system)
```

Fetch already has Aspera, S3, HTTP chunked, and local FS. Lawn adds the browser-side Aspera Connect SDK integration. SFTP and webhook are future.

The key: `markAssetArrived(assetId, storageLocation)` is transport-agnostic. Doesn't matter if it came via FASP, HTTP, or carrier pigeon. Once it's in storage, the review pipeline kicks in.

---

## Pluggable Transcoding

Same pattern. The platform needs an HLS proxy for browser playback. How it's generated is configurable.

```
TranscodeProvider
  ├── FfmpegProvider         (embedded, default — free, works offline)
  ├── MuxProvider            (cloud SaaS — best DX, per-minute cost)
  ├── MediaConvertProvider   (AWS — cheap, good for AWS-native customers)
  ├── AzureMediaProvider     (Azure — for Azure shops)
  └── WebhookProvider        (POST file location, receive callback when done)
```

**The webhook provider is critical.** Large M&E customers already own Telestream Vantage, Harmonic, AWS Elemental, or custom FFmpeg pipelines. You don't integrate with each one. You expose a contract: "Here's the file, here's the callback URL, tell me when HLS is ready." The customer wires it to whatever they have.

**Default:** FFmpeg (embedded). Free, self-hosted, works offline. Generates a standard HLS ladder (360p/720p/1080p). Good enough for review — you're watching proxies, not mastering.

**PacSend default:** Mux or MediaConvert (managed). PacGenesis absorbs the transcoding cost, baked into subscription pricing.

### FFmpeg vs Mux — Practical Tradeoffs

| | FFmpeg (self-hosted) | Mux (cloud) |
|---|---|---|
| Cost | Free (infra only) | $10 monthly base (includes 100,000 video minutes) + $0.005/encoded minute + $0.0015/streamed minute + $0.00083/stored video-minute/month |
| Speed | Limited by local CPU/GPU | Parallelized cloud, very fast |
| Quality | Standard ABR ladder (fixed) | Per-title encoding (ML-optimized) |
| Ops burden | You manage the queue, cleanup, hardware accel | Zero ops |
| Offline | Yes | No |
| CDN | None (serve from local/S3) | Built-in edge delivery |
| For review use case | More than sufficient | Overkill |

For a review tool, FFmpeg is fine. Reviewers need a watchable proxy, not broadcast-quality adaptive streaming. Mux is still valuable for managed operations and fast time-to-market, but it's no longer "obviously too expensive" at low/medium scale with current pricing.

---

## Automation Layer (New Build)

This is the piece that makes "Done" mean something. Without it, approval is just a label. With it, approval triggers real work.

### Core Concepts

**Triggers** — events that start an automation:
- Asset uploaded (to specific folder/project)
- Review status changed (review → approved, review → rejected)
- Comment added / resolved
- All comments resolved
- Deadline reached
- Manual trigger (button click)

**Actions** — what happens when triggered:
- Move/copy asset to folder (e.g., `/approved/masters/`)
- Start a Fetch transfer (deliver to client, archive to Glacier)
- Send notification (email, Slack webhook, generic webhook)
- Change asset status
- Assign to reviewer / add to review queue
- Run external webhook (trigger MAM ingest, start downstream workflow)
- Create a task in external system (Jira, Asana, etc.)

**Conditions** — optional filters:
- File type matches (ProRes, H.264, etc.)
- File size above/below threshold
- Project matches
- Reviewer role matches
- Time-based (business hours only)

### Example Workflows

**Basic review loop:**
```yaml
- trigger: asset_uploaded
  folder: /incoming/*
  actions:
    - transcode: { provider: ffmpeg, profile: review-proxy }
    - assign_reviewer: { role: senior-editor }
    - notify: { channel: slack, message: "New asset ready for review" }

- trigger: status_changed
  to: approved
  actions:
    - move: { to: /approved/masters/{project}/{date}/ }
    - transfer: { provider: aspera, destination: client-hsts, notify: true }
    - notify: { channel: email, to: producer, message: "Asset approved and delivered" }

- trigger: status_changed
  to: rejected
  actions:
    - notify: { channel: email, to: editor, message: "Revisions requested — see comments" }
    - assign_reviewer: { role: editor }
```

**Post-house delivery workflow:**
```yaml
- trigger: status_changed
  to: approved
  conditions:
    - project.tag: client-delivery
  actions:
    - transcode: { provider: webhook, endpoint: vantage, profile: broadcast-master }
    - wait_for: transcode_complete
    - transfer: { provider: aspera, destination: client-dropbox }
    - move: { to: /archive/{project}/{year}/ }
    - webhook: { url: https://mam.internal/api/ingest, payload: asset_metadata }
```

### UI

Two modes:

1. **Visual builder** — drag-and-drop trigger → condition → action chains. For managers who don't write YAML. Similar to Zapier/n8n but purpose-built for media workflows.

2. **YAML editor** — for power users and automation. Export from visual builder, version in git, import across instances.

### Scope

The automation layer is the largest new build. Estimated phases:

- **Phase 1 (NAB demo):** Hardcoded "on approve → move to folder + webhook" flow. Proves the concept. No visual builder yet.
- **Phase 2:** Core rules engine with trigger/action/condition primitives. YAML config.
- **Phase 3:** Visual builder UI. Template library. Slack/email integrations.
- **Phase 4:** Multi-step workflows with wait states, branching, error handling.

---

## Shared Asset Model

Today Fetch and Lawn have separate data models. Fetch has "files in spaces." Lawn has "videos in projects." These need to converge.

### Unified Model

```
Workspace (≈ team)
  └── Space (≈ project, with permissions)
       └── Asset
            ├── metadata (name, size, type, created, tags)
            ├── storage_location (s3_key, local_path, hsts_path)
            ├── proxy (hls_manifest, thumbnail, waveform)
            ├── versions[] (v1, v2, v3 — linked chain)
            ├── review_status (none | review | approved | rejected)
            ├── comments[] (timestamped, threaded, resolvable)
            └── automation_history[] (what fired, when, result)
```

Key changes from current models:

- **Versions are linked.** v2 knows it replaced v1. Comments carry forward with version annotations. ("This was on v1 — is it still relevant?")
- **Review is optional per-asset.** A CSV doesn't need review. A ProRes master does. Review surfaces only for assets that have `review_status != none`.
- **Proxy generation is automatic.** When a video asset arrives, transcoding kicks in. When the proxy is ready, the asset appears in the review queue. No manual step.
- **Assets exist independent of surface.** The same asset appears in the file browser (Media Management) and the review queue (Content Review). It's one record, two views.

### Migration Path

Don't rewrite both data models at once. Phase it:

1. Fetch's existing `files` + `spaces` model stays as-is
2. Add `review_status`, `comments`, `versions`, `proxy` fields to Fetch's asset model
3. Port Lawn's review UI to read from Fetch's API instead of Convex
4. Retire Convex/Lawn's separate data layer

---

## Auth Model

Fetch's auth is the foundation. Already production-tested with local, OIDC, and SAML.

### Role Mapping

| Role | Media Management | Content Review | Automation | Admin |
|------|-----------------|----------------|------------|-------|
| Admin | Full access | Full access | Configure rules | Full access |
| Manager | Browse, upload, download | Review, approve, assign | Configure rules | Team settings |
| Contributor | Upload to assigned spaces | View own submissions | None | None |
| Reviewer | Browse (read-only) | Review, comment, approve/reject | None | None |
| Client (guest) | None | Review specific assets (via link) | None | None |

Fetch already has 7-bit per-space permissions (browse, download, upload, create folder, rename, delete, manage, share). Review permissions extend this with: `review`, `approve`, `assign_reviewer`, `manage_automation`.

Guest review links work like Lawn's current share links — no account required, scoped to specific assets, optional password protection, expiration.

---

## Backend Unification

### Decision: Fetch's Rust Stack

Convex is no longer strictly cloud-only (self-hosting exists in early access), but Fetch's Rust stack is still the right unification target. Reasons:

- **Deployment certainty.** Enterprise and regulated customers need proven self-hosted operation today; Convex self-hosting is still early-access.
- **Lock-in reduction.** Convex's model is productive but proprietary; Axum + SQL keeps long-term portability.
- **Cost control.** Convex plans still meter function calls and realtime updates; Fetch's stack is easier to model on fixed infra budgets.
- **Fetch already has the stack.** Axum + SeaORM + SQLite/PostgreSQL is production-tested and already aligned with Fetch enterprise deployments.

What Convex provides that Fetch needs to replicate:
- **Real-time updates** → SSE (Fetch already uses this for activity feed)
- **Optimistic UI** → React Query mutations with cache updates
- **Serverless functions** → Axum handlers (already exist)
- **File storage** → S3/local (already exist)

The migration path: port Lawn's Convex mutations/queries to Fetch API endpoints. The React components stay mostly the same — swap `useQuery(api.videos.list)` for `useQuery({ queryKey: ['videos'], queryFn: fetchVideos })`.

### Data Layer

```
Fetch (Rust/Axum)
  ├── SeaORM models
  │   ├── workspaces (teams)
  │   ├── spaces (projects, with permissions)
  │   ├── assets (files + videos, unified)
  │   ├── asset_versions
  │   ├── comments
  │   ├── reviews (status history)
  │   ├── automation_rules
  │   ├── automation_runs
  │   ├── users, groups, sessions (existing)
  │   └── billing (Stripe, PacSend mode only)
  │
  ├── API endpoints
  │   ├── /api/v1/assets/* (CRUD, search, versions)
  │   ├── /api/v1/reviews/* (status, assign, queue)
  │   ├── /api/v1/comments/* (create, thread, resolve)
  │   ├── /api/v1/automations/* (rules CRUD, run history)
  │   ├── /api/v1/transcode/* (job status, provider config)
  │   └── existing Fetch endpoints (files, transfers, users, etc.)
  │
  └── SSE streams
      ├── /events/reviews (status changes, new comments)
      ├── /events/transfers (progress, completion)
      └── /events/assets (new arrivals, proxy ready)
```

---

## NAB Demo Flow (5 Steps)

The minimum viable demo that tells the whole story:

### Step 1 — Upload
Editor drags a 20GB ProRes file into the browser. Aspera Connect activates — transfer completes in 90 seconds instead of 20 minutes. Progress bar shows FASP speed.

"This is the same Aspera your team already uses. No new infrastructure."

### Step 2 — Auto-Queue
File lands in S3. FFmpeg (or Mux) automatically generates an HLS proxy. Within 60 seconds, the asset appears in the reviewer's queue with a "Ready for Review" badge.

"No one had to do anything. Content arrived, proxy was built, reviewer was notified."

### Step 3 — Review
Producer opens the review queue. Watches the proxy in the HLS player. Leaves timestamped comments: "0:14 — color is off in this shot." "1:32 — wrong lower third." Threaded replies from the editor: "Fixed in v2, uploading now."

"Frame.io experience, but running on your infrastructure."

### Step 4 — Approve
Producer clicks Approve. Version 2 is marked as the master.

### Step 5 — Automation Fires
On approval:
- Asset moves to `/approved/masters/2026-03/`
- Aspera transfer kicks off to the client's HSTS endpoint
- Slack notification: "Project X — final master approved and delivered"
- Webhook fires to MAM for archival ingest

"One click. Delivery, archive, and notification — all automatic. No emails, no manual file moves, no 'did you send it?'"

### Demo Requirements (What Must Be Built)

| Requirement | Status | Work Needed |
|-------------|--------|-------------|
| Aspera upload in browser | Done | Committed to Lawn |
| HLS playback | Done | Lawn (Mux) or Fetch (FFmpeg) |
| Timestamped comments | Done | Lawn, needs Fetch port |
| Review status workflow | Done | Lawn, needs Fetch port |
| Auto-proxy on upload | Partial | Trigger FFmpeg on asset arrival |
| Automation: move on approve | Not built | Simple hardcoded rule for demo |
| Automation: trigger transfer | Not built | Call Fetch transfer API |
| Automation: webhook/notify | Not built | HTTP POST on event |
| Unified navigation | Not built | Header switcher between surfaces |

**Estimate for NAB-ready demo:** 4-6 weeks with focused effort. The review UI and Aspera upload already work. The gaps are: proxy auto-generation, one hardcoded automation rule, and the unified navigation shell.

---

## Licensing Model

### Open Source (MIT)

Lawn's current MIT license covers the review UI, comments, share links, and basic workflow. This stays MIT. Community contributions flow back upstream.

### Enterprise License

Fetch's proprietary features: Aspera transport, SAML/OIDC, automation rules, admin panel, multi-endpoint storage, audit logging. Annual license, per-server or per-named-user pricing. Standard PacGenesis enterprise sales motion.

### PacSend (SaaS Terms)

Standard SaaS ToS. Monthly/annual subscription. PacGenesis hosts everything. Customer data in PacGenesis-managed AWS. SOC2/security questionnaire for enterprise SaaS customers.

### Open-Core Boundary

| Feature | Open Source | Enterprise / PacSend |
|---------|------------|---------------------|
| File upload/browse/download | Yes | Yes |
| Video review + comments | Yes | Yes |
| Share links (guest review) | Yes | Yes |
| FFmpeg transcoding | Yes | Yes |
| Team/project organization | Yes | Yes |
| REST API | Yes | Yes |
| Aspera FASP transport | No | Yes |
| SAML / OIDC SSO | No | Yes |
| Automation rules | No | Yes |
| Visual automation builder | No | Yes |
| Pluggable transcoding (Mux, MediaConvert, webhook) | No | Yes |
| Multi-endpoint storage | No | Yes |
| Audit logging | No | Yes |
| Admin panel | No | Yes |
| Priority support | No | Yes |

The boundary is clean: open source gets a fully functional review tool with local auth and FFmpeg. Enterprise gets the integrations, automation, and SSO that large organizations require.

---

## Relationship to MAM

This platform is **not a MAM.** It does not replace Dalet, Avid MediaCentral, Iconik, or CatDV.

A MAM manages the full asset lifecycle: ingest, cataloging, metadata taxonomy, search/discovery across millions of assets, rights management, licensing windows, compliance, archive/retrieval, distribution to playout/OTT/social.

This platform handles **two specific steps** in the M&E workflow:

1. **Move the file** (ingest/delivery) — Fetch's job
2. **Review the file** (feedback/approval) — Lawn's job

The automation layer connects these steps to each other and to external systems (including MAMs). "Approved → webhook to MAM for ingest" is an automation rule, not a MAM feature.

**Positioning:** "We're not replacing your MAM. We're replacing Frame.io and Aspera Shares — and connecting them to your MAM automatically."

For customers without a MAM (small post houses), the automation layer provides lightweight workflow that's "good enough" — move approved files to a folder, notify the right people, deliver to clients. They don't need Dalet. They need "approved stuff goes here, rejected stuff goes back."

---

## Decisions and Remaining Questions (Research Update — 2026-03-03)

### Product

1. **Brand naming (recommended decision).** Keep "Fetch" as the enterprise platform name and "Lawn" as the OSS distribution. Position "PacSend" as hosted Fetch. This preserves existing market equity and reduces rename risk before NAB.

2. **PacSend go-to-market (recommended decision).** Ship hybrid motion: self-serve credit card signup for Starter/Pro/Studio, plus sales-assisted onboarding for Studio/Enterprise. Use a 14-day trial, no permanent free tier for Aspera-enabled plans.

3. **Aspera licensing for PacSend (still open, now urgent).** This needs contract clarification before GA. IBM has published Connect end-of-support on April 30, 2026 and is moving customers to "Aspera for desktop," so licensing and desktop-client distribution rights must be explicitly covered for PacSend.

4. **Frame.io migration (recommended scope).** Build a phased importer, not a "full parity" promise:
   - Phase A: projects/folders/assets/comments/replies import.
   - Phase B: share links + reviewers mapping.
   - Deferred: range comments and template parity until Frame v4 API support is complete.

### Technical

5. **Backend unification timeline (recommended decision).** Keep pre-NAB as "single backend demo path" (review UI reads from Fetch APIs for one golden flow). Full Convex-to-Fetch migration should be post-NAB to avoid demo risk.

6. **Router unification (recommended decision).** Do not block NAB on router rewrites. Both React Router 7 and TanStack Router support intent-based prefetching. Choose one post-NAB based on migration cost and team velocity, not preload feature gaps.

7. **FFmpeg job queue (recommended design).** Use a DB-backed queue with Postgres in production (`FOR UPDATE SKIP LOCKED` worker leasing, retries, dead-letter states). Keep SQLite queue only for local/dev mode because SQLite permits a single concurrent writer.

8. **Version model (recommended UX).** Comments stay anchored to the version they were created on. On v2+, surface unresolved v1 comments in a "carried forward" lane with explicit resolve/reopen actions; do not silently copy all comments into the new timeline.

9. **PacSend infrastructure (updated recommendation).** Use multi-tenant by default for self-serve PacSend (better margin, faster onboarding), with single-tenant enterprise deployments as a paid isolation tier.

10. **Mobile strategy (updated recommendation).** PWA first is still correct, with caveat: iOS/iPadOS push notifications require Home Screen installation (supported since iOS/iPadOS 16.4). Revisit native only if background/offline transfer workflows become a top-tier requirement.

## Research Notes (2026-03-03)

- **Frame.io pricing moved.** Current published pricing is $15/member/mo Pro and $25/member/mo Team; storage/members caps changed from older assumptions.
- **Frame API parity is improving but incomplete.** v4 docs include comments + replies endpoints, but migration docs still list some features as "coming soon."
- **Aspera desktop transition is active.** IBM has announced Connect end-of-support and promoted Aspera for desktop as replacement.
- **Convex posture changed.** Self-hosting exists (early access), so "cloud-only" is no longer strictly accurate.
- **Mux economics changed materially.** Current rates are much lower than the legacy numbers in this document.
- **MediaConvert pricing is flexible but operationally complex.** Normalized-minute billing and tiered multipliers favor AWS-native customers with strong FinOps visibility.

## Sources

- Frame.io pricing: https://frame.io/pricing
- Frame.io API getting started + rate limits: https://next.developer.frame.io/platform/docs/getting-started
- Frame.io v4 comments API: https://next.developer.frame.io/api/reference/operation/list-comments-v4-experimental
- Frame.io v4 migration guide: https://next.developer.frame.io/platform/docs/v4-migration-guide
- IBM Aspera Connect EOS bulletin: https://www.ibm.com/support/pages/node/7231132
- IBM Aspera Connect / Aspera for desktop page: https://www.ibm.com/aspera/connect/
- IBM Aspera annual plans announcement: https://community.ibm.com/community/user/blogs/dhia-nadhem/2024/03/29/ibm-aspera-on-cloud-lite
- Convex self-hosting: https://docs.convex.dev/self-hosting
- Convex plan limits/pricing dimensions: https://docs.convex.dev/production/state/limits
- Mux video billing rates: https://support-agent.mux.com/docs/billing/video
- AWS Elemental MediaConvert pricing: https://aws.amazon.com/mediaconvert/pricing/
- React Router prefetch docs: https://reactrouter.com/api/components/Link
- TanStack Router preloading docs: https://tanstack.com/router/latest/docs/framework/react/guide/preloading
- PostgreSQL `SKIP LOCKED`: https://www.postgresql.org/about/featurematrix/detail/skip-locked-clause/
- SQLite transaction/concurrency behavior: https://www.sqlite.org/lang_transaction.html
- WebKit web push for iOS/iPadOS 16.4: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
