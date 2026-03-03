# Phase 1: Greenfield Unified Frontend — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the unified platform frontend from scratch on a `unified-platform` branch, proving the full stack works with a functional file browser in both aesthetic modes.

**Architecture:** Greenfield React app in `~/dev/fetch/web/` on a git branch. Ports Fetch's API client, auth, and transfer infrastructure as-is. Rebuilds all UI with Radix + CVA components referencing dual-aesthetic CSS variables. TanStack Router file-based routing. No backend changes.

**Tech Stack:** React 19, TanStack Router, React Query 5, Zustand 5, Radix UI, CVA, Tailwind CSS 4, Vite 7, bun, TypeScript (strict)

**Design doc:** `~/dev/lawn/docs/plans/2026-03-03-phase1-greenfield-design.md`

**Working repo:** `~/dev/fetch/`

---

## Task 1: Create Branch + Scaffold Project

**Files:**
- Create: `~/dev/fetch/web/package.json` (fresh)
- Create: `~/dev/fetch/web/tsconfig.json`
- Create: `~/dev/fetch/web/vite.config.ts`
- Create: `~/dev/fetch/web/index.html`
- Create: `~/dev/fetch/web/src/main.tsx`

**Step 1: Create branch and clear web/**

```bash
cd ~/dev/fetch
git checkout -b unified-platform
# Archive existing web/ contents
git rm -r web/
mkdir -p web/src web/public web/app/routes
```

**Step 2: Initialize project with bun**

```bash
cd ~/dev/fetch/web
bun init -y
```

Then replace `package.json` with:

```json
{
  "name": "fetch-unified-web",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@radix-ui/react-alert-dialog": "^1.1.14",
    "@radix-ui/react-avatar": "^1.1.10",
    "@radix-ui/react-context-menu": "^2.2.15",
    "@radix-ui/react-dialog": "^1.1.14",
    "@radix-ui/react-dropdown-menu": "^2.1.15",
    "@radix-ui/react-progress": "^1.1.7",
    "@radix-ui/react-scroll-area": "^1.2.8",
    "@radix-ui/react-separator": "^1.1.7",
    "@radix-ui/react-slot": "^1.2.3",
    "@radix-ui/react-tabs": "^1.1.12",
    "@radix-ui/react-tooltip": "^1.2.7",
    "@tanstack/react-query": "^5.90.5",
    "@tanstack/react-router": "^1.120.4",
    "@tanstack/react-virtual": "^3.13.19",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "hls.js": "^1.5.0",
    "lucide-react": "^0.544.0",
    "react": "^19.1.1",
    "react-dom": "^19.1.1",
    "tailwind-merge": "^3.3.0",
    "zod": "^4.3.6",
    "zustand": "^5.0.11"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.1.13",
    "@tanstack/router-devtools": "^1.120.4",
    "@tanstack/router-plugin": "^1.120.3",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@types/react": "^19.1.11",
    "@types/react-dom": "^19.1.7",
    "@vitejs/plugin-react": "^5.0.2",
    "eslint": "^9.34.0",
    "jsdom": "^28.1.0",
    "prettier": "^3.8.1",
    "tailwindcss": "^4.1.13",
    "typescript": "^5.9.2",
    "vite": "^7.1.3",
    "vitest": "^3.2.4"
  }
}
```

**Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "app"]
}
```

**Step 4: Create vite.config.ts**

```typescript
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  plugins: [
    TanStackRouterVite({
      routesDirectory: "./app/routes",
      generatedRouteTree: "./app/routeTree.gen.ts",
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8080",
      "/auth": "http://127.0.0.1:8080",
    },
  },
});
```

**Step 5: Create index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Fetch</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 6: Create src/main.tsx (minimal entrypoint)**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div>Unified Platform — scaffold working</div>
  </StrictMode>
);
```

**Step 7: Create minimal src/index.css**

```css
@import "tailwindcss";
```

**Step 8: Install and verify**

```bash
cd ~/dev/fetch/web
bun install
bun run build
```

Expected: Build succeeds. Vite outputs to `dist/`.

**Step 9: Commit**

```bash
cd ~/dev/fetch
git add web/
git commit -m "feat: scaffold greenfield unified frontend with bun + vite + tanstack router"
```

---

## Task 2: Bundle Fonts Locally

**Files:**
- Create: `~/dev/fetch/web/public/fonts/` (directory with woff2 files)
- Modify: `~/dev/fetch/web/src/index.css`

**Step 1: Download font files**

```bash
cd ~/dev/fetch/web
mkdir -p public/fonts/geist public/fonts/geist-mono public/fonts/instrument-serif public/fonts/dm-sans public/fonts/jetbrains-mono

# Geist Sans
curl -Lo public/fonts/geist/Geist-Regular.woff2 "https://cdn.jsdelivr.net/npm/geist@1.4.1/dist/fonts/geist-sans/Geist-Regular.woff2"
curl -Lo public/fonts/geist/Geist-Medium.woff2 "https://cdn.jsdelivr.net/npm/geist@1.4.1/dist/fonts/geist-sans/Geist-Medium.woff2"
curl -Lo public/fonts/geist/Geist-SemiBold.woff2 "https://cdn.jsdelivr.net/npm/geist@1.4.1/dist/fonts/geist-sans/Geist-SemiBold.woff2"
curl -Lo public/fonts/geist/Geist-Bold.woff2 "https://cdn.jsdelivr.net/npm/geist@1.4.1/dist/fonts/geist-sans/Geist-Bold.woff2"
curl -Lo public/fonts/geist/Geist-Black.woff2 "https://cdn.jsdelivr.net/npm/geist@1.4.1/dist/fonts/geist-sans/Geist-Black.woff2"

# Geist Mono
curl -Lo public/fonts/geist-mono/GeistMono-Regular.woff2 "https://cdn.jsdelivr.net/npm/geist@1.4.1/dist/fonts/geist-mono/GeistMono-Regular.woff2"
curl -Lo public/fonts/geist-mono/GeistMono-Medium.woff2 "https://cdn.jsdelivr.net/npm/geist@1.4.1/dist/fonts/geist-mono/GeistMono-Medium.woff2"

# DM Sans — download from Google Fonts API
curl -Lo public/fonts/dm-sans/DMSans-Regular.woff2 "https://fonts.gstatic.com/s/dmsans/v15/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwA.woff2"
curl -Lo public/fonts/dm-sans/DMSans-Medium.woff2 "https://fonts.gstatic.com/s/dmsans/v15/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwArl0.woff2"
curl -Lo public/fonts/dm-sans/DMSans-SemiBold.woff2 "https://fonts.gstatic.com/s/dmsans/v15/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAkFo.woff2"
curl -Lo public/fonts/dm-sans/DMSans-Bold.woff2 "https://fonts.gstatic.com/s/dmsans/v15/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAr1o.woff2"

# JetBrains Mono
curl -Lo public/fonts/jetbrains-mono/JetBrainsMono-Regular.woff2 "https://cdn.jsdelivr.net/gh/JetBrains/JetBrainsMono@2.304/fonts/webfonts/JetBrainsMono-Regular.woff2"
curl -Lo public/fonts/jetbrains-mono/JetBrainsMono-Medium.woff2 "https://cdn.jsdelivr.net/gh/JetBrains/JetBrainsMono@2.304/fonts/webfonts/JetBrainsMono-Medium.woff2"

# Instrument Serif
curl -Lo public/fonts/instrument-serif/InstrumentSerif-Regular.woff2 "https://fonts.gstatic.com/s/instrumentserif/v4/jizBRFtNs2ka5fXjeivQ4LroWlx-2zIZj1bIkNo.woff2"
```

Note: If any Google Fonts URLs change, use `bun add @fontsource/dm-sans @fontsource/instrument-serif @fontsource-variable/jetbrains-mono` instead and reference from `node_modules`. But direct woff2 download is preferred for no-dependency font hosting.

**Step 2: Add @font-face declarations to index.css**

Add before the `@import "tailwindcss"` line:

```css
/* ===== LOCAL FONTS ===== */

