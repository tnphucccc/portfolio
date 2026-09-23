# Astro Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the single-page portfolio from hand-written HTML + Tailwind v3 to Astro 7 + Tailwind v4 with all content in validated YAML collections and an optional per-project case-study route, with no visible change.

**Architecture:** Content lives in `src/content/*.yaml` (Astro `file()` loader, Zod schemas) plus `src/content/case-studies/*.md` (`glob()` loader). Small Astro components render it; `Base.astro` owns `<head>`, icon sprite, header, and footer. Inline `**x**` highlights are rendered by a unit-tested, escape-first helper. GitHub Actions builds and deploys to Pages under `/portfolio`.

**Tech Stack:** Astro ^7.3, Tailwind CSS ^4.3 via `@tailwindcss/vite`, TypeScript ^6 (the range `@astrojs/check` supports), Vitest ^5, pnpm, Node ≥ 22.12 (local: 24).

**Spec:** `docs/superpowers/specs/2026-09-23-astro-migration-design.md`

## Global Constraints

- Work on branch `astro-migration` in `/home/tnphuc/Workspace/Projects/portfolio`.
- No content changes: every visible string, link, attribute value, and section order matches `git show main:index.html` exactly (the phone number stays).
- No visual redesign; the live site `https://tnphucccc.github.io/portfolio/` is the reference.
- `site: 'https://tnphucccc.github.io'`, `base: '/portfolio'`.
- Package manager: pnpm. Commit `pnpm-lock.yaml`.
- `typescript` must be `^6` — `@astrojs/check@0.9.10` peers on `^5 || ^6`; TypeScript 7 breaks it.
- Every commit message ends with a blank line and `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Do not push, open a PR, or change the repository's Pages settings without the user's explicit approval (Task 7 ends by asking).

## Review Focus

1. A YAML value starting with `*` (e.g. a bullet that opens with `**Rust**`) is parsed as an alias, and one containing `: ` as a mapping → the build must fail loudly, never render a wrong value. All multi-word strings in this plan use `>-` block scalars or safe plain scalars; Task 3 Step 6 proves a malformed file fails `astro sync`.
2. A contact/footer `href` without a scheme (e.g. `github.com/tnphucccc`) would become a broken relative link under `/portfolio/` → the schema rejects anything not starting with `https://`, `mailto:`, or `tel:`. Task 3 Step 6 tests it.
3. A case study whose `project:` names a nonexistent project → build fails with a message naming the file. Task 5 Step 5 tests it.
4. Two case studies referencing the same project would silently produce one route and drop the other → `getStaticPaths` throws. Task 5 Step 6 tests it.
5. Header nav on a case-study page must point to `/portfolio/#about`, not `#about` (which would resolve against `/portfolio/projects/<id>/`). Task 5 Step 4 checks the built HTML.

---

## File map

| Path | Responsibility |
|---|---|
| `package.json` | scripts + deps (rewritten) |
| `astro.config.mjs` | site/base, Tailwind Vite plugin |
| `tsconfig.json` | Astro strict preset |
| `.gitignore` | add `.astro/` |
| `src/styles/global.css` | Tailwind v4 entry, `@theme` tokens, base + component classes (port of `src/input.css` + `tailwind.config.js`) |
| `src/lib/inline.ts` | `escapeHtml`, `renderInline` |
| `src/lib/url.ts` | `withBase`, `isExternal` |
| `src/lib/content.ts` | typed collection getters with explicit sorting |
| `src/content.config.ts` | collections + schemas |
| `src/content/{profile,skills,experience,education,projects}.yaml` | all page content |
| `src/content/case-studies/.gitkeep` | keeps the (empty) glob directory in git |
| `src/layouts/Base.astro` | document shell |
| `src/components/{Icon,Section,Hero,Skills,Entry,ProjectCard}.astro` | presentational pieces |
| `src/pages/index.astro` | home page |
| `src/pages/projects/[id].astro` | case-study route |
| `tests/{inline,url}.test.ts` | unit tests |
| `.github/workflows/deploy.yml` | CI deploy |
| `README.md` | updated docs |
| Deleted: `index.html`, `style.css`, `tailwind.config.js`, `src/input.css` | |

Scratch files (comparison script, old HTML, screenshots) go in the session scratchpad, referred to below as `$SCRATCH`, never in the repo.

---

### Task 1: Toolchain scaffold

**Files:**
- Modify: `package.json`, `.gitignore`
- Create: `astro.config.mjs`, `tsconfig.json`, `src/styles/global.css`, `src/pages/index.astro` (placeholder, replaced in Task 4)
- Delete: `tailwind.config.js`, `src/input.css`

**Interfaces:**
- Produces: `src/styles/global.css` with component classes `.wrap .section-title .hl .tag .card .badge .skill-label .nav-link .contact-link .ico .bullets` and theme utilities `bg-bg bg-surface bg-surface-2 border-line text-text text-muted text-accent font-sans font-mono max-w-content`; scripts `pnpm dev | build | preview | check | test`.

- [ ] **Step 1: Replace `package.json`**

```json
{
  "name": "portfolio",
  "version": "2.0.0",
  "description": "Personal portfolio for Phuc Tran Nguyen",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro check && astro build",
    "preview": "astro preview",
    "check": "astro check",
    "test": "vitest run"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:
```bash
cd /home/tnphuc/Workspace/Projects/portfolio
pnpm add astro@^7.3 tailwindcss@^4.3 @tailwindcss/vite@^4.3
pnpm add -D @astrojs/check typescript@^6 vitest@^5
```
Expected: `pnpm-lock.yaml` created, no peer-dependency errors. If pnpm prints "Ignored build scripts", continue; only if a later build fails because of it, add the named package to `"pnpm": { "onlyBuiltDependencies": [...] }` in `package.json` and reinstall.

- [ ] **Step 3: Create `astro.config.mjs`**

```js
// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://tnphucccc.github.io',
  base: '/portfolio',
  vite: {
    plugins: [tailwindcss()],
  },
});
```

- [ ] **Step 4: Create `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

- [ ] **Step 5: Add `.astro/` to `.gitignore`**

Append after the `dist/` block:
```
# Ignore Astro generated types
.astro/
```

- [ ] **Step 6: Create `src/styles/global.css`** (port of `tailwind.config.js` + `src/input.css`; base and component rules are verbatim)

