// Výpočty pro historický archiv. Vstup: sezony ze src/data/historie/*.json. Čisté funkce.

export const seasonSlug = (season) => season.replace('/', '-');

const winnerOf = (g) => (g.scores[0] > g.scores[1] ? g.teams[0] : g.teams[1]);

/** Zápas s doplněným vítězem. */
export const withWinner = (g) => ({ ...g, winner: winnerOf(g) });

export const sortSeasons = (seasons) => [...seasons].sort((a, b) => a.season.localeCompare(b.season));

/** Rozdělení play-off: hlavní pavouk po kolech, zápasy o umístění, consolation. */
export function bracketOf(season) {
  const games = season.games.map(withWinner);
  const by = (bracket, round) => games.filter((g) => g.bracket === bracket && g.round === round);
  return {
    main: [by('main', 1), by('main', 2), by('main', 3)],
    placement: [...by('placement', 2), ...by('placement', 3)],
    consolation: games.filter((g) => g.bracket === 'consolation'),
  };
}

export const STAGES = {
  champion: 'Šampion',
  final: 'Finále',
  semifinal: 'Semifinále',
  quarterfinal: 'Čtvrtfinále',
  out: 'Mimo play-off',
};

/** Jak daleko tým došel v hlavním pavouku. */
export function playoffStage(season, teamId) {
  const { main } = bracketOf(season);
  const [r1, r2, final] = main;
  if (final[0]?.teams.includes(teamId)) return final[0].winner === teamId ? 'champion' : 'final';
  if (r2.some((g) => g.teams.includes(teamId))) return 'semifinal';
  if (r1.some((g) => g.teams.includes(teamId))) return 'quarterfinal';
  return 'out';
}

/** Řádky „sezona po sezoně“ pro profil týmu. */
export function teamSeasons(seasons, teamId) {
  return sortSeasons(seasons).flatMap((s) => {
    const row = s.teams.find((t) => t.team === teamId);
    return row ? [{ season: s.season, slug: seasonSlug(s.season), ...row, stage: playoffStage(s, teamId) }] : [];
  });
}

const winPct = ({ w, l, t }) => (w + l + t === 0 ? 0 : (w + t / 2) / (w + l + t));

/** Souhrnné historické statistiky všech organizací. */
export function allTimeStats(seasons) {
  const rows = new Map();
  for (const s of seasons) {
    for (const t of s.teams) {
      const stage = playoffStage(s, t.team);
      const prev = rows.get(t.team) ?? {
        team: t.team, seasons: 0, w: 0, l: 0, t: 0, pf: 0, pa: 0, playoffs: 0, finals: 0, titles: 0, bestRank: 99,
      };
      rows.set(t.team, {
        ...prev,
        seasons: prev.seasons + 1,
        w: prev.w + t.record.w, l: prev.l + t.record.l, t: prev.t + t.record.t,
        pf: prev.pf + t.pf, pa: prev.pa + t.pa,
        playoffs: prev.playoffs + (stage === 'out' ? 0 : 1),
        finals: prev.finals + (stage === 'champion' || stage === 'final' ? 1 : 0),
        titles: prev.titles + (stage === 'champion' ? 1 : 0),
        bestRank: Math.min(prev.bestRank, t.finalRank),
      });
    }
  }
  return [...rows.values()]
    .map((r) => ({ ...r, pct: winPct(r) }))
    .sort((a, b) => b.titles - a.titles || b.finals - a.finals || b.pct - a.pct);
}

/** Nejlepší bilance základní části v sezoně (při shodě více týmů vrací všechny). */
export function bestRecord(season) {
  const best = Math.max(...season.teams.map((t) => winPct(t.record)));
  return season.teams.filter((t) => winPct(t.record) === best);
}

export const formatRecord = ({ w, l, t }) => `${w}-${l}-${t}`;
export const formatPct = (p) => p.toFixed(3).replace(/^0/, '');
export const formatPoints = (n) => new Intl.NumberFormat('cs-CZ').format(n);

const STAGE_SUFFIX = {
  champion: 'šampion',
  final: 'finále',
  semifinal: 'semifinále',
  quarterfinal: 'čtvrtfinále',
  out: 'mimo play-off',
};

/** Výsledek sezony pro profil týmu: skutečné konečné umístění + kam tým došel v play-off. */
export function resultLabel(stage, finalRank) {
  return `${finalRank}. místo · ${STAGE_SUFFIX[stage]}`;
}