@font-face { font-family: "Geist"; src: url("/fonts/geist/Geist-Regular.woff2") format("woff2"); font-weight: 400; font-display: swap; }
@font-face { font-family: "Geist"; src: url("/fonts/geist/Geist-Medium.woff2") format("woff2"); font-weight: 500; font-display: swap; }
@font-face { font-family: "Geist"; src: url("/fonts/geist/Geist-SemiBold.woff2") format("woff2"); font-weight: 600; font-display: swap; }
@font-face { font-family: "Geist"; src: url("/fonts/geist/Geist-Bold.woff2") format("woff2"); font-weight: 700; font-display: swap; }
@font-face { font-family: "Geist"; src: url("/fonts/geist/Geist-Black.woff2") format("woff2"); font-weight: 900; font-display: swap; }
@font-face { font-family: "Geist Mono"; src: url("/fonts/geist-mono/GeistMono-Regular.woff2") format("woff2"); font-weight: 400; font-display: swap; }
@font-face { font-family: "Geist Mono"; src: url("/fonts/geist-mono/GeistMono-Medium.woff2") format("woff2"); font-weight: 500; font-display: swap; }
@font-face { font-family: "DM Sans"; src: url("/fonts/dm-sans/DMSans-Regular.woff2") format("woff2"); font-weight: 400; font-display: swap; }
@font-face { font-family: "DM Sans"; src: url("/fonts/dm-sans/DMSans-Medium.woff2") format("woff2"); font-weight: 500; font-display: swap; }
@font-face { font-family: "DM Sans"; src: url("/fonts/dm-sans/DMSans-SemiBold.woff2") format("woff2"); font-weight: 600; font-display: swap; }
@font-face { font-family: "DM Sans"; src: url("/fonts/dm-sans/DMSans-Bold.woff2") format("woff2"); font-weight: 700; font-display: swap; }
@font-face { font-family: "JetBrains Mono"; src: url("/fonts/jetbrains-mono/JetBrainsMono-Regular.woff2") format("woff2"); font-weight: 400; font-display: swap; }
@font-face { font-family: "JetBrains Mono"; src: url("/fonts/jetbrains-mono/JetBrainsMono-Medium.woff2") format("woff2"); font-weight: 500; font-display: swap; }
@font-face { font-family: "Instrument Serif"; src: url("/fonts/instrument-serif/InstrumentSerif-Regular.woff2") format("woff2"); font-weight: 400; font-display: swap; }
```

**Step 3: Verify fonts load**

```bash
bun run dev
```

Open browser devtools → Network tab. Verify woff2 files load from `/fonts/` path (local, not external CDN).

**Step 4: Commit**

```bash
git add public/fonts/ src/index.css
git commit -m "feat: bundle all fonts locally (Geist, DM Sans, JetBrains Mono, Instrument Serif)"
```

---

## Task 3: Dual-Aesthetic CSS Variable System

**Files:**
- Modify: `~/dev/fetch/web/src/index.css`

**Step 1: Add aesthetic layer variables**

After the font declarations but before `@import "tailwindcss"`, add:

```css
/* ===== AESTHETIC LAYER ===== */

:root,
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
  --aesthetic-font-sans: "DM Sans", system-ui, -apple-system, sans-serif;
  --aesthetic-font-mono: "JetBrains Mono", ui-monospace, monospace;
  --aesthetic-font-serif: Georgia, serif;
}

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
  --aesthetic-font-sans: "Geist", system-ui, -apple-system, sans-serif;
  --aesthetic-font-mono: "Geist Mono", ui-monospace, monospace;
  --aesthetic-font-serif: "Instrument Serif", Georgia, serif;
}
```

**Step 2: Add Tailwind @theme block with palette variables**

After `@import "tailwindcss"`, add the @theme block. Port Fetch's existing `@theme` exactly, then add the 8 `[data-theme]` blocks. The default (no data-theme) should match `lawn-light` since that's the new default.

Fetch's existing theme structure uses `--color-base`, `--color-elevated`, `--color-surface`, `--color-surface-hover`, `--color-border-subtle`, `--color-border-default`, `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`, and accent colors. Keep this exact convention.

```css
@theme {
  --color-base: #f0f0e8;
  --color-elevated: #ffffff;
  --color-surface: #e8e8e0;
  --color-surface-hover: #d8d8d0;
  --color-border-subtle: #cccccc;
  --color-border-default: #1a1a1a;
  --color-text-primary: #1a1a1a;
  --color-text-secondary: #888888;
  --color-text-muted: #aaaaaa;
  --color-accent-blue: #2d5a2d;
  --color-accent-blue-dim: #3a6a3a;
  --color-accent-cyan: #7cb87c;
  --color-accent-emerald: #16a34a;
  --color-accent-amber: #ca8a04;
  --color-accent-red: #dc2626;
  --color-accent-purple: #6b21a8;
  --color-accent-rose: #e11d48;
  --color-folder: #2d5a2d;
  --color-shadow: #1a1a1a;

  --font-sans: var(--aesthetic-font-sans);
  --font-mono: var(--aesthetic-font-mono);

  --text-label: 0.625rem;
  --text-caption: 0.75rem;
  --text-body-sm: 0.8125rem;
  --text-body: 0.875rem;
  --text-body-lg: 1rem;
  --text-title: 1.125rem;
  --text-display: 1.75rem;
}
```

**Step 3: Add all 8 palette theme blocks**

Add `[data-theme]` blocks for each palette. `lawn-light` values are the @theme defaults. The other 7 override:

- `[data-theme="lawn-light"]` — matches defaults (warm cream, forest green)
- `[data-theme="lawn-dark"]` — dark olive (#101410), soft green accent (#7cb87c)
- `[data-theme="deep-space"]` — port from Fetch's existing theme (#0a0e17 base)
- `[data-theme="terminal"]` — port from Fetch's existing theme
- `[data-theme="parchment"]` — port from Fetch's existing theme
- `[data-theme="dracula"]` — port from Fetch's existing theme
- `[data-theme="overcast"]` — port from Fetch's existing theme
- `[data-theme="reef"]` — port from Fetch's existing theme

Each palette adds `--color-shadow` for brutalist offset shadows. Port the exact color values from Fetch's `src/index.css` lines 49-150.

**Step 4: Add brutalist interaction CSS**

```css
/* ===== BRUTALIST INTERACTIONS ===== */

