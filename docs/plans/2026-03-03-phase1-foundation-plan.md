# Phase 1: Foundation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Establish the unified frontend codebase in Fetch's repo with the dual-aesthetic design system, Radix + CVA component library, and TanStack Router navigation shell.

**Architecture:** All work happens in the Fetch repo (`~/dev/fetch/web/`). Lawn's UI components are ported into Fetch's frontend, replacing Fetch's custom components with Radix + CVA equivalents. The dual-aesthetic system (Brutalist + Clean) is implemented as two CSS variable layers — geometric (aesthetic) and chromatic (palette). TanStack Router replaces React Router v7.

**Tech Stack:** React 19, TanStack Router, React Query 5, Zustand, Radix UI, CVA, Tailwind CSS 4, Vite, TypeScript (strict)

**Design doc:** `~/dev/lawn/docs/plans/2026-03-03-unified-platform-design.md`

**Working repo:** `~/dev/fetch/`

---

## Task 1: Install Radix UI + CVA Dependencies

**Files:**
- Modify: `~/dev/fetch/web/package.json`

**Step 1: Install Radix primitives and CVA**

```bash
cd ~/dev/fetch/web
bun add @radix-ui/react-avatar @radix-ui/react-dialog @radix-ui/react-dropdown-menu \
  @radix-ui/react-progress @radix-ui/react-scroll-area @radix-ui/react-separator \
  @radix-ui/react-slot @radix-ui/react-tabs @radix-ui/react-tooltip \
  class-variance-authority tailwind-merge
```

Fetch already has `clsx`. `tailwind-merge` is needed for the `cn()` utility.

**Step 2: Create the `cn()` utility**

Create `~/dev/fetch/web/src/lib/cn.ts`:

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Step 3: Verify build**

```bash
cd ~/dev/fetch/web && bun run build
```

Expected: Build succeeds. No type errors.

**Step 4: Commit**

```bash
git add package.json bun.lock src/lib/cn.ts
git commit -m "feat: add Radix UI + CVA + tailwind-merge dependencies"
```

---

## Task 2: Implement Dual-Aesthetic CSS Variable System

**Files:**
- Modify: `~/dev/fetch/web/src/index.css`
- Create: `~/dev/fetch/web/src/lib/aesthetics.ts`

**Step 1: Add the aesthetic variable layer to index.css**

Add to the beginning of `index.css`, before the existing `@theme` block:

```css
/* ===== AESTHETIC LAYER ===== */
/* Geometric properties that change between Brutalist and Clean modes */

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

**Step 2: Add Brutalist palette variables**

Add two new palette themes after the existing theme definitions:

```css
/* ===== BRUTALIST PALETTES ===== */

[data-theme="lawn-light"] {
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
  --shadow-glow-success: 0 0 12px rgba(45, 90, 45, 0.3);
  --shadow-glow-warning: 0 0 12px rgba(202, 138, 4, 0.3);
}

[data-theme="lawn-dark"] {
  --color-base: #101410;
  --color-elevated: #1a1e1a;
  --color-surface: #242a24;
  --color-surface-hover: #2e342e;
  --color-border-subtle: #3a403a;
  --color-border-default: #e7ede4;
  --color-text-primary: #e7ede4;
  --color-text-secondary: #8a9a84;
  --color-text-muted: #5a6a54;
  --color-accent-blue: #7cb87c;
  --color-accent-blue-dim: #5a9a5a;
  --color-accent-cyan: #a8d8a8;
  --color-accent-emerald: #4ade80;
  --color-accent-amber: #fbbf24;
  --color-accent-red: #f87171;
  --color-accent-purple: #a78bfa;
  --color-accent-rose: #fb7185;
  --color-folder: #7cb87c;
  --color-shadow: #0a0e0a;
  --shadow-glow-success: 0 0 12px rgba(124, 184, 124, 0.3);
  --shadow-glow-warning: 0 0 12px rgba(251, 191, 36, 0.3);
}
```

**Step 3: Add `--color-shadow` to existing themes**

Each existing theme needs a `--color-shadow` variable. Add to each theme block:

- `deep-space`: `--color-shadow: #060a12;`
- `terminal`: `--color-shadow: #030603;`
- `parchment`: `--color-shadow: #3d2b1f;`
- `dracula`: `--color-shadow: #15161d;`
- `overcast`: `--color-shadow: #8890a0;`
- `reef`: `--color-shadow: #1a1614;`

