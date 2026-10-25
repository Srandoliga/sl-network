import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { canonicalGames } from '../src/lib/matches.js';
import { aliasMap } from '../src/lib/draft-history.js';
import { historySignals, topSignals, signalsFor, playoffSeriesSignals, AREAS } from '../src/lib/history-signals.js';

const root = new URL('../src/data/', import.meta.url);
const json = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const list = (dir) => readdirSync(new URL(dir, root)).map((f) => json(`${dir}/${f}`)).sort((a, b) => a.season.localeCompare(b.season));
const teams = json('teams.json');
const name = (id) => teams.find((t) => t.id === id).name;
const history = list('historie');
const drafts = list('draft');
const games = canonicalGames(list('zapasy'), history);
const ctx = { drafts, games, aliases: aliasMap(json('hraci-aliasy.json')), history, currentSeason: '2026/27', name };
const all = historySignals(ctx);
const byId = (id) => all.find((s) => s.id === id);
const seedText = (m) => new RegExp(`#${m.ws} proti #${m.ls}`);

test('každý signál má ID, zdroje, omezení, využití a jen historický stav; ID jsou jedinečná', () => {
  assert.ok(all.length > 0);
  assert.equal(new Set(all.map((s) => s.id)).size, all.length);
  for (const s of all) {
    assert.ok(s.evidence.length > 0 && s.evidence.every((e) => e.href && !e.href.startsWith('/')), s.id);
    assert.ok(s.why && s.limits && s.uses.length, s.id);
    assert.equal(s.dataStatus, 'historical');
    assert.ok(AREAS[s.area], s.id);
  }
});

