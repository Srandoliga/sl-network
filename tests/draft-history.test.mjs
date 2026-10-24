import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateHistoricalDraft, validatePicks, validatePlayerAliases } from '../scripts/lib/validate-draft.mjs';
import {
  aliasMap, playerKey, teamDraftHistory, firstOverallPicks, draftSlotTable, repeatedPlayers,
  teamRepeatedPlayers, playerDraftHistory, draftSlotResults, resultsBySlot, completedSeasons,
} from '../src/lib/draft-history.js';

const json = (p) => JSON.parse(readFileSync(new URL(`../src/data/${p}`, import.meta.url), 'utf8'));
const HISTORICAL = ['2022-23', '2023-24', '2024-25', '2025-26'];
const historical = HISTORICAL.map((s) => json(`draft/${s}.json`));
const drafts = [...historical, json('draft/2026-27.json')];
const history = HISTORICAL.map((s) => json(`historie/${s}.json`));
const teams = json('teams.json');
const teamIds = new Set(teams.map((t) => t.id));
const aliasesRaw = json('hraci-aliasy.json');
const aliases = aliasMap(aliasesRaw);

test('historické drafty 2022/23–2025/26 projdou validací', () => {
  historical.forEach((d, i) => {
    assert.deepEqual(validateHistoricalDraft(d, `${HISTORICAL[i]}.json`, { teamIds, history: history[i] }), { errors: [], warnings: [] });
  });
});

test('každý historický draft: 13 kol po 10, 130 výběrů, 13 na organizaci, #1–#130, bez duplicit', () => {
  for (const d of historical) {
    assert.equal(d.picks.length, 130);
    assert.deepEqual(d.picks.map((p) => p.pick), Array.from({ length: 130 }, (_, i) => i + 1));
    for (let r = 1; r <= 13; r += 1) assert.equal(d.picks.filter((p) => p.round === r).length, 10);
    for (const id of d.order) assert.equal(d.picks.filter((p) => p.team === id).length, 13);
    assert.equal(new Set(d.picks.map((p) => playerKey(p.player))).size, 130);
  }
});

test('účastníci draftu = organizace archivu téže sezony, dobové názvy ESPN zachované', () => {
  historical.forEach((d, i) => assert.deepEqual([...d.order].sort(), history[i].teams.map((t) => t.team).sort()));
  assert.equal(historical[0].espnLabels['abukuafi-vzdejto'], 'AbuKuafi Vzdejto');
  assert.equal(historical[1].espnLabels['abukuafi-vzdejto'], 'AbuKaufi Vzdejto');
  assert.equal(historical[2].espnLabels['tachovsky-gadzo'], 'Tachovsky gadzo');
  // Nováčci Sezony V se v historických draftech neobjevují.
  assert.ok(historical.every((d) => !d.order.includes('litice-hoopers') && !d.order.includes('mc-rising-stars')));
});

test('validateHistoricalDraft odhalí tým mimo archiv, chybějící dobový název a špatné pořadí v kole', () => {
  const [d] = historical;
  const intruder = { ...d, order: d.order.map((id) => (id === 'uganda-paopice' ? 'litice-hoopers' : id)) };
  assert.match(validateHistoricalDraft(intruder, 'x.json', { teamIds, history: history[0] }).errors.join(), /nehrál: litice-hoopers/);
  const noLabel = { ...d, espnLabels: { ...d.espnLabels, 'o-j': undefined, 'uganda-paopice': '' } };
  assert.match(validateHistoricalDraft(noLabel, 'x.json', { teamIds, history: history[0] }).errors.join(), /espnLabels\): uganda-paopice/);
  const badSlot = { ...d, picks: d.picks.map((p) => (p.pick === 12 ? { ...p, roundPick: 9 } : p)) };
  assert.match(validatePicks(badSlot, 'x').errors.join(), /#12: pořadí v kole 9, podle čísla výběru má být 2/);
  assert.match(validateHistoricalDraft(d, 'x.json', { teamIds, history: undefined }).errors.join(), /chybí historické výsledky/);
});

test('aliasy hráčů platí a bez nich validace varuje před variantou jména', () => {
  assert.deepEqual(validatePlayerAliases(aliasesRaw, drafts), { errors: [], warnings: [] });
  const warnings = validatePlayerAliases([], drafts).warnings.join();
  assert.match(warnings, /Jimmy Butler/);
  assert.match(warnings, /OG Anunoby|O\.G\. Anunoby/);
  assert.match(validatePlayerAliases([{ canonical: 'Nikdo', variants: ['Někdo'] }], drafts).errors.join(), /„Nikdo“ není/);
});