**Step 4: Add font imports for Brutalist mode**

Add to the top of `index.css` (alongside existing font imports if any):

```css
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif&display=swap');

@font-face {
  font-family: 'Geist';
  src: url('https://cdn.jsdelivr.net/npm/geist@1.4.1/dist/fonts/geist-sans/Geist-Regular.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: 'Geist';
  src: url('https://cdn.jsdelivr.net/npm/geist@1.4.1/dist/fonts/geist-sans/Geist-Medium.woff2') format('woff2');
  font-weight: 500;
  font-display: swap;
}
@font-face {
  font-family: 'Geist';
  src: url('https://cdn.jsdelivr.net/npm/geist@1.4.1/dist/fonts/geist-sans/Geist-SemiBold.woff2') format('woff2');
  font-weight: 600;
  font-display: swap;
}
@font-face {
  font-family: 'Geist';
  src: url('https://cdn.jsdelivr.net/npm/geist@1.4.1/dist/fonts/geist-sans/Geist-Bold.woff2') format('woff2');
  font-weight: 700;
  font-display: swap;
}
@font-face {
  font-family: 'Geist';
  src: url('https://cdn.jsdelivr.net/npm/geist@1.4.1/dist/fonts/geist-sans/Geist-Black.woff2') format('woff2');
  font-weight: 900;
  font-display: swap;
}
@font-face {
  font-family: 'Geist Mono';
  src: url('https://cdn.jsdelivr.net/npm/geist@1.4.1/dist/fonts/geist-mono/GeistMono-Regular.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: 'Geist Mono';
  src: url('https://cdn.jsdelivr.net/npm/geist@1.4.1/dist/fonts/geist-mono/GeistMono-Medium.woff2') format('woff2');
  font-weight: 500;
  font-display: swap;
}
```

**Step 5: Create aesthetic mode utilities**

Create `~/dev/fetch/web/src/lib/aesthetics.ts`:

```typescript
export const AESTHETICS = ["brutalist", "clean"] as const;
export type Aesthetic = (typeof AESTHETICS)[number];

export const AESTHETIC_LABELS: Record<Aesthetic, string> = {
  brutalist: "Brutalist",
  clean: "Clean",
};

const STORAGE_KEY = "fetch-aesthetic";
const DEFAULT_AESTHETIC: Aesthetic = "brutalist";

export function isAesthetic(value: string): value is Aesthetic {
  return AESTHETICS.includes(value as Aesthetic);
}

export function getSavedAesthetic(): Aesthetic {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && isAesthetic(saved)) return saved;
  } catch {}
  return DEFAULT_AESTHETIC;
}

export function applyAesthetic(aesthetic: Aesthetic): void {
  document.documentElement.dataset.aesthetic = aesthetic;
}

export function saveAesthetic(aesthetic: Aesthetic): void {
  try {
    localStorage.setItem(STORAGE_KEY, aesthetic);
  } catch {}
  applyAesthetic(aesthetic);
}
```

**Step 6: Update themes.ts — add brutalist palettes and default**

Modify `~/dev/fetch/web/src/lib/themes.ts` to add the new palettes:

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

// Update THEME_LABELS to include new themes:
// "lawn-light": "Lawn Light",
// "lawn-dark": "Lawn Dark",

// Update THEME_PREVIEW to include new themes:
// "lawn-light": { dots: ["#2d5a2d", "#7cb87c", "#1a1a1a"], bg: ["#f0f0e8", "#e8e8e0"] },
// "lawn-dark": { dots: ["#7cb87c", "#a8d8a8", "#e7ede4"], bg: ["#101410", "#1a1e1a"] },

// Change DEFAULT to "lawn-light"
```

**Step 7: Apply aesthetic on app mount**

Modify `~/dev/fetch/web/src/App.tsx` to apply aesthetic alongside theme:

```typescript
import { applyAesthetic, getSavedAesthetic } from "@/lib/aesthetics";
// ... existing imports

