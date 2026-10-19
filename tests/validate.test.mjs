import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateTeams, validateSeasons, validateRivalries, validateStaff, validateTemplates, validateWeek,
} from '../scripts/lib/validate.mjs';

const team = (id, extra = {}) => ({
  id, name: id.toUpperCase(), short: 'X', status: 'active', verified: true, color: '#112233', icon: 'monogram', story: 's', ...extra,
});
const ids = new Set(['a', 'b', 'c', 'd']);

test('validateTeams: platná data bez chyb, varování při jiném počtu než 10', () => {
  const r = validateTeams([team('a'), team('b')]);
  assert.deepEqual(r.errors, []);
  assert.equal(r.warnings.length, 1);
});

test('validateTeams: duplicita, špatná barva a chybějící pole', () => {
  const r = validateTeams([team('a'), team('a', { name: 'jiny' }), team('b', { color: 'red', story: '' })]);
  assert.ok(r.errors.some((e) => e.includes('duplicitní id')));
  assert.ok(r.errors.some((e) => e.includes('„color“')));
  assert.ok(r.errors.some((e) => e.includes('„story“')));
});

test('validateTeams: odmítne neplatný JSON tvar', () => {
  assert.equal(validateTeams({}).errors.length, 1);
});

test('validateSeasons: neexistující tým, stejný šampion a finalista, špatný formát sezony', () => {
  const ok = { season: '2022/23', number: 1, champion: 'a', finalist: 'b', awards: [], records: [] };
  assert.deepEqual(validateSeasons([ok], ids).errors, []);
  assert.deepEqual(validateSeasons([{ ...ok, season: '2099/00' }], ids).errors, []);
  const bad = validateSeasons([
    { ...ok, champion: 'zz' },
    { ...ok, season: '2023/25', number: 2, finalist: 'a', champion: 'a' },
  ], ids).errors;
  assert.ok(bad.some((e) => e.includes('neexistující tým „zz“')));
  assert.ok(bad.some((e) => e.includes('nesmí být stejný')));
  assert.ok(bad.some((e) => e.includes('„season“')));
});

test('validateRivalries a validateStaff a validateTemplates kontrolují odkazy', () => {
  assert.ok(validateRivalries([{ id: 'r', title: 't', story: 's', teams: ['a', 'x'] }], ids).errors[0].includes('„x“'));
  assert.equal(validateStaff([{ id: 'v', name: 'n', shortName: 'n', role: 'r', beat: 'b', bio: 'b', signature: 's', avatar: 'nope' }], ['vrana']).errors.length, 1);
  assert.equal(validateTemplates([{ id: 't', name: 'n', kicker: 'k', headline: 'h', text: 't', author: 'nikdo', demo: false }], new Set(['vrana'])).errors.length, 1);
});

const week = (extra = {}) => ({
  id: 'kolo-01', number: 1, start_date: '2026-10-20', end_date: '2026-10-26', source: 'screenshot', verification: 'partial', demo: true,
  matchups: [{ home: 'a', away: 'b', home_score: 100, away_score: 90 }],
  ...extra,
});

test('validateWeek: platné kolo projde', () => {
  assert.deepEqual(validateWeek(week(), 'kolo-01', ids), { errors: [], warnings: [] });
});

test('validateWeek: id musí odpovídat souboru, data a pořadí dat', () => {
  const r = validateWeek(week({ end_date: '2026-10-01' }), 'kolo-02', ids).errors;
  assert.ok(r.some((e) => e.includes('„id“')));
  assert.ok(r.some((e) => e.includes('dřív než')));
});

test('validateWeek: neexistující tým, nečíselné skóre a tým ve dvou zápasech', () => {
  const r = validateWeek(week({ matchups: [
    { home: 'a', away: 'zz', home_score: '100', away_score: 1 },
    { home: 'a', away: 'c', home_score: 1, away_score: 1 },
  ] }), 'kolo-01', ids).errors;
  assert.ok(r.some((e) => e.includes('„away“')));
  assert.ok(r.some((e) => e.includes('„home_score“')));
  assert.ok(r.some((e) => e.includes('víc než jeden zápas')));
});