test('playerKey sjednotí diakritiku i aliasy', () => {
  assert.equal(playerKey('Nikola Jokić'), playerKey('Nikola Jokic'));
  assert.equal(playerKey('Jimmy Butler', aliases), playerKey('Jimmy Butler III', aliases));
  assert.notEqual(playerKey('Jimmy Butler'), playerKey('Jimmy Butler III'));
});

test('teamDraftHistory: pozice a první výběr po sezonách', () => {
  const acl = teamDraftHistory(drafts, 'acl-rokycany');
  assert.deepEqual(acl.map((s) => [s.season, s.slot]), [['2023/24', 1], ['2024/25', 8], ['2025/26', 4], ['2026/27', 10]]);
  assert.equal(acl[0].firstPick.player, 'Giannis Antetokounmpo');
  assert.ok(acl.every((s) => s.picks.length === 13));
  assert.deepEqual(teamDraftHistory(drafts, 'litice-hoopers').map((s) => s.season), ['2026/27']);
});

test('firstOverallPicks a draftSlotTable', () => {
  assert.deepEqual(firstOverallPicks(drafts).map((p) => [p.season, p.player, p.team]), [
    ['2022/23', 'Nikola Jokic', 'kutlaks-amateurs'],
    ['2023/24', 'Giannis Antetokounmpo', 'acl-rokycany'],
    ['2024/25', 'Nikola Jokic', 'tachovsky-gadzo'],
    ['2025/26', 'Nikola Jokic', 'irish-airballers'],
    ['2026/27', 'Nikola Jokic', 'litice-hoopers'],
  ]);
  const table = draftSlotTable(drafts);
  assert.equal(table.length, 5);
  assert.deepEqual(table[0].slots[0], { slot: 1, team: 'kutlaks-amateurs' });
});

test('repeatedPlayers: Jokić v 5 draftech, alias spojí Butlera do 4 draftů', () => {
  const rep = repeatedPlayers(drafts, aliases);
  assert.equal(rep[0].entries.length, 5);
  const butler = rep.find((g) => g.name === 'Jimmy Butler III');
  assert.deepEqual(butler.entries.map((e) => e.season), ['2022/23', '2023/24', '2024/25', '2025/26']);
  assert.ok(rep.every((g, i) => i === 0 || rep[i - 1].entries.length >= g.entries.length));
  assert.deepEqual(playerDraftHistory(drafts, 'jimmy butler', aliases).map((e) => e.team), ['budejce-gotcha', 'los-mustachios', 'kutlaks-amateurs', 'los-mustachios']);
});

test('teamRepeatedPlayers: jen hráči téže organizace ve více sezonách', () => {
  const mus = teamRepeatedPlayers(drafts, 'los-mustachios', aliases);
  assert.ok(mus.some((g) => g.name === 'Jimmy Butler III'));
  assert.ok(mus.every((g) => g.entries.length >= 2 && g.entries.every((e) => e.team === 'los-mustachios')));
  assert.ok(mus.every((g) => new Set(g.entries.map((e) => e.season)).size === g.entries.length));
});

test('draftSlotResults: jen dokončené sezony, 2026/27 se nezapočítá', () => {
  const rows = draftSlotResults(drafts, history);
  assert.equal(rows.length, 40);
  assert.ok(rows.every((r) => r.season !== '2026/27'));
  assert.deepEqual(completedSeasons(history), new Set(['2022/23', '2023/24', '2024/25', '2025/26']));
  const champs = rows.filter((r) => r.stage === 'champion').map((r) => [r.season, r.team, r.slot]);
  assert.deepEqual(champs, [
    ['2022/23', 'little-barns-fireballs', 5],
    ['2023/24', 'acl-rokycany', 1],
    ['2024/25', 'little-barns-fireballs', 9],
    ['2025/26', 'acl-rokycany', 4],
  ]);
  const bySlot = resultsBySlot(drafts, history);
  assert.equal(bySlot.length, 10);
  assert.equal(bySlot.reduce((n, s) => n + s.titles, 0), 4);
  assert.ok(bySlot.every((s) => s.seasons === 4));
});

test('funkce nemění vstup a jsou deterministické', () => {
  const snapshot = JSON.stringify(drafts);
  const a = JSON.stringify([repeatedPlayers(drafts, aliases), resultsBySlot(drafts, history), teamDraftHistory(drafts, 'pilsen-beers')]);
  const b = JSON.stringify([repeatedPlayers([...drafts].reverse(), aliases), resultsBySlot([...drafts].reverse(), history), teamDraftHistory([...drafts].reverse(), 'pilsen-beers')]);
  assert.equal(a, b);
  assert.equal(JSON.stringify(drafts), snapshot);
});
