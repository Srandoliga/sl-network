// @ts-check
import { defineConfig } from 'astro/config';

// Adresa webu a base path. Na GitHub Pages je dodá workflow (actions/configure-pages).
// Lokálně se záměrně používá stejná base path jako na GitHubu, aby build ověřoval odkazy.
const site = process.env.SITE_URL || 'https://example.github.io';
const base = process.env.BASE_PATH || '/sl-network';

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  build: { format: 'directory' },
  devToolbar: { enabled: false },
});
