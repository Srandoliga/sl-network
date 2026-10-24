// Historie draftů: výpočty nad src/data/draft/*.json (všechny drafty) a src/data/historie/*.json (dokončené sezony).
// Čisté funkce – vstup nikdy nemění, výsledek je deterministický (pevné řazení při každé shodě).
import { seasonStandings } from './standings.js';
import { pearson, spearman, round2 } from './stats.js';

const normalize = (name) => String(name).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, "'").toLowerCase().trim();

/** Mapa normalizované jméno → kanonické jméno z aliasů (src/data/hraci-aliasy.json). */
export function aliasMap(aliases = []) {
  return new Map(aliases.flatMap((a) => [a.canonical, ...a.variants].map((n) => [normalize(n), a.canonical])));
}

/** Stabilní klíč hráče napříč sezonami: kanonické jméno (alias), bez diakritiky a velikosti písmen. */
export const playerKey = (name, aliases = new Map()) => normalize(aliases.get(normalize(name)) ?? name);

/** Kanonické jméno pro zobrazení (při aliasu kanonické, jinak tak, jak ho uvádí ESPN). */
export const playerName = (name, aliases = new Map()) => aliases.get(normalize(name)) ?? name;

export const sortDrafts = (drafts) => [...drafts].sort((a, b) => a.season.localeCompare(b.season));

/** Sezony s dokončeným archivem výsledků. Rozhoduje existence archivu, ne dokončený draft. */
export const completedSeasons = (historySeasons) => new Set(historySeasons.map((s) => s.season));

/** Draftová pozice organizace (1–n) v draftu, nebo null, pokud v něm nebyla. */
export const draftSlot = (draft, teamId) => {
  const i = draft.order.indexOf(teamId);
  return i === -1 ? null : i + 1;
};

/** Draftová historie organizace: po sezonách pozice, dobový název ESPN, první výběr a všech 13 výběrů. */
export function teamDraftHistory(drafts, teamId) {
  return sortDrafts(drafts).flatMap((d) => {
    const slot = draftSlot(d, teamId);
    if (slot === null) return [];
    const picks = d.picks.filter((p) => p.team === teamId).sort((a, b) => a.pick - b.pick);
    return [{ season: d.season, slot, espnLabel: d.espnLabels?.[teamId] ?? null, firstPick: picks[0], picks }];
  });
}

/** Výběr #1 každého draftu. */
export function firstOverallPicks(drafts) {
  return sortDrafts(drafts).map((d) => ({ season: d.season, ...d.picks.find((p) => p.pick === 1) }));
}

/** Tabulka draftových pozic: pro každou sezonu pořadí organizací (sezona → [{ slot, team }]). */
export function draftSlotTable(drafts) {
  return sortDrafts(drafts).map((d) => ({ season: d.season, slots: d.order.map((team, i) => ({ slot: i + 1, team })) }));
}

/** Všechny výběry seskupené podle hráče (klíč přes aliasy), v pořadí sezon. */
function picksByPlayer(drafts, aliases) {
  const groups = new Map();
  for (const d of sortDrafts(drafts)) {
    for (const p of d.picks) {
      const key = playerKey(p.player, aliases);
      groups.set(key, [...(groups.get(key) ?? []), { season: d.season, ...p }]);
    }
  }
  return [...groups.entries()].map(([key, entries]) => ({ key, name: playerName(entries.at(-1).player, aliases), entries }));
}

const byCountThenName = (a, b) => b.entries.length - a.entries.length || a.key.localeCompare(b.key);

/** Hráči draftovaní v alespoň `minSeasons` různých draftech (bez ohledu na organizaci). */
export function repeatedPlayers(drafts, aliases = new Map(), minSeasons = 2) {
  return picksByPlayer(drafts, aliases).filter((g) => g.entries.length >= minSeasons).sort(byCountThenName);
}

/** Hráči, které jedna organizace draftovala ve více sezonách. */
export function teamRepeatedPlayers(drafts, teamId, aliases = new Map(), minSeasons = 2) {
  return picksByPlayer(drafts, aliases)
    .map((g) => ({ ...g, entries: g.entries.filter((e) => e.team === teamId) }))
    .filter((g) => g.entries.length >= minSeasons)
    .sort(byCountThenName);
}

/** Draftová historie jednoho hráče napříč sezonami a organizacemi. */
export function playerDraftHistory(drafts, name, aliases = new Map()) {
  const key = playerKey(name, aliases);
  return picksByPlayer(drafts, aliases).find((g) => g.key === key)?.entries ?? [];
}

