import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { canonicalGames, completedOnly, seasonRecord, latestRound, headToHead, streaks } from '../src/lib/matches.js';
import { weekSummary, formatRoundSpan } from '../src/lib/home.js';
import { teamHistoryModel } from '../src/lib/team-history.js';
import { aliasMap } from '../src/lib/draft-history.js';
import { validateMatchSeason } from '../scripts/lib/validate-matches.mjs';

const root = new URL('../src/data/', import.meta.url);
const json = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const list = (dir) => readdirSync(new URL(dir, root)).map((f) => json(`${dir}/${f}`)).sort((a, b) => a.season.localeCompare(b.season));
const history = list('historie');
// Živá data rostou s každým kolem. Scénáře 3. kola běží na zafixovaném výřezu kol 1–3; stav živých dat má vlastní test.
const live = json('zapasy/2026-27.json');
const upTo = (n) => ({ ...structuredClone(live), matchups: live.matchups.filter((m) => m.matchup <= n), games: live.games.filter((g) => g.matchup <= n) });
const completedSeasons = list('zapasy').filter((s) => !s.inProgress);
const current = upTo(3);
const all = canonicalGames([...completedSeasons, current], history);
const liveAll = canonicalGames(list('zapasy'), history);
const playing = json('teams.json').filter((t) => t.status !== 'former').map((t) => t.id);
const recap = (round, date, extra = {}) => ({ id: `recap-${round}`, data: { category: 'weekly-recap', date: new Date(date), recap: { round, ...extra } } });

test('rozehraná sezona 2026/27 projde validací a historický archiv zůstává 460 zápasů', () => {
  assert.deepEqual(validateMatchSeason(current, '2026-27.json', { history: undefined, playingTeams: playing }), { errors: [], warnings: [] });
  assert.equal(completedOnly(all).length, 460);
  assert.equal(all.filter((g) => g.inProgress).length, 15);
});

test('validace rozehrané sezony: neúplné kolo, nepotvrzené kolo i bývalý tým jsou chyba', () => {
  const v = (change) => { const d = structuredClone(current); change(d); return validateMatchSeason(d, '2026-27.json', { playingTeams: playing }).errors.join('\n'); };
  assert.match(v((d) => d.games.pop()), /nehraje každý tým právě jednou/);
  assert.match(v((d) => { d.matchups[2].status = 'in_progress'; }), /zapisují se jen potvrzená kola/);
  assert.match(v((d) => { d.games[0].teams[0] = 'irish-airballers'; }), /nehraje/);
  assert.match(v((d) => { delete d.matchups[0].source; }), /chybí zdroj/);
  assert.match(validateMatchSeason(current, '2026-27.json', { history: history[0], playingTeams: playing }).errors.join(), /nemůže být rozehraná/);
});

test('bilance a body aktuální sezony z potvrzených kol (kolo 1 s opravenými skóre)', () => {
  const lbf = seasonRecord(all, '2026/27', 'little-barns-fireballs');
  assert.deepEqual([lbf.w, lbf.l, lbf.t, lbf.pf, lbf.lastRound], [3, 0, 0, 1316 + 1546 + 1429, 3]);
  assert.deepEqual(lbf.shortRounds, [{ matchup: 1, days: 6 }]);
  // Power Rankings #1 (po 2. kole) uvádí 2 862 FP – stejné opravené hodnoty.
  assert.equal(all.filter((g) => g.season === '2026/27' && g.matchup <= 2 && g.teams.includes('little-barns-fireballs'))
    .reduce((s, g) => s + g.scores[g.teams.indexOf('little-barns-fireballs')], 0), 2862);
  const bilance = Object.fromEntries(playing.map((t) => { const r = seasonRecord(all, '2026/27', t); return [t, `${r.w}-${r.l}`]; }));
  assert.deepEqual(bilance, {
    'acl-rokycany': '2-1', 'little-barns-fireballs': '3-0', 'pilsen-beers': '0-3', 'chlumcany-jzd': '2-1', 'los-mustachios': '3-0',
    'kutlaks-amateurs': '0-3', 'abukuafi-vzdejto': '1-2', 'tachovsky-gadzo': '2-1', 'litice-hoopers': '1-2', 'mc-rising-stars': '1-2',
  });
  assert.equal(seasonRecord(all, '2026/27', 'irish-airballers'), null);
});

