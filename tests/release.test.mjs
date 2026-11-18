// Plánované vydání: testovací scénáře rozhodování plánovaného běhu.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { parseFrontmatter, releaseDecision, buildManifest, leakedArticles, dueAt } from '../scripts/lib/release.mjs';

const A = (id, date, draft = false) => ({ id, date: new Date(date), draft });
const M = (ids, builtAt = '2026-11-18T06:17:00Z') => ({ commit: 'abc1234', builtAt, articles: ids });
const now = new Date('2026-11-23T07:35:00+01:00');

test('1) nic nového: web odpovídá poslednímu nasazení → nenasazovat', () => {
  const d = releaseDecision({ articles: [A('recap-4', '2026-11-18T07:00:00+01:00')], manifest: M(['recap-4']), now });
  assert.equal(d.deploy, false);
});

test('2) draft: false, ale čas vydání ještě nenastal → nenasazovat, článek je v „nejbližších“', () => {
  const d = releaseDecision({ articles: [A('recap-4', '2026-11-18'), A('recap-5', '2026-11-23T08:30:00+01:00')], manifest: M(['recap-4']), now });
  assert.equal(d.deploy, false);
  assert.deepEqual(d.upcoming.map((u) => u.id), ['recap-5']);
});

test('3) čas vydání nastal a článek v posledním nasazení chybí → nasadit', () => {
  const d = releaseDecision({ articles: [A('recap-4', '2026-11-18'), A('recap-5', '2026-11-23T07:30:00+01:00')], manifest: M(['recap-4']), now });
  assert.equal(d.deploy, true);
  assert.deepEqual(d.pending, ['recap-5']);
});

test('4) po úspěšném nasazení je článek v manifestu → žádné opakované nasazení', () => {
  const d = releaseDecision({ articles: [A('recap-5', '2026-11-23T07:30:00+01:00')], manifest: M(['recap-5'], '2026-11-23T06:40:00Z'), now: new Date('2026-11-23T08:05:00+01:00') });
  assert.equal(d.deploy, false);
});

test('5) neúspěšné nasazení manifest nezmění → článek zůstává k vydání, další běh to zkusí znovu', () => {
  const failedMeanwhile = M(['recap-4']);
  for (const t of ['2026-11-23T08:05:00+01:00', '2026-11-23T08:35:00+01:00']) {
    assert.deepEqual(releaseDecision({ articles: [A('recap-4', '2026-11-18'), A('recap-5', '2026-11-23T07:30:00+01:00')], manifest: failedMeanwhile, now: new Date(t) }).pending, ['recap-5']);
  }
});

test('6) koncept s minulým datem se nikdy nevydá', () => {
  const d = releaseDecision({ articles: [A('koncept', '2026-11-01', true)], manifest: M([]), now });
  assert.equal(d.deploy, false);
  assert.deepEqual(dueAt([A('koncept', '2026-11-01', true)], now), []);
});

test('7) koncept přepnutý na draft: false s minulým datem → nasadit hned při dalším běhu', () => {
  const d = releaseDecision({ articles: [A('flash', '2026-11-20T10:00:00+01:00')], manifest: M([]), now });
  assert.deepEqual(d.pending, ['flash']);
});

test('8) bez manifestu (první běh, výpadek webu) se automaticky nenasazuje', () => {
  const d = releaseDecision({ articles: [A('recap-5', '2026-11-23T07:30:00+01:00')], manifest: null, now });
  assert.equal(d.deploy, false);
  assert.match(d.reason, /ručně Run workflow/);
});

test('9) úprava už vydaného článku se plánovaně nenasazuje (jen ručně) – manifest eviduje ID, ne obsah', () => {
  const d = releaseDecision({ articles: [A('recap-4', '2026-11-18')], manifest: M(['recap-4']), now });
  assert.equal(d.deploy, false);
});

test('10) více článků najednou: jedno nasazení vydá všechny splatné', () => {
  const d = releaseDecision({ articles: [A('pr-2', '2026-11-23T06:00:00+01:00'), A('recap-5', '2026-11-23T07:30:00+01:00'), A('bts-3', '2026-11-25T19:15:00+01:00')], manifest: M([]), now });
  assert.deepEqual(d.pending.sort(), ['pr-2', 'recap-5']);
  assert.deepEqual(d.upcoming.map((u) => u.id), ['bts-3']);
});

