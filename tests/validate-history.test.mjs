import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateHistorySeason } from '../scripts/lib/validate-history.mjs';

const load = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url), 'utf8'));
const hof = load('seasons.json');
const teamIds = new Set(load('teams.json').map((t) => t.id));
const real = load('historie/2024-25.json');

test('skutečná data sezony 2024/25 projdou bez chyb', () => {
  assert.deepEqual(validateHistorySeason(real, hof, teamIds).errors, []);
});

test('odhalí překlep v bodech (PF ≠ PA)', () => {
  const s = structuredClone(real);
  s.teams[0].pf += 10;
  assert.ok(validateHistorySeason(s, hof, teamIds).errors.some((e) => e.includes('PF')));
});

test('odhalí nesoulad výsledku zápasu s konečným pořadím', () => {
  const s = structuredClone(real);
  const final = s.games.find((g) => g.label === 'Finále');
  final.scores = [final.scores[1], final.scores[0]];
  const errs = validateHistorySeason(s, hof, teamIds).errors;
  assert.ok(errs.some((e) => e.includes('1. místo') || e.includes('Síň slávy')));
});

test('odhalí neznámý tým a chybějící zápas', () => {
  const s = structuredClone(real);
  s.teams[3].team = 'neznamy-tym';
  s.games.pop();
  const errs = validateHistorySeason(s, hof, teamIds).errors;
  assert.ok(errs.some((e) => e.includes('neznamy-tym')));
  assert.ok(errs.some((e) => e.includes('15')));
});

test('odhalí špatné párování 1. kola', () => {
  const s = structuredClone(real);
  const r1 = s.games.filter((g) => g.bracket === 'main' && g.round === 1);
  [r1[0].teams[0], r1[1].teams[0]] = [r1[1].teams[0], r1[0].teams[0]];
  assert.ok(validateHistorySeason(s, hof, teamIds).errors.some((e) => e.includes('1. kolo')));
});