[data-aesthetic="brutalist"] .shadow-aesthetic {
  transition: transform 0.1s, box-shadow 0.1s;
}
[data-aesthetic="brutalist"] .shadow-aesthetic:hover {
  transform: translate(2px, 2px);
}
[data-aesthetic="brutalist"] .shadow-aesthetic:active {
  transform: translate(4px, 4px);
  box-shadow: none;
}
```

**Step 5: Add base layer styles**

Port Fetch's `@layer base` rules — global focus rings, scrollbar styling, body background/font. Update to reference `--aesthetic-font-sans`:

```css
@layer base {
  body {
    background-color: var(--color-base);
    color: var(--color-text-primary);
    font-family: var(--aesthetic-font-sans);
  }

  *:focus-visible {
    outline: 2px solid var(--color-accent-blue);
    outline-offset: 2px;
  }

  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: var(--color-surface); }
  ::-webkit-scrollbar-thumb { background: var(--color-border-subtle); border-radius: var(--aesthetic-radius); }
  ::-webkit-scrollbar-thumb:hover { background: var(--color-text-muted); }
}
```

**Step 6: Add animation utilities**

Port Fetch's `@keyframes fade-in`, `@keyframes stagger-in`, and `.animate-stagger-children` rules.

**Step 7: Verify build**

```bash
bun run build
```

Expected: Build succeeds.

**Step 8: Commit**

```bash
git add src/index.css
git commit -m "feat: implement dual-aesthetic CSS variable system with 8 palettes"
```

---

## Task 4: Theme + Aesthetic Utilities

**Files:**
- Create: `~/dev/fetch/web/src/lib/cn.ts`
- Create: `~/dev/fetch/web/src/lib/themes.ts`
- Create: `~/dev/fetch/web/src/lib/aesthetics.ts`
- Create: `~/dev/fetch/web/src/__tests__/themes.test.ts`
- Create: `~/dev/fetch/web/src/__tests__/aesthetics.test.ts`

**Step 1: Create cn() utility**

Create `src/lib/cn.ts`:

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Step 2: Create themes.ts**

Create `src/lib/themes.ts`. Port from Fetch's version but add the two brutalist palettes and change default:

```typescript
export const THEMES = [
  "lawn-light",
  "lawn-dark",
  "deep-space",
  "terminal",
  "parchment",
  "dracula",
  "overcast",
  "reef",
] as const;

export type Theme = (typeof THEMES)[number];

export const THEME_LABELS: Record<Theme, string> = {
  "lawn-light": "Lawn Light",
  "lawn-dark": "Lawn Dark",
  "deep-space": "Deep Space",
  terminal: "Terminal",
  parchment: "Parchment",
  dracula: "Dracula",
  overcast: "Overcast",
  reef: "Reef",
};

export const THEME_PREVIEW: Record<Theme, { dots: string[]; bg: string[] }> = {
  "lawn-light": { dots: ["#2d5a2d", "#7cb87c", "#1a1a1a"], bg: ["#f0f0e8", "#e8e8e0"] },
  "lawn-dark": { dots: ["#7cb87c", "#a8d8a8", "#e7ede4"], bg: ["#101410", "#1a1e1a"] },
  // Port existing 6 from Fetch's themes.ts THEME_PREVIEW
  "deep-space": { dots: ["#3b82f6", "#06b6d4", "#e2e8f0"], bg: ["#0a0e17", "#111827"] },
  terminal: { dots: ["#22c55e", "#86efac", "#d1fae5"], bg: ["#020a02", "#041504"] },
  parchment: { dots: ["#b45309", "#d97706", "#44403c"], bg: ["#faf5e8", "#f0ead4"] },
  dracula: { dots: ["#bd93f9", "#ff79c6", "#f8f8f2"], bg: ["#1a1b2e", "#22233d"] },
  overcast: { dots: ["#3b82f6", "#60a5fa", "#1e293b"], bg: ["#e2e8f0", "#cbd5e1"] },
  reef: { dots: ["#0d9488", "#2dd4bf", "#f0fdfa"], bg: ["#0f1412", "#152420"] },
};

// Brutalist palettes pair best with brutalist aesthetic; clean with clean
export const AESTHETIC_PALETTES = {
  brutalist: ["lawn-light", "lawn-dark"] as Theme[],
  clean: ["deep-space", "terminal", "parchment", "dracula", "overcast", "reef"] as Theme[],
};

const STORAGE_KEY = "fetch-theme";
const DEFAULT: Theme = "lawn-light";

export function isTheme(value: string): value is Theme {
  return THEMES.includes(value as Theme);
}

export function getSavedTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && isTheme(saved)) return saved;
  } catch {}
  return DEFAULT;
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

export function saveTheme(theme: Theme): void {
  try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
  applyTheme(theme);
}
```

**Step 3: Create aesthetics.ts**

Create `src/lib/aesthetics.ts`:

```typescript
export const AESTHETICS = ["brutalist", "clean"] as const;
export type Aesthetic = (typeof AESTHETICS)[number];

export const AESTHETIC_LABELS: Record<Aesthetic, string> = {
  brutalist: "Brutalist",
  clean: "Clean",
};

const STORAGE_KEY = "fetch-aesthetic";
const DEFAULT: Aesthetic = "brutalist";

export function isAesthetic(value: string): value is Aesthetic {
  return AESTHETICS.includes(value as Aesthetic);
}

export function getSavedAesthetic(): Aesthetic {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && isAesthetic(saved)) return saved;
  } catch {}
  return DEFAULT;
}

export function applyAesthetic(aesthetic: Aesthetic): void {
  document.documentElement.dataset.aesthetic = aesthetic;
}

export function saveAesthetic(aesthetic: Aesthetic): void {
  try { localStorage.setItem(STORAGE_KEY, aesthetic); } catch {}
  applyAesthetic(aesthetic);
}
```

**Step 4: Write theme tests**

Create `src/__tests__/themes.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { THEMES, isTheme, getSavedTheme, saveTheme, applyTheme } from "@/lib/themes";

describe("themes", () => {
  beforeEach(() => { localStorage.clear(); });

  it("exports 8 themes", () => {
    expect(THEMES).toHaveLength(8);
    expect(THEMES).toContain("lawn-light");
    expect(THEMES).toContain("lawn-dark");
    expect(THEMES).toContain("deep-space");
  });

  it("isTheme validates correctly", () => {
    expect(isTheme("lawn-light")).toBe(true);
    expect(isTheme("deep-space")).toBe(true);
    expect(isTheme("invalid")).toBe(false);
    expect(isTheme("LAWN-LIGHT")).toBe(false);
  });

  it("defaults to lawn-light", () => {
    expect(getSavedTheme()).toBe("lawn-light");
  });

  it("retrieves saved theme", () => {
    localStorage.setItem("fetch-theme", "terminal");
    expect(getSavedTheme()).toBe("terminal");
  });

  it("falls back to default for invalid saved value", () => {
    localStorage.setItem("fetch-theme", "garbage");
    expect(getSavedTheme()).toBe("lawn-light");
  });

  it("saveTheme persists and applies", () => {
    saveTheme("dracula");
    expect(localStorage.getItem("fetch-theme")).toBe("dracula");
    expect(document.documentElement.dataset.theme).toBe("dracula");
  });

  it("applyTheme sets data attribute", () => {
    applyTheme("reef");
    expect(document.documentElement.dataset.theme).toBe("reef");
  });
});
```

**Step 5: Write aesthetic tests**

Create `src/__tests__/aesthetics.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { AESTHETICS, isAesthetic, getSavedAesthetic, saveAesthetic, applyAesthetic } from "@/lib/aesthetics";

