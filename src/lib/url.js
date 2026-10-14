// Spojení base path (GitHub Pages: /<repo>/) s cestou uvnitř webu.
export function joinBase(base, path = '') {
  if (/^[a-z]+:\/\//i.test(path)) return path;
  const b = base.endsWith('/') ? base : `${base}/`;
  const p = path.startsWith('/') ? path.slice(1) : path;
  return `${b}${p}`;
}