test('manifest vzniká ze sestaveného webu a pojistka odhalí únik konceptu či budoucího článku', () => {
  const builtAt = new Date('2026-11-23T06:40:00Z');
  const m = buildManifest({ commit: 'abc', builtAt, articleDirs: ['recap-5', 'kategorie', 'recap-4'] });
  assert.deepEqual(m.articles, ['recap-4', 'recap-5']);
  const articles = [A('recap-4', '2026-11-18'), A('recap-5', '2026-11-23T07:30:00+01:00'), A('koncept', '2026-11-01', true), A('budouci', '2026-11-30')];
  assert.deepEqual(leakedArticles(m, articles), []);
  assert.deepEqual(leakedArticles({ ...m, articles: [...m.articles, 'koncept', 'budouci'] }, articles), ['koncept', 'budouci']);
});

test('všechny skutečné články mají čitelnou hlavičku s platným datem', () => {
  const dir = new URL('../src/content/articles/', import.meta.url);
  const list = readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => parseFrontmatter(readFileSync(new URL(f, dir), 'utf8'), f));
  assert.ok(list.length > 0);
  assert.ok(list.every((a) => a.date instanceof Date && !Number.isNaN(a.date.valueOf())));
  assert.throws(() => parseFrontmatter('---\ntitle: x\n---\n', 'x'), /datum/);
});

import { validManifest } from '../scripts/lib/release.mjs';

test('poškozený nebo podezřelý manifest nikdy nespustí nasazení', () => {
  const articles = [A('recap-5', '2026-11-23T07:30:00+01:00')];
  for (const bad of [null, 'text', {}, { commit: 'a', builtAt: 'x', articles: [] }, { commit: '', builtAt: '2026-11-23T06:00:00Z', articles: [] },
    { commit: 'a', builtAt: '2026-11-23T06:00:00Z', articles: 'recap-4' }, { commit: 'a', builtAt: '2026-11-23T06:00:00Z', articles: ['Recap 4', '../x'] },
    { commit: 'a', builtAt: '2026-11-23T06:00:00Z', articles: ['recap-4', 'recap-4'] }]) {
    assert.equal(validManifest(bad), null);
    assert.equal(releaseDecision({ articles, manifest: bad, now }).deploy, false);
  }
  assert.ok(validManifest(M(['recap-4'])));
});

test('naplánovaný článek ve stejném, už nasazeném commitu se v čas vydání nasadí (běžný případ)', () => {
  // Commit nasazen ráno ručně, recap-5 naplánovaný na 7:30 v něm ještě (správně) chybí.
  const d = releaseDecision({ articles: [A('recap-5', '2026-11-23T07:30:00+01:00')], manifest: { ...M([], '2026-11-23T05:00:00Z'), commit: 'c0ffee1' }, now, headCommit: 'c0ffee1' });
  assert.equal(d.deploy, true);
  assert.deepEqual(d.stuck, []);
});

test('úprava či chyba u článku nevytvoří nekonečný cyklus: uvízlý článek se znovu nenasazuje', () => {
  // Článek byl splatný už při buildu nasazeného commitu, a přesto v manifestu chybí → stejný commit znovu nenasazovat.
  const stuckCase = { articles: [A('rozbity', '2026-11-20T08:00:00+01:00')], manifest: { ...M([], '2026-11-23T06:00:00Z'), commit: 'c0ffee1' }, now, headCommit: 'c0ffee1' };
  const d = releaseDecision(stuckCase);
  assert.equal(d.deploy, false);
  assert.equal(d.error, true);
  assert.deepEqual(d.stuck, ['rozbity']);
  // Nový commit (oprava hlavičky) už nasazení povolí.
  assert.equal(releaseDecision({ ...stuckCase, headCommit: 'beef002' }).deploy, true);
  // Uvízlý článek neblokuje jiný splatný článek.
  const mixed = releaseDecision({ ...stuckCase, articles: [...stuckCase.articles, A('recap-5', '2026-11-23T07:30:00+01:00')] });
  assert.equal(mixed.deploy, true);
  assert.deepEqual([mixed.pending, mixed.stuck], [['recap-5'], ['rozbity']]);
});
