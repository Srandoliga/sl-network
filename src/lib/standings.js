// Výsledková pole tým-sezony z archivu (src/data/historie/*.json). Čisté funkce, archiv se nemění.
//
// - playoffSeed: ESPN nasazení z pavouku, jen pro 8 týmů hlavního pavouku (#9 a #10 hrají consolation → null).
// - divisionRank, finalRank: ověřené údaje ESPN, přebírají se beze změny.
// - regularSeasonRank: celkové pořadí po základní části. ESPN ho samostatně neuvádí a nasazení ho nenahrazuje
//   (vítězové divizí dostávají #1 a #2). Odvozuje se jen z bilance; při shodě bilancí zůstává null, protože
//   historická tiebreak pravidla ligy nejsou doložená. Skupina shody (tieGroup) je jen pomocný údaj.
import { playoffStage } from './archive.js';

export const PLAYOFF_TEAMS = 8;

/** Úspěšnost jako ESPN PCT: remíza se počítá za půl výhry. */
export const winPct = ({ w, l, t }) => (w + t / 2) / (w + l + t);

const formatRecord = ({ w, l, t }) => `${w}-${l}-${t}`;

/** Skupiny týmů se stejnou úspěšností, od nejlepší. Každá skupina má rozpětí pořadí [od, do]. */
export function pctGroups(teams) {
  const sorted = [...teams].sort((a, b) => winPct(b.record) - winPct(a.record) || a.team.localeCompare(b.team));
  const groups = sorted.reduce((acc, t) => {
    const last = acc.at(-1);
    return last && winPct(last.teams[0].record) === winPct(t.record)
      ? [...acc.slice(0, -1), { ...last, teams: [...last.teams, t] }]
      : [...acc, { teams: [t] }];
  }, []);
  let from = 1;
  return groups.map((g) => {
    const range = [from, from + g.teams.length - 1];
    from += g.teams.length;
    return { range, pct: winPct(g.teams[0].record), teams: g.teams.map((t) => t.team) };
  });
}

/** Výsledkové řádky jedné sezony: 10 organizací se všemi čtyřmi pořadími a stavem ověření. */
export function seasonStandings(season) {
  const groups = pctGroups(season.teams);
  return season.teams.map((t) => {
    const group = groups.find((g) => g.teams.includes(t.team));
    const tied = group.teams.length > 1;
    const stage = playoffStage(season, t.team);
    return {
      season: season.season,
      team: t.team,
      record: t.record,
      pct: winPct(t.record),
      playoffSeed: t.seed <= PLAYOFF_TEAMS ? t.seed : null,
      espnSeed: t.seed,
      division: t.division,
      divisionRank: t.divisionRank,
      regularSeasonRank: tied ? null : group.range[0],
      regularSeasonRankStatus: tied ? 'tie_unresolved' : 'derived',
      regularSeasonRankReason: tied
        ? `shodná bilance ${formatRecord(t.record)} (${winPct(t.record).toFixed(3)}) s: ${group.teams.filter((id) => id !== t.team).join(', ')}; tiebreak pravidla ligy pro tuto sezonu nejsou doložená`
        : null,
      tieGroup: tied ? { range: group.range, teams: group.teams } : null,
      finalRank: t.finalRank,
      stage,
      reachedFinal: stage === 'champion' || stage === 'final',
      champion: stage === 'champion',
    };
  }).sort((a, b) => a.espnSeed - b.espnSeed);
}

/** Všech 40 (n × 10) tým-sezon dokončených sezon. */
export const allStandings = (historySeasons) => [...historySeasons]
  .sort((a, b) => a.season.localeCompare(b.season))
  .flatMap(seasonStandings);
