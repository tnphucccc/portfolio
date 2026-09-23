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
pnpm build      # unit tests + type-check + build to dist/
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

## Link preview image

`public/og.png` (the 1200×630 image shown when the site is shared on LinkedIn,
Slack, X…) is rendered from `scripts/og-card.html`. After changing your name,
role, or tagline, edit that file too and regenerate:

```bash
npx playwright install chromium   # once
npx playwright screenshot --viewport-size=1200,630 --wait-for-timeout=1500 \
  "file://$PWD/scripts/og-card.html" public/og.png
```

`public/favicon.svg` is the site icon; `public/apple-touch-icon.png` is the same
icon at 180×180 on the page background.

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds with
`withastro/action` and deploys to GitHub Pages (repo Settings → Pages →
Source: GitHub Actions).
