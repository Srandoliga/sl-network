// Plánované vydání: rozhodnutí, zda má automatický běh nasadit web.
// Čisté funkce – žádná síť ani soubory; CLI a workflow je jen volají.
//
// Pravidla:
// - Kandidát = článek s `draft: false`, jehož datum vydání už nastalo.
// - „Vydaný“ = je v manifestu posledního ÚSPĚŠNÉHO nasazení (publikovano.json na živém webu).
//   Neúspěšné nasazení manifest nezmění → článek zůstává k vydání a další běh to zkusí znovu.
// - Nasadit jen tehdy, když existuje kandidát, který v manifestu chybí. Jinak nic (žádné opakované nasazení).
// - Bez manifestu se automaticky nenasazuje (bezpečný stav, poprvé je potřeba ruční Run workflow).

/** Hlavička článku: jen `date` a `draft` (formát podle konvencí projektu). Neplatné datum = chyba. */
export function parseFrontmatter(text, id = '?') {
  const m = String(text).match(/^---\n([\s\S]*?)\n---/);
  if (!m) throw new Error(`${id}: chybí hlavička (frontmatter)`);
  const date = m[1].match(/^date:\s*["']?([^"'\n]+?)["']?\s*$/m)?.[1];
  const draft = m[1].match(/^draft:\s*(true|false)\s*$/m)?.[1] === 'true';
  // Datum bez času (2026-11-18) je půlnoc UTC – stejně jako v buildu (z.coerce.date).
  const at = date ? new Date(date) : null;
  if (!at || Number.isNaN(at.valueOf())) throw new Error(`${id}: neplatné nebo chybějící datum vydání „${date ?? ''}“`);
  return { id, date: at, draft };
}

/** Články, které má veřejný build v daném okamžiku obsahovat (stejné pravidlo jako visibleArticles). */
export const dueAt = (articles, now) => articles.filter((a) => !a.draft && a.date <= now);

const ID = /^[a-z0-9-]+$/;

/**
 * Manifest je platný jen tehdy, když má commit, platný čas buildu a seznam ID článků (bez duplicit).
 * Cokoli jiného (poškozený soubor, cizí obsah) = null → automaticky se nenasazuje.
 */
export function validManifest(m) {
  if (!m || typeof m !== 'object') return null;
  if (typeof m.commit !== 'string' || !m.commit) return null;
  if (typeof m.builtAt !== 'string' || Number.isNaN(Date.parse(m.builtAt))) return null;
  if (!Array.isArray(m.articles) || !m.articles.every((id) => typeof id === 'string' && ID.test(id))) return null;
  if (new Set(m.articles).size !== m.articles.length) return null;
  return m;
}

/**
 * Rozhodnutí plánovaného běhu.
 * @param articles  hlavičky všech článků na `main` ({ id, date, draft })
 * @param manifest  manifest posledního úspěšného nasazení ({ commit, builtAt, articles: [id…] }) nebo null
 * @param now       čas běhu
 * @param headCommit commit, který by se nasadil (GITHUB_SHA)
 * @returns { deploy, error, reason, pending: [id…], stuck: [id…], upcoming: [{ id, date }] }
 */
export function releaseDecision({ articles, manifest: raw, now, headCommit }) {
  const manifest = validManifest(raw);
  const upcoming = articles.filter((a) => !a.draft && a.date > now)
    .sort((x, y) => x.date - y.date).map((a) => ({ id: a.id, date: a.date }));
  if (!manifest) {
    return { deploy: false, error: false, reason: 'Manifest posledního nasazení chybí nebo je neplatný – automaticky se nenasazuje. Spusťte ručně Run workflow.', pending: [], stuck: [], upcoming };
  }
  const live = new Set(manifest.articles);
  const due = dueAt(articles, now).filter((a) => !live.has(a.id));
  // Uvízlý článek: byl splatný už při buildu nasazeného commitu, a přesto v něm chybí (build ho vynechal).
  // Nové nasazení téhož commitu by ho znovu vynechalo → pojistka proti nekonečnému cyklu.
  const builtAt = new Date(manifest.builtAt);
  const sameCommit = Boolean(headCommit) && manifest.commit === headCommit;
  const stuck = sameCommit ? due.filter((a) => a.date <= builtAt).map((a) => a.id) : [];
  const pending = due.map((a) => a.id).filter((id) => !stuck.includes(id));
  const warn = stuck.length ? ` CHYBA: ${stuck.join(', ')} chybí i v nasazení commitu ${headCommit.slice(0, 7)} (build je vynechal) – kvůli nim se znovu nenasazuje, zkontrolujte hlavičku článku.` : '';
  if (!pending.length) {
    return stuck.length
      ? { deploy: false, error: true, reason: warn.trim(), pending, stuck, upcoming }
      : { deploy: false, error: false, reason: 'Nic nového k vydání – web odpovídá poslednímu úspěšnému nasazení.', pending, stuck, upcoming };
  }
  return { deploy: true, error: stuck.length > 0, reason: `K vydání: ${pending.join(', ')}.${warn}`, pending, stuck, upcoming };
}

/**
 * Manifest pro dist/publikovano.json: commit, čas buildu a ID článků, které build skutečně obsahuje.
 * Bere se ze sestaveného webu (adresáře dist/clanky/<id>/), ne z hlaviček – co v buildu není, nebylo vydáno.
 */
export function buildManifest({ commit, builtAt, articleDirs }) {
  return { commit, builtAt: builtAt.toISOString(), articles: [...articleDirs].filter((d) => d !== 'kategorie').sort() };
}

/** Pojistka proti úniku: manifest nesmí obsahovat koncept ani článek s budoucím datem v okamžiku buildu. */
export function leakedArticles(manifest, articles) {
  const byId = new Map(articles.map((a) => [a.id, a]));
  const builtAt = new Date(manifest.builtAt);
  return manifest.articles.filter((id) => { const a = byId.get(id); return !a || a.draft || a.date > builtAt; });
}
