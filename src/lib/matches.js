// Historické zápasy: základní část ze src/data/zapasy/*.json, play-off z archivu src/data/historie/*.json.
// Čisté funkce. Soutěže se nikdy nesčítají bez výslovného výběru (`competitions`, výchozí jen základní část).
import { gameId } from '../../scripts/lib/validate-matches.mjs';

export { gameId };
export const COMPETITIONS = { regular: 'Základní část', championship: 'Play-off', placement: 'O umístění', consolation: 'Consolation' };
const BRACKET = { main: 'championship', placement: 'placement', consolation: 'consolation' };
const ROUND_NAMES = { 1: 'čtvrtfinále', 2: 'semifinále', 3: 'finále' };
const slug = (season) => season.replace('/', '-');

/** ID zápasu play-off: sezona, kolo, soutěž a dvojice hosté–domácí (pořadí `teams` v archivu = ESPN). */
export const playoffGameId = (season, round, competition, [away, home]) => `${slug(season)}-po${round}-${competition}-${away}--${home}`;

/** Kanonické zápasy: 100 základní části + 15 play-off na sezonu, s vítězem, nasazením a délkou kola. */
export function canonicalGames(matchSeasons, historySeasons) {
  const history = new Map(historySeasons.map((h) => [h.season, h]));
  return [...matchSeasons].sort((a, b) => a.season.localeCompare(b.season)).flatMap((ms) => {
    const h = history.get(ms.season);
    const seeds = Object.fromEntries((h?.teams ?? []).map((t) => [t.team, t.seed]));
    const period = (kind, n) => ms.matchups.find((p) => p.kind === kind && (kind === 'regular' ? p.matchup === n : p.round === n));
    const make = (base) => {
      const [a, b] = base.scores;
      return { ...base, winner: a > b ? base.teams[0] : b > a ? base.teams[1] : null, margin: Math.abs(a - b), total: a + b };
    };
    const regular = ms.games.map((g) => {
      const p = period('regular', g.matchup);
      return make({ id: gameId(ms.season, g.matchup, g.teams), season: ms.season, competition: 'regular', matchup: g.matchup, round: null,
        teams: g.teams, scores: g.scores, seeds: null, start: p.start, end: p.end, days: p.days });
    });
    const playoff = (h?.games ?? []).map((g) => {
      const competition = BRACKET[g.bracket];
      const p = period('playoff', g.round);
      return make({ id: playoffGameId(ms.season, g.round, competition, g.teams), season: ms.season, competition, matchup: null, round: g.round,
        teams: g.teams, scores: g.scores, seeds: g.teams.map((t) => seeds[t]), start: p.start, end: p.end, days: p.days, label: g.label ?? null });
    });
    return [...regular, ...playoff];
  });
}

const inComp = (competitions) => (g) => competitions.includes(g.competition);
const involves = (team) => (g) => g.teams.includes(team);
const side = (g, team) => g.teams.indexOf(team);
const resultFor = (g, team) => (g.winner === null ? 't' : g.winner === team ? 'w' : 'l');

/** Vzájemné zápasy dvou organizací v daných soutěžích, od nejnovějšího. */
export function headToHead(games, a, b, competitions = ['regular']) {
  const list = games.filter((g) => inComp(competitions)(g) && involves(a)(g) && involves(b)(g))
    .sort((x, y) => y.start.localeCompare(x.start));
  const count = (r) => list.filter((g) => resultFor(g, a) === r).length;
  return { a, b, games: list, w: count('w'), l: count('l'), t: count('t') };
}

/** Bilance proti všem soupeřům (z pohledu `team`), seřazená podle počtu zápasů a rozdílu výher. */
export function opponents(games, team, competitions = ['regular']) {
  const mine = games.filter((g) => inComp(competitions)(g) && involves(team)(g));
  const ids = [...new Set(mine.map((g) => g.teams[1 - side(g, team)]))];
  return ids.map((opp) => {
    const h = headToHead(games, team, opp, competitions);
    const pf = h.games.reduce((s, g) => s + g.scores[side(g, team)], 0);
    const pa = h.games.reduce((s, g) => s + g.scores[1 - side(g, team)], 0);
    return { opp, n: h.games.length, w: h.w, l: h.l, t: h.t, pf, pa, last: h.games[0] };
  }).sort((x, y) => y.n - x.n || (y.w - y.l) - (x.w - x.l) || x.opp.localeCompare(y.opp));
}

