import { test } from 'node:test';
import assert from 'node:assert/strict';
import { visibleArticles, sortByDateDesc, pickLeadStory, buildTeaser, formatDateCs } from '../src/lib/articles.js';

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
