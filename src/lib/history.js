// Výpočty historie ligy z dat sezon (src/data/seasons.json). Čisté funkce bez vedlejších efektů.

/** Tituly podle týmů, seřazené od nejvíce titulů (při shodě dřívější první titul). */
export function titleCounts(seasons) {
  const byTeam = seasons.reduce((acc, s) => ({
    ...acc,
    [s.champion]: [...(acc[s.champion] ?? []), s.season],
  }), {});
  return Object.entries(byTeam)
    .map(([team, list]) => ({ team, titles: list.length, seasons: list }))
    .sort((a, b) => b.titles - a.titles || a.seasons[0].localeCompare(b.seasons[0]));
}

/** Účasti ve finále (vítězná i prohraná), seřazené podle počtu finále a titulů. */
export function finalAppearances(seasons) {
  const empty = { finals: 0, titles: 0, lost: 0 };
  const byTeam = seasons.reduce((acc, s) => {
    const champ = acc[s.champion] ?? empty;
    const fin = acc[s.finalist] ?? empty;
    return {
      ...acc,
      [s.champion]: { ...champ, finals: champ.finals + 1, titles: champ.titles + 1 },
      [s.finalist]: { ...fin, finals: fin.finals + 1, lost: fin.lost + 1 },
    };
  }, {});
  return Object.entries(byTeam)
    .map(([team, v]) => ({ team, ...v }))
    .sort((a, b) => b.finals - a.finals || b.titles - a.titles);
}

/** Finálová historie jednoho týmu. */
export function teamHistory(seasons, teamId) {
  return seasons
    .filter((s) => s.champion === teamId || s.finalist === teamId)
    .map((s) => ({
      season: s.season,
      result: s.champion === teamId ? 'champion' : 'finalist',
      opponent: s.champion === teamId ? s.finalist : s.champion,
    }));
}

/** Fakta o rivalitě dvou týmů: počty titulů a vzájemná finále. */
export function rivalryRecord(seasons, [a, b]) {
  const count = (id) => seasons.filter((s) => s.champion === id).length;
  const pair = new Set([a, b]);
  return {
    titles: { [a]: count(a), [b]: count(b) },
    headToHeadFinals: seasons
      .filter((s) => pair.has(s.champion) && pair.has(s.finalist))
      .map((s) => s.season),
  };
}

/** Zajímavosti z historie – pouze tvrzení přímo odvozená z dat. `name(id)` vrací název týmu. */
export function historyFacts(seasons, rivalryPairs, name) {
  if (seasons.length === 0) return [];
  const ordered = [...seasons].sort((a, b) => a.number - b.number);
  const unlucky = finalAppearances(ordered)
    .filter((f) => f.titles === 0 && f.finals >= 2)
    .map((f) => `${name(f.team)}: ${f.finals}× ve finále, zatím bez titulu.`);
  const repeated = ordered.some((s, i) => i > 0 && ordered[i - 1].champion === s.champion);
  const defence = repeated ? [] : ['Žádný šampion zatím titul neobhájil.'];
  const rivals = rivalryPairs.map(([a, b]) => {
    const { headToHeadFinals } = rivalryRecord(ordered, [a, b]);
    return headToHeadFinals.length
      ? `${name(a)} a ${name(b)} se ve finále potkali v sezoně ${headToHeadFinals.join(', ')}.`
      : `${name(a)} a ${name(b)} se ve finále ještě nikdy nepotkali.`;
  });
  const champions = titleCounts(ordered);
  const n = champions.length;
  const who = n === 1 ? 'jediný šampion' : n < 5 ? `${n} různí šampioni` : `${n} různých šampionů`;
  const distinct = [`Za ${ordered.length} sezon${ordered.length < 5 ? 'y' : ''} jen ${who}.`];
  return [...rivals, ...unlucky, ...defence, ...(champions.length < ordered.length ? distinct : [])];
}
