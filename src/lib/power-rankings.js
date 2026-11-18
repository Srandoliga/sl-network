// Power Rankings: redakční žebříček z frontmatteru článku (`rankings`). Jeden zdroj pro tabulku článku i homepage.
// Nic se nepřepočítává podle tabulky ESPN – zobrazuje se vždy poslední skutečně vydané hodnocení. Čisté funkce.

/** Vydání Power Rankings (články se strukturovaným žebříčkem), od nejnovějšího. Vstup už seřazený a viditelný. */
export const rankingEditions = (sorted) => sorted.filter((a) => a.data.category === 'power-rankings' && a.data.rankings);

/**
 * Pořadí s pohybem proti předchozímu vydání: `rank`, `prev` (null = v předchozím chyběl nebo předchozí není)
 * a `move` (kladné = posun nahoru, 0 = beze změny, null = nelze porovnat).
 */
export function withMovement(entries, previousEntries) {
  const before = new Map((previousEntries ?? []).map((e, i) => [e.team, i + 1]));
  return entries.map((e, i) => {
    const rank = i + 1;
    const prev = previousEntries ? before.get(e.team) ?? null : null;
    return { ...e, rank, prev, move: prev === null ? null : prev - rank };
  });
}

/** Vydání žebříčku s pohybem proti předchozímu vydání (podle data publikace). */
export function rankingFor(article, sorted) {
  const editions = rankingEditions(sorted);
  const i = editions.findIndex((a) => a.id === article.id);
  const previous = i >= 0 ? editions[i + 1] : undefined;
  return {
    article,
    edition: article.data.rankings.edition,
    afterRound: article.data.rankings.afterRound,
    previous,
    entries: withMovement(article.data.rankings.entries, previous?.data.rankings.entries),
  };
}

/** Poslední vydaný žebříček (nebo undefined, pokud žádný není). */
export function latestRanking(sorted) {
  const [last] = rankingEditions(sorted);
  return last ? rankingFor(last, sorted) : undefined;
}

/** Text pohybu pro čtečky i zobrazení: „▲ 2“, „▼ 1“, „=“, nebo „NEW“ u týmu bez předchozího pořadí. */
export function moveLabel({ move, prev }, hasPrevious) {
  if (!hasPrevious) return null;
  if (prev === null) return { mark: 'NEW', text: 'nově v žebříčku', kind: 'new' };
  if (move > 0) return { mark: `▲ ${move}`, text: `o ${move} nahoru`, kind: 'up' };
  if (move < 0) return { mark: `▼ ${-move}`, text: `o ${-move} dolů`, kind: 'down' };
  return { mark: '=', text: 'beze změny', kind: 'same' };
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nbsp = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '&nbsp;');

/**
 * Tabulka žebříčku pro článek (značka `<!-- power-rankings -->` v Markdownu). Stejné třídy jako ručně psaná tabulka
 * v Power Rankings #1. Odkaz vede na sekci týmu v článku (`id="tym-<id>"`), pokud existuje, jinak na profil týmu.
 */
export function rankingsTableHtml(ranking, { teamName, hasLogo, html = '' }) {
  const hasPrevious = Boolean(ranking.previous);
  const showPoints = ranking.entries.every((e) => Number.isInteger(e.points));
  const rows = ranking.entries.map((e) => {
    const anchor = html.includes(`id="tym-${e.team}"`) ? `#tym-${e.team}` : `../../tymy/${e.team}/`;
    const logo = hasLogo(e.team) ? `<img src="../../obrazky/tymy/${esc(e.team)}.webp" alt="" width="28" height="28" loading="lazy" decoding="async">` : '';
    const m = moveLabel(e, hasPrevious);
    const move = m ? ` <span class="pr-move pr-move--${m.kind}"><span aria-hidden="true">${m.mark}</span><span class="visually-hidden">${m.text}</span></span>` : '';
    return `<tr class="pr-table__row--${e.rank}"><td class="pr-table__rank">${e.rank}</td>`
      + `<td><a class="pr-table__team" href="${esc(anchor)}">${logo}<span>${esc(teamName(e.team))}</span></a>${move}</td>`
      + `<td class="pr-table__num">${esc(e.record)}</td>${showPoints ? `<td class="pr-table__num">${nbsp(e.points)}</td>` : ''}</tr>`;
  }).join('');
  return '<table class="pr-table"><caption>Redakční hodnocení síly, nikoli pořadí ESPN ani seřazení podle bodů</caption>'
    + `<thead><tr><th scope="col">PR</th><th scope="col">Organizace</th><th scope="col" class="pr-table__num">Bilance</th>${showPoints ? '<th scope="col" class="pr-table__num">FP</th>' : ''}</tr></thead>`
    + `<tbody>${rows}</tbody></table>`;
}

export const RANKINGS_MARKER = /<!--\s*power-rankings\s*-->/;
