// Kontroly jedné HTML stránky z dist/. Čisté funkce – vrací seznam chyb.

const ATTR = /\s(?:href|src|content)="([^"]*)"/g;

/** Interní URL ze stránky (relativní k webu nebo absolutní na vlastní doménu). */
export function internalUrls(html, origin) {
  return [...html.matchAll(ATTR)]
    .map((m) => m[1].replaceAll('&amp;', '&'))
    .map((v) => (v.startsWith(origin) ? v.slice(origin.length) : v))
    .filter((v) => v.startsWith('/') && !v.startsWith('//'));
}

/** Převod URL na soubor v dist/ (bez base path). Vrací null, pokud URL neleží pod base path. */
export function urlToDistPath(url, base) {
  const clean = decodeURIComponent(url.split(/[?#]/)[0]);
  const prefix = base.endsWith('/') ? base : `${base}/`;
  if (clean !== base && !clean.startsWith(prefix)) return null;
  const rest = clean.slice(prefix.length - 1) || '/';
  return rest.endsWith('/') ? `${rest}index.html` : rest;
}

export function checkPage({ file, html, base, origin, exists }) {
  const errors = [];
  if (!/<meta name="robots" content="noindex/.test(html)) errors.push(`${file}: chybí meta robots noindex`);
  if (!/<meta property="og:title"/.test(html)) errors.push(`${file}: chybí og:title`);
  if (!/<meta property="og:image" content="https?:\/\//.test(html)) errors.push(`${file}: og:image musí být absolutní URL`);
  for (const url of new Set(internalUrls(html, origin))) {
    const target = urlToDistPath(url, base);
    if (target === null) errors.push(`${file}: odkaz „${url}“ nezačíná base path ${base}`);
    else if (!exists(target)) errors.push(`${file}: odkaz „${url}“ vede na neexistující soubor`);
  }
  return errors;
}
