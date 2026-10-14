import { test } from 'node:test';
import assert from 'node:assert/strict';
import { joinBase } from '../src/lib/url.js';

test('joinBase spojí base path s cestou bez dvojitých lomítek', () => {
  assert.equal(joinBase('/sl-network/', '/clanky/'), '/sl-network/clanky/');
  assert.equal(joinBase('/sl-network', 'clanky/a/'), '/sl-network/clanky/a/');
  assert.equal(joinBase('/', '/'), '/');
  assert.equal(joinBase('/sl-network/', ''), '/sl-network/');
  assert.equal(joinBase('/sl-network/', 'robots.txt'), '/sl-network/robots.txt');
});

test('joinBase nechá absolutní URL beze změny', () => {
  assert.equal(joinBase('/sl-network/', 'https://espn.com/x'), 'https://espn.com/x');
});