test('validateWeek: duplicitní hráč ve First Team a neověřená pozice jsou chyby', () => {
  const players = [
    { name: 'Hráč 1', owner: 'a', eligible_positions: ['PG', 'SG'], counted_points: 50 },
    { name: 'Hráč 2', owner: 'a', counted_points: 50 },
  ];
  const r = validateWeek(week({
    matchups: [{ home: 'a', away: 'b', home_score: 100, away_score: 90, players }],
    first_team: [
      { position: 'PG', player: 'Hráč 1' },
      { position: 'SG', player: 'Hráč 1' },
      { position: 'C', player: 'Hráč 2' },
    ],
  }), 'kolo-01', ids).errors;
  assert.ok(r.some((e) => e.includes('vícekrát')));
  assert.ok(r.some((e) => e.includes('„Hráč 2“ nemá ověřenou způsobilost')));
  assert.ok(!r.some((e) => e.includes('„Hráč 1“ nemá')));
});

test('validateWeek: position_override se zdůvodněním je povolený', () => {
  const r = validateWeek(week({
    matchups: [{ home: 'a', away: 'b', home_score: 100, away_score: 90, players: [{ name: 'H', owner: 'a' }] }],
    first_team: [{ position: 'C', player: 'H', position_override: 'ESPN profil hráče uvádí C (screenshot 3)' }],
  }), 'kolo-01', ids);
  assert.deepEqual(r.errors, []);
});

test('validateWeek: nesoulad součtu bodů je jen varování', () => {
  const r = validateWeek(week({
    matchups: [{ home: 'a', away: 'b', home_score: 100, away_score: 90, players: [
      { name: 'H1', owner: 'a', counted_points: 60 }, { name: 'H2', owner: 'a', counted_points: 30 },
    ] }],
  }), 'kolo-01', ids);
  assert.deepEqual(r.errors, []);
  assert.equal(r.warnings.length, 1);
  assert.ok(r.warnings[0].includes('90.0'));
});

test('validateWeek: neplatná struktura', () => {
  assert.equal(validateWeek([], 'x', ids).errors.length, 1);
  assert.equal(validateWeek(null, 'x', ids).errors.length, 1);
});

test('validateSeasons: ocenění a rekordy musí mít label a existující tým', () => {
  const s = { season: '2022/23', number: 1, champion: 'a', finalist: 'b', awards: [{ label: 'MVP sezony', team: 'zz' }], records: [{ value: 1 }] };
  const r = validateSeasons([s], ids).errors;
  assert.ok(r.some((e) => e.includes('„zz“')));
  assert.ok(r.some((e) => e.includes('„label“')));
});

test('validateTeams: původní identita přejmenovaného týmu nesmí kolidovat s jiným týmem', () => {
  const base = { short: 'X', status: 'new', verified: true, color: '#ffffff', icon: 'monogram', story: 's' };
  const ok = [{ ...base, id: 'novy', name: 'Nový', formerIdentities: [{ id: 'stary', name: 'Starý', until: '2026-10-18' }] }];
  assert.deepEqual(validateTeams(ok).errors, []);
  const clash = [...ok, { ...base, id: 'stary', name: 'Jiný' }];
  assert.match(validateTeams(clash).errors.join(), /původní id „stary“ používá jiný tým/);
  assert.equal(validateTeams([{ ...base, id: 'a', name: 'A', formerIdentities: [{ id: 'Špatně', name: 'x', until: 'y' }] }]).errors.length, 1);
});

test('teams.json: 10 hrajících týmů, 2 nováčci, staré id přejmenovaného týmu není samostatný tým', async () => {
  const { readFileSync } = await import('node:fs');
  const teams = JSON.parse(readFileSync(new URL('../src/data/teams.json', import.meta.url), 'utf8'));
  const playing = teams.filter((t) => t.status !== 'former');
  assert.equal(playing.length, 10);
  assert.deepEqual(playing.filter((t) => t.status === 'new').map((t) => t.id), ['litice-hoopers', 'mc-rising-stars']);
  assert.equal(teams.some((t) => t.id === 'michals-balls-of-fire'), false);
  assert.equal(validateTeams(teams).errors.length, 0);
});