describe("aesthetics", () => {
  beforeEach(() => { localStorage.clear(); });

  it("exports 2 aesthetics", () => {
    expect(AESTHETICS).toHaveLength(2);
    expect(AESTHETICS).toContain("brutalist");
    expect(AESTHETICS).toContain("clean");
  });

  it("defaults to brutalist", () => {
    expect(getSavedAesthetic()).toBe("brutalist");
  });

  it("retrieves saved aesthetic", () => {
    localStorage.setItem("fetch-aesthetic", "clean");
    expect(getSavedAesthetic()).toBe("clean");
  });

  it("falls back for invalid value", () => {
    localStorage.setItem("fetch-aesthetic", "garbage");
    expect(getSavedAesthetic()).toBe("brutalist");
  });

  it("saveAesthetic persists and applies", () => {
    saveAesthetic("clean");
    expect(localStorage.getItem("fetch-aesthetic")).toBe("clean");
    expect(document.documentElement.dataset.aesthetic).toBe("clean");
  });
});
```

**Step 6: Run tests**

```bash
bun run test
```

Expected: All tests pass.

**Step 7: Commit**

```bash
git add src/lib/ src/__tests__/
git commit -m "feat: add theme, aesthetic, and cn utilities with tests"
```

---

## Task 5: Port API Infrastructure

**Files:**
- Create: `~/dev/fetch/web/src/api/client.ts` (port from existing)
- Create: `~/dev/fetch/web/src/api/types.ts` (port)
- Create: `~/dev/fetch/web/src/api/schemas.ts` (port)
- Create: `~/dev/fetch/web/src/api/spaces.ts` (port)
- Create: `~/dev/fetch/web/src/api/files.ts` (port)
- Create: `~/dev/fetch/web/src/api/members.ts` (port)
- Create: `~/dev/fetch/web/src/api/notifications.ts` (port)
- Create: `~/dev/fetch/web/src/api/activity.ts` (port)
- Create: `~/dev/fetch/web/src/api/shares.ts` (port)
- Create: `~/dev/fetch/web/src/api/adminUsers.ts` (port)
- Create: `~/dev/fetch/web/src/api/adminEndpoints.ts` (port)
- Create: `~/dev/fetch/web/src/api/adminBranding.ts` (port)
- Create: `~/dev/fetch/web/src/api/adminSpaces.ts` (port)

**Step 1: Copy API client verbatim**

Copy `~/dev/fetch/web/src/api/client.ts` to the new `src/api/client.ts`. This file has no UI dependencies — it's pure fetch logic with CSRF and error handling. No changes needed.

**Step 2: Copy types.ts and schemas.ts**

Copy as-is. These are TypeScript interfaces and Zod validators with no UI dependencies.

**Step 3: Copy domain API modules**

Copy these files as-is:
- `spaces.ts` (16 lines — `useSpaces()` hook + `listSpaces()`)
- `files.ts` (163 lines — browse, search, CRUD, download, content URLs)
- `members.ts` (member CRUD operations)
- `notifications.ts` (notification list/mark-read)
- `activity.ts` (activity feed)
- `shares.ts` (share CRUD)

**Step 4: Copy admin API modules needed for Phase 1**

- `adminUsers.ts` (user CRUD)
- `adminEndpoints.ts` (storage endpoint CRUD)
- `adminBranding.ts` (branding settings)
- `adminSpaces.ts` (space management)

Skip other admin modules (`adminConsole.ts`, `adminMigration.ts`, etc.) — not needed for Phase 1.

**Step 5: Copy lib utilities**

Port these from Fetch's `src/lib/`:
- `errors.ts` (error formatting utilities if they exist)
- `format.ts` (byte formatting, relative time — used by file browser and spaces list)

**Step 6: Verify build**

```bash
bun run typecheck
```

Expected: No type errors. All imports resolve.

**Step 7: Commit**

```bash
git add src/api/ src/lib/
git commit -m "feat: port API client, types, and domain modules from Fetch"
```

---

## Task 6: Port Auth System

**Files:**
- Create: `~/dev/fetch/web/src/hooks/useAuth.tsx`

**Step 1: Copy useAuth.tsx**

Copy `~/dev/fetch/web/src/hooks/useAuth.tsx` (102 lines). This file uses:
- `src/api/client.ts` (for `get`, `post`, `isApiError`)
- `src/api/types.ts` (for `UserInfo`, `LoginResponse`)
- No React Router imports — the redirect-on-401 is handled in `client.ts`, not in the auth hook

The hook itself is router-agnostic. It provides `user`, `loading`, `loginLocal()`, `logout()`, `refresh()`. The route guards (RequireAuth, RequireAdmin) will be built in the TanStack Router routes (Task 8), not in this hook.

**Step 2: Verify types**

```bash
bun run typecheck
```

Expected: No errors.

**Step 3: Commit**

```bash
git add src/hooks/
git commit -m "feat: port session-based auth hook"
```

---

## Task 7: Port Transfer System

**Files:**
- Create: `~/dev/fetch/web/src/stores/transferStore.ts` (port)
- Create: `~/dev/fetch/web/src/lib/asperaSdk.ts` (port)
- Create: `~/dev/fetch/web/src/components/transfers/TransferProvider.tsx` (port)

**Step 1: Copy transferStore.ts**

Copy `~/dev/fetch/web/src/stores/transferStore.ts` (69 lines). Pure Zustand — no UI dependencies.

**Step 2: Copy asperaSdk.ts**

Copy `~/dev/fetch/web/src/lib/asperaSdk.ts` (358 lines). Pure TypeScript facade over `window.asperaSdk`. No UI dependencies.

**Step 3: Copy TransferProvider.tsx**

Copy `~/dev/fetch/web/src/components/transfers/TransferProvider.tsx` (271 lines). This imports:
- `useAuth` (ported in Task 6)
- `transferStore` (ported above)
- `asperaSdk` (ported above)
- API client functions

It may reference a `useTransferConfig()` hook — check if that exists and port it too. It's likely a small hook that reads transfer config from an API endpoint.

**Step 4: Check for additional transfer dependencies**

Search Fetch's codebase for `useTransferConfig`, `TransferToast`, `InstallPrompt`, `FaspIndicator`, `PublicTransferProvider`. These will be rebuilt in Task 11 (layout) using new components, but note what they do:
- `TransferToast` — floating notification of active transfers. Rebuild with new styling.
- `InstallPrompt` — banner when Aspera Desktop not detected. Rebuild.
- `FaspIndicator` — small icon in topbar showing FASP connection status. Rebuild.
- `PublicTransferProvider` — variant for share/guest pages. Port if needed for Task 16.

For now, just port the core `TransferProvider.tsx`. The UI pieces (`TransferToast`, `InstallPrompt`, `FaspIndicator`) get rebuilt in Tasks 10-11 with new components.

**Step 5: Verify build**

```bash
bun run typecheck
```

Expected: Pass. TransferProvider may have unused imports (TransferToast, etc.) — comment those out temporarily with `// TODO: rebuild with new components` notes.

