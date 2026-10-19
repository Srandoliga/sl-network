// Draft: hadovité pořadí (Snake Draft) a řádky tabulky draftového pořadí. Čisté funkce – vstup nikdy nemění.

/** Celkové číslo výběru pro pozici `slot` (1–n) v kole `round` (1, 2, …) při `n` týmech. */
export function overallPick(slot, round, n) {
  return round % 2 === 1 ? (round - 1) * n + slot : round * n - slot + 1;
}

/** Pořadí pozic v daném kole: liché kolo 1 → n, sudé n → 1. */
export function snakeRound(round, n) {
  const slots = Array.from({ length: n }, (_, i) => i + 1);
  return round % 2 === 1 ? slots : slots.reverse();
}

/** Řádky tabulky: pořadí výběru, tým, bilance z archivu (u nováčků null). */
export function draftRows(order, teamById, historySeason) {
  return order.map((id, i) => {
    const standing = historySeason?.teams.find((t) => t.team === id);
    return { pick: i + 1, team: teamById(id), record: standing?.record ?? null, finalRank: standing?.finalRank ?? null };
  });
}

/** Soupisky po draftu: v pořadí draftových pozic, u každé organizace její výběry podle čísla výběru. */
export function draftRosters(order, picks, teamById) {
  return order.map((id, i) => ({
    slot: i + 1,
    team: teamById(id),
    picks: picks.filter((p) => p.team === id).sort((a, b) => a.pick - b.pick),
  }));
}

/**
 * Pravidlo pořadí pokračujících organizací: obrácená bilance základní části (méně výher dřív),
 * při shodě dřív vybírá horší konečné umístění po play-off. Vrací id seřazená podle pravidla.
 */
export function expectedContinuingOrder(ids, historySeason) {
  const byId = new Map(historySeason.teams.map((t) => [t.team, t]));
  return [...ids].sort((a, b) => {
    const ta = byId.get(a);
    const tb = byId.get(b);
    return ta.record.w - tb.record.w || tb.finalRank - ta.finalRank;
  });
}
