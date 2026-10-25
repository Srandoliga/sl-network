import { test } from 'node:test';
import assert from 'node:assert/strict';
import { internalUrls, urlToDistPath, checkPage } from '../scripts/lib/check-html.mjs';

test('internalUrls najde interní odkazy včetně absolutních na vlastní doménu', () => {
  const html = '<a href="/sl/a/"></a><img src="https://x.io/sl/i.png"><a href="https://espn.com"></a><a href="#x"></a><link href="//cdn.x/y">';
  assert.deepEqual(internalUrls(html, 'https://x.io'), ['/sl/a/', '/sl/i.png']);
});

test('urlToDistPath respektuje base path', () => {
  assert.equal(urlToDistPath('/sl/', '/sl'), '/index.html');
  assert.equal(urlToDistPath('/sl/clanky/a/#x', '/sl'), '/clanky/a/index.html');
  assert.equal(urlToDistPath('/sl/og.png', '/sl'), '/og.png');
  assert.equal(urlToDistPath('/clanky/', '/sl'), null);
  assert.equal(urlToDistPath('/slx/', '/sl'), null);
});

test('checkPage hlásí chybějící noindex, špatnou base path a mrtvé odkazy', () => {
  const ok = '<meta name="robots" content="noindex, nofollow"><meta property="og:title" content="t"><meta property="og:image" content="https://x.io/sl/og.png">';
  const files = new Set(['/index.html', '/og.png']);
  const exists = (p) => files.has(p);
  assert.deepEqual(checkPage({ file: 'a', html: `${ok}<a href="/sl/">x</a>`, base: '/sl', origin: 'https://x.io', exists }), []);
  const errs = checkPage({ file: 'a', html: '<a href="/clanky/">x</a><a href="/sl/nic/">y</a>', base: '/sl', origin: 'https://x.io', exists });
  assert.equal(errs.length, 5);
});

test('kotvy: hlídá odkazy na neexistující id na stejné i jiné stránce', async () => {
  const { fragmentErrors, pageIds } = await import('../scripts/lib/check-html.mjs');
  const target = '<li id="vyber-1"></li><div id="kolo-1"></div>';
  const idsOf = (p) => (p === '/drafty/index.html' ? pageIds(target) : new Set());
  const html = '<a href="#a"></a><span id="a"></span><a href="#chybi"></a><a href="/sl/drafty/#vyber-1"></a><a href="/sl/drafty/#vyber-999"></a>';
  const errs = fragmentErrors({ file: 'x', html, base: '/sl', origin: 'https://x.io', idsOf });
  assert.equal(errs.length, 2);
  assert.match(errs[0], /#chybi/);
  assert.match(errs[1], /vyber-999/);
  assert.deepEqual([...pageIds(target)], ['vyber-1', 'kolo-1']);
});
