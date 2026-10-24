// Popisná statistika pro interní analytiku. Čisté, deterministické funkce bez závislostí.

const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;

/** Pearsonův korelační koeficient; null při méně než 3 hodnotách nebo nulovém rozptylu. */
export function pearson(xs, ys) {
  if (xs.length !== ys.length) throw new Error('pearson: řady musí mít stejnou délku');
  if (xs.length < 3) return null;
  const mx = mean(xs);
  const my = mean(ys);
  const cov = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const vx = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const vy = ys.reduce((s, y) => s + (y - my) ** 2, 0);
  return vx === 0 || vy === 0 ? null : cov / Math.sqrt(vx * vy);
}

/** Pořadí hodnot od nejmenší (1); shodné hodnoty dostanou průměrné (střední) pořadí. */
export function midRanks(xs) {
  const order = xs.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]);
  const ranks = new Array(xs.length);
  for (let i = 0; i < order.length;) {
    let j = i;
    while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j += 1;
    for (let k = i; k <= j; k += 1) ranks[order[k][1]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return ranks;
}

/** Spearmanův koeficient (Pearson nad středními pořadími). */
export const spearman = (xs, ys) => pearson(midRanks(xs), midRanks(ys));

/** Zaokrouhlení pro výstup (koeficienty na 2 desetinná místa, null zůstává null). */
export const round2 = (x) => (x === null ? null : Math.round(x * 100) / 100);
