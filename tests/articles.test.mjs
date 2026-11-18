import { test } from 'node:test';
import assert from 'node:assert/strict';
import { visibleArticles, sortByDateDesc, pickLeadStory, buildTeaser, formatDateCs, listedCategories } from '../src/lib/articles.js';

const mk = (id, date, extra = {}) => ({ id, data: { date: new Date(date), title: id, perex: `perex ${id}`, draft: false, featured: false, ...extra } });

test('sortByDateDesc řadí od nejnovějšího a nemění vstup', () => {
  const list = [mk('a', '2026-01-01'), mk('b', '2026-03-01'), mk('c', '2026-02-01')];
  assert.deepEqual(sortByDateDesc(list).map((a) => a.id), ['b', 'c', 'a']);
  assert.deepEqual(list.map((a) => a.id), ['a', 'b', 'c']);
});

test('visibleArticles skryje koncepty, pokud nejsou povolené', () => {
  const list = [mk('a', '2026-01-01'), mk('b', '2026-02-01', { draft: true })];
  assert.deepEqual(visibleArticles(list, false).map((a) => a.id), ['a']);
  assert.deepEqual(visibleArticles(list, true).map((a) => a.id), ['b', 'a']);
});

test('pickLeadStory preferuje nejnovější featured článek', () => {
  const list = [mk('a', '2026-03-01'), mk('b', '2026-01-01', { featured: true }), mk('c', '2026-02-01', { featured: true })];
  assert.equal(pickLeadStory(sortByDateDesc(list)).id, 'c');
  assert.equal(pickLeadStory(sortByDateDesc([mk('x', '2026-01-01')])).id, 'x');
  assert.equal(pickLeadStory([]), undefined);
});

test('buildTeaser nepřidá odkaz podruhé, když ho upoutávka už obsahuje', () => {
  assert.equal(buildTeaser({ title: 'T', perex: 'P', teaser: 'A\n👇 Celé:\nhttps://x.cz/a/\n' }, 'https://x.cz/a/'), 'A\n👇 Celé:\nhttps://x.cz/a/');
});

test('buildTeaser použije vlastní upoutávku nebo titulek s perexem a přidá odkaz', () => {
  assert.equal(
    buildTeaser({ title: 'T', perex: 'P' }, 'https://x.cz/a/'),
    '📰 T\nP\n👉 https://x.cz/a/',
  );
  assert.equal(buildTeaser({ title: 'T', perex: 'P', teaser: 'Vlastní' }, 'https://x.cz/a/'), 'Vlastní\n👉 https://x.cz/a/');
});

test('formatDateCs vrací české datum', () => {
  assert.equal(formatDateCs(new Date('2026-10-13T12:00:00Z')), '13. října 2026');
});

import { splitHeadline } from '../src/lib/articles.js';

test('splitHeadline oddělí první větu', () => {
  assert.deepEqual(splitHeadline('Dvě dynastie. Jedna liga.'), { lead: 'Dvě dynastie.', rest: 'Jedna liga.' });
  assert.deepEqual(splitHeadline('Bez tečky'), { lead: 'Bez tečky', rest: '' });
  assert.deepEqual(splitHeadline('Kdo vyhraje? Nikdo neví.'), { lead: 'Kdo vyhraje?', rest: 'Nikdo neví.' });
});

import { coverImage, ogImageFor } from '../src/lib/articles.js';

test('coverImage použije vlastní obrázek, jinak obrázek rubriky', () => {
  assert.equal(coverImage({ image: 'obrazky/clanky/x.webp', category: 'zpravy' }), 'obrazky/clanky/x.webp');
  assert.equal(coverImage({ category: 'analyza' }), 'obrazky/clanky/rubrika-analyza.webp');
});

test('ogImageFor najde JPG náhled k WebP, jiné formáty nechá', () => {
  assert.equal(ogImageFor('obrazky/clanky/x.webp'), 'obrazky/clanky/x-og.jpg');
  assert.equal(ogImageFor('obrazky/clanky/x.png'), 'obrazky/clanky/x.png');
});

test('listedCategories skryje prázdnou rubriku s hideWhenEmpty, ostatní ponechá', () => {
  const cats = [{ id: 'zpravy' }, { id: 'bts', hideWhenEmpty: true }];
  assert.deepEqual(listedCategories(cats, [mk('a', '2026-01-01', { category: 'zpravy' })]).map((c) => c.id), ['zpravy']);
  assert.deepEqual(listedCategories(cats, [mk('a', '2026-01-01', { category: 'bts' })]).map((c) => c.id), ['zpravy', 'bts']);
});