applyTheme(getSavedTheme());
applyAesthetic(getSavedAesthetic());
```

**Step 8: Verify build**

```bash
cd ~/dev/fetch/web && bun run build
```

Expected: Build succeeds. Default renders with Brutalist + Lawn Light.

**Step 9: Commit**

```bash
git add src/index.css src/lib/aesthetics.ts src/lib/themes.ts src/App.tsx
git commit -m "feat: implement dual-aesthetic CSS variable system (brutalist + clean)"
```

---

## Task 3: Port Lawn's Base UI Components

Port Lawn's Radix + CVA components into Fetch. These replace Fetch's custom components.

**Files:**
- Create: `~/dev/fetch/web/src/components/ui/button.tsx`
- Create: `~/dev/fetch/web/src/components/ui/card.tsx`
- Create: `~/dev/fetch/web/src/components/ui/input.tsx`
- Create: `~/dev/fetch/web/src/components/ui/textarea.tsx`
- Create: `~/dev/fetch/web/src/components/ui/badge-v2.tsx` (avoid collision with existing Badge.tsx)
- Create: `~/dev/fetch/web/src/components/ui/dialog.tsx`
- Create: `~/dev/fetch/web/src/components/ui/dropdown-menu.tsx`
- Create: `~/dev/fetch/web/src/components/ui/avatar.tsx`
- Create: `~/dev/fetch/web/src/components/ui/progress-bar.tsx`
- Create: `~/dev/fetch/web/src/components/ui/tabs.tsx`
- Create: `~/dev/fetch/web/src/components/ui/tooltip.tsx`
- Create: `~/dev/fetch/web/src/components/ui/separator.tsx`
- Create: `~/dev/fetch/web/src/components/ui/scroll-area.tsx`

**Step 1: Port button component**

Copy from Lawn's `src/components/ui/button.tsx`. Modify to use aesthetic variables instead of hardcoded values:

Replace all hardcoded brutalist styles with CSS variable references:
- `border-2 border-[#1a1a1a]` → `border-[length:var(--aesthetic-border-width)] border-[var(--color-border-default)]`
- `shadow-[4px_4px_0px_0px_var(--shadow-color)]` → `shadow-[var(--aesthetic-shadow)]`
- `uppercase tracking-wider` → `[text-transform:var(--aesthetic-text-transform)] tracking-[var(--aesthetic-letter-spacing)]`
- `font-bold` → `font-[var(--aesthetic-font-weight-label)]`
- `rounded-none` → `rounded-[var(--aesthetic-radius)]`
- Color references like `bg-[#1a1a1a]` → `bg-[var(--color-text-primary)]`
- Color references like `bg-[#f0f0e8]` → `bg-[var(--color-base)]`
- Color references like `bg-[#2d5a2d]` → `bg-[var(--color-accent-blue)]`

The hover translate effect (Lawn's signature) should only apply in brutalist mode. Use a CSS approach:

```css
/* In index.css */
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

**Step 2: Port card, input, textarea, separator**

Same pattern — copy from Lawn, replace hardcoded values with CSS variables:

Key substitutions for all components:
- `border-[#1a1a1a]` → `border-[var(--color-border-default)]`
- `bg-[#f0f0e8]` → `bg-[var(--color-base)]`
- `text-[#1a1a1a]` → `text-[var(--color-text-primary)]`
- `text-[#888888]` → `text-[var(--color-text-secondary)]`
- `font-mono` → `font-[var(--aesthetic-font-mono)]`
- `rounded-none` → `rounded-[var(--aesthetic-radius)]`
- `border-2` → `border-[length:var(--aesthetic-border-width)]`
- Shadow values → `shadow-[var(--aesthetic-shadow)]`

**Step 3: Port dialog, dropdown-menu, avatar, progress, tabs, tooltip, scroll-area**

Same variable substitution pattern. These are thinner wrappers around Radix primitives — the main change is applying aesthetic variables to the overlay, content, and trigger styling.

**Step 4: Verify build**

```bash
cd ~/dev/fetch/web && bun run build
```

Expected: Build succeeds. New components exist alongside old ones.

**Step 5: Commit**

```bash
git add src/components/ui/
git commit -m "feat: port Lawn's Radix + CVA component library with aesthetic variables"
```

---

## Task 4: Create Aesthetic + Theme Picker UI

**Files:**
- Modify: `~/dev/fetch/web/src/components/layout/UserDropdown.tsx`
- Create: `~/dev/fetch/web/src/hooks/useAesthetic.tsx`

**Step 1: Create aesthetic context**

Create `~/dev/fetch/web/src/hooks/useAesthetic.tsx`:

```typescript
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import {
  type Aesthetic,
  getSavedAesthetic,
  saveAesthetic,
  AESTHETIC_LABELS,
} from "@/lib/aesthetics";

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
    <AestheticContext.Provider
      value={{ aesthetic, setAesthetic, label: AESTHETIC_LABELS[aesthetic] }}
    >
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

**Step 2: Add AestheticProvider to App.tsx**

Wrap inside the existing provider stack:

```typescript
import { AestheticProvider } from "@/hooks/useAesthetic";

// In the render:
<AuthProvider>
  <BrandingProvider>
    <AestheticProvider>
      <RouterProvider router={router} />
    </AestheticProvider>
  </BrandingProvider>
</AuthProvider>
```

**Step 3: Update UserDropdown theme picker**

Modify the existing theme picker section in `UserDropdown.tsx` to add an aesthetic toggle above the palette grid:

```tsx
{/* Aesthetic mode toggle */}
<div className="flex gap-1 mb-2">
  <button
    onClick={() => setAesthetic("brutalist")}
    className={cn(
      "flex-1 px-2 py-1 text-xs rounded-[var(--aesthetic-radius)]",
      "border-[length:var(--aesthetic-border-width)] border-[var(--color-border-default)]",
      aesthetic === "brutalist"
        ? "bg-[var(--color-accent-blue)] text-white"
        : "bg-[var(--color-surface)]"
    )}
  >
    Brutalist
  </button>
  <button
    onClick={() => setAesthetic("clean")}
    className={cn(
      "flex-1 px-2 py-1 text-xs rounded-[var(--aesthetic-radius)]",
      "border-[length:var(--aesthetic-border-width)] border-[var(--color-border-default)]",
      aesthetic === "clean"
        ? "bg-[var(--color-accent-blue)] text-white"
        : "bg-[var(--color-surface)]"
    )}
  >
    Clean
  </button>
</div>

{/* Palette grid (existing theme buttons, now including lawn-light and lawn-dark) */}
```

**Step 4: Verify UI**

```bash
cd ~/dev/fetch/web && bun run dev:web
```

Open browser. Click user dropdown. Verify:
- Aesthetic toggle switches between Brutalist and Clean
- Palette grid shows all 8 themes (2 brutalist + 6 clean)
- Switching aesthetic changes border-radius, shadows, text-transform across the app
- Switching palette changes colors
- Both settings persist across page reload

**Step 5: Commit**

```bash
git add src/hooks/useAesthetic.tsx src/components/layout/UserDropdown.tsx src/App.tsx
git commit -m "feat: add aesthetic mode toggle (brutalist/clean) to theme picker"
```

---

## Task 5: Install TanStack Router

**Files:**
- Modify: `~/dev/fetch/web/package.json`
- Create: `~/dev/fetch/web/app/routes/__root.tsx`
- Create: `~/dev/fetch/web/app/routes/index.tsx`
- Create: `~/dev/fetch/web/app/routeTree.gen.ts` (auto-generated)
- Modify: `~/dev/fetch/web/vite.config.ts`
- Modify: `~/dev/fetch/web/src/App.tsx`

**Step 1: Install TanStack Router**

```bash
cd ~/dev/fetch/web
bun add @tanstack/react-router
bun add -D @tanstack/router-plugin @tanstack/router-devtools
```

**Step 2: Configure Vite plugin**

Add the TanStack Router plugin to `vite.config.ts`:

```typescript
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

export default defineConfig({
  plugins: [
    TanStackRouterVite({
      routesDirectory: "./app/routes",
      generatedRouteTree: "./app/routeTree.gen.ts",
    }),
    react(),
    tailwindcss(),
  ],
  // ... rest of config
});
```

**Step 3: Create root route**

Create `~/dev/fetch/web/app/routes/__root.tsx`:

```tsx
import { createRootRoute, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return <Outlet />;
}
```

**Step 4: Create index route (placeholder)**

Create `~/dev/fetch/web/app/routes/index.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return <div>Unified Platform — TanStack Router active</div>;
}
```

**Step 5: Parallel router setup**

During migration, both routers run side-by-side. The TanStack Router handles new routes; React Router handles existing ones. This allows incremental migration without breaking existing pages.

Update `App.tsx` to render both routers with a feature flag or path-based split. The specifics depend on the migration strategy chosen at execution time.

**Step 6: Verify build**

```bash
cd ~/dev/fetch/web && bun run build
```

Expected: Build succeeds. Route tree auto-generated.

**Step 7: Commit**

```bash
git add app/ vite.config.ts package.json bun.lock src/App.tsx
git commit -m "feat: install TanStack Router alongside existing React Router"
```

---

## Task 6: Build Unified Navigation Shell

**Files:**
- Create: `~/dev/fetch/web/app/routes/dashboard/-layout.tsx`
- Modify: `~/dev/fetch/web/src/components/layout/Sidebar.tsx`
- Create: `~/dev/fetch/web/src/components/layout/SpaceTabs.tsx`

**Step 1: Create space tabs component**

Create `~/dev/fetch/web/src/components/layout/SpaceTabs.tsx`:

```tsx
import { Link, useMatchRoute } from "@tanstack/react-router";
import { cn } from "@/lib/cn";

interface SpaceTabsProps {
  spaceSlug: string;
  teamSlug: string;
  reviewEnabled: boolean;
  automationEnabled: boolean;
}

export function SpaceTabs({
  spaceSlug,
  teamSlug,
  reviewEnabled,
  automationEnabled,
}: SpaceTabsProps) {
  const matchRoute = useMatchRoute();

  const tabs = [
    { label: "Files", to: `/${teamSlug}/${spaceSlug}/files`, always: true },
    { label: "Review", to: `/${teamSlug}/${spaceSlug}/review`, always: reviewEnabled },
    { label: "Automation", to: `/${teamSlug}/${spaceSlug}/automation`, always: automationEnabled },
  ].filter((t) => t.always);

  return (
    <div
      className={cn(
        "flex gap-0 border-b-[length:var(--aesthetic-border-width)]",
        "border-[var(--color-border-default)]"
      )}
    >
      {tabs.map((tab) => {
        const isActive = matchRoute({ to: tab.to, fuzzy: true });
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={cn(
              "px-4 py-2 text-sm font-[var(--aesthetic-font-weight-label)]",
              "[text-transform:var(--aesthetic-text-transform)]",
              "tracking-[var(--aesthetic-letter-spacing)]",
              "border-b-2 -mb-[var(--aesthetic-border-width)]",
              isActive
                ? "border-[var(--color-accent-blue)] text-[var(--color-text-primary)]"
                : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
```

**Step 2: Update sidebar to show spaces**

Modify the existing Sidebar component to list spaces with icons. The existing sidebar already shows spaces — add visual indicators for which spaces have review enabled.

**Step 3: Create dashboard layout route**

Create `~/dev/fetch/web/app/routes/dashboard/-layout.tsx` that wraps content in the sidebar + topbar + space tabs layout. This mirrors Fetch's existing `AppLayout` but uses the new component library.

**Step 4: Verify navigation**

```bash
cd ~/dev/fetch/web && bun run dev:web
```

Navigate between Files and Review tabs. Verify:
- Tabs render with correct aesthetic styling
- Active tab is highlighted
- Sidebar lists spaces
- Layout is responsive

**Step 5: Commit**

```bash
git add src/components/layout/SpaceTabs.tsx app/routes/dashboard/
git commit -m "feat: build unified navigation shell with Files/Review/Automation tabs"
```

---

## Task 7: Migrate Fetch's Existing Components to New Library

This is the largest task — incrementally replace Fetch's custom components with the new Radix + CVA equivalents.

**Approach:** File by file, replace imports. Don't rewrite pages — just swap components.

**Step 1: Audit all component usage**

```bash
cd ~/dev/fetch/web
grep -r "from.*components/ui/Badge" src/ --include="*.tsx" -l
grep -r "from.*components/ui/Modal" src/ --include="*.tsx" -l
grep -r "from.*components/ui/ConfirmDialog" src/ --include="*.tsx" -l
grep -r "from.*components/ui/Skeleton" src/ --include="*.tsx" -l
grep -r "from.*components/ui/EmptyState" src/ --include="*.tsx" -l
```

**Step 2: Replace Badge**

Replace imports of `Badge.tsx` with `badge-v2.tsx` (then rename once old is removed). The CVA badge has variants: `default`, `secondary`, `destructive`, `outline`, `success`, `warning`.

Map Fetch's existing badge usage to CVA variants.

**Step 3: Replace Modal with Dialog**

Fetch's `Modal.tsx` → Radix `dialog.tsx`. The API differs:
- `Modal` uses `isOpen`/`onClose` props
- Radix Dialog uses `open`/`onOpenChange`

Update all callsites. The dialog component handles overlay, animations, and close button.

**Step 4: Replace ConfirmDialog**

Port to use the new Dialog component internally. Keep the same external API (`title`, `message`, `onConfirm`, `onCancel`).

**Step 5: Migrate page-level styling**

Update page components to use CSS variables instead of hardcoded colors:
- `text-[var(--color-text-primary)]` instead of `text-[#e2e8f0]`
- `bg-[var(--color-base)]` instead of `bg-[#0a0e17]`
- etc.

This is mechanical — find/replace across all page files.

**Step 6: Verify each page**

After each page migration, visually verify in both aesthetic modes:

```bash
cd ~/dev/fetch/web && bun run dev:web
```

Check: login, spaces list, file browser, admin panel, operations, share pages.

**Step 7: Commit incrementally**

One commit per page or component group:

```bash
git commit -m "refactor: migrate Badge to CVA variant system"
git commit -m "refactor: migrate Modal to Radix Dialog"
git commit -m "refactor: migrate admin pages to aesthetic variables"
git commit -m "refactor: migrate file browser to aesthetic variables"
```

---

## Task 8: Port Branding System for Dual Aesthetics

**Files:**
- Modify: `~/dev/fetch/web/src/hooks/useBranding.tsx`

**Step 1: Update branding provider**

The existing `BrandingProvider` sets `--color-accent-blue` and `--color-accent-blue-dim` from admin settings. This already works with both aesthetics since it overrides the palette layer.

Add: also override `--color-shadow` in brutalist mode when branding changes the accent, so offset shadows can optionally use the brand color.

**Step 2: Verify branding in both modes**

Set a custom brand color in admin panel. Verify it applies correctly in both Brutalist and Clean modes.

**Step 3: Commit**

```bash
git add src/hooks/useBranding.tsx
git commit -m "feat: branding system works with both aesthetic modes"
```

---

## Task 9: Remove Old Components + Clean Up

**Step 1: Remove old custom components**

Once all pages are migrated:
- Delete old `Badge.tsx` (replaced by `badge-v2.tsx`, then rename)
- Delete old `Modal.tsx` (replaced by `dialog.tsx`)
- Verify no remaining imports to old components

**Step 2: Run full test suite**

```bash
cd ~/dev/fetch/web && bun run typecheck && bun run lint && bun run test
```

**Step 3: Run Playwright tests**

```bash
cd ~/dev/fetch/web && bunx playwright test
```

**Step 4: Commit**

```bash
git commit -m "chore: remove old custom components replaced by Radix + CVA"
```

---

## Phase 1 Completion Criteria

- [ ] Radix + CVA component library in Fetch's frontend
- [ ] Dual-aesthetic system working (Brutalist + Clean)
- [ ] 8 color palettes (2 brutalist + 6 clean)
- [ ] Aesthetic + palette picker in user dropdown
- [ ] TanStack Router installed alongside React Router
- [ ] Navigation shell with sidebar + Files/Review/Automation tabs
- [ ] All existing Fetch pages work in both aesthetic modes
- [ ] Branding system works with both aesthetics
- [ ] Build passes, types pass, linting passes
- [ ] Existing Playwright tests pass

---

## Phases 2-6 Summary (Future Plans)

Each phase gets its own detailed plan when the previous phase completes.

### Phase 2: Review Core (4-6 weeks)
Add review tables to Fetch's Rust backend. Port Lawn's review UI. ~35 new API endpoints. HLS player, comments, share links, presence. SSE real-time.

### Phase 3: Transcoding Pipeline (2-3 weeks)
FFmpeg background job queue. Webhook provider for external transcoders. Mux provider for PacSend. Auto-proxy generation on upload.

### Phase 4: Auth + Permissions (2-3 weeks)
Extend permission model with review bits. Space invites. Self-registration for PacSend. Remove Clerk.

### Phase 5: Automation Engine (4-6 weeks)
Rules engine with triggers, conditions, actions. YAML config. Run history. "Approve → move + deliver + notify" flow.

### Phase 6: Visual Builder + PacSend (4-6 weeks)
Drag-drop automation builder. Stripe billing. Quota enforcement. Product mode feature gating.