```css
@import 'tailwindcss';

@theme {
  --color-bg: #0d1117;
  --color-surface: #161b22;
  --color-surface-2: #1c2129;
  --color-line: #30363d;
  --color-text: #e6edf3;
  --color-muted: #8b949e;
  --color-accent: #34d399;

  --font-sans: Inter, ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;

  --container-content: 920px;
}

@layer base {
  html {
    scroll-behavior: smooth;
  }

  body {
    @apply bg-bg font-sans text-text antialiased;
  }

  /* Offset anchored sections for the sticky nav */
  section[id] {
    scroll-margin-top: 5rem;
  }

  @media (prefers-reduced-motion: reduce) {
    html {
      scroll-behavior: auto;
    }
  }
}

@layer components {
  /* Centered page column */
  .wrap {
    @apply mx-auto w-full max-w-content px-6;
  }

  /* "// section" terminal-style heading */
  .section-title {
    @apply mb-7 font-mono text-sm font-medium tracking-widest text-accent;
  }

  /* Inline accent highlight */
  .hl {
    @apply text-accent;
  }

  /* Tech pill */
  .tag {
    @apply inline-flex items-center rounded border border-line bg-surface-2 px-2.5 py-1 font-mono text-xs text-muted;
  }

  /* Project card */
  .card {
    @apply flex flex-col rounded-xl border border-line bg-surface p-6 transition-colors duration-200 hover:border-accent/40;
  }

  /* Award badge */
  .badge {
    @apply mb-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-xs text-accent;
  }

  /* Group label in the skills grid */
  .skill-label {
    @apply mb-3 font-mono text-xs font-medium uppercase tracking-wider text-muted;
  }

  /* Nav + footer links */
  .nav-link {
    @apply font-mono text-sm text-muted transition-colors hover:text-accent;
  }

  /* Hero / footer contact links with leading icon */
  .contact-link {
    @apply inline-flex items-center gap-2 font-mono text-sm text-muted transition-colors hover:text-accent;
  }

  /* Inline icon sized to the current text */
  .ico {
    @apply inline-block h-[1.1em] w-[1.1em] shrink-0 fill-current;
  }

  /* Accent-marker bullet list */
  .bullets {
    @apply space-y-2 leading-relaxed text-muted;
  }
  .bullets > li {
    @apply relative pl-5;
  }
  .bullets > li::before {
    content: '▸';
    @apply absolute left-0 text-accent;
  }
}
```

v3 → v4 differences that could show (verified visually in Task 6, not changed pre-emptively): `space-y-*` now sets `margin-bottom` on all-but-last children instead of `margin-top` on all-but-first (same visual result); hover styles only apply on devices that support hover; the default border color is `currentColor` (every border here sets `border-line`).

- [ ] **Step 7: Create placeholder `src/pages/index.astro`**

```astro
---
import '../styles/global.css';
---

<html lang="en"><body><p class="wrap text-accent">scaffold</p></body></html>
```

- [ ] **Step 8: Delete the v3 files and build**

Run:
```bash
git rm -q tailwind.config.js src/input.css
pnpm build
grep -rlo -- '--color-accent:#34d399' dist | head -1
```
Expected: `astro check` reports 0 errors, build writes `dist/index.html`, grep prints one file (CSS may be inlined in the HTML or emitted under `dist/_astro/`).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "build: scaffold Astro 7 with Tailwind v4 theme

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Inline markup and URL helpers (TDD)

**Files:**
- Create: `tests/inline.test.ts`, `src/lib/inline.ts`, `tests/url.test.ts`, `src/lib/url.ts`

**Interfaces:**
- Produces:
  - `escapeHtml(s: string): string`
  - `renderInline(s: string): string` — escapes, then `**x**` → `<span class="hl">x</span>`
  - `withBase(path: string, base?: string): string` — `base` defaults to `import.meta.env.BASE_URL`
  - `isExternal(href: string): boolean` — true for `http://` / `https://`

- [ ] **Step 1: Write failing tests `tests/inline.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { escapeHtml, renderInline } from '../src/lib/inline';

describe('escapeHtml', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml(`<a href="x">Tom & Jerry's</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;',
    );
  });
});

