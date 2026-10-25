// Spouští se před každým buildem. Chyba = build selže. Varování = vypíše se ke kontrole.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import {
  validateTeams, validateSeasons, validateRivalries, validateStaff, validateTemplates, validateWeek, mergeResults,
} from './lib/validate.mjs';
import { validateHistorySeason } from './lib/validate-history.mjs';
import { validateDraft, validateHistoricalDraft, validatePlayerAliases } from './lib/validate-draft.mjs';
import { validateMatchSeason } from './lib/validate-matches.mjs';

const root = new URL('..', import.meta.url).pathname;
const parseErrors = [];

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    parseErrors.push(`${path.replace(root, '')}: neplatný JSON (${err.message})`);
    return undefined;
  }
}

const data = (name) => readJson(join(root, 'src/data', name));
const teams = data('teams.json') ?? [];
const seasons = data('seasons.json') ?? [];
const rivalries = data('rivalries.json') ?? [];
const staff = data('staff.json') ?? [];
const templates = data('templates.json') ?? [];

const teamIds = new Set(Array.isArray(teams) ? teams.map((t) => t?.id) : []);
const playingIds = new Set(Array.isArray(teams) ? teams.filter((t) => t?.status !== 'former').map((t) => t?.id) : []);
const staffIds = new Set(Array.isArray(staff) ? staff.map((s) => s?.id) : []);

// Portréty redakce: public/obrazky/redakce/<id>.webp
const avatarDir = join(root, 'public/obrazky/redakce');
const avatarIds = existsSync(avatarDir) ? readdirSync(avatarDir).filter((f) => f.endsWith('.webp')).map((f) => basename(f, '.webp')) : [];

// Obrázky rubrik: každý článek bez vlastního obrázku použije public/obrazky/clanky/rubrika-<kategorie>.webp (+ -og.jpg).
const { CATEGORY_IDS } = await import('../src/lib/site.js');
const missingCovers = CATEGORY_IDS.flatMap((id) => [`rubrika-${id}.webp`, `rubrika-${id}-og.jpg`])
  .filter((f) => !existsSync(join(root, 'public/obrazky/clanky', f)))
  .map((f) => `chybí obrázek rubriky public/obrazky/clanky/${f} (vytvořte: npm run obrazek -- <obrázek> ${f.replace(/(-og)?\.(webp|jpg)$/, '')})`);
parseErrors.push(...missingCovers);

const weeksDir = join(root, 'data/weeks');
const weekFiles = existsSync(weeksDir) ? readdirSync(weeksDir).filter((f) => f.endsWith('.json')) : [];
const weekResults = weekFiles.map((file) => {
  const week = readJson(join(weeksDir, file));
  return week === undefined ? { errors: [], warnings: [] } : validateWeek(week, basename(file, '.json'), playingIds);
});

// Historický archiv: jeden JSON na sezonu v src/data/historie/
const historyDir = join(root, 'src/data/historie');
const historyFiles = existsSync(historyDir) ? readdirSync(historyDir).filter((f) => f.endsWith('.json')) : [];
const historyResults = historyFiles.map((file) => {
  const season = readJson(join(historyDir, file));
  if (season === undefined) return { errors: [], warnings: [] };
  const expected = basename(file, '.json').replace('-', '/');
  const result = validateHistorySeason(season, Array.isArray(seasons) ? seasons : [], teamIds);
  return { errors: [...result.errors, ...(season.season === expected ? [] : [`src/data/historie/${file}: pole season „${season.season}“ neodpovídá názvu souboru`])], warnings: [] };
});

// Draftové pořadí: src/data/draft/<rrrr-rr>.json, bilance z historických výsledků sezony `recordsFrom`.
const draftDir = join(root, 'src/data/draft');
const draftFiles = existsSync(draftDir) ? readdirSync(draftDir).filter((f) => f.endsWith('.json')) : [];
const newIds = new Set(Array.isArray(teams) ? teams.filter((t) => t?.status === 'new').map((t) => t?.id) : []);
// Draft s `recordsFrom` je aktuální (pravidlo pořadí podle bilancí), bez něj historický (účastníci z archivu téže sezony).
const historyOf = (season) => {
  const path = join(historyDir, `${String(season).replace('/', '-')}.json`);
  return existsSync(path) ? readJson(path) : undefined;
};
const drafts = draftFiles.map((file) => ({ file, draft: readJson(join(draftDir, file)) })).filter(({ draft }) => draft !== undefined);
const draftResults = drafts.map(({ file, draft }) => {
  const result = draft.recordsFrom === undefined
    ? validateHistoricalDraft(draft, file, { teamIds, history: historyOf(draft.season) })
    : validateDraft(draft, file, { playingIds, newIds, history: historyOf(draft.recordsFrom) });
  const expected = basename(file, '.json').replace('-', '/');
  return draft.season === expected ? result : { ...result, errors: [...result.errors, `src/data/draft/${file}: pole season „${draft.season}“ neodpovídá názvu souboru`] };
});
const aliasesFile = join(root, 'src/data/hraci-aliasy.json');
const aliasResult = existsSync(aliasesFile) ? validatePlayerAliases(readJson(aliasesFile) ?? [], drafts.map((d) => d.draft)) : { errors: [], warnings: [] };

// Zápasy základní části: src/data/zapasy/<rrrr-rr>.json, kontrola proti archivu téže sezony.
const matchesDir = join(root, 'src/data/zapasy');
const matchFiles = existsSync(matchesDir) ? readdirSync(matchesDir).filter((f) => f.endsWith('.json')) : [];
const matchResults = matchFiles.map((file) => {
  const doc = readJson(join(matchesDir, file));
  return doc === undefined ? { errors: [], warnings: [] } : validateMatchSeason(doc, file, { history: historyOf(doc.season) });
});

const { errors, warnings } = mergeResults(
  { errors: parseErrors, warnings: [] },
  validateTeams(teams),
  validateSeasons(seasons, teamIds),
  validateRivalries(rivalries, teamIds),
  validateStaff(staff, avatarIds),
  validateTemplates(templates, staffIds),
  ...weekResults,
  ...historyResults,
  ...draftResults,
  aliasResult,
  ...matchResults,
);
// parseErrors se plní i při čtení týdnů, proto je připojíme znovu bez duplicit.
const allErrors = [...new Set([...errors, ...parseErrors])];

warnings.forEach((w) => console.warn(`⚠️  KE KONTROLE: ${w}`));
if (allErrors.length) {
  allErrors.forEach((e) => console.error(`❌ ${e}`));
  console.error(`\nValidace dat selhala (${allErrors.length} chyb). Build zastaven.`);
  process.exit(1);
}
console.log(`✅ Data v pořádku: ${teams.length} týmů, ${seasons.length} sezon (${historyFiles.length} v historických výsledcích), ${drafts.length} draftů, ${matchFiles.length} sezon zápasů, ${weekFiles.length} kol${warnings.length ? `, ${warnings.length} varování ke kontrole` : ''}.`);