/**
 * Propojení draftové pozice s výsledkem sezony (viz standings.js). Jen sezony s archivem výsledků
 * (src/data/historie/), takže rozehraná sezona (2026/27) se nezapočítá, dokud nemá archiv.
 */
export function draftSlotResults(drafts, historySeasons) {
  const done = new Map(historySeasons.map((s) => [s.season, s]));
  return sortDrafts(drafts)
    .filter((d) => done.has(d.season))
    .flatMap((d) => seasonStandings(done.get(d.season))
      .map((row) => ({ ...row, slot: draftSlot(d, row.team) }))
      .sort((a, b) => a.slot - b.slot));
}

/**
 * Každý draftový výběr s výsledkem své tým-sezony. Výběry sezon bez archivu mají result: null.
 * Vrací i souhrn propojení pro kontrolu úplnosti.
 */
export function picksWithResults(drafts, historySeasons) {
  const rows = draftSlotResults(drafts, historySeasons);
  const byKey = new Map(rows.map((r) => [`${r.season}|${r.team}`, r]));
  const picks = sortDrafts(drafts).flatMap((d) => d.picks.map((p) => ({
    season: d.season, ...p, slot: draftSlot(d, p.team), result: byKey.get(`${d.season}|${p.team}`) ?? null,
  })));
  const linked = picks.filter((p) => p.result);
  return {
    picks,
    summary: {
      picks: picks.length,
      linkedPicks: linked.length,
      unlinkedPicks: picks.length - linked.length,
      unlinkedSeasons: [...new Set(picks.filter((p) => !p.result).map((p) => p.season))],
      teamSeasons: rows.length,
      teamSeasonsWithoutPicks: rows.filter((r) => !linked.some((p) => p.season === r.season && p.team === r.team)).length,
    },
  };
}

/** Jedna korelace: koeficient (2 desetinná místa) a počet pozorování. */
const corr = (fn, rows, x, y) => {
  const valid = rows.filter((r) => x(r) !== null && y(r) !== null);
  return { value: round2(fn(valid.map(x), valid.map(y))), n: valid.length };
};

/**
 * Popisné korelace draftového slotu s výsledky – po sezonách a souhrnně. Hlavní ukazatele:
 * W% (Pearson), playoff seed (Spearman, jen týmy v play-off), konečné umístění (Spearman), finále (bodově biseriální).
 * Celkové pořadí základní části jen jako dílčí analýza nad jednoznačně odvozenými případy (`regularSeasonRankPartial`).
 * Kladná hodnota u pořadí = pozdější slot ~ horší umístění; u W% a finále = pozdější slot ~ vyšší úspěšnost.
 */
export function slotCorrelations(drafts, historySeasons) {
  const rows = draftSlotResults(drafts, historySeasons);
  const measure = (subset) => ({
    winPct: corr(pearson, subset, (r) => r.slot, (r) => r.pct),
    playoffSeed: corr(spearman, subset, (r) => r.slot, (r) => r.playoffSeed),
    finalRank: corr(spearman, subset, (r) => r.slot, (r) => r.finalRank),
    reachedFinal: corr(pearson, subset, (r) => r.slot, (r) => (r.reachedFinal ? 1 : 0)),
    regularSeasonRankPartial: corr(spearman, subset, (r) => r.slot, (r) => r.regularSeasonRank),
  });
  const seasons = [...new Set(rows.map((r) => r.season))];
  return {
    bySeason: seasons.map((season) => ({ season, ...measure(rows.filter((r) => r.season === season)) })),
    pooled: { season: 'all', ...measure(rows) },
  };
}

/** Výsledky podle draftové pozice: kolikrát se z pozice slot došlo k titulu / do finále / do play-off. */
export function resultsBySlot(drafts, historySeasons) {
  const rows = draftSlotResults(drafts, historySeasons);
  const slots = [...new Set(rows.map((r) => r.slot))].sort((a, b) => a - b);
  return slots.map((slot) => {
    const at = rows.filter((r) => r.slot === slot);
    return {
      slot,
      seasons: at.length,
      titles: at.filter((r) => r.stage === 'champion').length,
      finals: at.filter((r) => r.stage === 'champion' || r.stage === 'final').length,
      playoffs: at.filter((r) => r.stage !== 'out').length,
      champions: at.filter((r) => r.stage === 'champion').map((r) => ({ season: r.season, team: r.team })),
    };
  });
}