test('H2H a série průběžně zahrnují aktuální sezonu, rekordy skóre ji vynechají', () => {
  const live = headToHead(all, 'acl-rokycany', 'chlumcany-jzd');
  const done = headToHead(completedOnly(all), 'acl-rokycany', 'chlumcany-jzd');
  assert.equal(live.games.length, done.games.length + 1);
  assert.equal(live.w, done.w + 1);
  const drafts = list('draft');
  const m = teamHistoryModel({ teamId: 'little-barns-fireballs', drafts, games: completedOnly(all), liveGames: all, aliases: aliasMap(json('hraci-aliasy.json')), currentSeason: '2026/27' });
  assert.equal(m.completedSeasons, 4, 'rozehraná sezona se nepočítá mezi odehrané sezony');
  assert.ok(m.records.highest.game.season !== '2026/27');
  assert.ok(streaks(all, 'little-barns-fireballs').some((s) => s.season === '2026/27' && s.kind === 'w' && s.length === 3));
  const debut = teamHistoryModel({ teamId: 'litice-hoopers', drafts, games: completedOnly(all), liveGames: all, aliases: aliasMap(json('hraci-aliasy.json')), currentSeason: '2026/27' });
  assert.equal(debut.isDebut, true);
  assert.equal(debut.records, null);
});

test('Týden ve Srandolize: poslední potvrzené kolo, ocenění z recapu, Zápas týdne podle redakce', () => {
  const w = weekSummary(all, '2026/27', [recap(3, '2026-11-09T08:16:00+01:00', { mvp: { player: 'Victor Wembanyama', team: 'mc-rising-stars', points: 258 }, gameOfWeek: { teams: ['little-barns-fireballs', 'mc-rising-stars'] }, highlight: 'H' })]);
  assert.equal(w.matchup, 3);
  assert.equal(w.span, '2.–8. listopadu 2026');
  assert.equal(w.games.length, 5);
  assert.equal(w.mvp.points, 258);
  assert.equal(w.gameOfWeek.margin, 33);
  assert.equal(w.closest, undefined, 'nejtěsnější zápas je zároveň Zápasem týdne');
});

test('Týden ve Srandolize: bez recapu jen výsledky a nejtěsnější zápas; jiný redakční výběr zobrazí obojí', () => {
  const bare = weekSummary(all, '2026/27', []);
  assert.equal(bare.recap, undefined);
  assert.equal(bare.mvp, undefined);
  assert.equal(bare.gameOfWeek, undefined);
  assert.equal(bare.closest.margin, 33);
  const other = weekSummary(all, '2026/27', [recap(3, '2026-11-09', { gameOfWeek: { teams: ['acl-rokycany', 'chlumcany-jzd'] } })]);
  assert.equal(other.gameOfWeek.margin, 82);
  assert.equal(other.closest.margin, 33);
  // Recap jiného kola ani recap vydaný před koncem kola se nepřiřadí.
  assert.equal(weekSummary(all, '2026/27', [recap(2, '2026-11-02')]).recap, undefined);
  assert.equal(weekSummary(all, '2026/27', [recap(3, '2026-11-07')]).recap, undefined);
  assert.equal(weekSummary(all, undefined, []), null);
});