test('visibleArticles skryje článek s budoucím datem až do jeho času (jen veřejně)', () => {
  const list = [mk('a', '2026-10-28T07:00:00Z'), mk('b', '2026-10-28T18:15:00Z')];
  assert.deepEqual(visibleArticles(list, false, new Date('2026-10-28T12:00:00Z')).map((a) => a.id), ['a']);
  assert.deepEqual(visibleArticles(list, false, new Date('2026-10-28T18:15:00Z')).map((a) => a.id), ['b', 'a']);
  assert.deepEqual(visibleArticles(list, true, new Date('2026-10-28T12:00:00Z')).map((a) => a.id), ['b', 'a']);
});

import { pickTicker, homeLayout, upcomingIssue, articlesAboutTeam } from '../src/lib/articles.js';

const art = (id, date, extra = {}) => ({ id, body: extra.body ?? '', data: { date: new Date(date), title: id, perex: `p ${id}`, draft: false, featured: false, author: 'benson', category: 'zpravy', ...extra } });

test('ticker: text i odkaz vždy z nejnovějšího článku, i když hlavní příběh je starší featured', () => {
  const sorted = sortByDateDesc([art('flash', '2026-11-06', { category: 'flash' }), art('recap', '2026-11-02', { featured: true })]);
  const { lead, ticker } = homeLayout(sorted);
  assert.equal(lead.id, 'recap');
  assert.equal(ticker.id, 'flash');
  assert.equal(pickTicker([]), undefined);
});

test('homeLayout: nový featured článek automaticky nahradí hlavní příběh', () => {
  const before = sortByDateDesc([art('bts2', '2026-11-11', { featured: true, category: 'beyond-the-score' }), art('recap3', '2026-11-09', { featured: true })]);
  assert.equal(homeLayout(before).lead.id, 'bts2');
  const after = sortByDateDesc([...before, art('w5', '2026-11-15', { featured: true, category: 'matchup-preview' })]);
  const l = homeLayout(after);
  assert.equal(l.lead.id, 'w5');
  assert.equal(l.beyond.id, 'bts2', 'Beyond the Score se vrací do vlastního bloku');
  assert.ok(!l.latest.some((a) => a.id === 'w5' || a.id === 'bts2'), 'nejnovější články neopakují hlavní příběh ani blok BtS');
});

test('homeLayout: Beyond the Score jako hlavní příběh nemá druhou velkou kartu', () => {
  const l = homeLayout(sortByDateDesc([art('bts', '2026-11-11', { featured: true, category: 'beyond-the-score' }), art('x', '2026-11-10')]));
  assert.equal(l.lead.id, 'bts');
  assert.equal(l.beyond, undefined);
  assert.equal(l.lastBeyond.id, 'bts');
});

test('homeLayout: bez featured článku je hlavním příběhem nejnovější; bez článků nic nespadne', () => {
  assert.equal(homeLayout(sortByDateDesc([art('a', '2026-01-01'), art('b', '2026-02-01')])).lead.id, 'b');
  const empty = homeLayout([], ['benson']);
  assert.equal(empty.lead, undefined);
  assert.deepEqual(empty.latest, []);
  assert.equal(empty.experts.benson, undefined);
});

test('homeLayout: redaktor dostane svůj nejnovější článek, který ještě není na homepage', () => {
  const sorted = sortByDateDesc([
    art('lead', '2026-11-11', { featured: true, author: 'brooks' }),
    art('b1', '2026-11-10'), art('b2', '2026-11-09'), art('b3', '2026-11-08'), art('b4', '2026-11-07'),
    art('b5', '2026-11-06'),
    art('brooks-old', '2026-10-28', { author: 'brooks' }),
  ]);
  const l = homeLayout(sorted, ['benson', 'brooks', 'vrana']);
  assert.equal(l.experts.benson.id, 'b5');
  assert.equal(l.experts.brooks.id, 'brooks-old');
  assert.equal(l.experts.vrana, undefined);
});

test('homeLayout: když už redaktor nic dalšího nemá, zobrazí se jeho nejnovější článek', () => {
  const l = homeLayout(sortByDateDesc([art('only', '2026-11-11', { author: 'vrana' })]), ['vrana']);
  assert.equal(l.experts.vrana.id, 'only');
});

test('upcomingIssue: ohlášený díl jen do jeho data', () => {
  const a = { data: { nextIssue: { date: new Date('2026-11-25'), title: 'T' } } };
  assert.equal(upcomingIssue(a, new Date('2026-11-12T10:00:00Z')).title, 'T');
  assert.equal(upcomingIssue(a, new Date('2026-11-25T20:00:00Z')).title, 'T');
  assert.equal(upcomingIssue(a, new Date('2026-11-26T06:00:00Z')), undefined);
  assert.equal(upcomingIssue(undefined), undefined);
});

