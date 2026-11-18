// Vnitřní propojení: navigace rubriky, související články, články o týmu a o sezoně.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortByDateDesc, visibleArticles } from '../src/lib/articles.js';
import { seriesNav, relatedArticles, teamArticles, seasonArticles, linkedTeams, linkedArticles, relevance } from '../src/lib/related.js';

const ALL10 = ['acl-rokycany', 'little-barns-fireballs', 'pilsen-beers', 'chlumcany-jzd', 'los-mustachios', 'kutlaks-amateurs', 'abukuafi-vzdejto', 'tachovsky-gadzo', 'litice-hoopers', 'mc-rising-stars'];
const links = (ids) => ids.map((t) => `[x](../../tymy/${t}/)`).join(' ');
const art = (id, date, category, { teams, body = '', draft = false } = {}) => ({ id, body, data: { date: new Date(date), category, draft, title: id, ...(teams ? { relatedTeams: teams } : {}) } });

const recap = (n, date, teams) => art(`recap-${n}`, date, 'weekly-recap', { teams, body: links(ALL10) });
const R1 = recap(1, '2026-10-26', ['little-barns-fireballs', 'tachovsky-gadzo', 'acl-rokycany']);
const R2 = recap(2, '2026-11-02', ['mc-rising-stars', 'acl-rokycany', 'pilsen-beers']);
const R3 = recap(3, '2026-11-09', ['little-barns-fireballs', 'los-mustachios', 'mc-rising-stars', 'pilsen-beers']);
const R4 = recap(4, '2026-11-18', ['los-mustachios', 'acl-rokycany', 'pilsen-beers', 'mc-rising-stars']);
const BTS = art('bts-2', '2026-11-11', 'beyond-the-score', { teams: ['abukuafi-vzdejto'], body: `${links(['abukuafi-vzdejto', 'little-barns-fireballs'])} [s](../../historie/2025-26/) [s](../../historie/2025-26/#z) [s](../../historie/2024-25/)` });
const W5 = art('w5', '2026-11-15', 'matchup-preview', { teams: ['mc-rising-stars', 'tachovsky-gadzo', 'acl-rokycany', 'little-barns-fireballs'], body: `${links(ALL10)} [BtS](../bts-2/) [h](../../historie/2025-26/)` });
const REDAKCE = art('redakce', '2026-10-14', 'redakce', { body: 'Bez odkazů.' });
const DRAFT_ARCHIV = art('draft', '2026-10-20', 'draft-report', { body: `${links(ALL10)} [d](../../historie/drafty/2025-26/#vyber-1)` });
const sorted = sortByDateDesc([R1, R2, R3, R4, BTS, W5, REDAKCE, DRAFT_ARCHIV]);

test('navigace Recap #1 → #2 → #3 → #4 (jen stejná rubrika, bez vydání navíc)', () => {
  const chain = [R1, R2, R3, R4].map((r) => seriesNav(sorted, r));
  assert.deepEqual(chain.map(({ prev, next }) => [prev?.id ?? null, next?.id ?? null]), [
    [null, 'recap-2'], ['recap-1', 'recap-3'], ['recap-2', 'recap-4'], ['recap-3', null],
  ]);
  assert.deepEqual(seriesNav(sorted, REDAKCE), { prev: undefined, next: undefined }, 'nepravidelná rubrika navigaci nemá');
});

test('další vydání se připojí až po zveřejnění – koncept ani budoucí recap se neodkáže', () => {
  const R5 = recap(5, '2026-11-23T07:00:00+01:00', ['los-mustachios']);
  const draft = { ...R5, data: { ...R5.data, draft: true } };
  const before = visibleArticles([R1, R2, R3, R4, R5], false, new Date('2026-11-20'));
  assert.equal(seriesNav(before, R4).next, undefined, 'budoucí');
  assert.equal(seriesNav(visibleArticles([R4, draft], false, new Date('2026-11-24')), R4).next, undefined, 'koncept');
  const after = visibleArticles([R1, R2, R3, R4, R5], false, new Date('2026-11-23T08:00:00+01:00'));
  assert.equal(seriesNav(after, R4).next.id, 'recap-5');
});

