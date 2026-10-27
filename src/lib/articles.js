// Pomocné funkce pro články. Čisté funkce – vstup nikdy nemění.

export function sortByDateDesc(articles) {
  return [...articles].sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** Publikované články (koncepty jen při showDrafts), od nejnovějšího. */
export function visibleArticles(articles, showDrafts) {
  return sortByDateDesc(articles.filter((a) => showDrafts || !a.data.draft));
}

/** Rubriky k zobrazení: s `hideWhenEmpty` jen tehdy, když mají aspoň jeden (viditelný) článek. */
export function listedCategories(categories, articles) {
  return categories.filter((c) => !c.hideWhenEmpty || articles.some((a) => a.data.category === c.id));
}

/** Hlavní zpráva: nejnovější článek s `featured: true`, jinak nejnovější článek. Vstup už seřazený. */
export function pickLeadStory(sorted) {
  return sorted.find((a) => a.data.featured) ?? sorted[0];
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
