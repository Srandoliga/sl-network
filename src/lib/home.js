// Homepage – „Týden ve Srandolize“: poslední dokončené a potvrzené kolo. Výsledky z dat zápasů
// (src/data/zapasy/<sezona>.json), redakční ocenění z frontmatteru `recap` Weekly Recapu daného kola. Čisté funkce.
import { latestRound } from './matches.js';

const MONTHS = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
const parts = (iso) => { const [y, m, d] = iso.split('-').map(Number); return { y, m, d }; };

/** Období kola česky: „2.–8. listopadu 2026“, přes měsíc „26. října – 1. listopadu 2026“. */
export function formatRoundSpan(start, end) {
  const a = parts(start);
  const b = parts(end);
  if (a.y !== b.y) return `${a.d}. ${MONTHS[a.m - 1]} ${a.y} – ${b.d}. ${MONTHS[b.m - 1]} ${b.y}`;
  if (a.m !== b.m) return `${a.d}. ${MONTHS[a.m - 1]} – ${b.d}. ${MONTHS[b.m - 1]} ${b.y}`;
  return `${a.d}.–${b.d}. ${MONTHS[b.m - 1]} ${b.y}`;
}

const samePair = (g, [x, y]) => g.teams.includes(x) && g.teams.includes(y);

/** Weekly Recap daného kola: `recap.round` sedí a článek vyšel až po posledním dni kola. */
export const recapFor = (round, end, articles) => articles.find((a) => a.data.category === 'weekly-recap'
  && a.data.recap?.round === round && a.data.date > new Date(`${end}T23:59:59Z`));

/**
 * Kola rozehrané sezony, jejichž výsledky smí web zobrazit: vyšel k nim Weekly Recap (`articles` = viditelné články),
 * nebo je u kola v datech výslovně `publishWithoutRecap: true`. Výsledky se tak zveřejní současně s recapem,
 * i když se web mezitím nasadí kvůli jinému článku. Data zůstávají jediným zdrojem – filtruje se jen zobrazení.
 */
export function releasedRounds(matchSeason, articles = []) {
  if (!matchSeason) return new Set();
  return new Set(matchSeason.matchups
    .filter((m) => m.publishWithoutRecap === true || recapFor(m.matchup, m.end, articles))
    .map((m) => m.matchup));
}

/** Zápasy k zobrazení: dokončené sezony beze změny, z rozehrané sezony jen uvolněná kola. */
export function publicGames(games, matchSeason, articles = []) {
  if (!matchSeason) return games;
  const released = releasedRounds(matchSeason, articles);
  return games.filter((g) => g.season !== matchSeason.season || released.has(g.matchup));
}

/**
 * Souhrn posledního potvrzeného kola. `recapArticles` = viditelné články seřazené od nejnovějšího.
 * Recap se páruje podle `recap.round` a toho, že vyšel až po posledním dni kola (stejná sezona).
 * Zápas týdne: redakčně zvolený z recapu; jinak jen statistika „nejtěsnější zápas“ (není to ocenění).
 */
export function weekSummary(games, season, recapArticles = []) {
  const round = season ? latestRound(games, season) : null;
  if (!round) return null;
  const recap = recapFor(round.matchup, round.end, recapArticles);
  const awards = recap?.data.recap;
  const chosen = awards?.gameOfWeek ? round.games.find((g) => samePair(g, awards.gameOfWeek.teams)) : undefined;
  // Chybně zadaný Zápas týdne (dvojice v kole nehrála) zastaví build – nesmí se tiše nahradit jiným zápasem.
  if (awards?.gameOfWeek && !chosen) {
    throw new Error(`${recap.id}: gameOfWeek ${awards.gameOfWeek.teams.join(' × ')} v ${round.matchup}. kole sezony ${season} nehrál (src/data/zapasy/)`);
  }
  return {
    ...round,
    span: formatRoundSpan(round.start, round.end),
    recap,
    mvp: awards?.mvp,
    highlight: awards?.highlight,
    gameOfWeek: chosen,
    // Nejtěsnější zápas zobrazit zvlášť jen tehdy, když není zároveň zvoleným Zápasem týdne.
    closest: chosen?.id === round.closest.id ? undefined : round.closest,
    // Výsledky od nejvyššího vítězného skóre (přehledně, nezávisle na pořadí v datech).
    games: [...round.games].sort((x, y) => Math.max(...y.scores) - Math.max(...x.scores) || x.id.localeCompare(y.id)),
  };
}