test('související u Recapu #4: podle společných hlavních organizací, bez předchozího/dalšího vydání a bez duplicit', () => {
  const { prev, next } = seriesNav(sorted, R4);
  const rel = relatedArticles(sorted, R4, { exclude: [prev, next] });
  assert.ok(rel.length <= 2);
  assert.ok(!rel.some((a) => a.id === R4.id || a.id === prev.id));
  assert.equal(new Set(rel.map((a) => a.id)).size, rel.length);
  assert.equal(rel[0].id, 'recap-2', 'tři společné hlavní organizace');
});

test('ligové souhrny s odkazy na všech deset týmů samy o sobě souvislost nezakládají', () => {
  assert.deepEqual(relevance(BTS, R2), [0, 0, 0, 0], 'recap odkazuje na AbuKaufí, ale je to ligový souhrn (10 týmů)');
  assert.deepEqual(relevance(R1, DRAFT_ARCHIV), [0, 0, 0, 0], 'odkaz na archiv draftů není odkaz na sezonu');
  assert.deepEqual(relatedArticles(sorted, REDAKCE), [], 'bez souvislosti nic – žádné doplňování nejnovějšími');
});

test('přímý odkaz a společná sezona souvislost zakládají (BtS ↔ Week 5 Preview)', () => {
  assert.deepEqual(linkedArticles(W5), ['bts-2']);
  const [both, direct, , seasons] = relevance(BTS, W5);
  assert.deepEqual([both, direct, seasons], [0, 1, 1]);
  assert.equal(relatedArticles(sorted, BTS)[0].id, 'w5');
});

test('profil AbuKaufí: tematický Beyond the Score zůstane první i po dalších recapech', () => {
  const later = sortByDateDesc([...sorted, recap(5, '2026-11-23', ['abukuafi-vzdejto', 'kutlaks-amateurs']), recap(6, '2026-11-30', ['los-mustachios'])]);
  const list = teamArticles(later, ['abukuafi-vzdejto']);
  assert.deepEqual(list.slice(0, 2).map((x) => [x.article.id, x.tier]), [['bts-2', 1], ['recap-5', 3]]);
  assert.ok(list.slice(2).every((x) => x.tier === 4), 'ostatní jen zmínky');
  assert.deepEqual(list.filter((x) => x.tier === 4).map((x) => x.article.id), list.filter((x) => x.tier === 4).map((x) => x.article.id).sort((a, b) => later.findIndex((y) => y.id === a) - later.findIndex((y) => y.id === b)), 'v rámci úrovně od nejnovějšího');
});

test('články bez relatedTeams: na profilu jen jako zmínky (úroveň 4), nic se nevymýšlí', () => {
  const list = teamArticles(sorted, ['kutlaks-amateurs']);
  assert.ok(list.length > 0);
  assert.ok(list.every((x) => x.tier === 4));
  assert.deepEqual(teamArticles([REDAKCE], ['kutlaks-amateurs']), []);
  assert.deepEqual(linkedTeams(art('x', '2026-01-01', 'zpravy', { body: '![](../../obrazky/tymy/acl-rokycany.webp) [ACL](../../tymy/acl-rokycany/#historie-klubu)' })), ['acl-rokycany']);
});

test('články o sezoně: jen skutečné odkazy na stránku sezony, víc odkazů = vyšší váha, nejvýš tři', () => {
  assert.deepEqual(seasonArticles(sorted, '2025-26').map((a) => a.id), ['bts-2', 'w5']);
  assert.deepEqual(seasonArticles(sorted, '2024-25').map((a) => a.id), ['bts-2']);
  assert.deepEqual(seasonArticles(sorted, '2022-23'), [], 'letopočet v textu ani archiv draftů nestačí');
  const many = sortByDateDesc([1, 2, 3, 4].map((i) => art(`s${i}`, `2026-11-0${i}`, 'zpravy', { body: '[h](../../historie/2023-24/)'.repeat(i) })));
  assert.deepEqual(seasonArticles(many, '2023-24').map((a) => a.id), ['s4', 's3', 's2']);
});