**Step 6: Commit**

```bash
git add src/stores/ src/lib/asperaSdk.ts src/components/transfers/
git commit -m "feat: port Aspera transfer system (SDK wrapper, store, provider)"
```

---

## Task 8: TanStack Router + Root Route with Providers

**Files:**
- Create: `~/dev/fetch/web/app/routes/__root.tsx`
- Create: `~/dev/fetch/web/app/routes/index.tsx`
- Create: `~/dev/fetch/web/src/hooks/useAesthetic.tsx`
- Modify: `~/dev/fetch/web/src/main.tsx`

**Step 1: Create aesthetic context**

Create `src/hooks/useAesthetic.tsx`:

```tsx
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { type Aesthetic, getSavedAesthetic, saveAesthetic, AESTHETIC_LABELS } from "@/lib/aesthetics";

interface AestheticContextValue {
  aesthetic: Aesthetic;
  setAesthetic: (a: Aesthetic) => void;
  label: string;
}

const AestheticContext = createContext<AestheticContextValue | null>(null);

export function AestheticProvider({ children }: { children: ReactNode }) {
  const [aesthetic, setAestheticState] = useState<Aesthetic>(getSavedAesthetic);
  const setAesthetic = useCallback((a: Aesthetic) => {
    setAestheticState(a);
    saveAesthetic(a);
  }, []);

  return (
    <AestheticContext.Provider value={{ aesthetic, setAesthetic, label: AESTHETIC_LABELS[aesthetic] }}>
      {children}
    </AestheticContext.Provider>
  );
}

export function useAesthetic() {
  const ctx = useContext(AestheticContext);
  if (!ctx) throw new Error("useAesthetic must be used within AestheticProvider");
  return ctx;
}
```

**Step 2: Create root route**

Create `app/routes/__root.tsx`:

```tsx
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks/useAuth";
import { AestheticProvider } from "@/hooks/useAesthetic";
import { applyTheme, getSavedTheme } from "@/lib/themes";
import { applyAesthetic, getSavedAesthetic } from "@/lib/aesthetics";

// Apply saved preferences before React renders to avoid flash
applyTheme(getSavedTheme());
applyAesthetic(getSavedAesthetic());

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AestheticProvider>
          <Outlet />
        </AestheticProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

**Step 3: Create index route (redirect to /spaces)**

Create `app/routes/index.tsx`:

```tsx
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/spaces" });
  },
});
```

**Step 4: Update main.tsx**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "../app/routeTree.gen";
import "./index.css";

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
```

**Step 5: Verify route generation + build**

```bash
bun run build
```

Expected: TanStack Router Vite plugin generates `app/routeTree.gen.ts`. Build succeeds.

**Step 6: Verify dev server**

```bash
bun run dev
```

Open browser. Should redirect `/` to `/spaces` (which will 404 until we add the route).

**Step 7: Commit**

```bash
git add app/ src/main.tsx src/hooks/useAesthetic.tsx
git commit -m "feat: set up TanStack Router with root providers and index redirect"
```

---

## Task 9: Core UI Components (Non-Overlay)

**Files:**
- Create: `~/dev/fetch/web/src/components/ui/button.tsx`
- Create: `~/dev/fetch/web/src/components/ui/input.tsx`
- Create: `~/dev/fetch/web/src/components/ui/textarea.tsx`
- Create: `~/dev/fetch/web/src/components/ui/badge.tsx`
- Create: `~/dev/fetch/web/src/components/ui/card.tsx`
- Create: `~/dev/fetch/web/src/components/ui/separator.tsx`
- Create: `~/dev/fetch/web/src/components/ui/progress.tsx`
- Create: `~/dev/fetch/web/src/components/ui/skeleton.tsx`

Build the non-overlay components first. These are simpler (no portals, no focus traps) and form the foundation for everything else.

**Pattern for every component:**

1. Use CVA for variant definitions
2. Reference aesthetic CSS variables — never hardcoded values
3. Use `cn()` for class merging
4. Forward refs with `React.forwardRef`
5. Use `@radix-ui/react-slot` for `asChild` pattern on Button

**Step 1: Build Button**

CVA variants:
- `variant`: default (solid accent), secondary (surface bg), destructive (red), outline (border only), ghost (no border/bg)
- `size`: sm, md (default), lg

Key classes use variables:
- `rounded-[var(--aesthetic-radius)]`
- `border-[length:var(--aesthetic-border-width)]`
- `font-[number:var(--aesthetic-font-weight-label)]`
- `tracking-[var(--aesthetic-letter-spacing)]`
- `[text-transform:var(--aesthetic-text-transform)]`
- `shadow-[var(--aesthetic-shadow)]` (add `shadow-aesthetic` class for brutalist hover)

Default variant bg: `bg-[var(--color-accent-blue)] text-white hover:bg-[var(--color-accent-blue-dim)]`

**Step 2: Build Input**

Styled `<input>` with:
- `rounded-[var(--aesthetic-radius)]`
- `border-[length:var(--aesthetic-border-width)] border-[var(--color-border-default)]`
- `bg-[var(--color-surface)]`
- `text-[var(--color-text-primary)]`
- `placeholder:text-[var(--color-text-muted)]`
- Focus: `focus:ring-2 focus:ring-[var(--color-accent-blue)]`

**Step 3: Build Textarea**

Same pattern as Input but multiline. Add `min-h-[80px] resize-y`.

**Step 4: Build Badge**

Pure CVA, no Radix. Variants: default, secondary, destructive, outline, success, warning.
- `rounded-[var(--aesthetic-radius)]`
- `border-[length:var(--aesthetic-border-width)]`
- `text-[length:var(--text-caption)] font-[number:var(--aesthetic-font-weight-label)]`

**Step 5: Build Card**

Wrapper div with:
- `rounded-[var(--aesthetic-radius-lg)]`
- `border-[length:var(--aesthetic-border-width)] border-[var(--color-border-default)]`
- `bg-[var(--color-elevated)]`
- `shadow-[var(--aesthetic-shadow)]`

Sub-components: `CardHeader`, `CardContent`, `CardFooter`.

**Step 6: Build Separator**

Wrap `@radix-ui/react-separator`. Horizontal: `h-[var(--aesthetic-border-width)] bg-[var(--color-border-subtle)]`. Vertical: similar.

**Step 7: Build Progress**

Wrap `@radix-ui/react-progress`. Track: `bg-[var(--color-surface)]`, indicator: `bg-[var(--color-accent-blue)]`. Both `rounded-[var(--aesthetic-radius)]`.

**Step 8: Build Skeleton**

Animated placeholder. `bg-[var(--color-surface)] animate-pulse rounded-[var(--aesthetic-radius)]`. Variants: text (single line), block (rectangle).

**Step 9: Verify build**

```bash
bun run typecheck && bun run build
```

**Step 10: Commit**

