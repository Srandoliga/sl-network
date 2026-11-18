// „Historie klubu“ na profilu: jeden výpočet nad drafty, archivem a zápasy. Čisté funkce, nic se neopisuje ručně.
import { teamDraftHistory, teamRepeatedPlayers, playerKey } from './draft-history.js';
import { opponents, streaks, scoringRecords } from './matches.js';

/** Soutěže po základní části (hlavní pavouk, o umístění, útěcha) – v H2H souhrnně jako „play-off“. */
export const POSTSEASON = ['championship', 'placement', 'consolation'];
const ALL = ['regular', ...POSTSEASON];
const zero = { n: 0, w: 0, l: 0, t: 0 };
const slim = (o) => (o ? { n: o.n, w: o.w, l: o.l, t: o.t } : zero);

/** Vzájemné bilance se soupeři: celkem, základní část a play-off. Seřazené jako `opponents` (počet zápasů, rozdíl výher). */
export function headToHeadSplit(games, teamId) {
  const reg = new Map(opponents(games, teamId).map((o) => [o.opp, o]));
  const post = new Map(opponents(games, teamId, POSTSEASON).map((o) => [o.opp, o]));
  return opponents(games, teamId, ALL).map((o) => ({ opp: o.opp, total: slim(o), regular: slim(reg.get(o.opp)), postseason: slim(post.get(o.opp)) }));
}

/** Ligové rekordy pro srovnání s rekordy klubu: nejdelší vítězná série (ZČ) a nejvyšší skóre v 7denním kole. */
export function leagueRecords(games) {
  const ids = [...new Set(games.flatMap((g) => g.teams))];
  const streak = Math.max(0, ...ids.flatMap((t) => streaks(games, t)).filter((s) => s.kind === 'w').map((s) => s.length));
  return { streakW: streak, highest: scoringRecords(games, { standardOnly: true }).highest };
}

/** Návraty v draftu sezony: hráči, které organizace draftovala v kterémkoli dřívějším draftu. Null = první sezona. */
export function draftReturns(drafts, teamId, season, aliases) {
  const past = drafts.filter((d) => d.season < season && d.order.includes(teamId));
  const now = drafts.find((d) => d.season === season);
  if (!now?.order.includes(teamId) || past.length === 0) return null;
  const known = new Set(past.flatMap((d) => d.picks.filter((p) => p.team === teamId).map((p) => playerKey(p.player, aliases))));
  const picks = now.picks.filter((p) => p.team === teamId);
  const back = picks.filter((p) => known.has(playerKey(p.player, aliases)));
  return { season, total: picks.length, count: back.length, inTop3: back.filter((p) => p.round <= 3).length, picks: back };
}

/**
 * `games` = jen dokončené sezony (rekordy skóre, počet odehraných sezon). `liveGames` = navíc potvrzené zápasy
 * rozehrané sezony – použijí se jen pro průběžnou historii: bilance proti soupeřům (H2H) a vítězné/porážkové série.
 */
export function teamHistoryModel({ teamId, drafts, games, liveGames = games, aliases, currentSeason }) {
  const league = { ...leagueRecords(games), streakW: leagueRecords(liveGames).streakW };
  const draftsOf = teamDraftHistory(drafts, teamId);
  const current = draftsOf.find((d) => d.season === currentSeason) ?? null;
  const played = [...new Set(games.filter((g) => g.teams.includes(teamId)).map((g) => g.season))];
  const opp = opponents(liveGames, teamId);
  const best = streaks(liveGames, teamId);
  const pick = (kind) => [...best.filter((s) => s.kind === kind)].sort((a, b) => b.length - a.length || b.season.localeCompare(a.season))[0] ?? null;
  return {
    firstSeason: draftsOf[0]?.season ?? null,
    isDebut: draftsOf.length <= 1 && played.length === 0,
    seasonsInLeague: draftsOf.length,
    completedSeasons: played.length,
    drafts: draftsOf,
    current,
    returns: current ? draftReturns(drafts, teamId, currentSeason, aliases) : null,
    repeated: teamRepeatedPlayers(drafts, teamId, aliases),
    opponents: opp,
    h2h: headToHeadSplit(liveGames, teamId),
    streakW: pick('w'),
    streakL: pick('l'),
    records: played.length ? scoringRecords(games, { team: teamId, standardOnly: true }) : null,
    league,
  };
}
