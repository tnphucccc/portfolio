# Astro migration — design

Date: 2026-09-23
Status: approved in conversation, pending spec review

## Goal

Move the portfolio from a single hand-written `index.html` (Tailwind v3,
committed `style.css`) to Astro, so that:

1. content lives in validated data files instead of markup, and a future
   Typst PDF résumé can read the same files;
2. any project can gain a case-study page by adding one Markdown file.

## Non-goals

- No content changes. Every visible string, link, and section stays as it is
  today (positioning, new projects, and removing the phone number are a later,
  separate change).
- No visual redesign.
- No PDF résumé yet — only a data shape that makes it straightforward.
- No URL change: the site stays at `https://tnphucccc.github.io/portfolio/`.

## Success criteria

- The built home page is visually identical to the live site at 1280px and
  375px widths (side-by-side screenshots), including the sticky header, skip
  link, and hover/focus states.
- All nav anchors, external links, `mailto:`/`tel:` links, and meta/OG tags
  match the current page.
- `astro check` and `astro build` pass with zero errors.
- Adding `src/content/case-studies/<project-id>.md` produces
  `/portfolio/projects/<project-id>/` with no other code changes; an unknown
  project id fails the build.
- Pushing to `main` deploys via GitHub Actions.

## Stack

- Astro 7 (static output), pnpm, Node 24.
- Tailwind CSS v4 via `@tailwindcss/vite` (the `@astrojs/tailwind` integration
  is no longer the recommended path).
- Vitest for the one unit-tested module (`inline.ts`).

## Structure

```
astro.config.mjs          site: https://tnphucccc.github.io, base: /portfolio
src/
  content.config.ts       collection definitions + Zod schemas
  content/
    profile.yaml          single entry, id "me"
    skills.yaml
    experience.yaml
    education.yaml
    projects.yaml
    case-studies/         <project-id>.md (initially empty)
  lib/inline.ts           inline highlight renderer
  styles/global.css       Tailwind v4 entry, @theme tokens, component classes
  layouts/Base.astro      <html>/<head>, meta + OG, fonts, skip link,
                          icon sprite, header nav, footer
  components/
    Icon.astro            <svg><use href="#i-…"/></svg>
    Section.astro         section wrapper with "// title" heading + anchor id
    Hero.astro
    Skills.astro
    Entry.astro           title/period/org/bullets — shared by experience
                          and education
    ProjectCard.astro
  pages/
    index.astro           composes sections from collections
    projects/[id].astro   one page per case study
.github/workflows/deploy.yml
```

Removed: `index.html`, `style.css`, `tailwind.config.js`, `src/input.css`.

## Data model

All collections use Astro's `file()` loader over YAML, except case studies
(`glob()` over Markdown). Schemas (Zod, abbreviated):

- **profile** (one entry, `me`): `name`, `role` ("Software Engineer"; the
  hero label renders it lowercased as `// software engineer`, the `<title>`
  and footer use it as-is), `tagline` (inline-markup string), `location`,
  `about` (inline-markup string), `meta.description`, `meta.ogDescription`,
  `contacts[]` of `{ kind: email|phone|linkedin|github, label, href }` (hero
  list, in order), `footerLinks[]` of `{ label, href }` (footer list, which
  today has different labels, order, and no phone — kept explicit rather than
  derived).
- **skills**: `id`, `label`, `items: string[]`, `order`.
- **experience**: `id`, `title`, `org` (the accent line, e.g.
  "Metacraft Studio · Under Realm TCG · Ho Chi Minh City"), `period` (display
  string, e.g. "Sep – Dec 2024"), `start` (`YYYY-MM`, used only for sorting,
  newest first), `bullets: string[]` (inline markup).
- **education**: same shape as experience.
- **projects**: `id`, `name`, `summary`, `tags: string[]`, `repo` (URL),
  `badge?` (string), `order`.
- **caseStudies**: frontmatter `project: reference('projects')`, optional
  `title`; body is Markdown.

Collections are sorted explicitly (`order` or `start`); nothing relies on
file order.

### Inline markup

Strings marked "inline markup" may contain `**text**`. `inline.ts` exports
`renderInline(s: string): string`, which HTML-escapes the whole string and
then turns `**text**` into `<span class="hl">text</span>`. Components output
it with `set:html`. Escaping first means content can never inject markup.
The future PDF can map the same `**text**` to bold.

The current page's `&amp;` entities become plain `&` in YAML and are escaped
on output.

## Routing and links

- `base: '/portfolio'`. Internal links use `import.meta.env.BASE_URL`, so the
  header nav (`#about`, `#skills`, …) points to `<base>/#about` and works from
  case-study pages.
- `projects/[id].astro` uses `getStaticPaths()` over `caseStudies`, resolves
  the referenced project, and renders the project header (name, badge, tags,
  repo link) above the Markdown body inside `Base.astro`. The project cards
  on the home page are not linked to case studies in this change — linking
  them comes with the first real case study.

## Styling

- `tailwind.config.js` theme → `@theme` in `global.css`: `--color-bg`,
  `--color-surface`, `--color-surface-2`, `--color-line`, `--color-text`,
  `--color-muted`, `--color-accent`, `--font-sans`, `--font-mono`,
  `--container-content: 920px` (keeps `max-w-content` working).
- The `@layer base` rules and all component classes (`.wrap`,
  `.section-title`, `.hl`, `.tag`, `.card`, `.badge`, `.skill-label`,
  `.nav-link`, `.contact-link`, `.ico`, `.bullets`) are ported verbatim.
- Known v4 default change: the default border color is `currentColor`. Every
  border on the site sets `border-line` explicitly, so no visual change is
  expected; the screenshot comparison confirms it.
- Google Fonts `<link>` tags stay as-is. The README's "self-hosted" claim is
  corrected.

## Deployment

- `.github/workflows/deploy.yml`: `withastro/action` build + upload, then
  `actions/deploy-pages`, on push to `main` and manual dispatch.
- The repo's Pages source must switch from "Deploy from a branch" to "GitHub
  Actions". This changes the live site, so it is done only with explicit
  approval, at merge time.
- Work happens on branch `astro-migration`.

## Verification

1. `inline.ts` unit tests, written first: plain text passes through; `**x**`
   highlights; multiple highlights in one string; `<`, `>`, `&`, `"` are
   escaped, including inside highlights; unmatched `**` stays literal.
2. `pnpm astro check` and `pnpm build` succeed.
3. Screenshots of the live site vs. `pnpm preview` at 1280px and 375px,
   compared side by side; any difference is fixed or explained.
4. Links check on the built HTML: every `href` from the old page appears in
   the new one, and all section anchors resolve.
5. A throwaway `case-studies/mangahub.md` builds to
   `/portfolio/projects/mangahub/` and renders; a bad `project:` id fails the
   build. The throwaway file is deleted afterwards.
