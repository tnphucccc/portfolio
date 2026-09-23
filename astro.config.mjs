// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://tnphucccc.github.io',
  base: '/portfolio',
  integrations: [
    // With a base path the sitemap lists the home page as both /portfolio and
    // /portfolio/; every real page ends in a slash, so keep only those.
    sitemap({ filter: (page) => page.endsWith('/') }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
