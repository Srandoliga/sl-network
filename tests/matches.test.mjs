import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { canonicalGames, headToHead, opponents, streaks, scoringRecords, championshipPath, STANDARD_DAYS } from '../src/lib/matches.js';
import { teamHistoryModel } from '../src/lib/team-history.js';
import { aliasMap } from '../src/lib/draft-history.js';

const root = new URL('../src/data/', import.meta.url);
const json = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const list = (dir) => readdirSync(new URL(dir, root)).map((f) => json(`${dir}/${f}`)).sort((a, b) => a.season.localeCompare(b.season));
const history = list('historie');
const drafts = list('draft');
const games = canonicalGames(list('zapasy'), history);
const model = (teamId) => teamHistoryModel({ teamId, drafts, games, aliases: aliasMap(json('hraci-aliasy.json')), currentSeason: '2026/27' });

test('kanonické zápasy: 460, jedinečná ID, soutěže odděleně', () => {
  assert.equal(games.length, 460);
  assert.equal(new Set(games.map((g) => g.id)).size, 460);
  const c = (k) => games.filter((g) => g.competition === k).length;
  assert.deepEqual([c('regular'), c('championship'), c('placement'), c('consolation')], [400, 28, 20, 12]);
  assert.ok(games.filter((g) => g.competition !== 'regular').every((g) => g.seeds.every((s) => Number.isInteger(s))));
  assert.ok(games.filter((g) => g.competition === 'championship').every((g) => g.seeds.every((s) => s <= 8)));
  assert.ok(games.filter((g) => g.competition === 'consolation').every((g) => g.seeds.every((s) => s >= 9)));
});

test('H2H a soupeři počítají bez výslovné volby jen základní část', () => {
  const ab = headToHead(games, 'abukuafi-vzdejto', 'acl-rokycany');
  assert.equal(ab.games.length, 9);
  assert.equal(headToHead(games, 'abukuafi-vzdejto', 'acl-rokycany', ['regular', 'championship']).games.length, 10);
  const acl = opponents(games, 'acl-rokycany');
  assert.deepEqual(['w', 'l', 't'].map((k) => acl.find((o) => o.opp === 'kutlaks-amateurs')[k]), [6, 0, 0]);
});

test('rekordy skóre jen z kol dlouhých přesně 7 dní', () => {
  const r = scoringRecords(games, { standardOnly: true });
  assert.equal(STANDARD_DAYS, 7);
  for (const k of ['highest', 'lowest']) assert.equal(r[k].game.days, 7);
  for (const k of ['biggestWin', 'closestWin', 'highestTotal']) assert.equal(r[k].days, 7);
  assert.equal(r.highest.score, 2045);
  assert.equal(scoringRecords(games).highest.score, 2131);
  assert.equal(scoringRecords(games).highest.game.days, 14);
});

test('série v rámci sezony a cesta šampiona', () => {
  const s = streaks(games, 'acl-rokycany').find((x) => x.season === '2025/26' && x.kind === 'w');
  assert.deepEqual([s.length, s.from, s.to], [16, 5, 20]);
  assert.deepEqual(championshipPath(games, '2025/26', 'acl-rokycany').map((r) => [r.oppSeed, r.won]), [[8, true], [4, true], [7, true]]);
});

test('Historie klubu: rekord klubu vs. rekord ligy jsou oddělené údaje', () => {
  const acl = model('acl-rokycany');
  assert.equal(acl.streakW.length, acl.league.streakW);
  assert.equal(acl.records.highest.game.id, acl.league.highest.game.id);
  const pil = model('pilsen-beers');
  assert.ok(pil.streakW.length < pil.league.streakW);
  assert.notEqual(pil.records.highest.game.id, pil.league.highest.game.id);
  assert.equal(pil.records.highest.game.days, 7);
});

test('nováček: bez návratů, soupeřů a rekordů; bývalá organizace bez aktuálního draftu', () => {
  const lit = model('litice-hoopers');
  assert.equal(lit.isDebut, true);
  assert.equal(lit.returns, null);
  assert.deepEqual([lit.opponents.length, lit.records, lit.streakW], [0, null, null]);
  assert.equal(lit.current.slot, 1);
  const pre = model('prestice-mighty-ducks');
  assert.equal(pre.current, null);
  assert.equal(pre.isDebut, false);
  assert.ok(pre.opponents.length > 0);
});