test('po vydání dalšího kola a Recapu #4 se homepage přepne sama', () => {
  const four = structuredClone(current);
  four.matchups.push({ matchup: 4, kind: 'regular', espnLabel: 'Matchup 4', start: '2026-11-09', end: '2026-11-15', days: 7, status: 'final', source: 'testovací zdroj' });
  const pairs = [['los-mustachios', 'acl-rokycany'], ['pilsen-beers', 'mc-rising-stars'], ['abukuafi-vzdejto', 'tachovsky-gadzo'], ['chlumcany-jzd', 'little-barns-fireballs'], ['kutlaks-amateurs', 'litice-hoopers']];
  pairs.forEach((teams, i) => four.games.push({ matchup: 4, teams, scores: [1200 + i, 1100 + i * 30] }));
  assert.deepEqual(validateMatchSeason(four, '2026-27.json', { playingTeams: playing }).errors, []);
  const games = canonicalGames([...completedSeasons, four], history);
  const w = weekSummary(games, '2026/27', [recap(4, '2026-11-16T08:00:00+01:00', { highlight: 'Nové kolo' }), recap(3, '2026-11-09')]);
  assert.equal(w.matchup, 4);
  assert.equal(w.recap.id, 'recap-4');
  assert.equal(w.span, '9.–15. listopadu 2026');
  // Neúplné kolo 5 se nezobrazí – zůstane kolo 4.
  assert.equal(latestRound(games.concat([{ ...games.at(-1), id: 'x', matchup: 5 }]), '2026/27').matchup, 4);
});

test('formatRoundSpan: přes konec měsíce i roku', () => {
  assert.equal(formatRoundSpan('2026-10-26', '2026-11-01'), '26. října – 1. listopadu 2026');
  assert.equal(formatRoundSpan('2026-12-28', '2027-01-03'), '28. prosince 2026 – 3. ledna 2027');
});

import { headToHeadSplit } from '../src/lib/team-history.js';

test('H2H na profilu: ACL × Chlumčany ZČ 6–1, play-off 2–0, celkem 8–1 (včetně potvrzeného kola 2026/27)', () => {
  const h = headToHeadSplit(all, 'acl-rokycany').find((x) => x.opp === 'chlumcany-jzd');
  assert.deepEqual([h.regular.w, h.regular.l, h.regular.n], [6, 1, 7]);
  assert.deepEqual([h.postseason.w, h.postseason.l, h.postseason.n], [2, 0, 2]);
  assert.deepEqual([h.total.w, h.total.l, h.total.n], [8, 1, 9]);
  // Bez rozehrané sezony (jen dokončené sezony) je to 7–1.
  const done = headToHeadSplit(completedOnly(all), 'acl-rokycany').find((x) => x.opp === 'chlumcany-jzd');
  assert.deepEqual([done.total.w, done.total.l], [7, 1]);
  // Z pohledu soupeře zrcadlově.
  const back = headToHeadSplit(all, 'chlumcany-jzd').find((x) => x.opp === 'acl-rokycany');
  assert.deepEqual([back.total.w, back.total.l, back.postseason.l], [1, 8, 2]);
});

test('H2H: soupeř jen ze základní části má prázdný play-off; součet sedí', () => {
  for (const h of headToHeadSplit(all, 'little-barns-fireballs')) {
    assert.equal(h.total.n, h.regular.n + h.postseason.n);
    assert.equal(h.total.w, h.regular.w + h.postseason.w);
  }
});

test('chybně zadaný Zápas týdne zastaví build místo tichého nahrazení', () => {
  assert.throws(() => weekSummary(all, '2026/27', [recap(3, '2026-11-09', { gameOfWeek: { teams: ['acl-rokycany', 'litice-hoopers'] } })]), /nehrál/);
});

test('recap vydaný v poslední den kola se nepřiřadí, ráno po kole ano', () => {
  assert.equal(weekSummary(all, '2026/27', [recap(3, '2026-11-08T20:00:00+01:00')]).recap, undefined);
  assert.equal(weekSummary(all, '2026/27', [recap(3, '2026-11-09T08:16:00+01:00')]).recap.id, 'recap-3');
});

