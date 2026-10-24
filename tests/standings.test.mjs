import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { winPct, pctGroups, seasonStandings, allStandings } from '../src/lib/standings.js';
import { pearson, spearman, midRanks } from '../src/lib/stats.js';
import { picksWithResults, slotCorrelations } from '../src/lib/draft-history.js';

const json = (p) => JSON.parse(readFileSync(new URL(`../src/data/${p}`, import.meta.url), 'utf8'));
const SEASONS = ['2022-23', '2023-24', '2024-25', '2025-26'];
const history = SEASONS.map((s) => json(`historie/${s}.json`));
const drafts = [...SEASONS, '2026-27'].map((s) => json(`draft/${s}.json`));
const rows = allStandings(history);
const row = (season, team) => rows.find((r) => r.season === season && r.team === team);

test('winPct počítá remízu za půl výhry (6-12-2 = 7-13-0 = .350)', () => {
  assert.equal(winPct({ w: 6, l: 12, t: 2 }), 0.35);
  assert.equal(winPct({ w: 7, l: 13, t: 0 }), 0.35);
});

test('40 tým-sezon, ověřené údaje archivu přebrané beze změny', () => {
  assert.equal(rows.length, 40);
  assert.equal(new Set(rows.map((r) => `${r.season}|${r.team}`)).size, 40);
  for (const s of history) {
    for (const t of s.teams) {
      const r = row(s.season, t.team);
      assert.deepEqual([r.record, r.divisionRank, r.finalRank, r.espnSeed], [t.record, t.divisionRank, t.finalRank, t.seed]);
    }
  }
});

test('playoff seed jen u 8 týmů hlavního pavouku, #9 a #10 mají null', () => {
  for (const s of history) {
    const seeds = rows.filter((r) => r.season === s.season).map((r) => r.playoffSeed);
    assert.deepEqual(seeds.filter((x) => x !== null).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8]);
    assert.equal(seeds.filter((x) => x === null).length, 2);
  }
  assert.ok(rows.every((r) => (r.playoffSeed === null) === (r.stage === 'out')));
});

test('regularSeasonRank: 18 odvozených, 22 neověřených shod s důvodem a skupinou', () => {
  const derived = rows.filter((r) => r.regularSeasonRankStatus === 'derived');
  const tied = rows.filter((r) => r.regularSeasonRankStatus === 'tie_unresolved');
  assert.equal(derived.length, 18);
  assert.equal(tied.length, 22);
  assert.ok(derived.every((r) => Number.isInteger(r.regularSeasonRank) && r.tieGroup === null && r.regularSeasonRankReason === null));
  assert.ok(tied.every((r) => r.regularSeasonRank === null && r.tieGroup.teams.includes(r.team) && /nejsou doložená/.test(r.regularSeasonRankReason)));
  // Seed nenahrazuje celkové pořadí: Kutlak’s je v 2025/26 nasazený #2, ale bilancí 12-8 sdílí 4.–5. místo.
  const kut = row('2025/26', 'kutlaks-amateurs');
  assert.equal(kut.playoffSeed, 2);
  assert.equal(kut.regularSeasonRank, null);
  assert.deepEqual(kut.tieGroup.range, [4, 5]);
  assert.equal(row('2025/26', 'little-barns-fireballs').regularSeasonRank, 2);
  // Remíza: Přeštice 6-12-2 sdílí .350 se třemi týmy 7-13-0 (2023/24, rozpětí 6–9).
  assert.deepEqual(row('2023/24', 'prestice-mighty-ducks').tieGroup.range, [6, 9]);
});

test('pctGroups: souvislá rozpětí 1–10 bez děr a překryvů', () => {
  for (const s of history) {
    const groups = pctGroups(s.teams);
    assert.equal(groups[0].range[0], 1);
    assert.equal(groups.at(-1).range[1], 10);
    groups.slice(1).forEach((g, i) => assert.equal(g.range[0], groups[i].range[1] + 1));
  }
  assert.deepEqual(seasonStandings(history[0]).map((r) => r.team), seasonStandings(structuredClone(history[0])).map((r) => r.team));
});