test('opakovaný souboj v play-off: text o „jedničce“ jen když poražený byl pokaždé #1', () => {
  for (const s of all.filter((x) => x.type === 'playoff_series')) {
    assert.equal(/nasazenou jedničkou/.test(s.why), s.metrics.loserTop, s.id);
    assert.equal(/hůře nasazený/.test(s.why), s.metrics.allUpsets, s.id);
    assert.doesNotMatch(`${s.title} ${s.why} ${s.typeLabel}`, /odvet/i, s.id);
  }
  const lbfAbu = byId('playoff-series:little-barns-fireballs:abukuafi-vzdejto');
  assert.equal(lbfAbu.metrics.loserTop, false);
  assert.match(lbfAbu.why, /#7 proti #2, #6 proti #3/);
  const pil = byId('playoff-series:pilsen-beers:los-mustachios');
  assert.ok(pil.metrics.loserTop && pil.metrics.allUpsets && pil.metrics.sameRound);
  assert.match(pil.why, /Los Mustachios byli v obou případech nasazenou jedničkou/);
});

test('seedy ve vysvětlení odpovídají skutečným zápasům', () => {
  for (const s of all.filter((x) => x.type === 'playoff_series' && x.metrics.allUpsets)) {
    const [w, l] = s.teams;
    const meetings = games.filter((g) => g.competition === 'championship' && g.teams.includes(w) && g.teams.includes(l));
    for (const g of meetings) assert.match(s.why, seedText({ ws: g.seeds[g.teams.indexOf(w)], ls: g.seeds[g.teams.indexOf(l)] }), s.id);
  }
});

test('cesta k titulu: „dolní polovina“ jen u nasazení #5–#8, „žádný jiný“ jen když je to pravda', () => {
  const lbf = byId('title-run:little-barns-fireballs:2022-23+2024-25');
  assert.deepEqual(lbf.metrics.seeds, [7, 6]);
  assert.match(lbf.why, /dolní polovina/);
  assert.match(lbf.why, /Žádný jiný šampion/);
  assert.match(lbf.title, /10–10 \(pokaždé\)/);
  for (const s of all.filter((x) => x.type === 'championship_run')) {
    assert.equal(/dolní polovina/.test(s.why), s.metrics.seeds.every((x) => x >= 5), s.id);
    assert.equal(/Žádný jiný/.test(s.why), s.metrics.othersLow === 0, s.id);
  }
});

test('kontinuita: „nejvyšší počet“ jen u maxima ligy, „aktuální draft“ jen u aktuální sezony', () => {
  for (const s of all.filter((x) => x.type === 'continuity')) {
    assert.equal(/Nejvyšší počet/.test(s.why), s.metrics.count === s.metrics.max, s.id);
    assert.equal(/aktuálního draftu/.test(s.why), s.seasons[0] === '2026/27', s.id);
  }
  assert.equal(byId('continuity:acl-rokycany:2026-27').metrics.count, 9);
});

test('rekordy: skóre jen ze 7denních kol, série s druhou nejdelší pro srovnání', () => {
  const sc = all.find((s) => s.type === 'scoring_record');
  const g = games.find((x) => x.id === sc.evidence[0].href.split('#')[1]);
  assert.equal(g.days, 7);
  assert.equal(sc.metrics.score, 2045);
  assert.equal(sc.metrics.longer, 2131);
  const w = all.find((s) => s.id.startsWith('streak:w:'));
  assert.deepEqual([w.metrics.length, w.metrics.second], [16, 12]);
  assert.match(w.why, /o 4 zápasy/);
});

test('opakovaná pozice: tvrzení o jedinečnosti odpovídá katalogu', () => {
  const pil = byId('slot-repeat:pilsen-beers:2022-23');
  assert.equal(pil.metrics.length, 4);
  assert.match(pil.why, /Žádná jiná organizace/);
  assert.doesNotMatch(pil.why, /bilanc/);
});

test('selektivní přehled: pestré oblasti, nejvýš jeden signál typu, úplný katalog zůstává', () => {
  const top = topSignals(all);
  assert.equal(top.length, 6);
  assert.equal(new Set(top.map((s) => s.area)).size, 5);
  assert.equal(new Set(top.map((s) => s.type)).size, top.length);
  assert.ok(all.length > top.length);
});

test('signalsFor: organizace, dvojice soupeřů, hráč, sezona, typ článku', () => {
  assert.ok(signalsFor(all, { team: 'acl-rokycany' }).every((s) => s.teams.includes('acl-rokycany')));
  const pair = signalsFor(all, { opponents: ['pilsen-beers', 'los-mustachios'] });
  assert.deepEqual(pair.map((s) => s.id), ['playoff-series:pilsen-beers:los-mustachios']);
  assert.ok(signalsFor(all, { player: 'cade cunningham' }).some((s) => s.type === 'price_shift'));
  assert.ok(signalsFor(all, { season: '2025/26', use: 'matchup' }).length > 0);
  assert.deepEqual(signalsFor(all, { team: 'litice-hoopers' }), []);
});

test('funkce jsou deterministické a nemění vstup', () => {
  const snap = JSON.stringify(games);
  assert.deepEqual(historySignals(ctx).map((s) => s.id), all.map((s) => s.id));
  assert.equal(JSON.stringify(games), snap);
  assert.deepEqual(playoffSeriesSignals({ games: [...games].reverse(), name }).map((s) => s.id).sort(), all.filter((s) => s.type === 'playoff_series').map((s) => s.id).sort());
});

test('veřejné texty „Z historie“: stručné, s čísly z metrik, bez skloňovaných jmen a bez „odvety“', () => {
  const pub = all.filter((s) => s.publicText);
  assert.ok(pub.length >= 6);
  for (const s of pub) {
    assert.ok(s.publicText.length <= 140, `${s.id}: ${s.publicText.length} znaků`);
    assert.doesNotMatch(s.publicText, /odvet/i);
    assert.ok(s.evidence[0]?.href, s.id);
  }
  for (const s of pub.filter((x) => x.type === 'price_shift')) {
    assert.ok(s.publicText.includes(`Hráče ${s.players[0]} `), s.id);
    for (const p of s.metrics.picks) assert.match(s.publicText, new RegExp(`#${p}\\b`), s.id);
  }
  assert.equal(byId('title-run:little-barns-fireballs:2022-23+2024-25').publicText, 'Oba tituly (2022/23 a 2024/25) vyhráli z bilance 10–10 – jako nasazená sedmička a šestka.');
  assert.equal(byId('playoff-series:pilsen-beers:los-mustachios').publicText, 'V play-off porazili Los Mustachios dvakrát – pokaždé v semifinále (2023/24 a 2024/25).');
  assert.match(byId('playoff-series:little-barns-fireballs:abukuafi-vzdejto').publicText, /pokaždé ve čtvrtfinále/);
  assert.match(byId('slot-repeat:pilsen-beers:2022-23').publicText, /^Čtyřikrát po sobě .* #7 \(2022\/23–2025\/26\)\.$/);
});

test('rekord skóre je výslovně rekordem 7denních kol, ne absolutním', () => {
  const sc = all.find((s) => s.type === 'scoring_record');
  assert.match(sc.title, /7denním kole/);
  assert.match(sc.why, /ne absolutní rekord/);
});