test('skutečné Weekly Recapy: zvolené Zápasy týdne v daném kole opravdu hrály', () => {
  const dir = new URL('../src/content/articles/', import.meta.url);
  const recaps = readdirSync(dir).filter((f) => f.startsWith('weekly-recap-')).map((f) => readFileSync(new URL(f, dir), 'utf8'));
  let checked = 0;
  for (const text of recaps) {
    const round = Number(text.match(/^recap:\n {2}round: (\d+)/m)?.[1]);
    const pair = text.match(/gameOfWeek: \{ teams: \[([a-z-]+), ([a-z-]+)\] \}/);
    if (!round || !pair) continue;
    const games = liveAll.filter((g) => g.season === '2026/27' && g.matchup === round);
    assert.ok(games.some((g) => g.teams.includes(pair[1]) && g.teams.includes(pair[2])), `kolo ${round}: ${pair[1]} × ${pair[2]}`);
    checked += 1;
  }
  assert.equal(checked, recaps.filter((t) => /^recap:/m.test(t)).length);
  assert.ok(checked >= 4);
});

// Stav po 4. kole se počítá jen z kol 1–4 (pozdější kola ho nesmí změnit).
const liveUpTo = (n) => liveAll.filter((g) => g.season !== '2026/27' || g.matchup <= n);

test('živá data po 4. kole: kompletní, bilance a body podle redakčního zadání Recapu #4', () => {
  assert.deepEqual(validateMatchSeason(live, '2026-27.json', { playingTeams: playing }), { errors: [], warnings: [] });
  const upTo4 = liveUpTo(4);
  const rec = (t) => { const r = seasonRecord(upTo4, '2026/27', t); return `${r.w}-${r.l}`; };
  assert.deepEqual(Object.fromEntries(playing.map((t) => [t, rec(t)])), {
    'acl-rokycany': '2-2', 'little-barns-fireballs': '3-1', 'pilsen-beers': '1-3', 'chlumcany-jzd': '3-1', 'los-mustachios': '4-0',
    'kutlaks-amateurs': '0-4', 'abukuafi-vzdejto': '2-2', 'tachovsky-gadzo': '2-2', 'litice-hoopers': '2-2', 'mc-rising-stars': '1-3',
  });
  // Definitivní skóre 4. kola podle ESPN screenshotu z 18. 11. 2026 (shodné s Weekly Recapem #4).
  assert.equal(seasonRecord(upTo4, '2026/27', 'little-barns-fireballs').pf, 5666);
  assert.equal(seasonRecord(upTo4, '2026/27', 'los-mustachios').pf, 5447);
  const r4scores = Object.fromEntries(liveAll.filter((g) => g.season === '2026/27' && g.matchup === 4).map((g) => [g.teams.join(' @ '), g.scores.join(':')]));
  assert.deepEqual(r4scores, {
    'los-mustachios @ acl-rokycany': '1493:1439', 'pilsen-beers @ mc-rising-stars': '1442:1355', 'abukuafi-vzdejto @ tachovsky-gadzo': '1204:1196',
    'chlumcany-jzd @ little-barns-fireballs': '1407:1375', 'kutlaks-amateurs @ litice-hoopers': '1149:1344',
  });
  // Hosté/domácí podle ESPN rozpisu: ACL, MC Rising Stars, Gadžo, Fireballs a Litice hráli doma.
  const r4 = liveAll.filter((g) => g.season === '2026/27' && g.matchup === 4);
  assert.deepEqual(r4.map((g) => g.teams[1]).sort(), ['acl-rokycany', 'litice-hoopers', 'little-barns-fireballs', 'mc-rising-stars', 'tachovsky-gadzo']);
  const w = weekSummary(upTo4, '2026/27', [recap(4, '2026-11-18T08:00:00+01:00', { gameOfWeek: { teams: ['abukuafi-vzdejto', 'tachovsky-gadzo'] } })]);
  assert.equal(w.matchup, 4);
  assert.equal(w.span, '9.–15. listopadu 2026');
  assert.equal(w.gameOfWeek.margin, 8);
  assert.equal(w.closest, undefined);
});

