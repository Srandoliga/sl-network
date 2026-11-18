// Plánované vydání: po produkčním buildu zapíše dist/publikovano.json –
// commit, čas buildu a ID článků, které build skutečně obsahuje. Zároveň ověří, že mezi nimi není
// koncept ani článek s budoucím datem (jinak build selže). Redakční build manifest nezapisuje.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildManifest, leakedArticles, parseFrontmatter } from './lib/release.mjs';

if (process.env.REDAKCE === '1') process.exit(0);
const root = process.cwd();
const clanky = join(root, 'dist/clanky');
if (!existsSync(clanky)) { console.error('❌ dist/clanky neexistuje – nejdřív npm run build.'); process.exit(1); }
// Redakční build (koncepty, šablony, interní stránky) se nikdy nezveřejňuje – manifest z něj nevzniká.
if (existsSync(join(root, 'dist/sablony')) || existsSync(join(root, 'dist/interni'))) { console.error('❌ dist/ je redakční build – manifest se nezapisuje. Spusťte npm run build.'); process.exit(1); }
const articleDirs = readdirSync(clanky, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
const manifest = buildManifest({ commit: process.env.GITHUB_SHA ?? 'lokalni', builtAt: new Date(), articleDirs });
const src = join(root, 'src/content/articles');
const articles = readdirSync(src).filter((f) => f.endsWith('.md')).map((f) => parseFrontmatter(readFileSync(join(src, f), 'utf8'), f.replace(/\.md$/, '')));
const leaked = leakedArticles(manifest, articles);
if (leaked.length) { console.error(`❌ Build obsahuje koncept nebo budoucí článek: ${leaked.join(', ')}`); process.exit(1); }
writeFileSync(join(root, 'dist/publikovano.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`✅ Manifest: ${manifest.articles.length} publikovaných článků (dist/publikovano.json).`);
