# Astro migration — design

Date: 2026-09-23
Status: approved; revised after ECC architect + planner review

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
- No PDF résumé yet — only a data shape that makes it straightforward. (When
  it comes, it must map `**x**` to bold with a regex and never evaluate
  content strings as Typst markup: `#`, `$`, `@`, `<` would break it.)
- No URL change: the site stays at `https://tnphucccc.github.io/portfolio/`.
- No new head tags. `og:url`, `og:image`, and `<link rel="canonical">` are not
  on the current page and are deliberately left out.

## Success criteria

- The built home page is visually identical to the live site at 1280px and
  375px widths (side-by-side screenshots), including the sticky header, skip
  link, and hover/focus states.
- All nav anchors, external links, `mailto:`/`tel:` links, classes, ARIA
  attributes, and meta/OG tags match the current page.
- `pnpm build` (unit tests, `astro check`, `astro build`) passes with zero
  errors.
- A malformed or id-less YAML entry fails `pnpm build`.
- Adding `src/content/case-studies/<file>.md` with `project: <project-id>`
  produces `/portfolio/projects/<project-id>/` with no other code changes; an
  unknown project id, or two case studies for the same project, fails the
  build.
- Pushing to `main` deploys via GitHub Actions.

## Stack

- Astro 7 (static output), Node ≥ 22.12 (24 locally and in CI).
- pnpm, pinned via `"packageManager": "pnpm@11.22.0"` so CI and local agree;
  `pnpm-lock.yaml` is committed.
- Tailwind CSS v4 via `@tailwindcss/vite` (the `@astrojs/tailwind` integration
  is no longer the recommended path).
- `@astrojs/check` + `typescript@^6` (`@astrojs/check` does not support TS 7).
- Vitest for unit tests; `js-yaml` ^4 (the parser Astro itself uses) for the
  content guard test.
- `.astro/` is git-ignored.

## Structure

```
astro.config.mjs          site: https://tnphucccc.github.io, base: /portfolio
src/
  content.config.ts       collection definitions + Zod schemas
  content/
    profile.yaml          single entry (array item with id: me)
    skills.yaml
    experience.yaml
    education.yaml
    projects.yaml
    case-studies/         <file>.md (initially empty; .gitkeep keeps the dir)
  lib/inline.ts           inline highlight renderer
  lib/url.ts              withBase(), isExternal()
  lib/content.ts          collection getters: explicit sort, throw on empty
  styles/global.css       Tailwind v4 entry, @theme tokens, component classes
  layouts/Base.astro      <html>/<head>, meta + OG, fonts, skip link,
                          icon sprite, header nav, <main id="main">, footer
  components/
    Icon.astro            <svg class="ico"><use href="#i-…"/></svg>
    Section.astro         takes id + title separately (id "work" has the
                          heading "// experience"); emits the current
                          wrapper classes and aria-labelledby="<id>-title"
    Hero.astro
    Skills.astro
    Entry.astro           title/period/org/bullets — shared by experience
                          and education
    ProjectCard.astro
  pages/
    index.astro           composes sections from collections
    projects/[id].astro   one page per case study
tests/                    inline, url, and content-guard unit tests
.github/workflows/deploy.yml
```

Removed: `index.html`, `style.css`, `tailwind.config.js`, `src/input.css`.

## Data model

All collections use Astro's `file()` loader over YAML, except case studies
(`glob()` over Markdown). Each YAML file is an array of objects with an `id`.
Schemas (Zod, abbreviated):

- **profile** (one entry, `id: me`): `name`, `role` ("Software Engineer"; the
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
  string, e.g. "Sep – Dec 2024"), `start` (quoted `'YYYY-MM'` string, regex-
  validated, used only for sorting, newest first), `bullets: string[]`
  (inline markup).
- **education**: `id`, `title`, `org`, `period`, `bullets` like experience,
  but `order` instead of `start` — the start date is not on the current site
  and must not be invented.
- **projects**: `id` (lowercase kebab-case), `name`, `summary`,
  `tags: string[]`, `repo` (`https://` URL only), `badge?` (string), `order`.
- **caseStudies**: frontmatter `project: reference('projects')`, optional
  `title`; body is Markdown. The route comes from `project`, not the file
  name.

Every `href` must start with `https://`, `mailto:`, or `tel:` (a scheme-less
value would become a broken relative link under `/portfolio/`).

Collections are sorted explicitly (`order` or `start`); nothing relies on
file order.

### YAML rules

- Prose strings use `>-` block scalars or are otherwise safe plain scalars.
  A plain value starting with `*` is a YAML alias, and one containing `: `
  (e.g. "Thesis: …") is a mapping.
- Astro's `file()` loader only *logs* a YAML parse error, a missing file, or
  an item without an `id`, and the build still succeeds (verified in
  `astro@7.3.4` `dist/content/loaders/file.js`). Therefore:
  - a unit test parses every `src/content/*.yaml` with `js-yaml` and asserts
    a non-empty array whose items all have unique string `id`s;
  - `pnpm build` runs the unit tests first, so CI fails too;
  - the collection getters in `lib/content.ts` throw on an empty collection.

### Inline markup

