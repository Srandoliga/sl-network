// Validace zápasů základní části (src/data/zapasy/<rrrr-rr>.json) proti archivu sezony (src/data/historie/<rrrr-rr>.json).
// Zápasy play-off se zde neukládají – jsou v archivu; kontroluje se jen kalendář jejich kol.

const SEASON = /^\d{4}\/\d{2}$/;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const DAY = 24 * 60 * 60 * 1000;
const GAMES_PER_MATCHUP = 5;
const REGULAR_MATCHUPS = 20;
const PLAYOFF_ROUNDS = 3;

const days = (start, end) => Math.round((Date.parse(end) - Date.parse(start)) / DAY) + 1;
const seasonSlug = (season) => season.replace('/', '-');

/**
 * Stabilní ID zápasu: sezona, kolo a dvojice v pořadí hosté–domácí podle ESPN.
 * Nezávisí na pořadí záznamů v souboru (dvojice se v jednom kole nemůže opakovat).
 */
export const gameId = (season, matchup, [away, home]) => `${seasonSlug(season)}-z${String(matchup).padStart(2, '0')}-${away}--${home}`;

/** Datum kola play-off z archivu („18.–24. 3. 2024“ nebo „27. 3.–2. 4. 2023“) jako [začátek, konec] ISO. */
export function archiveRoundDates(text) {
  const m = String(text).match(/^(\d+)\.\s*(?:(\d+)\.\s*)?–(\d+)\.\s*(\d+)\.\s*(\d{4})$/);
  if (!m) return null;
  const [, d1, m1, d2, m2, y] = m;
  const iso = (d, mo) => `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return [iso(d1, m1 ?? m2), iso(d2, m2)];
}

function validateCalendar(doc, at, history) {
  const errors = [];
  const list = Array.isArray(doc.matchups) ? doc.matchups : [];
  const regular = list.filter((p) => p?.kind === 'regular');
  const playoff = list.filter((p) => p?.kind === 'playoff');
  if (regular.map((p) => p.matchup).join() !== Array.from({ length: REGULAR_MATCHUPS }, (_, i) => i + 1).join()) {
    errors.push(`${at}: kalendář musí obsahovat matchup 1–${REGULAR_MATCHUPS} v pořadí`);
  }
  if (playoff.map((p) => p.round).join() !== Array.from({ length: PLAYOFF_ROUNDS }, (_, i) => i + 1).join()) {
    errors.push(`${at}: kalendář musí obsahovat kola play-off 1–${PLAYOFF_ROUNDS}`);
  }
  list.forEach((p, i) => {
    const where = `${at}: kalendář [${i}]`;
    if (!ISO.test(p?.start ?? '') || !ISO.test(p?.end ?? '')) { errors.push(`${where}: neplatné datum`); return; }
    if (p.days !== days(p.start, p.end)) errors.push(`${where}: délka ${p.days} dní neodpovídá datům ${p.start}–${p.end}`);
    const next = list[i + 1];
    if (next && ISO.test(next.start ?? '') && days(p.end, next.start) !== 2) errors.push(`${where}: další kolo nezačíná den po konci tohoto (${p.end} → ${next.start})`);
  });
  for (const p of playoff) {
    const archived = archiveRoundDates(history.rounds?.find((r) => r.round === p.round)?.dates);
    if (!archived || archived[0] !== p.start || archived[1] !== p.end) errors.push(`${at}: kolo play-off ${p.round} (${p.start}–${p.end}) neodpovídá archivu`);
  }
  return errors;
}

/** Bilance a body ze zápasů základní části po týmech. */
export function recordsFromGames(games) {
  const rows = new Map();
  const add = (team, own, opp) => {
    const r = rows.get(team) ?? { w: 0, l: 0, t: 0, pf: 0, pa: 0 };
    rows.set(team, {
      w: r.w + (own > opp ? 1 : 0), l: r.l + (own < opp ? 1 : 0), t: r.t + (own === opp ? 1 : 0), pf: r.pf + own, pa: r.pa + opp,
    });
  };
  for (const g of games) {
    add(g.teams[0], g.scores[0], g.scores[1]);
    add(g.teams[1], g.scores[1], g.scores[0]);
  }
  return rows;
}

/** Stavy kola rozehrané sezony: do souboru patří jen dokončená a redakčně potvrzená kola. */
export const ROUND_STATUSES = ['final', 'corrected'];

/**
 * Rozehraná sezona (`inProgress: true`): kalendář jen pro zapsaná kola 1…N (bez play-off), každé kolo se stavem
 * (`final`/`corrected`) a zdrojem, v každém kole všech pět zápasů a každý hrající tým právě jednou. Archiv sezony
 * zatím neexistuje, proto se nic neporovnává s konečnou tabulkou. `playingTeams` = ID týmů aktuální sezony.
 */
function validateInProgress(doc, at, playingTeams) {
  const errors = [];
  const list = Array.isArray(doc.matchups) ? doc.matchups : [];
  if (list.some((p) => p?.kind !== 'regular')) errors.push(`${at}: rozehraná sezona smí mít v kalendáři jen kola základní části`);
  if (list.map((p) => p?.matchup).join() !== list.map((_, i) => i + 1).join()) errors.push(`${at}: kalendář musí obsahovat kola 1–${list.length} v pořadí`);
  list.forEach((p, i) => {
    const where = `${at}: kolo ${p?.matchup ?? i + 1}`;
    if (!ISO.test(p?.start ?? '') || !ISO.test(p?.end ?? '')) { errors.push(`${where}: neplatné datum`); return; }
    if (p.days !== days(p.start, p.end)) errors.push(`${where}: délka ${p.days} dní neodpovídá datům ${p.start}–${p.end}`);
    const next = list[i + 1];
    if (next && ISO.test(next.start ?? '') && days(p.end, next.start) !== 2) errors.push(`${where}: další kolo nezačíná den po konci tohoto`);
    if (!ROUND_STATUSES.includes(p.status)) errors.push(`${where}: stav „${p.status}“ – zapisují se jen potvrzená kola (${ROUND_STATUSES.join(', ')})`);
    if (typeof p.source !== 'string' || p.source.length < 5) errors.push(`${where}: chybí zdroj výsledků (source)`);
  });
  const games = Array.isArray(doc.games) ? doc.games : [];
  const rounds = new Set(list.map((p) => p?.matchup));
  games.forEach((g, i) => {
    const where = `${at}: zápas [${i}]`;
    if (!rounds.has(g?.matchup)) errors.push(`${where}: kolo ${g?.matchup} není v kalendáři`);
    if (!Array.isArray(g?.teams) || g.teams.length !== 2 || g.teams[0] === g.teams[1]) errors.push(`${where}: musí mít dva různé týmy`);
    else g.teams.filter((t) => !playingTeams.includes(t)).forEach((t) => errors.push(`${where}: tým ${t} v sezoně ${doc.season} nehraje`));
    if (!Array.isArray(g?.scores) || g.scores.length !== 2 || !g.scores.every((x) => Number.isFinite(x) && x >= 0)) errors.push(`${where}: neplatné skóre`);
  });
  if (errors.length) return errors;
  for (const m of rounds) {
    const inRound = games.filter((g) => g.matchup === m).flatMap((g) => g.teams);
    if ([...inRound].sort().join() !== [...playingTeams].sort().join()) errors.push(`${at}: v kole ${m} nehraje každý tým právě jednou (zapisuje se jen kompletní kolo)`);
  }
  return errors;
}

export function validateMatchSeason(doc, file, { history, playingTeams = [] }) {
  const at = `src/data/zapasy/${file}`;
  if (!doc || typeof doc !== 'object') return { errors: [`${at}: neplatná struktura`], warnings: [] };
  const errors = [];
  if (!SEASON.test(doc.season ?? '')) errors.push(`${at}: chybí nebo je neplatné pole season`);
  if (`${seasonSlug(doc.season ?? '')}.json` !== file) errors.push(`${at}: pole season „${doc.season}“ neodpovídá názvu souboru`);
  if (doc.inProgress === true) {
    if (history) errors.push(`${at}: sezona má archiv (src/data/historie/), nemůže být rozehraná – odstraňte inProgress`);
    return { errors: [...errors, ...validateInProgress(doc, at, playingTeams)], warnings: [] };
  }
  if (!history) return { errors: [...errors, `${at}: chybí archiv sezony ${doc.season} (src/data/historie/)`], warnings: [] };
  errors.push(...validateCalendar(doc, at, history));

  const games = Array.isArray(doc.games) ? doc.games : [];
  const teams = history.teams.map((t) => t.team);
  if (games.length !== REGULAR_MATCHUPS * GAMES_PER_MATCHUP) errors.push(`${at}: zápasů je ${games.length}, má jich být ${REGULAR_MATCHUPS * GAMES_PER_MATCHUP}`);
  games.forEach((g, i) => {
    const where = `${at}: zápas [${i}]`;
    if (!Number.isInteger(g?.matchup) || g.matchup < 1 || g.matchup > REGULAR_MATCHUPS) errors.push(`${where}: neplatné kolo ${g?.matchup}`);
    if (!Array.isArray(g?.teams) || g.teams.length !== 2 || g.teams[0] === g.teams[1]) errors.push(`${where}: musí mít dva různé týmy`);
    else g.teams.filter((t) => !teams.includes(t)).forEach((t) => errors.push(`${where}: tým ${t} v sezoně ${doc.season} nehrál`));
    if (!Array.isArray(g?.scores) || g.scores.length !== 2 || !g.scores.every((s) => Number.isFinite(s) && s >= 0)) errors.push(`${where}: neplatné skóre`);
  });
  if (errors.length) return { errors, warnings: [] };

  for (let m = 1; m <= REGULAR_MATCHUPS; m += 1) {
    const inRound = games.filter((g) => g.matchup === m).flatMap((g) => g.teams);
    if ([...inRound].sort().join() !== [...teams].sort().join()) errors.push(`${at}: v kole ${m} nehraje každý tým právě jednou`);
  }
  const ids = games.map((g) => gameId(doc.season, g.matchup, g.teams));
  const pairs = games.map((g) => `${g.matchup}|${[...g.teams].sort().join()}`);
  if (new Set(ids).size !== ids.length || new Set(pairs).size !== pairs.length) errors.push(`${at}: duplicitní zápas v jednom kole`);

  const derived = recordsFromGames(games);
  for (const t of history.teams) {
    const r = derived.get(t.team);
    if (`${r.w}-${r.l}-${r.t}` !== `${t.record.w}-${t.record.l}-${t.record.t}`) errors.push(`${at}: ${t.team} má ze zápasů bilanci ${r.w}-${r.l}-${r.t}, archiv ${t.record.w}-${t.record.l}-${t.record.t}`);
    if (r.pf !== t.pf || r.pa !== t.pa) errors.push(`${at}: ${t.team} má ze zápasů PF/PA ${r.pf}/${r.pa}, archiv ${t.pf}/${t.pa}`);
  }
  return { errors, warnings: [] };
}
