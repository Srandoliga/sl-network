// Kontrola sestaveného webu (dist/): base path, funkční interní odkazy, noindex a Open Graph na každé stránce.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { checkPage, pageIds } from './lib/check-html.mjs';

const dist = new URL('../dist/', import.meta.url).pathname;
const base = (process.env.BASE_PATH || '/sl-network').replace(/\/$/, '') || '/';
const origin = new URL(process.env.SITE_URL || 'https://srandoliga.github.io').origin;

const walk = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? walk(path) : [path];
});

const htmlFiles = walk(dist).filter((f) => f.endsWith('.html'));
const exists = (p) => existsSync(join(dist, p));
const idCache = new Map();
const idsOf = (p) => {
  if (!idCache.has(p)) idCache.set(p, exists(p) ? pageIds(readFileSync(join(dist, p), 'utf8')) : new Set());
  return idCache.get(p);
};
const errors = htmlFiles.flatMap((file) => checkPage({
  file: relative(dist, file), html: readFileSync(file, 'utf8'), base, origin, exists, idsOf,
}));
if (!exists('robots.txt')) errors.push('chybí robots.txt');
// Pojistka: veřejný build nesmí obsahovat redakční části (koncepty, šablony, upoutávky, odkazy na ně).
if (process.env.REDAKCE !== '1') {
  const editorial = /notice--draft|tag--draft|data-copy-teaser|editorial-bar|\/sablony\/|\/interni\//;
  htmlFiles
    .filter((file) => editorial.test(readFileSync(file, 'utf8')))
    .forEach((file) => errors.push(`${relative(dist, file)}: obsahuje redakční část, ale build není v redakčním režimu (REDAKCE=1)`));
  if (exists('sablony/index.html')) errors.push('veřejný build obsahuje šablony pro Messenger');
  if (exists('interni')) errors.push('veřejný build obsahuje interní redakční přehledy');
}

if (errors.length) {
  errors.forEach((e) => console.error(`❌ ${e}`));
  console.error(`\nKontrola buildu selhala (${errors.length} chyb).`);
  process.exit(1);
}
console.log(`✅ Build v pořádku: ${htmlFiles.length} stránek, base path „${base}“, odkazy i kotvy funkční, noindex všude.`);
