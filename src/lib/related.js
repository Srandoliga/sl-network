// Vnitřní propojení článků: rubrika (předchozí/další vydání), související články, články o týmu a o sezoně.
// Vstupem jsou vždy jen VIDITELNÉ články (getArticles) seřazené od nejnovějšího – koncepty ani budoucí články
// se tak nikdy neodkážou. Čisté funkce; souvislosti se berou z metadat (`relatedTeams`) a ze skutečných odkazů
// v textu (profil týmu, stránka sezony), nikdy z pouhého výskytu jména či letopočtu.

/** Pravidelné rubriky s navigací „předchozí / další vydání“. */
export const SERIES = ['weekly-recap', 'matchup-preview', 'power-rankings', 'beyond-the-score'];
/** Ligové souhrny: týkají se všech týmů, proto mají na profilu týmu nižší váhu než tematické články. */
export const LEAGUE_SUMMARIES = ['weekly-recap', 'matchup-preview', 'power-rankings'];

const uniq = (xs) => [...new Set(xs)];
/** Hlavní organizace článku (metadata `relatedTeams`). */
export const mainTeams = (a) => a.data.relatedTeams ?? [];
/** Organizace, na jejichž profil článek v textu odkazuje. */
export const linkedTeams = (a) => uniq([...(a.body ?? '').matchAll(/tymy\/([a-z0-9-]+)\//g)].map((m) => m[1]));

/**
 * Odkazy článku na stránky sezon (`historie/<rrrr-rr>/`, i s kotvou zápasu) – počet odkazů na sezonu.
 * Archiv draftů (`historie/drafty/…`) se nepočítá.
 */
export function seasonLinks(a) {
  const counts = new Map();
  for (const m of (a.body ?? '').matchAll(/historie\/(\d{4}-\d{2})\//g)) counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
  return counts;
}

/** Předchozí (starší) a následující (novější, už vydané) vydání stejné pravidelné rubriky. */
export function seriesNav(sorted, article) {
  if (!SERIES.includes(article.data.category)) return { prev: undefined, next: undefined };
  const same = sorted.filter((a) => a.data.category === article.data.category);
  const i = same.findIndex((a) => a.id === article.id);
  return { prev: same[i + 1], next: i > 0 ? same[i - 1] : undefined };
}

const overlap = (a, b) => a.filter((x) => b.includes(x)).length;
/** Zaměřený článek odkazuje nanejvýš na tolik týmů; ligové souhrny (všech deset týmů) souvislost přes odkazy nezakládají. */
export const FOCUSED_MAX_TEAMS = 4;
const focusedLinks = (a) => { const l = linkedTeams(a); return l.length <= FOCUSED_MAX_TEAMS ? l : []; };
/** Články, na které článek v textu přímo odkazuje (`../<id>/` v Markdownu i HTML). */
export const linkedArticles = (a) => uniq([...(a.body ?? '').matchAll(/(?:\(|href=")\.\.\/([a-z0-9-]+)\//g)].map((m) => m[1]));

/**
 * Skóre souvislosti dvou článků jako n-tice (porovnává se postupně, teprve pak datum):
 * 1. společné hlavní organizace (relatedTeams × relatedTeams),
 * 2. přímý odkaz z jednoho článku na druhý,
 * 3. hlavní organizace jednoho článku, na jejíž profil odkazuje druhý ZAMĚŘENÝ článek (≤ 4 odkazované týmy),
 * 4. společné sezony doložené odkazy na stránky historie.
 * Pouhé společné odkazy na profily (ligové souhrny odkazují na všech deset týmů) souvislost nezakládají.
 */
export function relevance(a, b) {
  const [ma, mb] = [mainTeams(a), mainTeams(b)];
  const both = overlap(ma, mb);
  const direct = (linkedArticles(a).includes(b.id) ? 1 : 0) + (linkedArticles(b).includes(a.id) ? 1 : 0);
  const cross = overlap(ma.filter((t) => !mb.includes(t)), focusedLinks(b)) + overlap(mb.filter((t) => !ma.includes(t)), focusedLinks(a));
  const seasons = overlap([...seasonLinks(a).keys()], [...seasonLinks(b).keys()]);
  return [both, direct, cross, seasons];
}

const cmpTuple = (x, y) => { for (let i = 0; i < x.length; i += 1) if (x[i] !== y[i]) return y[i] - x[i]; return 0; };

/**
 * Nejvýš `limit` souvisejících článků: jen s doloženou souvislostí (nenulové skóre), bez článku samotného a bez
 * článků v `exclude` (předchozí/další vydání). Pořadí: síla souvislosti, potom novější. Žádné doplňování „nejnovějšími“.
 */
export function relatedArticles(sorted, article, { exclude = [], limit = 2 } = {}) {
  const skip = new Set([article.id, ...exclude.filter(Boolean).map((a) => a.id)]);
  return sorted
    .filter((c) => !skip.has(c.id))
    .map((c) => ({ c, score: relevance(article, c) }))
    .filter(({ score }) => score.some((s) => s > 0))
    .sort((x, y) => cmpTuple(x.score, y.score) || y.c.data.date - x.c.data.date)
    .slice(0, limit)
    .map(({ c }) => c);
}

/** Preferované související články, které neexistují (překlep v ID) – build kvůli nim selže. */
export const missingPreferred = (article, allIds) => (article.data.relatedArticles ?? []).filter((id) => !allIds.includes(id));

/**
 * Související články na konci článku: nejdřív redakčně preferované (`relatedArticles`), pokud už vyšly
 * (`sorted` = jen viditelné články), zbytek doplní automatický výběr. Bez duplicit a bez předchozího/dalšího vydání.
 */
export function endRelated(sorted, article, { exclude = [], limit = 2 } = {}) {
  const skip = new Set([article.id, ...exclude.filter(Boolean).map((a) => a.id)]);
  const preferred = (article.data.relatedArticles ?? [])
    .map((id) => sorted.find((a) => a.id === id))
    .filter((a) => a && !skip.has(a.id))
    .slice(0, limit);
  const auto = relatedArticles(sorted, article, { exclude: [...exclude, ...preferred], limit: limit - preferred.length });
  return [...preferred, ...auto];
}

/** Historické speciály: na profilu týmu mají nejvyšší prioritu, aby nezapadly mezi týdenní články. */
export const HISTORY_SPECIALS = ['beyond-the-score'];

/**
 * Články o týmu ve čtyřech úrovních (v každé od nejnovějšího):
 * 1. historický speciál (Beyond the Score) s týmem jako hlavní organizací – zůstane vidět i po dalších vydáních,
 * 2. jiný tematický článek s týmem jako hlavní organizací (FLASH, zákulisí…),
 * 3. ligový souhrn (Recap, Preview, Power Rankings) s týmem jako hlavní organizací,
 * 4. článek, který jen odkazuje na profil týmu.
 * `teamIds` = aktuální ID a dřívější ID organizace.
 */
export function teamArticles(sorted, teamIds) {
  const tier = (a) => {
    if (mainTeams(a).some((t) => teamIds.includes(t))) {
      if (HISTORY_SPECIALS.includes(a.data.category)) return 1;
      return LEAGUE_SUMMARIES.includes(a.data.category) ? 3 : 2;
    }
    return linkedTeams(a).some((t) => teamIds.includes(t)) ? 4 : 0;
  };
  return sorted.map((a) => ({ a, t: tier(a) })).filter(({ t }) => t > 0)
    .sort((x, y) => x.t - y.t || y.a.data.date - x.a.data.date)
    .map(({ a, t }) => ({ article: a, tier: t }));
}

/**
 * Články o sezoně (`slug` = „2025-26“): jen ty, které na stránky sezony skutečně odkazují.
 * Víc odkazů = článek se sezoně věnuje víc; při shodě novější. Nejvýš `limit`.
 */
export function seasonArticles(sorted, slug, limit = 3) {
  return sorted.map((a) => ({ a, n: seasonLinks(a).get(slug) ?? 0 })).filter(({ n }) => n > 0)
    .sort((x, y) => y.n - x.n || y.a.data.date - x.a.data.date)
    .slice(0, limit)
    .map(({ a }) => a);
}
