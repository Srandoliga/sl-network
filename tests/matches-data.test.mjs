import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateMatchSeason, gameId, archiveRoundDates, recordsFromGames } from '../scripts/lib/validate-matches.mjs';

const json = (p) => JSON.parse(readFileSync(new URL(`../src/data/${p}`, import.meta.url), 'utf8'));
const SEASONS = ['2022-23', '2023-24', '2024-25', '2025-26'];
const seasons = SEASONS.map((s) => ({ file: `${s}.json`, doc: json(`zapasy/${s}.json`), history: json(`historie/${s}.json`) }));
const check = ({ doc, file, history }) => validateMatchSeason(doc, file, { history });
const errorsOf = (s, change) => {
  const doc = structuredClone(s.doc);
  change(doc);
  return check({ ...s, doc }).errors.join('\n');
};

test('všechny čtyři sezony projdou validací proti archivu', () => {
  for (const s of seasons) assert.deepEqual(check(s), { errors: [], warnings: [] });
});

test('400 zápasů základní části, 20 kol po 5, play-off se neukládá', () => {
  assert.equal(seasons.reduce((n, s) => n + s.doc.games.length, 0), 400);
  for (const s of seasons) {
    for (let m = 1; m <= 20; m += 1) assert.equal(s.doc.games.filter((g) => g.matchup === m).length, 5);
    assert.ok(s.doc.games.every((g) => Object.keys(g).join() === 'matchup,teams,scores'));
  }
});

test('bilance a PF/PA ze zápasů = 40 tým-sezon archivu, včetně dvou remíz 2023/24', () => {
  let checked = 0;
  for (const s of seasons) {
    const derived = recordsFromGames(s.doc.games);
    for (const t of s.history.teams) {
      const r = derived.get(t.team);
      assert.deepEqual([r.w, r.l, r.t, r.pf, r.pa], [t.record.w, t.record.l, t.record.t, t.pf, t.pa]);
      checked += 1;
    }
  }
  assert.equal(checked, 40);
  const ties = seasons.flatMap((s) => s.doc.games.filter((g) => g.scores[0] === g.scores[1]).map((g) => `${s.doc.season} ${g.matchup}`));
  assert.deepEqual(ties, ['2023/24 18', '2023/24 20']);
});

test('kalendář: souvislý, délky podle dat ESPN, kola play-off shodná s archivem', () => {
  for (const s of seasons) {
    const reg = s.doc.matchups.filter((p) => p.kind === 'regular');
    assert.equal(reg.length, 20);
    assert.deepEqual(s.doc.matchups.filter((p) => p.kind === 'playoff').map((p) => p.round), [1, 2, 3]);
    assert.ok(s.doc.matchups.every((p) => p.espnLabel === (p.kind === 'regular' ? `Matchup ${p.matchup}` : `Playoff Round ${p.round}`)));
  }
  const long = seasons.flatMap((s) => s.doc.matchups.filter((p) => p.days !== 7).map((p) => `${s.doc.season}:${p.matchup}:${p.days}`));
  assert.deepEqual(long, ['2022/23:18:14', '2023/24:1:6', '2023/24:17:14', '2024/25:1:6', '2024/25:17:14', '2025/26:1:6', '2025/26:17:14']);
  assert.deepEqual(archiveRoundDates('27. 3.–2. 4. 2023'), ['2023-03-27', '2023-04-02']);
  assert.deepEqual(archiveRoundDates('18.–24. 3. 2024'), ['2024-03-18', '2024-03-24']);
});

test('validace odhalí změněné skóre, duplicitu, cizí tým i chybu v kalendáři', () => {
  const [s] = seasons;
  assert.match(errorsOf(s, (d) => { d.games[0].scores[0] += 1; }), /PF\/PA/);
  assert.match(errorsOf(s, (d) => { d.games[0].scores = [d.games[0].scores[1], d.games[0].scores[0]]; }), /bilanci/);
  assert.match(errorsOf(s, (d) => { d.games[1] = { ...d.games[0] }; }), /nehraje každý tým právě jednou|duplicitní/);
  assert.match(errorsOf(s, (d) => { d.games[0].teams[0] = 'litice-hoopers'; }), /litice-hoopers v sezoně 2022\/23 nehrál/);
  assert.match(errorsOf(s, (d) => { d.games.pop(); }), /zápasů je 99/);
  assert.match(errorsOf(s, (d) => { d.matchups[4].days = 6; }), /délka 6 dní/);
  assert.match(errorsOf(s, (d) => { d.matchups[4].end = '2022-11-19'; d.matchups[4].days = 6; }), /nezačíná den po konci/);
  assert.match(errorsOf(s, (d) => { d.matchups.at(-1).end = '2023-04-03'; d.matchups.at(-1).days = 8; }), /play-off 3 .* neodpovídá archivu/);
  assert.match(validateMatchSeason(s.doc, '2023-24.json', { history: s.history }).errors.join(), /neodpovídá názvu souboru/);
});

test('ID zápasu je stabilní: nezávisí na pořadí záznamů a je jedinečné', () => {
  for (const s of seasons) {
    const ids = s.doc.games.map((g) => gameId(s.doc.season, g.matchup, g.teams));
    assert.equal(new Set(ids).size, 100);
    const reversed = [...s.doc.games].reverse().map((g) => gameId(s.doc.season, g.matchup, g.teams));
    assert.deepEqual([...reversed].sort(), [...ids].sort());
    assert.deepEqual(check({ ...s, doc: { ...s.doc, games: [...s.doc.games].reverse() } }).errors, []);
  }
  assert.equal(gameId('2025/26', 1, ['irish-airballers', 'little-barns-fireballs']), '2025-26-z01-irish-airballers--little-barns-fireballs');
});

test('data neobsahují jména manažerů, jen ID organizací', () => {
  const ids = new Set(json('teams.json').map((t) => t.id));
  for (const s of seasons) assert.ok(s.doc.games.every((g) => g.teams.every((t) => ids.has(t))));
});
