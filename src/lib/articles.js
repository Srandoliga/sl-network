// Pomocné funkce pro články. Čisté funkce – vstup nikdy nemění.

export function sortByDateDesc(articles) {
  return [...articles].sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/**
 * Publikované články (koncepty jen při showDrafts), od nejnovějšího.
 * Článek s datem v budoucnosti se na veřejném webu objeví až v buildu po tomto čase (plánované vydání).
 */
export function visibleArticles(articles, showDrafts, now = new Date()) {
  return sortByDateDesc(articles.filter((a) => showDrafts || (!a.data.draft && a.data.date <= now)));
}

/** Rubriky k zobrazení: s `hideWhenEmpty` jen tehdy, když mají aspoň jeden (viditelný) článek. */
export function listedCategories(categories, articles) {
  return categories.filter((c) => !c.hideWhenEmpty || articles.some((a) => a.data.category === c.id));
}

/** Hlavní zpráva: nejnovější článek s `featured: true`, jinak nejnovější článek. Vstup už seřazený. */
export function pickLeadStory(sorted) {
  return sorted.find((a) => a.data.featured) ?? sorted[0];
}

/** Breaking News: vždy nejnovější viditelný článek – text i odkaz ze stejného článku. Vstup už seřazený. */
export const pickTicker = (sorted) => sorted[0];

export const BEYOND = 'beyond-the-score';

/**
 * Rozložení homepage bez opakování článků: hlavní příběh, blok Beyond the Score (jen když speciál není hlavním
 * příběhem), nejnovější články bez obou a pro každého redaktora jeho nejnovější článek, který ještě není vidět.
 * Vstup už seřazený (od nejnovějšího); `authors` = ID redaktorů v pořadí zobrazení.
 */
export function homeLayout(sorted, authors = [], { latestCount = 4 } = {}) {
  const lead = pickLeadStory(sorted);
  const lastBeyond = sorted.find((a) => a.data.category === BEYOND);
  const beyond = lastBeyond && lastBeyond.id !== lead?.id ? lastBeyond : undefined;
  const latest = sorted.filter((a) => a.id !== lead?.id && a.id !== beyond?.id).slice(0, latestCount);
  const shown = new Set([lead, beyond, ...latest].filter(Boolean).map((a) => a.id));
  const experts = Object.fromEntries(authors.map((id) => {
    const own = sorted.filter((a) => a.data.author === id);
    return [id, own.find((a) => !shown.has(a.id)) ?? own[0]];
  }));
  return { lead, ticker: pickTicker(sorted), beyond, lastBeyond, latest, experts };
}

/** Ohlášený další díl (`nextIssue`) jen do jeho data – po něm se už nezobrazuje. */
export const upcomingIssue = (article, now = new Date()) => {
  const next = article?.data.nextIssue;
  if (!next) return undefined;
  const endOfDay = new Date(next.date);
  endOfDay.setUTCHours(23, 59, 59, 999);
  return endOfDay >= now ? next : undefined;
};

/**
 * Články o týmu: ty, které v textu odkazují na profil organizace (`tymy/<id>/`, i dřívější ID). Nejnovější první.
 * Odkaz je strukturovaná značka – nic se neodvozuje z běžného textu.
 */
export function articlesAboutTeam(sorted, teamIds, limit = 3) {
  const patterns = teamIds.map((id) => new RegExp(`tymy/${id}/`));
  return sorted.filter((a) => patterns.some((re) => re.test(a.body ?? ''))).slice(0, limit);
}

/** Text upoutávky pro Messenger. Obsahuje-li vlastní upoutávka už odkaz na článek, nepřidává se znovu. */
export function buildTeaser({ title, perex, teaser }, url) {
  if (teaser?.includes(url)) return teaser.trim();
  const body = teaser ? teaser : `📰 ${title}\n${perex}`;
  return `${body}\n👉 ${url}`;
}

const dateFormatter = new Intl.DateTimeFormat('cs-CZ', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Prague',
});

export function formatDateCs(date) {
  return dateFormatter.format(date);
}

export function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

/** Titulek pro velký nadpis: první věta tučně, zbytek kurzívou („Dvě dynastie. *Jedna liga.*“). */
export function splitHeadline(title) {
  const match = title.match(/^(.+?[.!?])\s+(.+)$/);
  return match ? { lead: match[1], rest: match[2] } : { lead: title, rest: '' };
}

/** Obrázek článku: vlastní `image`, jinak obrázek rubriky (public/obrazky/clanky/rubrika-<kategorie>.webp). */
export function coverImage({ image, category }) {
  return image ?? `obrazky/clanky/rubrika-${category}.webp`;
}

/** Náhled pro Messenger: k WebP obrázku z `npm run obrazek` patří JPG 1200×630 se stejným názvem a „-og“. */
export function ogImageFor(path) {
  return path.endsWith('.webp') ? path.replace(/\.webp$/, '-og.jpg') : path;
}