/** Nejdelší série výher a porážek týmu v základní části (v rámci jedné sezony). */
export function streaks(games, team) {
  const seasons = [...new Set(games.filter(involves(team)).map((g) => g.season))].sort();
  return seasons.flatMap((season) => {
    const seq = games.filter((g) => g.season === season && g.competition === 'regular' && involves(team)(g)).sort((x, y) => x.matchup - y.matchup);
    return ['w', 'l'].map((kind) => {
      let best = { length: 0 };
      let run = [];
      for (const g of seq) {
        run = resultFor(g, team) === kind ? [...run, g] : [];
        if (run.length > best.length) best = { length: run.length, from: run[0].matchup, to: g.matchup };
      }
      return { team, season, kind, ...best };
    }).filter((s) => s.length > 0);
  });
}

/** Výsledky jednoho týmu v zápasech (pro rekordy týmu i ligy). */
const teamScores = (games) => games.flatMap((g) => g.teams.map((team, i) => ({ team, score: g.scores[i], opp: g.teams[1 - i], game: g })));

/**
 * Rekordy skóre. Délka kola se vždy vrací s výsledkem; `standardOnly` ponechá jen kola dlouhá přesně STANDARD_DAYS
 * (vynechá zkrácená i dvoutýdenní kola), aby se nesrovnávaly nesrovnatelně dlouhé týdny.
 */
export const STANDARD_DAYS = 7;

export function scoringRecords(games, { competitions = ['regular'], team = null, standardOnly = false } = {}) {
  const pool = games.filter((g) => inComp(competitions)(g) && (!standardOnly || g.days === STANDARD_DAYS));
  const scores = teamScores(pool).filter((s) => !team || s.team === team);
  const decided = pool.filter((g) => g.winner && (!team || involves(team)(g)));
  const by = (arr, f) => [...arr].sort(f)[0] ?? null;
  return {
    highest: by(scores, (x, y) => y.score - x.score || x.game.id.localeCompare(y.game.id)),
    lowest: by(scores, (x, y) => x.score - y.score || x.game.id.localeCompare(y.game.id)),
    biggestWin: by(decided.filter((g) => !team || g.winner === team), (x, y) => y.margin - x.margin || x.id.localeCompare(y.id)),
    closestWin: by(decided.filter((g) => !team || g.winner === team), (x, y) => x.margin - y.margin || x.id.localeCompare(y.id)),
    highestTotal: by(pool.filter((g) => !team || involves(team)(g)), (x, y) => y.total - x.total || x.id.localeCompare(y.id)),
  };
}

/** Cesta týmu hlavním pavoukem v sezoně: kolo, soupeř a nasazení, výsledek. */
export function championshipPath(games, season, team) {
  return games.filter((g) => g.season === season && g.competition === 'championship' && involves(team)(g))
    .sort((x, y) => x.round - y.round)
    .map((g) => {
      const i = side(g, team);
      return { round: g.round, roundName: ROUND_NAMES[g.round], opp: g.teams[1 - i], seed: g.seeds[i], oppSeed: g.seeds[1 - i], score: g.scores[i], oppScore: g.scores[1 - i], won: g.winner === team, game: g };
    });
}

/** Zápasy jednoho kola základní části (pro rozpis sezony). */
export const matchupGames = (games, season, matchup) => games.filter((g) => g.season === season && g.competition === 'regular' && g.matchup === matchup);

export const roundName = (round) => ROUND_NAMES[round];
export const formatSpan = (start, end) => {
  const d = (iso) => { const [, m, day] = iso.split('-').map(Number); return `${day}. ${m}.`; };
  return `${d(start)}–${d(end)} ${end.slice(0, 4)}`;
};
