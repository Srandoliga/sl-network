import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { overallPick, snakeRound, draftRows, expectedContinuingOrder } from '../src/lib/draft.js';
import { validateDraft } from '../scripts/lib/validate-draft.mjs';

const json = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
const draft = json('src/data/draft/2026-27.json');
const history = json('src/data/historie/2025-26.json');
const teams = json('src/data/teams.json');
const playingIds = new Set(teams.filter((t) => t.status !== 'former').map((t) => t.id));
const newIds = new Set(teams.filter((t) => t.status === 'new').map((t) => t.id));

test('overallPick: první pozice #1, #20, #21; desátá #10, #11, #30', () => {
  assert.deepEqual([1, 2, 3].map((r) => overallPick(1, r, 10)), [1, 20, 21]);
  assert.deepEqual([1, 2, 3].map((r) => overallPick(10, r, 10)), [10, 11, 30]);
});

test('snakeRound střídá směr kol', () => {
  assert.deepEqual(snakeRound(1, 4), [1, 2, 3, 4]);
  assert.deepEqual(snakeRound(2, 4), [4, 3, 2, 1]);
  assert.deepEqual(snakeRound(3, 4), [1, 2, 3, 4]);
});

test('expectedContinuingOrder: obrácená bilance, při shodě horší konečné umístění dřív', () => {
  const ids = ['kutlaks-amateurs', 'acl-rokycany', 'abukuafi-vzdejto', 'tachovsky-gadzo'];
  assert.deepEqual(expectedContinuingOrder(ids, history), ['tachovsky-gadzo', 'abukuafi-vzdejto', 'kutlaks-amateurs', 'acl-rokycany']);
  assert.deepEqual(ids, ['kutlaks-amateurs', 'acl-rokycany', 'abukuafi-vzdejto', 'tachovsky-gadzo']);
});

test('draftRows doplní bilanci z archivu, nováčci ji nemají', () => {
  const rows = draftRows(draft.order, (id) => teams.find((t) => t.id === id), history);
  assert.equal(rows[0].team.name, 'Litice Hoopers');
  assert.equal(rows[0].record, null);
  assert.deepEqual(rows[9].record, { w: 19, l: 1, t: 0 });
  assert.equal(rows[9].pick, 10);
});

test('uložené pořadí 2026/27 projde validací', () => {
  assert.deepEqual(validateDraft(draft, '2026-27.json', { playingIds, newIds, history }).errors, []);
});

test('validateDraft odhalí prohozené pořadí, duplicitu i chybějící tým', () => {
  const swapped = { ...draft, order: draft.order.map((id) => (id === 'abukuafi-vzdejto' ? 'kutlaks-amateurs' : id === 'kutlaks-amateurs' ? 'abukuafi-vzdejto' : id)) };
  assert.match(validateDraft(swapped, 'x.json', { playingIds, newIds, history }).errors.join(), /neodpovídá bilancím/);
  const dup = { ...draft, order: [...draft.order.slice(0, 9), 'litice-hoopers'] };
  const errs = validateDraft(dup, 'x.json', { playingIds, newIds, history }).errors.join();
  assert.match(errs, /víckrát/);
  assert.match(errs, /chybí: acl-rokycany/);
  const late = { ...draft, order: [...draft.order.slice(1, 3), 'litice-hoopers', ...draft.order.slice(3)] };
  assert.match(validateDraft(late, 'x.json', { playingIds, newIds, history }).errors.join(), /nováčci/);
});

test('embedDraftBlocks nahradí značky tabulkou a přehledem kol, jiné HTML nechá být', async () => {
  const { embedDraftBlocks } = await import('../src/lib/draft-embed.mjs');
  const root = new URL('..', import.meta.url).pathname;
  const out = embedDraftBlocks('<p>a</p>\n<!-- draft-order: 2026-27 -->\n<!-- snake-rounds: 2026-27 -->', { base: '/sl-network/', root });
  assert.doesNotMatch(out, /<!--/);
  assert.equal((out.match(/<tr/g) ?? []).length, 11);
  assert.match(out, /href="\/sl-network\/tymy\/acl-rokycany\/"/);
  assert.match(out, /19–1/);
  assert.match(out, /2\. kolo/);
  // 2. kolo: pozice zleva 1–10, zvýrazněná desítka vpravo
  const round2 = out.split('<li>')[2];
  assert.match(round2, /<span>1<\/span>.*<span class="is-start">10<\/span>/);
  assert.match(out.split('<li>')[1], /<span class="is-start">1<\/span>/);
  assert.equal(embedDraftBlocks('<p>bez značek</p>', { root }), '<p>bez značek</p>');
});

test('výsledek draftu 2026/27: 130 výběrů, 13 kol po 10, 13 hráčů na tým, Snake Draft, bez duplicit', async () => {
  const { validatePicks } = await import('../scripts/lib/validate-draft.mjs');
  assert.equal(draft.picks.length, 130);
  assert.equal(draft.rounds, 13);
  assert.deepEqual(validatePicks(draft, 'x'), { errors: [], warnings: [] });
  const ids = new Set(teams.map((t) => t.id));
  assert.ok(draft.picks.every((p) => ids.has(p.team)));
  assert.deepEqual(draft.picks.filter((p) => p.team === 'litice-hoopers').map((p) => p.pick).slice(0, 3), [1, 20, 21]);
  assert.deepEqual(draft.picks.filter((p) => p.team === 'acl-rokycany').map((p) => p.pick).slice(0, 3), [10, 11, 30]);
});

test('validatePicks odhalí prohozený výběr, duplicitního hráče i chybějící výběr', async () => {
  const { validatePicks } = await import('../scripts/lib/validate-draft.mjs');
  const swapped = { ...draft, picks: draft.picks.map((p) => (p.pick === 11 ? { ...p, team: 'litice-hoopers' } : p)) };
  assert.match(validatePicks(swapped, 'x').errors.join(), /#11: vybírá litice-hoopers, podle Snake Draftu má vybírat acl-rokycany/);
  const dup = { ...draft, picks: draft.picks.map((p) => (p.pick === 130 ? { ...p, player: 'Nikola Jokić' } : p)) };
  assert.match(validatePicks(dup, 'x').errors.join(), /víckrát: nikola jokic/);
  const short = { ...draft, picks: draft.picks.slice(0, 129) };
  assert.match(validatePicks(short, 'x').errors.join(), /výběrů je 129/);
});

test('draftRosters: deset soupisek po 13 hráčích v pořadí draftu', async () => {
  const { draftRosters } = await import('../src/lib/draft.js');
  const rosters = draftRosters(draft.order, draft.picks, (id) => teams.find((t) => t.id === id));
  assert.equal(rosters.length, 10);
  assert.ok(rosters.every((r) => r.picks.length === 13));
  assert.equal(rosters[0].team.name, 'Litice Hoopers');
  assert.equal(rosters[1].picks[0].player, 'Victor Wembanyama');
});