```bash
git add src/components/ui/
git commit -m "feat: build core UI components (button, input, badge, card, separator, progress, skeleton)"
```

---

## Task 10: Overlay UI Components

**Files:**
- Create: `~/dev/fetch/web/src/components/ui/dialog.tsx`
- Create: `~/dev/fetch/web/src/components/ui/alert-dialog.tsx`
- Create: `~/dev/fetch/web/src/components/ui/dropdown-menu.tsx`
- Create: `~/dev/fetch/web/src/components/ui/context-menu.tsx`
- Create: `~/dev/fetch/web/src/components/ui/tabs.tsx`
- Create: `~/dev/fetch/web/src/components/ui/tooltip.tsx`
- Create: `~/dev/fetch/web/src/components/ui/avatar.tsx`
- Create: `~/dev/fetch/web/src/components/ui/scroll-area.tsx`

**Step 1: Build Dialog**

Wrap `@radix-ui/react-dialog`. Export: `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose`.

Overlay: `fixed inset-0 z-50 bg-black/50`
Content: `bg-[var(--color-elevated)] rounded-[var(--aesthetic-radius-lg)] border-[length:var(--aesthetic-border-width)] border-[var(--color-border-default)] shadow-[var(--aesthetic-shadow-elevated)] p-6`

**Step 2: Build AlertDialog**

Wrap `@radix-ui/react-alert-dialog`. Same styling as Dialog but with `AlertDialogAction` (destructive button) and `AlertDialogCancel`.

**Step 3: Build DropdownMenu**

Wrap `@radix-ui/react-dropdown-menu`. Export: `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`, `DropdownMenuLabel`.

Content: `bg-[var(--color-elevated)] rounded-[var(--aesthetic-radius)] border-[length:var(--aesthetic-border-width)] border-[var(--color-border-default)] shadow-[var(--aesthetic-shadow-elevated)] p-1`
Items: `rounded-[var(--aesthetic-radius)] px-2 py-1.5 text-[length:var(--text-body-sm)] cursor-pointer hover:bg-[var(--color-surface-hover)] focus:bg-[var(--color-surface-hover)]`

**Step 4: Build ContextMenu**

Same pattern as DropdownMenu but wrapping `@radix-ui/react-context-menu`. Used for right-click in file browser.

**Step 5: Build Tabs**

Wrap `@radix-ui/react-tabs`. Used for Files/Review switching.

TabsList: `border-b-[length:var(--aesthetic-border-width)] border-[var(--color-border-default)]`
TabsTrigger (active): `border-b-2 border-[var(--color-accent-blue)] text-[var(--color-text-primary)] font-[number:var(--aesthetic-font-weight-label)] [text-transform:var(--aesthetic-text-transform)] tracking-[var(--aesthetic-letter-spacing)]`
TabsTrigger (inactive): `border-transparent text-[var(--color-text-secondary)]`

**Step 6: Build Tooltip**

Wrap `@radix-ui/react-tooltip`. Content: `bg-[var(--color-text-primary)] text-[var(--color-base)] rounded-[var(--aesthetic-radius)] px-2 py-1 text-[length:var(--text-caption)]`

**Step 7: Build Avatar**

