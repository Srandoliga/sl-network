import { test } from 'node:test';
import assert from 'node:assert/strict';
import { titleCounts, finalAppearances, teamHistory, rivalryRecord } from '../src/lib/history.js';

const seasons = [
  { season: '2022/23', number: 1, champion: 'a', finalist: 'b' },
  { season: '2023/24', number: 2, champion: 'c', finalist: 'b' },
  { season: '2024/25', number: 3, champion: 'a', finalist: 'c' },
];

test('titleCounts seřadí týmy podle počtu titulů a nemění vstup', () => {
  const copy = structuredClone(seasons);
  assert.deepEqual(titleCounts(seasons), [
    { team: 'a', titles: 2, seasons: ['2022/23', '2024/25'] },
    { team: 'c', titles: 1, seasons: ['2023/24'] },
  ]);
  assert.deepEqual(seasons, copy);
});

test('finalAppearances řadí podle finále, pak titulů', () => {
  assert.deepEqual(finalAppearances(seasons), [
    { team: 'a', finals: 2, titles: 2, lost: 0 },
    { team: 'c', finals: 2, titles: 1, lost: 1 },
    { team: 'b', finals: 2, titles: 0, lost: 2 },
  ]);
});

test('teamHistory vrací jen finále daného týmu', () => {
  assert.deepEqual(teamHistory(seasons, 'c'), [
    { season: '2023/24', result: 'champion', opponent: 'b' },
    { season: '2024/25', result: 'finalist', opponent: 'a' },
  ]);
  assert.deepEqual(teamHistory(seasons, 'x'), []);
});

test('rivalryRecord zjistí tituly obou týmů a vzájemná finále', () => {
  assert.deepEqual(rivalryRecord(seasons, ['a', 'c']), {
    titles: { a: 2, c: 1 },
    headToHeadFinals: ['2024/25'],
  });
});

import { historyFacts } from '../src/lib/history.js';

test('historyFacts odvodí jen fakta z dat', () => {
  const name = (id) => id.toUpperCase();
  const facts = historyFacts(seasons, [['a', 'c']], name);
  assert.ok(facts.includes('B: 2× ve finále, zatím bez titulu.'));
  assert.ok(facts.includes('Žádný šampion zatím titul neobhájil.'));
  assert.ok(!facts.some((f) => f.includes('nepotkali')));
  const facts2 = historyFacts(seasons, [['a', 'b']], name);
  assert.ok(facts2.includes('A a B se ve finále potkali v sezoně 2022/23.'));
  assert.deepEqual(historyFacts([], [], name), []);
});