describe('renderInline', () => {
  it('passes plain text through unchanged', () => {
    expect(renderInline('Open to full-time software engineering roles.')).toBe(
      'Open to full-time software engineering roles.',
    );
  });

  it('wraps **text** in an accent span', () => {
    expect(renderInline('from **ML** and more')).toBe(
      'from <span class="hl">ML</span> and more',
    );
  });

  it('handles several highlights in one string', () => {
    expect(renderInline('on **GraphQL** and **MongoDB**, improving **30%**')).toBe(
      'on <span class="hl">GraphQL</span> and <span class="hl">MongoDB</span>, improving <span class="hl">30%</span>',
    );
  });

  it('escapes markup so content cannot inject HTML', () => {
    expect(renderInline('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
    );
  });

  it('escapes inside highlights', () => {
    expect(renderInline('**DSA & OOP**')).toBe('<span class="hl">DSA &amp; OOP</span>');
  });

  it('leaves an unmatched ** literal', () => {
    expect(renderInline('a ** b')).toBe('a ** b');
    expect(renderInline('**open')).toBe('**open');
  });
});
```

- [ ] **Step 2: Write failing tests `tests/url.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { isExternal, withBase } from '../src/lib/url';

describe('withBase', () => {
  it('joins a hash onto a base without trailing slash', () => {
    expect(withBase('#about', '/portfolio')).toBe('/portfolio/#about');
  });

  it('joins onto a base with trailing slash', () => {
    expect(withBase('#about', '/portfolio/')).toBe('/portfolio/#about');
  });

  it('strips a leading slash from the path', () => {
    expect(withBase('/projects/mangahub/', '/portfolio')).toBe('/portfolio/projects/mangahub/');
  });

  it('returns the base root for an empty path', () => {
    expect(withBase('', '/portfolio')).toBe('/portfolio/');
  });

  it('works with the root base', () => {
    expect(withBase('#about', '/')).toBe('/#about');
  });
});

describe('isExternal', () => {
  it('is true for http(s) links', () => {
    expect(isExternal('https://github.com/tnphucccc')).toBe(true);
    expect(isExternal('http://example.com')).toBe(true);
  });

  it('is false for mailto, tel, and in-site links', () => {
    expect(isExternal('mailto:a@b.c')).toBe(false);
    expect(isExternal('tel:+84901976650')).toBe(false);
    expect(isExternal('#about')).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL — both files error with "Failed to resolve import ../src/lib/inline" / "../src/lib/url".

- [ ] **Step 4: Implement `src/lib/inline.ts`**

```ts
const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

/**
 * Renders content strings for `set:html`. Escapes first, so the only markup
 * that can appear in the output is the accent span produced from `**text**`.
 */
export function renderInline(s: string): string {
  return escapeHtml(s).replace(/\*\*(.+?)\*\*/g, '<span class="hl">$1</span>');
}
```

- [ ] **Step 5: Implement `src/lib/url.ts`**

```ts
/** Prefixes an in-site path or hash with the configured `base` (e.g. /portfolio). */
export function withBase(path: string, base: string = import.meta.env.BASE_URL): string {
  const root = base.endsWith('/') ? base : `${base}/`;
  return `${root}${path.replace(/^\//, '')}`;
}

export function isExternal(href: string): boolean {
  return /^https?:\/\//.test(href);
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS — 2 files, 14 tests.

- [ ] **Step 7: Type-check and commit**

Run: `pnpm check` — expected 0 errors.
```bash
git add src/lib tests
git commit -m "feat: add inline highlight renderer and base-aware URL helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Content collections

**Files:**
- Create: `src/content.config.ts`, `src/content/profile.yaml`, `src/content/skills.yaml`, `src/content/experience.yaml`, `src/content/education.yaml`, `src/content/projects.yaml`, `src/content/case-studies/.gitkeep`, `src/lib/content.ts`

**Interfaces:**
- Produces collections `profile`, `skills`, `experience`, `education`, `projects`, `caseStudies` and, in `src/lib/content.ts`:
  - `getProfile(): Promise<CollectionEntry<'profile'>['data']>` (throws if `me` missing)
  - `getSkills(): Promise<CollectionEntry<'skills'>[]>` — by `order` asc
  - `getExperience(): Promise<CollectionEntry<'experience'>[]>` — by `start` desc
  - `getEducation(): Promise<CollectionEntry<'education'>[]>` — by `order` asc
  - `getProjects(): Promise<CollectionEntry<'projects'>[]>` — by `order` asc

- [ ] **Step 1: Create `src/content.config.ts`**

```ts
import { defineCollection, reference } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Only these schemes are allowed: anything else would render as a broken
// relative link under the /portfolio base.
const href = z
  .string()
  .regex(/^(https:\/\/|mailto:|tel:)/, 'href must start with https://, mailto:, or tel:');

const bullets = z.array(z.string().min(1)).min(1);

const profile = defineCollection({
  loader: file('src/content/profile.yaml'),
  schema: z.object({
    name: z.string(),
    role: z.string(),
    tagline: z.string(),
    location: z.string(),
    about: z.string(),
    meta: z.object({
      description: z.string(),
      ogDescription: z.string(),
    }),
    contacts: z.array(
      z.object({
        kind: z.enum(['email', 'phone', 'linkedin', 'github']),
        label: z.string(),
        href,
      }),
    ),
    footerLinks: z.array(z.object({ label: z.string(), href })),
  }),
});

const skills = defineCollection({
  loader: file('src/content/skills.yaml'),
  schema: z.object({
    label: z.string(),
    order: z.number().int(),
    items: z.array(z.string().min(1)).min(1),
  }),
});

const experience = defineCollection({
  loader: file('src/content/experience.yaml'),
  schema: z.object({
    title: z.string(),
    org: z.string(),
    period: z.string(),
    // Sort key only (newest first); `period` is what is displayed.
    start: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'start must be YYYY-MM'),
    bullets,
  }),
});

const education = defineCollection({
  loader: file('src/content/education.yaml'),
  schema: z.object({
    title: z.string(),
    org: z.string(),
    period: z.string(),
    order: z.number().int(),
    bullets,
  }),
});

const projects = defineCollection({
  loader: file('src/content/projects.yaml'),
  schema: z.object({
    name: z.string(),
    summary: z.string(),
    tags: z.array(z.string().min(1)),
    repo: z.url(),
    badge: z.string().optional(),
    order: z.number().int(),
  }),
});

const caseStudies = defineCollection({
  loader: glob({ base: './src/content/case-studies', pattern: '**/[^_.]*.md' }),
  schema: z.object({
    project: reference('projects'),
    title: z.string().optional(),
  }),
});

export const collections = { profile, skills, experience, education, projects, caseStudies };
```

Note: `education` deliberately has `order` instead of `start` — the start date isn't on the current site and must not be invented.

- [ ] **Step 2: Create `src/content/profile.yaml`** (text copied verbatim from `index.html`; `<span class="hl">x</span>` → `**x**`)

```yaml
- id: me
  name: Phuc Tran Nguyen
  role: Software Engineer
  tagline: >-
    Building across the stack — from **ML** and **backend systems** to
    **web apps**.
  location: Ho Chi Minh City, Vietnam
  about: >-
    Software Engineer working across backend systems, infrastructure, and
    ML — currently building game-server infrastructure for **Under Realm TCG**
    at **Metacraft Studio**. I work **AI-first**, using AI-assisted coding
    tools daily and reviewing AI-generated code in production. Open to
    full-time software engineering roles.
  meta:
    description: >-
      Phuc Tran Nguyen — Software Engineer building across the stack, from ML
      and backend systems to web apps. Based in Ho Chi Minh City, Vietnam.
    ogDescription: >-
      Software Engineer building across the stack — from ML and backend
      systems to web apps.
  contacts:
    - kind: email
      label: Email
      href: mailto:tnphuc.personal@gmail.com
    - kind: phone
      label: (+84) 90 197-6650
      href: tel:+84901976650
    - kind: linkedin
      label: LinkedIn
      href: https://www.linkedin.com/in/phuc-tran-hcmiu/
    - kind: github
      label: GitHub
      href: https://github.com/tnphucccc
  footerLinks:
    - label: tnphuc.personal@gmail.com
      href: mailto:tnphuc.personal@gmail.com
    - label: github.com/tnphucccc
      href: https://github.com/tnphucccc
    - label: LinkedIn
      href: https://www.linkedin.com/in/phuc-tran-hcmiu/
```

- [ ] **Step 3: Create `src/content/skills.yaml`**

```yaml
- id: languages
  label: Languages
  order: 1
  items:
    - Go
    - Rust
    - Python
    - TypeScript / JavaScript
    - Java
    - C++
- id: backend-infra
  label: Backend & Infra
  order: 2
  items:
    - GraphQL
    - REST
    - gRPC
    - AWS (CDK, Lambda, EC2)
    - Docker
    - MongoDB
    - Redis
- id: cs-fundamentals
  label: CS Fundamentals
  order: 3
  items:
    - Data Structures & Algorithms
    - Complexity Analysis
    - Design Patterns
    - Concurrency
- id: ai-ml
  label: AI / ML
  order: 4
  items:
    - PyTorch (GPT / Transformer)
    - scikit-learn
    - ML pipeline design
- id: ai-assisted-dev
  label: AI-Assisted Dev
  order: 5
  items:
    - Claude Code
    - GitHub Copilot
    - Reviewing AI-generated code
```

- [ ] **Step 4: Create `src/content/experience.yaml` and `src/content/education.yaml`**

`src/content/experience.yaml`:
```yaml
- id: metacraft-se
  title: Software Engineer
  org: Metacraft Studio · Under Realm TCG · Ho Chi Minh City
  period: Jan 2025 – Present
  start: '2025-01'
  bullets:
    - >-
      Built the authoritative multiplayer duel server in **Rust** (Tokio +
      Axum) using a per-room actor pattern, with real-time state
      synchronization that reconnects clients from stale views mid-duel.
    - >-
      Built the **PvE bot system** — concurrency-safe bot matchmaking and
      scheduled duel orchestration, with a decision engine scoring skill
      targeting and tiered deck selection.
    - >-
      Architected the in-game economy — multi-currency store, inventory, and a
      CDN asset pipeline — on **GraphQL** and **MongoDB**, improving query
      performance **30%** with aggregation-based loaders.
    - >-
      Designed and shipped **AWS CDK** infrastructure (Lambda, EC2, CloudWatch
      analytics pipeline) and server-to-server IAP receipt verification for iOS
      and Android.
    - >-
      Lead code reviews with **AI-assisted tooling** — triaging diffs and
      validating AI-generated code — enforcing idiomatic Rust/TypeScript
      patterns, security hygiene, and API reliability.
- id: metacraft-intern
  title: Software Engineer Intern
  org: Metacraft Studio · Under Realm TCG · Ho Chi Minh City
  period: Sep – Dec 2024
  start: '2024-09'
  bullets:
    - >-
      Designed and shipped the **quest system** end-to-end — MongoDB data
      models and GraphQL APIs in TypeScript/Node.js — with progress tracking
      across daily, weekly, and all-time quests.
    - >-
      Built an interactive **CLI** for quest authoring and a duel-tracking
      pipeline with scheduled match resets, supporting PvE and matchmaking.
- id: iu-ta
  title: Teaching Assistant — DSA & OOP
  org: International University – VNUHCM · Ho Chi Minh City
  period: Sep 2023 – Jan 2026
  start: '2023-09'
  bullets:
    - >-
      Evaluated code submissions across DSA and OOP courses — assessing
      correctness, time/space complexity, and idiomatic quality; gave
      structured written feedback on assignments and exams.
    - >-
      Mentored students on algorithm design, clean code principles, and design
      patterns through workshops and 1-on-1 guidance.
```

`src/content/education.yaml`:
```yaml
- id: iu-bcs
  title: Bachelor of Computer Science
  org: International University – VNUHCM
  period: Expected 2026
  order: 1
  bullets:
    - GPA 3.1 · IELTS 6.5
    - >-
      Thesis: Dynamic Difficulty Adjustment in 2D platformers (Unity).
    - Member of CSE Youth Union · Member of IoTs Club.
```

- [ ] **Step 5: Create `src/content/projects.yaml`, the case-studies dir, and `src/lib/content.ts`**

`src/content/projects.yaml`:
```yaml
- id: gpt-at-home
  name: GPTAtHome
  order: 1
  repo: https://github.com/tnphucccc/gpt-at-home
  summary: >-
    Built Bigram and full GPT/Transformer architectures from scratch in
    PyTorch (multi-head attention, positional encodings, layer norm) with
    comprehensive unit tests.
  tags:
    - Python
    - PyTorch
    - Transformers
- id: mangahub
  name: MangaHub
  order: 2
  repo: https://github.com/tnphucccc/mangahub
  summary: >-
    Manga-tracking platform in Go exposing five concurrent network servers
    (HTTP/REST, TCP, UDP, gRPC, WebSocket) with JWT auth, multi-device sync,
    real-time chat, and a CLI client.
  tags:
    - Go
    - gRPC
    - WebSocket
    - JWT
- id: sol-me
  name: SolMe
  order: 3
  repo: https://github.com/tnphucccc/sol-me
  badge: 🏆 3rd Prize · Solana Consumer Hack 16
  summary: >-
    Telegram crypto-wallet assistant that simplifies the crypto transaction
    process, built end-to-end in TypeScript under hackathon constraints.
  tags:
    - TypeScript
    - Solana
    - Telegram
- id: lib-man
  name: LibMan
  order: 4
  repo: https://github.com/tnphucccc/lib-man
  summary: >-
    Led an 8-person team (157 commits) building a full-stack library
    management system in Java Spring Boot + React/TypeScript; designed RESTful
    APIs and managed frontend state with Hooks.
  tags:
    - Java
    - Spring Boot
    - React
    - TypeScript
```

Run: `mkdir -p src/content/case-studies && touch src/content/case-studies/.gitkeep`

`src/lib/content.ts`:
```ts
import { getCollection, getEntry } from 'astro:content';

const byOrder = (a: { data: { order: number } }, b: { data: { order: number } }) =>
  a.data.order - b.data.order;

export async function getProfile() {
  const entry = await getEntry('profile', 'me');
  if (!entry) throw new Error('src/content/profile.yaml must contain an entry with id "me"');
  return entry.data;
}

export async function getSkills() {
  return (await getCollection('skills')).sort(byOrder);
}

/** Newest first. */
export async function getExperience() {
  return (await getCollection('experience')).sort((a, b) =>
    b.data.start.localeCompare(a.data.start),
  );
}

export async function getEducation() {
  return (await getCollection('education')).sort(byOrder);
}

export async function getProjects() {
  return (await getCollection('projects')).sort(byOrder);
}
```

- [ ] **Step 6: Validate, including the failure modes (Review Focus 1 & 2)**

Run: `pnpm astro sync`
Expected: succeeds (an "empty collection caseStudies" warning is fine).

Then prove bad input fails, reverting each with the reverse `sed` (the files are untracked, so `git checkout` cannot restore them):
```bash
# (1) A YAML value opening with ** is parsed as an alias → must fail
sed -i 's/^    - GPA 3.1 · IELTS 6.5$/    - **GPA** 3.1/' src/content/education.yaml
pnpm astro sync; echo "exit=$?"   # expect non-zero, YAML error naming education.yaml
sed -i 's/^    - \*\*GPA\*\* 3.1$/    - GPA 3.1 · IELTS 6.5/' src/content/education.yaml

# (2) A scheme-less href → must fail the schema
sed -i 's#href: https://github.com/tnphucccc$#href: github.com/tnphucccc#' src/content/profile.yaml
pnpm astro sync; echo "exit=$?"   # expect non-zero, "href must start with https://, mailto:, or tel:"
sed -i 's#href: github.com/tnphucccc$#href: https://github.com/tnphucccc#' src/content/profile.yaml

# Confirm both files are restored
grep -c 'GPA 3.1 · IELTS 6.5' src/content/education.yaml            # expect 1
grep -c 'https://github.com/tnphucccc$' src/content/profile.yaml   # expect 2
pnpm astro sync                                                     # expect success
```
If `astro sync` does **not** fail on (1), stop and report — the YAML convention in this plan would then need a different guard.

- [ ] **Step 7: Type-check and commit**

Run: `pnpm check` — expected 0 errors.
```bash
git add src/content.config.ts src/content src/lib/content.ts
git commit -m "feat: move page content into validated YAML collections

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Layout, components, and home page

**Files:**
- Create: `src/layouts/Base.astro`, `src/components/Icon.astro`, `src/components/Section.astro`, `src/components/Hero.astro`, `src/components/Skills.astro`, `src/components/Entry.astro`, `src/components/ProjectCard.astro`
- Replace: `src/pages/index.astro`

**Interfaces:**
- Consumes: `renderInline`, `withBase`, `isExternal` (Task 2); `getProfile`, `getSkills`, `getExperience`, `getEducation`, `getProjects` (Task 3).
- Produces:
  - `Base.astro` props `{ title?: string; home?: boolean }` — `title` becomes `"<title> — <name>"`; `home` makes nav links bare hashes.
  - `Icon.astro` props `{ name: 'pin' | 'mail' | 'phone' | 'linkedin' | 'github' }`
  - `Section.astro` props `{ id: string; title: string }` + default slot
  - `Hero.astro` props `{ profile: CollectionEntry<'profile'>['data'] }`
  - `Skills.astro` props `{ groups: CollectionEntry<'skills'>[] }`
  - `Entry.astro` props `{ title: string; period: string; org: string; bullets: string[] }`
  - `ProjectCard.astro` props `{ project: CollectionEntry<'projects'>['data'] }`

- [ ] **Step 1: Create `src/components/Icon.astro`**

```astro
---
interface Props {
  name: 'pin' | 'mail' | 'phone' | 'linkedin' | 'github';
}
const { name } = Astro.props;
---

<svg class="ico" aria-hidden="true"><use href={`#i-${name}`} /></svg>
```

- [ ] **Step 2: Create `src/components/Section.astro`**

```astro
---
interface Props {
  id: string;
  title: string;
}
const { id, title } = Astro.props;
---

<section id={id} class="wrap border-t border-line py-12 sm:py-16" aria-labelledby={`${id}-title`}>
  <h2 class="section-title" id={`${id}-title`}>// {title}</h2>
  <slot />
</section>
```

- [ ] **Step 3: Create `src/components/Hero.astro`**

```astro
---
import type { CollectionEntry } from 'astro:content';
import Icon from './Icon.astro';
import { renderInline } from '../lib/inline';
import { isExternal } from '../lib/url';

interface Props {
  profile: CollectionEntry<'profile'>['data'];
}
const { profile } = Astro.props;

const icons = { email: 'mail', phone: 'phone', linkedin: 'linkedin', github: 'github' } as const;
---

<section class="wrap pb-12 pt-16 sm:pb-16 sm:pt-24" aria-labelledby="hero-name">
  <p class="mb-4 font-mono text-sm tracking-widest text-accent">// {profile.role.toLowerCase()}</p>
  <h1 id="hero-name" class="text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
    {profile.name}
  </h1>
  <p class="mt-5 max-w-xl text-lg leading-relaxed text-muted" set:html={renderInline(profile.tagline)} />
  <p class="mt-4 flex items-center gap-2 font-mono text-sm text-muted">
    <Icon name="pin" />
    {profile.location}
  </p>

  <ul class="mt-7 flex flex-wrap gap-x-6 gap-y-3" aria-label="Contact">
    {
      profile.contacts.map((c) => (
        <li>
          <a
            class="contact-link"
            href={c.href}
            target={isExternal(c.href) ? '_blank' : undefined}
            rel={isExternal(c.href) ? 'noopener' : undefined}
          >
            <Icon name={icons[c.kind]} />
            {c.label}
          </a>
        </li>
      ))
    }
  </ul>
</section>
```

- [ ] **Step 4: Create `src/components/Skills.astro`, `Entry.astro`, `ProjectCard.astro`**

`src/components/Skills.astro`:
```astro
---
import type { CollectionEntry } from 'astro:content';

interface Props {
  groups: CollectionEntry<'skills'>[];
}
const { groups } = Astro.props;
---

<div class="grid gap-8 sm:grid-cols-2">
  {
    groups.map(({ data }) => (
      <div>
        <h3 class="skill-label">{data.label}</h3>
        <ul class="flex flex-wrap gap-2">
          {data.items.map((item) => (
            <li class="tag">{item}</li>
          ))}
        </ul>
      </div>
    ))
  }
</div>
```

`src/components/Entry.astro`:
```astro
---
import { renderInline } from '../lib/inline';

interface Props {
  title: string;
  period: string;
  org: string;
  bullets: string[];
}
const { title, period, org, bullets } = Astro.props;
---

<article>
  <div class="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
    <h3 class="text-lg font-semibold text-text">{title}</h3>
    <span class="font-mono text-sm text-muted">{period}</span>
  </div>
  <p class="mt-1 font-mono text-sm text-accent">{org}</p>
  <ul class="bullets mt-4">
    {bullets.map((b) => <li set:html={renderInline(b)} />)}
  </ul>
</article>
```

`src/components/ProjectCard.astro`:
```astro
---
import type { CollectionEntry } from 'astro:content';
import Icon from './Icon.astro';

interface Props {
  project: CollectionEntry<'projects'>['data'];
}
const { project } = Astro.props;
---

<article class="card">
  <div class="mb-3 flex items-start justify-between gap-3">
    <h3 class="font-mono text-lg font-bold text-text">{project.name}</h3>
    <a
      class="text-muted transition-colors hover:text-accent"
      href={project.repo}
      target="_blank"
      rel="noopener"
      aria-label={`${project.name} on GitHub`}
    >
      <Icon name="github" />
    </a>
  </div>
  {project.badge && <p class="badge">{project.badge}</p>}
  <p class="text-sm leading-relaxed text-muted">{project.summary}</p>
  <ul class="mt-auto flex flex-wrap gap-2 pt-4">
    {project.tags.map((t) => <li class="tag">{t}</li>)}
  </ul>
</article>
```

- [ ] **Step 5: Create `src/layouts/Base.astro`**

The five `d="…"` values are copied from `index.html:38-62`. Copy them from `git show main:index.html` rather than retyping; the Step 7 comparison checks them byte-for-byte.

```astro
---
import '../styles/global.css';
import { getProfile } from '../lib/content';
import { isExternal, withBase } from '../lib/url';

interface Props {
  title?: string;
  home?: boolean;
}
const { title, home = false } = Astro.props;

const me = await getProfile();
const pageTitle = title ? `${title} — ${me.name}` : `${me.name} — ${me.role}`;
// On the home page section links stay same-page hashes; elsewhere they must
// go back to the home page under the base path.
const toHome = (hash: string) => (home ? hash : withBase(hash));
const nav = ['about', 'skills', 'work', 'projects', 'education'];
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{pageTitle}</title>
    <meta name="description" content={me.meta.description} />

    <!-- Open Graph -->
    <meta property="og:title" content={pageTitle} />
    <meta property="og:description" content={me.meta.ogDescription} />
    <meta property="og:type" content="website" />

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
      rel="stylesheet"
    />
  </head>

  <body>
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded focus:bg-surface focus:px-3 focus:py-2 focus:text-accent"
      >Skip to content</a
    >

    <!-- Icon sprite: define once, reuse via <use> -->
    <svg width="0" height="0" class="hidden" aria-hidden="true">
      <symbol id="i-pin" viewBox="0 0 24 24">
        <path
          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"
        />
      </symbol>
      <symbol id="i-mail" viewBox="0 0 24 24">
        <path
          d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"
        />
      </symbol>
      <symbol id="i-phone" viewBox="0 0 24 24">
        <path
          d="M6.62 10.79a15.53 15.53 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24 11.36 11.36 0 0 0 3.57.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.36 11.36 0 0 0 .57 3.57 1 1 0 0 1-.25 1.02l-2.2 2.2z"
        />
      </symbol>
      <symbol id="i-linkedin" viewBox="0 0 24 24">
        <path
          d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.71h.05c.53-1 1.83-2.06 3.76-2.06C20.5 8.65 21 11.2 21 14.5V21h-4v-5.7c0-1.36-.02-3.1-1.9-3.1-1.9 0-2.2 1.48-2.2 3v5.8H9z"
        />
      </symbol>
      <symbol id="i-github" viewBox="0 0 24 24">
        <path
          d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.36 1.12 2.94.85.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.72 0 0 .84-.28 2.75 1.05a9.36 9.36 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.46.1 2.72.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .27.18.6.69.49A10.26 10.26 0 0 0 22 12.25C22 6.58 17.52 2 12 2z"
        />
      </symbol>
    </svg>

    <!-- Sticky nav -->
    <header id="top" class="sticky top-0 z-50 border-b border-line bg-bg/80 backdrop-blur">
      <div class="wrap flex h-16 items-center justify-between">
        <a href={toHome('#top')} class="font-mono text-base font-bold text-text">
          <span class="text-muted">~/</span>phuc<span class="text-accent">_</span>
        </a>
        <nav class="hidden gap-6 sm:flex" aria-label="Primary">
          {nav.map((id) => <a class="nav-link" href={toHome(`#${id}`)}>{id}</a>)}
        </nav>
      </div>
    </header>

    <main id="main">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="border-t border-line">
      <div class="wrap flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <p class="font-mono text-sm text-muted">{me.name} · {me.role}</p>
        <ul class="flex flex-wrap gap-x-6 gap-y-2" aria-label="Contact">
          {
            me.footerLinks.map((l) => (
              <li>
                <a
                  class="nav-link"
                  href={l.href}
                  target={isExternal(l.href) ? '_blank' : undefined}
                  rel={isExternal(l.href) ? 'noopener' : undefined}
                >
                  {l.label}
                </a>
              </li>
            ))
          }
        </ul>
      </div>
    </footer>
  </body>
</html>
```

- [ ] **Step 6: Replace `src/pages/index.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import Entry from '../components/Entry.astro';
import Hero from '../components/Hero.astro';
import ProjectCard from '../components/ProjectCard.astro';
import Section from '../components/Section.astro';
import Skills from '../components/Skills.astro';
import { renderInline } from '../lib/inline';
import { getEducation, getExperience, getProfile, getProjects, getSkills } from '../lib/content';

const [profile, skills, experience, projects, education] = await Promise.all([
  getProfile(),
  getSkills(),
  getExperience(),
  getProjects(),
  getEducation(),
]);
---

<Base home>
  <Hero profile={profile} />

  <Section id="about" title="about">
    <p class="max-w-3xl text-lg leading-relaxed text-muted" set:html={renderInline(profile.about)} />
  </Section>

  <Section id="skills" title="skills">
    <Skills groups={skills} />
  </Section>

  <Section id="work" title="experience">
    <div class="space-y-10">
      {
        experience.map(({ data }) => (
          <Entry title={data.title} period={data.period} org={data.org} bullets={data.bullets} />
        ))
      }
    </div>
  </Section>

  <Section id="projects" title="projects">
    <div class="grid gap-5 sm:grid-cols-2">
      {projects.map(({ data }) => <ProjectCard project={data} />)}
    </div>
  </Section>

  <Section id="education" title="education">
    <div class="space-y-10">
      {
        education.map(({ data }) => (
          <Entry title={data.title} period={data.period} org={data.org} bullets={data.bullets} />
        ))
      }
    </div>
  </Section>
</Base>
```

- [ ] **Step 7: Build and compare against the old page**

Run `pnpm build` — expected: 0 check errors, `dist/index.html` written.

Save this comparison script to `$SCRATCH/compare.mjs`:
```js
// usage: node compare.mjs old.html new.html
import { readFileSync } from 'node:fs';

const [oldHtml, newHtml] = process.argv.slice(2).map((p) => readFileSync(p, 'utf8'));

const decode = (s) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
   .replace(/&#39;|&#x27;/g, "'").replace(/&amp;/g, '&');
const head = (h) => h.match(/<head[^>]*>([\s\S]*?)<\/head>/)[1];
const body = (h) => h.match(/<body[^>]*>([\s\S]*?)<\/body>/)[1];
const text = (h) =>
  decode(
    body(h)
      .replace(/<svg[\s\S]*?<\/svg>/g, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ').trim();
const attr = (h, name) =>
  [...h.matchAll(new RegExp(`\\s${name}="([^"]*)"`, 'g'))].map((m) => decode(m[1])).sort();
const title = (h) => decode(h.match(/<title>([^<]*)<\/title>/)[1]);

let failed = false;
const check = (label, a, b) => {
  if (JSON.stringify(a) === JSON.stringify(b)) return console.log(`ok    ${label}`);
  failed = true;
  if (typeof a === 'string') {
    let i = 0;
    while (a[i] === b[i]) i++;
    const around = (s) => s.slice(Math.max(0, i - 60), i + 60);
    console.log(`FAIL  ${label} at char ${i}\n  old: …${around(a)}…\n  new: …${around(b)}…`);
  } else {
    const missing = a.filter((v) => !b.includes(v));
    const extra = b.filter((v) => !a.includes(v));
    console.log(`FAIL  ${label}\n  missing: ${JSON.stringify(missing)}\n  extra:   ${JSON.stringify(extra)}`);
  }
};

check('title', title(oldHtml), title(newHtml));
check('meta content', attr(head(oldHtml), 'content'), attr(head(newHtml), 'content'));
check('visible text', text(oldHtml), text(newHtml));
check('body hrefs', attr(body(oldHtml), 'href'), attr(body(newHtml), 'href'));
check('body ids', attr(body(oldHtml), 'id'), attr(body(newHtml), 'id'));
check('aria-labels', attr(body(oldHtml), 'aria-label'), attr(body(newHtml), 'aria-label'));
check('svg path data', attr(body(oldHtml), 'd'), attr(body(newHtml), 'd'));
check('targets', attr(body(oldHtml), 'target'), attr(body(newHtml), 'target'));
process.exit(failed ? 1 : 0);
```

Run:
```bash
git show main:index.html > "$SCRATCH/old.html"
node "$SCRATCH/compare.mjs" "$SCRATCH/old.html" dist/index.html
```
Expected: all 8 lines `ok`, exit 0. Fix any `FAIL` in the YAML/components (never by editing the old file) and re-run until clean.

- [ ] **Step 8: Commit**

```bash
git add src
git commit -m "feat: render home page from content collections

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Case-study route

**Files:**
- Create: `src/pages/projects/[id].astro`
- Modify: `src/styles/global.css` (append `.case-body` rules inside `@layer components`)

**Interfaces:**
- Consumes: `Base.astro` (`title` prop), `ProjectCard.astro`, collection `caseStudies` (`data.project: { collection: 'projects'; id: string }`, `data.title?: string`).
- Produces: static route `/portfolio/projects/<project-id>/` per case-study file.

- [ ] **Step 1: Create `src/pages/projects/[id].astro`**

```astro
---
import { getCollection, getEntry, render, type CollectionEntry } from 'astro:content';
import Base from '../../layouts/Base.astro';
import ProjectCard from '../../components/ProjectCard.astro';

export async function getStaticPaths() {
  const studies = await getCollection('caseStudies');
  const seen = new Map<string, string>();
  for (const study of studies) {
    const projectId = study.data.project.id;
    const other = seen.get(projectId);
    if (other) {
      throw new Error(
        `Case studies "${other}" and "${study.id}" both reference project "${projectId}"; keep one.`,
      );
    }
    seen.set(projectId, study.id);
  }
  return studies.map((study) => ({ params: { id: study.data.project.id }, props: { study } }));
}

interface Props {
  study: CollectionEntry<'caseStudies'>;
}
const { study } = Astro.props;

const project = await getEntry(study.data.project);
if (!project) {
  throw new Error(
    `Case study "${study.id}" references unknown project "${study.data.project.id}"; add it to src/content/projects.yaml or fix the id.`,
  );
}
const { Content } = await render(study);
---

<Base title={study.data.title ?? project.data.name}>
  <article class="wrap py-12 sm:py-16">
    <ProjectCard project={project.data} />
    <div class="case-body mt-10">
      <Content />
    </div>
  </article>
</Base>
```

- [ ] **Step 2: Add minimal Markdown styles to `src/styles/global.css`** (inside `@layer components`, after the `.bullets > li::before` rule)

```css
  /* Rendered Markdown on case-study pages (preflight strips defaults) */
  .case-body {
    @apply max-w-3xl space-y-5 leading-relaxed text-muted;
  }
  .case-body h2 {
    @apply pt-4 font-mono text-sm font-medium tracking-widest text-accent;
  }
  .case-body h3 {
    @apply pt-2 text-lg font-semibold text-text;
  }
  .case-body a {
    @apply text-accent underline underline-offset-4;
  }
  .case-body ul {
    @apply list-disc space-y-2 pl-5;
  }
  .case-body ol {
    @apply list-decimal space-y-2 pl-5;
  }
  .case-body code {
    @apply rounded bg-surface-2 px-1.5 py-0.5 font-mono text-sm text-text;
  }
  .case-body pre {
    @apply overflow-x-auto rounded-xl border border-line bg-surface p-4;
  }
  .case-body pre code {
    @apply bg-transparent p-0;
  }
```

- [ ] **Step 3: Build with a throwaway case study**

```bash
cat > src/content/case-studies/mangahub.md <<'EOF'
---
project: mangahub
---

## Problem

Throwaway case study to verify the route. Includes `inline code` and a [link](https://github.com/tnphucccc/mangahub).

- one
- two
EOF
pnpm build
grep -o '<title>[^<]*</title>' dist/projects/mangahub/index.html
```
Expected: build succeeds; prints `<title>MangaHub — Phuc Tran Nguyen</title>`.

- [ ] **Step 4: Check nav links from the case-study page (Review Focus 5)**

```bash
grep -o 'href="[^"]*#about"' dist/projects/mangahub/index.html
grep -o 'href="[^"]*#about"' dist/index.html
```
Expected: first prints `href="/portfolio/#about"`; second prints `href="#about"`. Then run `pnpm preview`, open `http://localhost:4321/portfolio/projects/mangahub/`, click "about" in the header, and confirm it lands on the home page's About section. Stop the preview server.

- [ ] **Step 5: Unknown project fails the build (Review Focus 3)**

```bash
sed -i 's/^project: mangahub$/project: no-such-project/' src/content/case-studies/mangahub.md
pnpm build; echo "exit=$?"
sed -i 's/^project: no-such-project$/project: mangahub/' src/content/case-studies/mangahub.md
```
Expected: non-zero exit and an error mentioning `no-such-project` (either Astro's reference validation or the page's "references unknown project" error).

- [ ] **Step 6: Duplicate project reference fails the build (Review Focus 4)**

```bash
cp src/content/case-studies/mangahub.md src/content/case-studies/mangahub-2.md
pnpm build; echo "exit=$?"
```
Expected: non-zero exit, error `Case studies "…" and "…" both reference project "mangahub"; keep one.`

- [ ] **Step 7: Remove throwaway files, rebuild, commit**

```bash
rm src/content/case-studies/mangahub.md src/content/case-studies/mangahub-2.md
pnpm build && pnpm test
test ! -e dist/projects && echo "no case-study pages"
git add src
git commit -m "feat: add per-project case-study route

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
Expected: build and tests pass; prints `no case-study pages`.

---

### Task 6: Visual comparison with the live site

**Files:**
- Modify (only if a difference is found): `src/styles/global.css` or the relevant component

**Interfaces:**
- Consumes: built site from Tasks 1–5; live reference `https://tnphucccc.github.io/portfolio/`.

- [ ] **Step 1: Serve the build**

Run `pnpm build && pnpm preview` in the background; confirm `http://localhost:4321/portfolio/` responds 200.

- [ ] **Step 2: Capture four full-page screenshots**

With the chrome-devtools MCP tools (`new_page`, `resize_page`, `take_screenshot` with `fullPage: true`), save to `$SCRATCH`:
- `live-1280.png` — live URL at 1280×900
- `new-1280.png` — preview URL at 1280×900
- `live-375.png` — live URL at 375×812
- `new-375.png` — preview URL at 375×812

Before each capture, `wait_for` the text "Phuc Tran Nguyen", then `evaluate_script` `async () => { await document.fonts.ready; }`.

- [ ] **Step 3: Compare side by side**

View each pair. Check in order: fonts, colors, section spacing, tag pill corners, card borders, bullet markers, header blur/border, footer layout, nav hidden at 375px.
Then check interactively on the preview: press Tab once → "Skip to content" appears top-left in accent on a surface background; hover a project card → border turns accent; hover a nav link → accent.

- [ ] **Step 4: Fix differences**

For each difference, change the smallest thing that restores the live look, rebuild, and re-capture that pair. Record every difference found and its fix (or why it is acceptable) for the final report.

- [ ] **Step 5: Commit (only if files changed)**

```bash
git add src
git commit -m "fix: match live site rendering after Tailwind v4 port

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Deploy workflow, cleanup, docs, handoff

**Files:**
- Create: `.github/workflows/deploy.yml`
- Delete: `index.html`, `style.css`
- Replace: `README.md`

- [ ] **Step 1: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v7
      - name: Install, build, and upload
        uses: withastro/action@v6

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v5
```

- [ ] **Step 2: Delete the old page and replace `README.md`**

```bash
git rm -q index.html style.css
```

`README.md`:
````markdown
# portfolio

Personal portfolio for **Phuc Tran Nguyen**, live at
<https://tnphucccc.github.io/portfolio/>.

## Stack

- [Astro](https://astro.build/) 7 — static output
- [Tailwind CSS](https://tailwindcss.com/) v4 via `@tailwindcss/vite`
- Inter + JetBrains Mono from Google Fonts

## Develop

```bash
pnpm install
pnpm dev        # http://localhost:4321/portfolio/
pnpm test       # unit tests
pnpm build      # type-check + build to dist/
pnpm preview    # serve dist/
```

## Editing content

All text lives in `src/content/` and is validated on build:

| File | Section |
|---|---|
| `profile.yaml` | name, tagline, about, contacts, footer links, meta tags |
| `skills.yaml` | skill groups (sorted by `order`) |
| `experience.yaml` | jobs (sorted by `start`, `YYYY-MM`, newest first) |
| `education.yaml` | education (sorted by `order`) |
| `projects.yaml` | project cards (sorted by `order`) |

Wrap text in `**double asterisks**` to highlight it in the accent color
(supported in `tagline`, `about`, and bullets). Use `>-` block scalars for
long strings, and never start a plain YAML value with `*`.

## Case studies

Add `src/content/case-studies/<anything>.md`:

```markdown
---
project: mangahub   # an id from projects.yaml
title: Optional page title
---

Markdown body…
```

It is published at `/portfolio/projects/<project id>/`. An unknown project
id, or two case studies for the same project, fails the build.

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds with
`withastro/action` and deploys to GitHub Pages (repo Settings → Pages →
Source: GitHub Actions).
````

- [ ] **Step 3: Final verification**

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm build
node "$SCRATCH/compare.mjs" "$SCRATCH/old.html" dist/index.html
git status --short
```
Expected: tests pass, 0 check errors, all comparison lines `ok`; `git status` lists only this task's files.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "ci: deploy with GitHub Actions; remove static page; update README

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Hand off — ask before anything outward-facing**

Report results (tests, check, comparison, screenshot findings) and ask the user to approve, in this order:
1. Push `astro-migration` and open a PR.
2. Switch the Pages source to GitHub Actions: `gh api -X PUT repos/tnphucccc/portfolio/pages -f build_type=workflow`. This must happen **before** merging — otherwise the legacy branch build would publish `main` without an `index.html`. The current deployment keeps serving until the next workflow deploy.
3. Merge; watch the `Deploy to GitHub Pages` run; confirm the live URL renders and matches `new-1280.png`.

Rollback if the deploy looks wrong: revert the merge commit on `main`, then `gh api -X PUT repos/tnphucccc/portfolio/pages -f build_type=legacy -f 'source[branch]=main' -f 'source[path]=/'`.
