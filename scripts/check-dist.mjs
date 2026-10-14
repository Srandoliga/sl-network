// Kontrola sestaveného webu (dist/): base path, funkční interní odkazy, noindex a Open Graph na každé stránce.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { checkPage } from './lib/check-html.mjs';

const dist = new URL('../dist/', import.meta.url).pathname;
const base = (process.env.BASE_PATH || '/sl-network').replace(/\/$/, '') || '/';
const origin = new URL(process.env.SITE_URL || 'https://example.github.io').origin;

const walk = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? walk(path) : [path];
});

const htmlFiles = walk(dist).filter((f) => f.endsWith('.html'));
const exists = (p) => existsSync(join(dist, p));
const errors = htmlFiles.flatMap((file) => checkPage({
  file: relative(dist, file), html: readFileSync(file, 'utf8'), base, origin, exists,
}));
if (!exists('robots.txt')) errors.push('chybí robots.txt');
// Pojistka: koncepty (draft: true) se do veřejného buildu nesmí dostat.
if (process.env.SHOW_DRAFTS !== '1') {
  htmlFiles
    .filter((file) => /notice--draft|tag--draft/.test(readFileSync(file, 'utf8')))
    .forEach((file) => errors.push(`${relative(dist, file)}: obsahuje koncept, ale build není s SHOW_DRAFTS=1`));
}

if (errors.length) {
  errors.forEach((e) => console.error(`❌ ${e}`));
  console.error(`\nKontrola buildu selhala (${errors.length} chyb).`);
  process.exit(1);
}
console.log(`✅ Build v pořádku: ${htmlFiles.length} stránek, base path „${base}“, odkazy funkční, noindex všude.`);
