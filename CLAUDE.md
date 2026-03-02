# CLAUDE.md — Lawn (PacGenesis Fork)

PacGenesis fork of Lawn — video review platform for creative teams, positioned alongside Fetch as a Frame.io replacement for M&E customers using IBM Aspera.

## On Session Start
1. Read `docs/plans/2026-03-02-aspera-upload-integration-design.md` — approved integration design
2. Read `AGENTS.md` — upstream philosophies (performance, defaults, convenience, security)
3. Read `docs/setup.md` — dev commands and env vars

## What This Is

**Lawn** is an open-source video review platform (Frame.io alternative) originally built by Theo. This fork adds IBM Aspera FASP upload support and positions it as a PacGenesis product for M&E customers.

**Fetch** (`~/dev/fetch/`) is the companion product — a self-hosted managed file transfer portal replacing IBM Aspera Shares. Fetch handles bulk file transfer; Lawn handles video review and collaboration. They share Aspera infrastructure and can share S3 storage.

## Customer Profile

- **Industry:** Media & Entertainment (broadcast, post-production, content distribution)
- **Current tools:** IBM Aspera (HSTS/FASP for transfer) + Frame.io (video review) — separate products, separate vendors
- **Pain:** Two disconnected tools. Frame.io doesn't leverage their Aspera investment. Large video uploads (10-100GB ProRes) are slow over HTTP
- **Pitch:** Lawn replaces Frame.io. Uploads accelerated by their existing Aspera infrastructure. One fewer vendor, faster uploads, tighter integration with Fetch for bulk transfer
- **Lighthouse candidates:** WWE, National Geographic, CBS, small post houses
- **Competitor context:** Frame.io (Adobe), Wipster, Screenlight. None integrate with Aspera

## IBM Aspera Context

For agents unfamiliar with the Aspera ecosystem:

- **FASP:** IBM's proprietary high-speed transfer protocol. 10-100x faster than HTTP/FTP over distance/lossy networks. Requires Aspera software on both ends
- **HSTS (High-Speed Transfer Server):** The server component. Exposes a Node API (REST) for managing transfers programmatically. Can use S3, local disk, or other storage backends
- **Aspera Connect:** Browser plugin/extension that enables FASP transfers from web apps. Detected via JavaScript SDK (`AW4.Connect`). Falls back to HTTP if not installed
- **Node API:** REST API on HSTS (typically port 9092). Used to authenticate, create transfer specs, manage files. Basic auth or access key authentication
- **Transfer Spec:** JSON object describing a transfer (token, remote host, paths, rate policy, etc.). Passed to Connect SDK to initiate FASP transfer
- **PacGenesis:** IBM Aspera reseller. Steven (project owner) is a Solutions Architect with 15 years on Aspera. Builds Fetch and this fork

## Architecture

```
Tech Stack:
- Frontend: React 19 + TanStack React Router + Vite + Tailwind CSS 4
- Backend: Convex (serverless DB + functions)
- Auth: Clerk (JWT)
- Video processing: Mux (HLS transcoding)
- Storage: S3-compatible (Railway or AWS)
- Billing: Stripe
- Deployment: Vercel (frontend) + Convex (backend)

Upload Pipeline (current):
  Browser → presigned S3 PUT → S3 bucket → Mux ingests from S3 → HLS playback

Upload Pipeline (with Aspera — in progress):
  Browser → Aspera Connect SDK → FASP → HSTS → same S3 bucket → Mux ingests → HLS playback
  (Falls back to S3 direct if Connect not installed)
```

Key files for the upload pipeline:
- `app/routes/dashboard/-useVideoUploadManager.ts` — orchestrates upload flow
- `convex/videoActions.ts` — presigned URL generation, upload completion, Mux ingest
- `convex/s3.ts` — S3 client configuration
- `convex/mux.ts` — Mux API client
- `src/components/upload/DropZone.tsx` — drag-drop upload UI

## Infrastructure

**Steven's environments (see `~/dev/fetch/secrets/INFRA.md` for credentials):**

| Environment | Purpose | Access |
|-------------|---------|--------|
| Devbox | Development server | `ssh devbox` |
| HSTS (EC2) | Aspera transfer server | `ssh -i ~/Steven-KeyPair.cer ec2-user@aew-hsts.pacgenesis.com` |
| Fetch Dev | Fetch on devbox | `fetch-dev.lan:8080` |
| Fetch Staging | Fetch on Proxmox | `192.168.1.160` |
| Fetch Demo | Fetch on AWS | `demo.pacgenesis.com` |
| Fetch Prod | Fetch on AWS | `fetch.pacgenesis.com` |

For S3 bucket access and HSTS Node API credentials, check `~/dev/fetch/secrets/INFRA.md`.

## Dev Commands

```bash
bun install          # Install dependencies
bun run dev          # Run app + Convex locally
bun run dev:web      # Run only web app
bun run build        # Production build
bun run typecheck    # Type checking
bun run lint         # Linting
```

## Working Style

- Be direct. Skip filler
- Simple solutions over clever ones
- Test before claiming things work
- `trash` > `rm`
- Ask before: sending emails/messages, anything external, destructive operations
- Ship > perfect; track debt, don't hide it

## Design Language

### Philosophy
Brutalist, typographic, minimal. Bold and direct — like a poster, not a dashboard. Clarity over decoration. Typography and whitespace do the heavy lifting.

### Colors
- **Background**: `#f0f0e8` (warm cream)
- **Text**: `#1a1a1a` (near-black)
- **Muted text**: `#888888`
- **Primary accent**: `#2d5a2d` (deep forest green)
- **Accent hover**: `#3a6a3a`
- **Highlight**: `#7cb87c` (soft green for emphasis)
- **Borders**: `#1a1a1a` (strong) or `#ccc` (subtle)
- **Inverted sections**: `#1a1a1a` background with `#f0f0e8` text

### Rules
- Bold typography for hierarchy, embrace whitespace
- 2px black borders, no rounded corners, no gradients/shadows
- Solid buttons with bold text, clear hover states
- No decorative icons — only functional ones
- Green sparingly as accent, not primary

## Code Preferences

- TypeScript throughout (strict mode)
- Convex for all backend logic — no separate API server
- Prefer Convex queries/mutations over actions when possible (actions are for side effects like S3, Mux, HSTS calls)
- Follow upstream patterns: optimistic updates, prewarm on hover, avoid waterfalls

## Don't

- Expose secrets in commits
- Run destructive commands without asking
- Break upstream compatibility unnecessarily — this is a fork, not a rewrite
- Add features without checking the design doc first
- Hardcode PacGenesis branding in ways that break the open-source upstream