test('finále a titul odpovídají Síni slávy', () => {
  const hof = json('seasons.json');
  for (const s of hof) {
    assert.deepEqual(rows.filter((r) => r.season === s.season && r.champion).map((r) => r.team), [s.champion]);
    assert.deepEqual(rows.filter((r) => r.season === s.season && r.reachedFinal).map((r) => r.team).sort(), [s.champion, s.finalist].sort());
  }
});

test('statistika: Pearson, Spearman se středním pořadím', () => {
  assert.equal(pearson([1, 2, 3], [2, 4, 6]), 1);
  assert.equal(pearson([1, 2, 3], [5, 5, 5]), null);
  assert.equal(pearson([1, 2], [1, 2]), null);
  assert.deepEqual(midRanks([10, 20, 20, 30]), [1, 2.5, 2.5, 4]);
  assert.equal(spearman([1, 2, 3, 4], [10, 20, 30, 100]), 1);
  assert.throws(() => pearson([1], [1, 2]));
});

test('propojení: 650 výběrů, 520 s výsledkem, 130 z 2026/27 zatím bez výsledku', () => {
  const { picks, summary } = picksWithResults(drafts, history);
  assert.equal(picks.length, 650);
  assert.deepEqual(summary, {
    picks: 650, linkedPicks: 520, unlinkedPicks: 130, unlinkedSeasons: ['2026/27'], teamSeasons: 40, teamSeasonsWithoutPicks: 0,
  });
  const jokic = picks.find((p) => p.season === '2022/23' && p.pick === 1);
  assert.equal(jokic.result.team, 'kutlaks-amateurs');
  assert.equal(jokic.result.finalRank, 2);
});

test('slotCorrelations: počty pozorování a dílčí analýza jen nad 18 odvozenými pořadími', () => {
  const { bySeason, pooled } = slotCorrelations(drafts, history);
  assert.equal(bySeason.length, 4);
  assert.deepEqual([pooled.winPct.n, pooled.playoffSeed.n, pooled.finalRank.n, pooled.reachedFinal.n, pooled.regularSeasonRankPartial.n], [40, 32, 40, 40, 18]);
  assert.ok(bySeason.every((s) => s.winPct.n === 10 && s.playoffSeed.n === 8));
  assert.ok(Object.values(pooled).filter((m) => typeof m === 'object').every((m) => m.value === null || Math.abs(m.value) <= 1));
});

test('chybějící pořadí se vynechá – nepočítá se jako 0 ani jako poslední místo', async () => {
  const { draftSlotResults } = await import('../src/lib/draft-history.js');
  const { round2 } = await import('../src/lib/stats.js');
  const all = draftSlotResults(drafts, history);
  const known = all.filter((r) => r.regularSeasonRank !== null);
  const { pooled } = slotCorrelations(drafts, history);
  assert.equal(pooled.regularSeasonRankPartial.value, round2(spearman(known.map((r) => r.slot), known.map((r) => r.regularSeasonRank))));
  const asZero = round2(spearman(all.map((r) => r.slot), all.map((r) => r.regularSeasonRank ?? 0)));
  const asLast = round2(spearman(all.map((r) => r.slot), all.map((r) => r.regularSeasonRank ?? 10)));
  assert.notEqual(pooled.regularSeasonRankPartial.value, asZero);
  assert.notEqual(pooled.regularSeasonRankPartial.value, asLast);
});

test('sezona 2026/27 nevstupuje do výsledkových korelací', async () => {
  const { draftSlotResults } = await import('../src/lib/draft-history.js');
  assert.ok(draftSlotResults(drafts, history).every((r) => r.season !== '2026/27'));
  assert.deepEqual(slotCorrelations(drafts, history), slotCorrelations(drafts.slice(0, 4), history));
});