test('živá data po 5. kole: skóre, hosté/domácí podle ESPN rozpisu a bilance podle Recapu #5', () => {
  const r5 = liveAll.filter((g) => g.season === '2026/27' && g.matchup === 5);
  assert.deepEqual(Object.fromEntries(r5.map((g) => [g.teams.join(' @ '), g.scores.join(':')])), {
    'little-barns-fireballs @ acl-rokycany': '1409:1158', 'tachovsky-gadzo @ mc-rising-stars': '1196:1390',
    'kutlaks-amateurs @ abukuafi-vzdejto': '1312:1165', 'chlumcany-jzd @ pilsen-beers': '1244:1538', 'litice-hoopers @ los-mustachios': '1603:1423',
  });
  const rec = (t) => { const r = seasonRecord(liveUpTo(5), '2026/27', t); return `${r.w}-${r.l}`; };
  assert.deepEqual(Object.fromEntries(playing.map((t) => [t, rec(t)])), {
    'acl-rokycany': '2-3', 'little-barns-fireballs': '4-1', 'pilsen-beers': '2-3', 'chlumcany-jzd': '3-2', 'los-mustachios': '4-1',
    'kutlaks-amateurs': '1-4', 'abukuafi-vzdejto': '2-3', 'tachovsky-gadzo': '2-3', 'litice-hoopers': '3-2', 'mc-rising-stars': '2-3',
  });
  const w = weekSummary(liveUpTo(5), '2026/27', [recap(5,'2026-11-23T12:00:00+01:00', { gameOfWeek: { teams: ['litice-hoopers', 'los-mustachios'] } })]);
  assert.equal(w.matchup, 5);
  assert.equal(w.span, '16.–22. listopadu 2026');
  assert.equal(w.gameOfWeek.margin, 180);
});

import { releasedRounds, publicGames } from '../src/lib/home.js';

test('výsledky kola se zobrazí až s vydaným Weekly Recapem (jediný zdroj dat, jen filtr zobrazení)', () => {
  const four = upTo(4);
  const games = canonicalGames([...completedSeasons, four], history);
  const recaps = [1, 2, 3].map((n, i) => recap(n, ['2026-10-26', '2026-11-02', '2026-11-09'][i]));
  // Kolo 4 je v datech, recap #4 ještě nevyšel → kolo 4 se nezobrazí ani na homepage, ani na profilech.
  assert.deepEqual([...releasedRounds(four, recaps)], [1, 2, 3]);
  const pub = publicGames(games, four, recaps);
  assert.equal(weekSummary(pub, '2026/27', recaps).matchup, 3);
  assert.equal(seasonRecord(pub, '2026/27', 'los-mustachios').games, 3);
  assert.equal(completedOnly(pub).length, 460, 'dokončené sezony beze změny');
  // Recap #4 vyšel → kolo 4 se uvolní.
  const withR4 = [...recaps, recap(4, '2026-11-18T07:00:00+01:00')];
  assert.equal(weekSummary(publicGames(games, four, withR4), '2026/27', withR4).matchup, 4);
  // Recap vydaný před koncem kola kolo neuvolní.
  assert.deepEqual([...releasedRounds(four, [...recaps, recap(4, '2026-11-15T10:00:00+01:00')])], [1, 2, 3]);
});

test('výslovná výjimka publishWithoutRecap: true zveřejní výsledky i bez recapu', () => {
  const four = upTo(4);
  four.matchups[3].publishWithoutRecap = true;
  assert.deepEqual(validateMatchSeason(four, '2026-27.json', { playingTeams: playing }).errors, []);
  assert.ok(releasedRounds(four, []).has(4));
  four.matchups[3].publishWithoutRecap = 'ano';
  assert.match(validateMatchSeason(four, '2026-27.json', { playingTeams: playing }).errors.join(), /publishWithoutRecap/);
});

test('živá data: všechna zapsaná kola mají vydaný recap (na webu nic neschovaného)', () => {
  const dir = new URL('../src/content/articles/', import.meta.url);
  const rounds = readdirSync(dir).filter((f) => f.startsWith('weekly-recap-')).map((f) => Number(readFileSync(new URL(f, dir), 'utf8').match(/^recap:\n {2}round: (\d+)/m)?.[1]));
  assert.deepEqual(live.matchups.map((m) => m.matchup).filter((n) => !rounds.includes(n)), []);
});
