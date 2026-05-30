# portfolio

Personal portfolio for **Phuc Tran Nguyen** — a single-page, statically-served
résumé site.

## Stack

- Plain HTML (`index.html`)
- [Tailwind CSS](https://tailwindcss.com/) v3 — compiled from `src/input.css` to
  `style.css`
- Self-hosted Google Fonts (Inter + JetBrains Mono), no other runtime
  dependencies

## Develop

Install once, then rebuild the stylesheet on change:

```bash
npm install
npm run dev      # watch + rebuild style.css
```

To preview, open `index.html` in a browser (no server required).

## Build

```bash
npm run build    # writes a minified style.css
```

Commit the generated `style.css` so the site works on GitHub Pages without a
build step.
