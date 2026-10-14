import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  seasonSlug, bracketOf, playoffStage, teamSeasons, allTimeStats, bestRecord, formatRecord, formatPct,
} from '../src/lib/archive.js';

const dir = new URL('../src/data/historie/', import.meta.url);
const seasons = readdirSync(dir).map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')));
const s2425 = seasons.find((s) => s.season === '2024/25');

test('seasonSlug', () => assert.equal(seasonSlug('2024/25'), '2024-25'));

test('bracketOf rozdělí 15 zápasů na 7 + 5 + 3', () => {
  const b = bracketOf(s2425);
  assert.deepEqual(b.main.map((r) => r.length), [4, 2, 1]);
  assert.equal(b.placement.length, 5);
  assert.equal(b.consolation.length, 3);
  assert.equal(b.main[2][0].winner, 'little-barns-fireballs');
});

test('playoffStage podle skutečných výsledků 2024/25', () => {
  assert.equal(playoffStage(s2425, 'little-barns-fireballs'), 'champion');
  assert.equal(playoffStage(s2425, 'pilsen-beers'), 'final');
  assert.equal(playoffStage(s2425, 'acl-rokycany'), 'semifinal');
  assert.equal(playoffStage(s2425, 'chlumcany-jzd'), 'quarterfinal');
  assert.equal(playoffStage(s2425, 'irish-airballers'), 'out');
});

test('teamSeasons vrací sezony chronologicky a jen ty, kde tým hrál', () => {
  const rows = teamSeasons(seasons, 'acl-rokycany');
  assert.deepEqual(rows.map((r) => r.season), ['2023/24', '2024/25', '2025/26']);
  assert.deepEqual(rows.map((r) => r.stage), ['champion', 'semifinal', 'champion']);
});

test('allTimeStats sedí se Síní slávy', () => {
  const stats = allTimeStats(seasons);
  const get = (id) => stats.find((r) => r.team === id);
  assert.equal(get('little-barns-fireballs').titles, 2);
  assert.equal(get('acl-rokycany').titles, 2);
  assert.equal(get('pilsen-beers').finals, 2);
  assert.equal(get('pilsen-beers').titles, 0);
  assert.equal(get('uganda-paopice').seasons, 1);
  assert.equal(stats.reduce((a, r) => a + r.titles, 0), 4);
  assert.equal(stats[0].titles, 2);
});

test('bestRecord a formátování', () => {
  assert.deepEqual(bestRecord(s2425).map((t) => t.team), ['los-mustachios']);
  assert.equal(formatRecord({ w: 15, l: 4, t: 1 }), '15-4-1');
  assert.equal(formatPct(0.775), '.775');
});