import { endRelated, missingPreferred } from '../src/lib/related.js';

const PR1 = art('pr-1', '2026-11-04', 'power-rankings', { teams: ['pilsen-beers', 'acl-rokycany', 'little-barns-fireballs'], body: links(ALL10) });
const withPref = (a, ids) => ({ ...a, data: { ...a.data, relatedArticles: ids } });

test('Recap #4 s relatedArticles: přesně Week 5 Preview a Power Rankings #1 v daném pořadí', () => {
  const R4p = withPref(R4, ['w5', 'pr-1']);
  const list = sortByDateDesc([R1, R2, R3, R4p, BTS, W5, PR1]);
  const { prev, next } = seriesNav(list, R4p);
  assert.deepEqual(endRelated(list, R4p, { exclude: [prev, next] }).map((a) => a.id), ['w5', 'pr-1']);
});

test('preferovaný článek, který ještě nevyšel (budoucí nebo koncept), se nahradí automatickým výběrem', () => {
  const R4p = withPref(R4, ['w5', 'pr-1']);
  const future = { ...W5, data: { ...W5.data, date: new Date('2026-12-01') } };
  const draft = { ...PR1, data: { ...PR1.data, draft: true } };
  const visible = visibleArticles([R1, R2, R3, R4p, BTS, future, draft], false, new Date('2026-11-20'));
  const rel = endRelated(visible, R4p, { exclude: [seriesNav(visible, R4p).prev] });
  assert.equal(rel.length, 2);
  assert.ok(!rel.some((a) => a.id === 'w5' || a.id === 'pr-1'), 'neodkazuje na nevydané');
  assert.equal(rel[0].id, 'recap-2', 'doplněno automaticky podle souvislosti');
});

test('bez relatedArticles platí automatický výběr; preferovaný předchozí díl ani duplicita se neopakuje', () => {
  assert.deepEqual(endRelated(sorted, R4, { exclude: [R3] }).map((a) => a.id), relatedArticles(sorted, R4, { exclude: [R3] }).map((a) => a.id));
  const dup = withPref(R4, ['recap-3', 'recap-2']);
  const rel = endRelated(sorted, dup, { exclude: [R3] });
  assert.equal(rel[0].id, 'recap-2');
  assert.equal(new Set(rel.map((a) => a.id)).size, rel.length);
  assert.ok(!rel.some((a) => a.id === 'recap-3'), 'předchozí díl je už v navigaci');
});

test('překlep v relatedArticles odhalí build (neexistující ID)', () => {
  assert.deepEqual(missingPreferred(withPref(R4, ['w5', 'pr-l']), ['w5', 'pr-1']), ['pr-l']);
  assert.deepEqual(missingPreferred(R4, ['w5']), []);
});

test('Beyond the Score o AbuKaufí zůstane mezi viditelnými i po dalších FLASH článcích a recapech', () => {
  const extra = [1, 2, 3].map((i) => art(`flash-${i}`, `2026-12-0${i}`, 'flash', { teams: ['abukuafi-vzdejto'] }));
  const recaps = [5, 6, 7].map((n, i) => recap(n, `2026-12-1${i}`, ['abukuafi-vzdejto']));
  const list = teamArticles(sortByDateDesc([...sorted, ...extra, ...recaps]), ['abukuafi-vzdejto']);
  assert.equal(list[0].article.id, 'bts-2');
  assert.deepEqual(list.slice(1, 4).map((x) => x.article.id), ['flash-3', 'flash-2', 'flash-1']);
});