test('articlesAboutTeam: podle odkazů na profil, i pod dřívějším ID, nejnovější první', () => {
  const sorted = sortByDateDesc([
    art('a', '2026-11-01', { body: '[**Litice**](../../tymy/litice-hoopers/)' }),
    art('b', '2026-11-05', { body: 'odkaz ../../tymy/litice-hoops/#x' }),
    art('c', '2026-11-03', { body: 'bez odkazu na Litice' }),
    art('d', '2026-11-04', { body: '../../tymy/litice-hoopers-b/' }),
  ]);
  assert.deepEqual(articlesAboutTeam(sorted, ['litice-hoopers', 'litice-hoops']).map((x) => x.id), ['b', 'a']);
});

import { rankingEditions, latestRanking, withMovement, moveLabel, rankingsTableHtml } from '../src/lib/power-rankings.js';

const pr = (id, date, teams, extra = {}) => art(id, date, { category: 'power-rankings', author: 'brooks', rankings: { edition: extra.edition ?? 1, afterRound: extra.afterRound ?? 2, entries: teams.map((t, i) => ({ team: t, record: `${i}–0`, points: 1000 + i })) }, ...extra });

test('latestRanking: poslední vydaný žebříček, bez vydání undefined', () => {
  assert.equal(latestRanking(sortByDateDesc([art('x', '2026-11-01')])), undefined);
  const one = latestRanking(sortByDateDesc([pr('pr1', '2026-11-04', ['a', 'b', 'c'])]));
  assert.equal(one.edition, 1);
  assert.equal(one.previous, undefined);
  assert.deepEqual(one.entries.map((e) => [e.team, e.rank, e.move]), [['a', 1, null], ['b', 2, null], ['c', 3, null]]);
});

test('Power Rankings #2 automaticky nahradí #1 a ukáže pohyb v pořadí', () => {
  const sorted = sortByDateDesc([
    pr('pr1', '2026-11-04', ['a', 'b', 'c', 'd']),
    pr('pr2', '2026-11-18', ['c', 'a', 'b', 'e'], { edition: 2, afterRound: 4 }),
    art('recap', '2026-11-20'),
  ]);
  const r = latestRanking(sorted);
  assert.equal(r.article.id, 'pr2');
  assert.equal(r.previous.id, 'pr1');
  assert.deepEqual(r.entries.map((e) => [e.team, e.move]), [['c', 2], ['a', -1], ['b', -1], ['e', null]]);
  assert.equal(moveLabel(r.entries[0], true).mark, '▲ 2');
  assert.equal(moveLabel(r.entries[1], true).kind, 'down');
  assert.equal(moveLabel(r.entries[3], true).mark, 'NEW');
  assert.equal(moveLabel(r.entries[0], false), null);
});

test('žebříček se nepřepočítává: koncept ani článek bez rankings ho nezmění', () => {
  const sorted = sortByDateDesc([pr('pr1', '2026-11-04', ['a', 'b']), art('pr-bez-dat', '2026-11-10', { category: 'power-rankings' })]);
  assert.deepEqual(rankingEditions(sorted).map((a) => a.id), ['pr1']);
  assert.equal(latestRanking(sorted).article.id, 'pr1');
});

test('withMovement: beze změny = 0, chybějící předchozí = null', () => {
  const m = withMovement([{ team: 'a' }, { team: 'b' }], [{ team: 'a' }, { team: 'c' }]);
  assert.deepEqual(m.map((e) => [e.rank, e.prev, e.move]), [[1, 1, 0], [2, null, null]]);
  assert.equal(moveLabel(m[0], true).kind, 'same');
});

test('rankingsTableHtml: tabulka z dat, odkaz na sekci týmu nebo profil, pohyb až od 2. vydání', () => {
  const sorted = sortByDateDesc([pr('pr1', '2026-11-04', ['a', 'b']), pr('pr2', '2026-11-18', ['b', 'a'], { edition: 2 })]);
  const html = rankingsTableHtml(latestRanking(sorted), { teamName: (id) => id.toUpperCase(), hasLogo: (id) => id === 'a', html: '<h2 id="tym-b">B</h2>' });
  assert.match(html, /href="#tym-b"/);
  assert.match(html, /href="\.\.\/\.\.\/tymy\/a\/"/);
  assert.match(html, /obrazky\/tymy\/a\.webp/);
  assert.match(html, /▲ 1/);
  assert.match(html, /1&nbsp;000/);
  const first = rankingsTableHtml(latestRanking(sortByDateDesc([pr('pr1', '2026-11-04', ['a'])])), { teamName: (x) => x, hasLogo: () => false });
  assert.doesNotMatch(first, /pr-move/);
});
