// Plánované vydání: má plánovaný běh nasadit web?
// Čte hlavičky článků na `main` a manifest posledního úspěšného nasazení z živého webu.
// Výstup pro GitHub Actions: `deploy=true|false` (GITHUB_OUTPUT) a přehled do souhrnu běhu (GITHUB_STEP_SUMMARY).
// Použití: MANIFEST_URL=https://…/sl-network/publikovano.json node scripts/release-check.mjs
import { readdirSync, readFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseFrontmatter, releaseDecision } from './lib/release.mjs';

const dir = join(process.cwd(), 'src/content/articles');
const articles = readdirSync(dir).filter((f) => f.endsWith('.md'))
  .map((f) => parseFrontmatter(readFileSync(join(dir, f), 'utf8'), f.replace(/\.md$/, '')));

async function loadManifest(url) {
  try {
    const res = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return { manifest: null, note: `manifest HTTP ${res.status}` };
    // Poškozený JSON skončí výjimkou → null; obsah dál kontroluje validManifest.
    return { manifest: await res.json(), note: 'manifest načten' };
  } catch (err) {
    return { manifest: null, note: `manifest nedostupný: ${err.message}` };
  }
}

const url = process.env.MANIFEST_URL;
if (!url) { console.error('Chybí MANIFEST_URL.'); process.exit(1); }
const now = new Date();
const { manifest, note } = await loadManifest(url);
const d = releaseDecision({ articles, manifest, now, headCommit: process.env.GITHUB_SHA });
const fmt = (x) => new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Prague' }).format(x);

const lines = [
  `### Plánované vydání – ${fmt(now)}`,
  `- Rozhodnutí: **${d.deploy ? 'NASADIT' : 'nenasazovat'}** – ${d.reason}`,
  `- Poslední úspěšné nasazení: ${manifest ? `${manifest.commit?.slice(0, 7) ?? '?'} (${fmt(new Date(manifest.builtAt))}), ${manifest.articles.length} článků` : `— (${note})`}`,
  `- Nejbližší plánované: ${d.upcoming.slice(0, 3).map((u) => `${u.id} (${fmt(u.date)})`).join(', ') || 'žádné'}`,
];
console.log(lines.join('\n'));
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `deploy=${d.deploy}\npending=${d.pending.join(',')}\n`);
// Uvízlý článek = červený běh a e-mail. Nasazení jiných splatných článků přitom proběhne (deploy=true v GITHUB_OUTPUT).
if (d.error && !d.deploy) process.exit(1);
if (d.error) console.error('⚠️ Uvízlý článek – viz souhrn běhu.');