Strings marked "inline markup" may contain `**text**`. `inline.ts` exports
`renderInline(s: string): string`, which HTML-escapes the whole string and
then turns `**text**` into `<span class="hl">text</span>`. Components output
it with `set:html`. Escaping first means content can never inject markup.

The current page's `&amp;` entities become plain `&` in YAML and are escaped
on output.

## Links and icons

- http(s) links get `target="_blank" rel="noopener"`; `mailto:` and `tel:`
  links get neither (matches the current page).
- The project repo icon link has `aria-label="<name> on GitHub"`.
- Contact kinds map to sprite symbols explicitly: email → `i-mail`,
  phone → `i-phone`, linkedin → `i-linkedin`, github → `i-github`.

## Routing

- `base: '/portfolio'`. `Base.astro` takes a `home` flag:
  - on the home page, the logo (`#top`) and nav (`#about`, …) stay bare
    same-page hashes, exactly as today;
  - on other pages they become `/portfolio/#top`, `/portfolio/#about`, …
    (`withBase()` normalises the slash, so they never become
    `/portfolio#about`).
  - The skip link is always `#main`; `Base.astro` always renders
    `<main id="main">`.
- `projects/[id].astro` uses `getStaticPaths()` over `caseStudies`, routes by
  the referenced project id, and:
  - throws if two case studies reference the same project;
  - throws, naming the file, if the referenced project does not exist
    (`getEntry` alone returns `undefined` and would not fail the build).
- A case-study page renders the project's card (name, badge, summary, tags,
  repo link) above the Markdown body. Its `<title>` and `og:title` are
  `<case-study title or project name> — <name>`; description tags reuse the
  profile's.
- The project cards on the home page are not linked to case studies in this
  change — linking them comes with the first real case study.

## Styling

- `tailwind.config.js` theme → `@theme` in `global.css`: `--color-bg`,
  `--color-surface`, `--color-surface-2`, `--color-line`, `--color-text`,
  `--color-muted`, `--color-accent`, `--font-sans`, `--font-mono`,
  `--container-content: 920px` (keeps `max-w-content` working).
- The `@layer base` rules and all component classes (`.wrap`,
  `.section-title`, `.hl`, `.tag`, `.card`, `.badge`, `.skill-label`,
  `.nav-link`, `.contact-link`, `.ico`, `.bullets`) are ported verbatim.
- `@source not "../../docs"` so class names in the docs don't bloat the CSS.
- A small `.case-body` block styles rendered Markdown (headings, lists, links,
  code), since preflight strips browser defaults.
- Tailwind v3 → v4 differences, expected to be invisible here and confirmed by
  the screenshot comparison:
  - default border color is `currentColor` — every border sets `border-line`;
  - bare `rounded` and `backdrop-blur` still work with their v3 values (only
    the `-sm` variants changed meaning), so they are **not** renamed;
  - `space-y-*` uses bottom margins on all-but-last children instead of top
    margins on all-but-first;
  - `hover:` only applies on devices that support hover.
- Google Fonts `<link>` tags stay as-is. The README (which also still
  documents npm commands) is rewritten, including correcting its
  "self-hosted fonts" claim.

## Deployment

- `.github/workflows/deploy.yml`: `withastro/action` (Node 24) build + upload,
  then `actions/deploy-pages`, on push to `main` and manual dispatch;
  `permissions: contents: read, pages: write, id-token: write`; a `pages`
  concurrency group.
- Work happens on branch `astro-migration`. There is no pre-merge test
  deploy (the `github-pages` environment only accepts `main`).
- Cutover, each step only with the user's explicit approval:
  1. push the branch and open a PR;
  2. switch the Pages source to "GitHub Actions" — **before** merging, or the
     legacy branch build would publish `main` without an `index.html`
     (the current deployment keeps serving until the next deploy);
  3. merge, watch the first run, check the live site.
- Rollback: revert the merge on `main`, then switch the Pages source back to
  "Deploy from a branch" (`main`, `/`).

## Verification

1. Unit tests, written first: `inline.ts` (plain text; `**x**`; several
   highlights; `<`, `>`, `&`, `"`, `'` escaped, including inside highlights;
   unmatched `**` stays literal), `url.ts`, and the YAML content guard.
2. `pnpm build` succeeds (tests + `astro check` + `astro build`).
3. Negative checks: a YAML value starting with `**` and a scheme-less `href`
   each make `pnpm build` fail; both are reverted.
4. Screenshots of the live site vs. `pnpm preview` at 1280px and 375px,
   compared side by side; any difference is fixed or explained.
5. Comparison of the old and new HTML: title, meta values, visible text
   (inline tags removed so a missing space shows up), and the multisets of
   body `href`, `id`, `class`, `rel`, `target`, `aria-label`,
   `aria-labelledby`, SVG path data, head link `href`s (minus stylesheets),
   OG `property`, and `<html lang>`.
6. A throwaway `case-studies/mangahub.md` builds to
   `/portfolio/projects/mangahub/`, its nav links point to
   `/portfolio/#…`; a bad `project:` id and a duplicate case study each fail
   the build. The throwaway files are deleted afterwards.