Wrap `@radix-ui/react-avatar`. Fallback generates initials from username (port logic from Fetch's UserDropdown). `rounded-[var(--aesthetic-radius)] bg-[var(--color-accent-blue)]`

**Step 8: Build ScrollArea**

Wrap `@radix-ui/react-scroll-area`. Thin scrollbar styled with aesthetic variables.

**Step 9: Verify build**

```bash
bun run typecheck && bun run build
```

**Step 10: Commit**

```bash
git add src/components/ui/
git commit -m "feat: build overlay UI components (dialog, dropdown, context menu, tabs, tooltip, avatar, scroll-area)"
```

---

## Task 11: Layout Shell

**Files:**
- Create: `~/dev/fetch/web/src/components/layout/AppLayout.tsx`
- Create: `~/dev/fetch/web/src/components/layout/Sidebar.tsx`
- Create: `~/dev/fetch/web/src/components/layout/Topbar.tsx`
- Create: `~/dev/fetch/web/src/components/layout/UserDropdown.tsx`
- Create: `~/dev/fetch/web/src/components/layout/FaspIndicator.tsx`
- Create: `~/dev/fetch/web/src/components/transfers/TransferToast.tsx`

**Step 1: Build Sidebar**

Simplified from Fetch's 16KB sidebar. Contains:
- Logo/product name at top
- Spaces list from `useSpaces()` React Query hook
- Each space is a `<Link>` to `/spaces/${slug}/files`
- Active space highlighted
- Admin link (if `isAdmin`) → `/admin`
- Settings link → placeholder
- Collapsible on mobile (controlled by parent)

Use `ScrollArea` for the space list. Use Fetch's existing `listSpaces()` API call.

All styling via aesthetic variables. `bg-[var(--color-elevated)] border-r-[length:var(--aesthetic-border-width)] border-[var(--color-border-default)]`

**Step 2: Build FaspIndicator**

Small component showing Aspera connection status. Reads from `useTransferStore()`:
- `sdkReady` + connection state → green/yellow/red dot
- Tooltip with status text

Port logic from Fetch's existing FaspIndicator but use new Tooltip component.

**Step 3: Build UserDropdown**

Use `DropdownMenu` component. Contains:
- Avatar + username + role badge (trigger)
- Aesthetic toggle (Brutalist / Clean buttons)
- Palette picker grid (grouped by aesthetic pairing from `AESTHETIC_PALETTES`)
- Menu items: Profile Settings, Sign Out

Aesthetic toggle uses `useAesthetic()` hook. Palette picker uses `saveTheme()`. Show `THEME_PREVIEW` dots for each palette.

**Step 4: Build Topbar**

Sticky header: `sticky top-0 z-30 h-13 bg-[var(--color-elevated)] border-b-[length:var(--aesthetic-border-width)] border-[var(--color-border-default)]`

Contents:
- Left: hamburger menu (mobile only) + page title
- Right: `FaspIndicator` + `Separator` + `UserDropdown`

Title derived from current route params (space name from route context).

**Step 5: Build AppLayout**

Wrapper combining Sidebar + Topbar + main content. Port layout logic from Fetch's AppLayout:
- Desktop: sidebar always visible (`hidden lg:flex`)
- Mobile: sidebar in overlay (`fixed inset-0 z-50 lg:hidden`)
- Auto-close sidebar on route change
- Escape key closes mobile sidebar
- Wrap children in `TransferProvider`

**Step 6: Build TransferToast**

Floating toast showing active/completed transfers. Reads from `useTransferStore()`. Styled with new components (Card, Progress, Button). Position: `fixed bottom-4 right-4 z-50`.

**Step 7: Verify layout renders**

```bash
bun run dev
```

Navigate to any route. Verify:
- Sidebar renders with spaces list (needs API — may show empty/loading in dev without backend)
- Topbar renders with user dropdown
- Aesthetic toggle switches between Brutalist and Clean
- Palette picker changes colors
- Mobile sidebar collapses/expands

**Step 8: Commit**

```bash
git add src/components/layout/ src/components/transfers/TransferToast.tsx
git commit -m "feat: build layout shell (sidebar, topbar, user dropdown with aesthetic picker)"
```

---

## Task 12: Auth Pages

**Files:**
- Create: `~/dev/fetch/web/app/routes/login.tsx`
- Create: `~/dev/fetch/web/app/routes/forgot-password.tsx`
- Create: `~/dev/fetch/web/app/routes/reset-password.tsx`

**Step 1: Build login route**

Create `app/routes/login.tsx`:

- Guest-only guard: if `user` exists, redirect to `/spaces`
- Read `next` search param for post-login redirect
- Form: username + password + remember me checkbox
- Call `loginLocal()` from `useAuth()`
- On success: navigate to `next` param or `/spaces`
- On error: show inline error message
- Link to forgot-password

Styled with Card, Input, Button, Badge (for errors). Centered layout: `flex items-center justify-center min-h-screen bg-[var(--color-base)]`.

**Step 2: Build forgot-password route**

Simple form: email input → `POST /api/auth/forgot-password`. Success message. Link back to login.

**Step 3: Build reset-password route**

Read token from URL search params. New password + confirm password form → `POST /api/auth/reset-password`. On success: redirect to login.

**Step 4: Test login flow manually**

```bash
bun run dev
# Start Fetch backend in another terminal
cd ~/dev/fetch && cargo run
```

Navigate to `/login`. Log in with test credentials. Verify redirect to `/spaces`.

**Step 5: Commit**

```bash
git add app/routes/login.tsx app/routes/forgot-password.tsx app/routes/reset-password.tsx
git commit -m "feat: build auth pages (login, forgot password, reset password)"
```

---

## Task 13: Spaces List Page

**Files:**
- Create: `~/dev/fetch/web/app/routes/spaces/index.tsx`

**Step 1: Build spaces list route**

Create `app/routes/spaces/index.tsx`:

- Auth guard via `_layout` (or inline — TanStack Router can use `beforeLoad` to check auth)
- Wrap in AppLayout
- Call `useSpaces()` from `src/api/spaces.ts`
- Render responsive grid of space cards: `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4`
- Each card: space name, description, last updated (relative time), space type icon
- Card click navigates to `/spaces/${space.slug}/files`
- Loading state: skeleton cards
- Empty state: message + icon

Use Card component. Space type icon from Lucide (`Folder`, `HardDrive`, etc. — port icon mapping from Fetch's Spaces.tsx).

**Step 2: Create spaces layout route with auth guard**

Create `app/routes/spaces.tsx` (layout for all /spaces/* routes):

```tsx
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";

export const Route = createFileRoute("/spaces")({
  component: SpacesLayout,
});

function SpacesLayout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
```

The auth guard can be implemented via `beforeLoad` checking auth state, or by having `AppLayout` render a redirect if no user. Match Fetch's existing pattern where `RequireAuth` redirects to `/login?next=...`.

**Step 3: Verify against backend**

```bash
bun run dev
```

Log in → verify spaces list loads with real data from Fetch's API.

**Step 4: Commit**

```bash
git add app/routes/spaces/
git commit -m "feat: build spaces list page with card grid"
```

---

## Task 14: File Browser

The largest task. Port of Fetch's SpaceBrowser.tsx (1,067 lines).

**Files:**
- Create: `~/dev/fetch/web/app/routes/spaces/$slug/_layout.tsx`
- Create: `~/dev/fetch/web/app/routes/spaces/$slug/files.tsx`
- Create: `~/dev/fetch/web/app/routes/spaces/$slug/review.tsx`
- Create: `~/dev/fetch/web/src/components/browser/FileBrowser.tsx`
- Create: `~/dev/fetch/web/src/components/browser/FileRow.tsx`
- Create: `~/dev/fetch/web/src/components/browser/Breadcrumbs.tsx`
- Create: `~/dev/fetch/web/src/components/browser/BrowserToolbar.tsx`
- Create: `~/dev/fetch/web/src/components/browser/FilePreviewPanel.tsx`
- Create: `~/dev/fetch/web/src/components/browser/MembersDialog.tsx`

**Step 1: Create space layout route with tabs**

Create `app/routes/spaces/$slug/_layout.tsx`:

```tsx
import { createFileRoute, Outlet, Link, useParams } from "@tanstack/react-router";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/spaces/$slug")({
  component: SpaceLayout,
});

function SpaceLayout() {
  const { slug } = useParams({ from: "/spaces/$slug" });
  // Tabs: Files always, Review placeholder
  return (
    <div>
      <nav className="border-b-[length:var(--aesthetic-border-width)] border-[var(--color-border-default)]">
        <Link to="/spaces/$slug/files" params={{ slug }}>Files</Link>
        <Link to="/spaces/$slug/review" params={{ slug }}>Review</Link>
      </nav>
      <Outlet />
    </div>
  );
}
```

Style the tab links with active state detection via `useMatchRoute()` or TanStack Router's `activeProps`.

**Step 2: Create review placeholder**

Create `app/routes/spaces/$slug/review.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/spaces/$slug/review")({
  component: ReviewPlaceholder,
});

function ReviewPlaceholder() {
  return (
    <div className="flex items-center justify-center h-96 text-[var(--color-text-secondary)]">
      <p>Review surface coming in Phase 2</p>
    </div>
  );
}
```

**Step 3: Build Breadcrumbs component**

Port breadcrumb logic from SpaceBrowser. Takes `path: string`, renders clickable segments. Each segment navigates to that folder path. Use `ChevronRight` separator.

**Step 4: Build BrowserToolbar**

Contains:
- Breadcrumbs (left)
- Action buttons (right): Upload dropdown (DropdownMenu with FASP/HTTP/Folder options), Download dropdown, New Folder button, Search toggle
- Search bar (Input component, visible when toggled)

Upload/download dropdowns use `useTransferContext()` for FASP operations and API `uploadFiles()` for HTTP.

**Step 5: Build FileRow component**

Single row in the virtualized table:
- Checkbox (multi-select)
- File/folder icon (Lucide: `Folder`, `File`, `FileVideo`, `FileImage`, etc.)
- Name (clickable — folders navigate, files open preview)
- Size (formatted bytes)
- Modified (relative time)
- Selected state highlighting

**Step 6: Build FileBrowser (main component)**

Port the core logic from SpaceBrowser.tsx:

State:
- `currentPath` (from URL search params — use TanStack Router's typed search params)
- `sort` (SortMode — from URL search params)
- `searchQuery` (local state)
- `selectedPaths` (Set<string>)
- `previewEntry` (FileEntry | null)

React Query:
- `useQuery({ queryKey: ['files', slug, currentPath, sort], queryFn: () => browseDirectory(...) })`
- Search: `useQuery({ queryKey: ['files-search', slug, currentPath, searchQuery], queryFn: ..., enabled: !!searchQuery })`

Mutations:
- `createFolder` → invalidates files query
- `deleteEntry` → invalidates files query
- `renameEntry` → invalidates files query

Virtualization:
- `useVirtualizer({ count: entries.length, getScrollElement, estimateSize: () => 40, overscan: 10 })`

Multi-select:
- Click: toggle single
- Shift+click: range select
- Track `lastClickedIndex` for range calculation

Context menu:
- Right-click on file/empty space
- Options: Download, Rename, Delete, Copy path, New folder (on empty space)
- Use ContextMenu component

**Step 7: Build FilePreviewPanel**

Side panel or modal for file preview:
- Image: `<img>` with content URL
- Video: `<video>` with HLS.js (port video player setup)
- Text: fetch text content, render in `<pre>` with monospace font
- Other: show file info (name, size, type, modified)

Navigation: prev/next buttons to cycle through files in current directory.

**Step 8: Build MembersDialog**

Port Fetch's MembersModal using new Dialog component:
- List members with role badge
- Add member form (search users)
- Update member permissions
- Remove member (with AlertDialog confirmation)

Uses `listMembers()`, `addMember()`, `updateMember()`, `removeMember()` from `src/api/members.ts`.

**Step 9: Wire up the files route**

Create `app/routes/spaces/$slug/files.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { FileBrowser } from "@/components/browser/FileBrowser";
import { z } from "zod";

const searchSchema = z.object({
  path: z.string().optional().default("/"),
  sort: z.enum(["name_asc", "name_desc", "size_asc", "size_desc", "modified_asc", "modified_desc"]).optional().default("name_asc"),
});

export const Route = createFileRoute("/spaces/$slug/files")({
  component: FilesPage,
  validateSearch: searchSchema,
});

function FilesPage() {
  const { slug } = Route.useParams();
  const { path, sort } = Route.useSearch();
  return <FileBrowser slug={slug} path={path} sort={sort} />;
}
```

This gives type-safe search params and URL-driven state.

**Step 10: Test against backend**

```bash
bun run dev
# Ensure Fetch backend running
```

Log in → navigate to a space → verify:
- Files list loads
- Folder navigation works (breadcrumbs update)
- File upload works (HTTP and FASP if Aspera Desktop running)
- File download works
- Create folder, rename, delete work
- Search works
- Multi-select works
- Context menu works
- File preview works (images, videos, text)
- Both aesthetic modes render correctly

**Step 11: Commit**

```bash
git add app/routes/spaces/ src/components/browser/
git commit -m "feat: port file browser with full CRUD, FASP transfers, and virtual scrolling"
```

---

## Task 15: Admin Pages

**Files:**
- Create: `~/dev/fetch/web/app/routes/admin/_layout.tsx`
- Create: `~/dev/fetch/web/app/routes/admin/index.tsx`
- Create: `~/dev/fetch/web/app/routes/admin/users.tsx`
- Create: `~/dev/fetch/web/app/routes/admin/storage.tsx`
- Create: `~/dev/fetch/web/app/routes/admin/branding.tsx`

**Step 1: Create admin layout with guard**

Create `app/routes/admin/_layout.tsx`:

```tsx
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  // Use useAuth() — if not admin, redirect to /spaces
  return (
    <AppLayout>
      <div className="flex">
        <AdminNav />
        <div className="flex-1 p-6"><Outlet /></div>
      </div>
    </AppLayout>
  );
}
```

`AdminNav`: sidebar with links to Users, Storage, Branding. Styled with aesthetic variables.

**Step 2: Build admin index (dashboard)**

Simple page showing admin overview: user count, space count, storage endpoint count. Calls relevant API endpoints.

**Step 3: Build users page**

Port from Fetch's AdminUsersPage:
- Table of users (username, role, status, auth method, created)
- Create user dialog (Dialog)
- Edit user dialog
- Delete user (AlertDialog)
- Role selection (DropdownMenu or inline)

Uses `adminUsers.ts` API functions.

**Step 4: Build storage page**

Port from Fetch's AdminEndpointsPage:
- Table of storage endpoints (name, type, path/bucket, status)
- Create/edit endpoint dialog
- Delete endpoint (AlertDialog)

Uses `adminEndpoints.ts` API functions.

**Step 5: Build branding page**

Port from Fetch's AdminBrandingPage:
- Product name input
- Logo URL input
- Accent color picker
- Preview showing both aesthetic modes
- Save button

Uses `adminBranding.ts` API functions. Branding changes apply to `--color-accent-blue` and `--color-accent-blue-dim` via the branding provider.

**Step 6: Port useBranding hook**

Create `src/hooks/useBranding.tsx` — port from Fetch. Reads branding settings from API, applies CSS variable overrides. Wrap in the provider stack in `__root.tsx`.

**Step 7: Test admin pages**

Log in as admin → navigate to `/admin` → verify all CRUD operations work.

**Step 8: Commit**

```bash
git add app/routes/admin/ src/hooks/useBranding.tsx
git commit -m "feat: build admin panel (users, storage, branding)"
```

---

## Task 16: Share Landing Page

**Files:**
- Create: `~/dev/fetch/web/app/routes/s/$token.tsx`

**Step 1: Build share landing route**

Port from Fetch's ShareLandingPage:
- No auth required (guest access)
- Fetch share info from `GET /api/shares/public/:token`
- If password-protected: show password form
- If accessible: show file browser (read-only variant) or single file preview
- Download button (HTTP or FASP via `PublicTransferProvider`)

This page does NOT use AppLayout — it's standalone with minimal chrome.

**Step 2: Test with a share link**

Create a share in Fetch → open the link in the new frontend → verify it renders.

**Step 3: Commit**

```bash
git add app/routes/s/
git commit -m "feat: build share landing page for guest access"
```

---

## Task 17: Tests + Build Verification

**Files:**
- Modify: `~/dev/fetch/web/src/__tests__/` (add tests)
- Create: `~/dev/fetch/web/vitest.config.ts` (if not exists)

**Step 1: Verify all existing tests pass**

```bash
bun run test
```

Theme and aesthetic tests from Task 4 should pass.

**Step 2: Add component smoke tests**

Add basic render tests for key components:
- Button renders all variants
- Dialog opens/closes
- Badge renders all variants

These validate that the component library doesn't have import/rendering errors.

**Step 3: Run type checking**

```bash
bun run typecheck
```

Expected: Zero errors.

**Step 4: Run production build**

```bash
bun run build
```

Expected: Successful build. Check bundle size is reasonable.

**Step 5: Run lint**

```bash
bun run lint
```

Fix any lint errors.

**Step 6: Manual smoke test in both aesthetics**

With Fetch backend running, test these flows in BOTH Brutalist and Clean modes:
1. Login → spaces list → click space → file browser
2. Browse folders (breadcrumbs update)
3. Upload file (HTTP)
4. Upload file (FASP — if Aspera Desktop available)
5. Download file
6. Create folder, rename file, delete file
7. Right-click context menu
8. File preview (image, video, text)
9. Switch aesthetic mode in user dropdown
10. Switch palette
11. Admin: users, storage, branding pages
12. Share link landing page

**Step 7: Final commit**

```bash
git add .
git commit -m "test: add component smoke tests and build verification"
```

---

## Phase 1 Complete

At this point:
- `unified-platform` branch has a fully functional frontend on the new stack
- File browser works end-to-end against Fetch's existing API
- Both aesthetic modes render correctly across all pages
- FASP and HTTP transfers work
- Admin panel is functional
- All tests pass, types pass, build passes

**Next:** Phase 2 plan (review core — assets table, comments, HLS player, share links, ~35 new API endpoints in Fetch's Rust backend).
