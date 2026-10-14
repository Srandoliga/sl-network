// Validace historických sezon (src/data/historie/*.json). Vrací { errors, warnings, notes }.
const sum = (arr, f) => arr.reduce((a, x) => a + f(x), 0);
const winner = (g) => (g.scores[0] > g.scores[1] ? g.teams[0] : g.teams[1]);
const loser = (g) => (g.scores[0] > g.scores[1] ? g.teams[1] : g.teams[0]);
const same = (a, b) => a.length === b.length && [...a].sort().join() === [...b].sort().join();

export function validateHistorySeason(s, hallOfFame, teamIds) {
  const errors = [];
  const notes = [];
  const where = s.season ?? '?';
  const err = (m) => errors.push(`${where}: ${m}`);
  const teams = s.teams ?? [];
  const byKey = new Map(teams.map((t) => [t.team, t]));
  teams.forEach((t) => { if (!teamIds.has(t.team)) err(`neexistující tým „${t.team}“ (doplňte do teams.json)`); });
  ['season', 'espnSeason', 'source', 'verification'].forEach((k) => { if (s[k] === undefined) err(`chybí pole „${k}“`); });

  if (teams.length !== 10) err(`počet týmů ${teams.length}, čekáno 10`);
  if (byKey.size !== teams.length) err('duplicitní klíč týmu');
  const ranks = teams.map((t) => t.finalRank).sort((a, b) => a - b).join();
  if (ranks !== '1,2,3,4,5,6,7,8,9,10') err(`konečná umístění nejsou 1–10 (${ranks})`);
  const seeds = teams.map((t) => t.seed).sort((a, b) => a - b).join();
  if (seeds !== '1,2,3,4,5,6,7,8,9,10') err(`nasazení nejsou 1–10 (${seeds})`);
  for (const div of new Set(teams.map((t) => t.division))) {
    const r = teams.filter((t) => t.division === div).map((t) => t.divisionRank).sort().join();
    if (r !== '1,2,3,4,5') err(`pořadí v divizi ${div} není 1–5 (${r})`);
  }
  const games = new Set(teams.map((t) => t.record.w + t.record.l + t.record.t));
  if (games.size !== 1) err(`týmy mají různý počet zápasů základní části (${[...games]})`);
  const w = sum(teams, (t) => t.record.w); const l = sum(teams, (t) => t.record.l); const ti = sum(teams, (t) => t.record.t);
  if (w !== l) err(`součet výher ${w} ≠ součet proher ${l}`);
  if (ti % 2) err(`lichý součet remíz ${ti}`);
  const pf = sum(teams, (t) => t.pf); const pa = sum(teams, (t) => t.pa);
  if (pf !== pa) err(`součet PF ${pf} ≠ součet PA ${pa}`);
  notes.push(`${where}: ${[...games][0]} zápasů základní části, W=L=${w}, remízy ${ti / 2}, PF=PA=${pf}`);

  const gs = s.games ?? [];
  if (gs.length !== 15) err(`play-off má ${gs.length} zápasů, čekáno 15 (7 hlavní pavouk, 5 o umístění, 3 consolation)`);
  gs.forEach((g, i) => {
    g.teams.forEach((k) => { if (!byKey.has(k)) err(`zápas ${i}: neznámý tým ${k}`); });
    if (g.scores[0] === g.scores[1]) err(`zápas ${i}: nerozhodné skóre`);
  });
  const pick = (b, r) => gs.filter((g) => g.bracket === b && g.round === r);
  const seedOf = (k) => byKey.get(k)?.seed;
  const m1 = pick('main', 1); const m2 = pick('main', 2); const m3 = pick('main', 3);
  const p2 = pick('placement', 2); const p3 = pick('placement', 3);
  if (m1.length !== 4 || m2.length !== 2 || m3.length !== 1) err('hlavní pavouk nemá 4+2+1 zápasů');
  m1.forEach((g) => { if (seedOf(g.teams[0]) + seedOf(g.teams[1]) !== 9) err(`1. kolo: nasazení ${g.teams} nedávají pár 1–8/2–7/3–6/4–5`); });
  if (!same(m2.flatMap((g) => g.teams), m1.map(winner))) err('2. kolo neodpovídá vítězům 1. kola');
  if (m3[0] && !same(m3[0].teams, m2.map(winner))) err('finále neodpovídá vítězům 2. kola');
  if (!same(p2.flatMap((g) => g.teams), m1.map(loser))) err('zápasy o umístění (2. kolo) neodpovídají poraženým z 1. kola');
  const third = p3.find((g) => g.places?.[0] === 3);
  if (third && !same(third.teams, m2.map(loser))) err('zápas o 3. místo neodpovídá poraženým semifinalistům');
  const fifth = p3.find((g) => g.places?.[0] === 5); const seventh = p3.find((g) => g.places?.[0] === 7);
  if (fifth && !same(fifth.teams, p2.map(winner))) err('zápas o 5. místo neodpovídá vítězům zápasů o umístění');
  if (seventh && !same(seventh.teams, p2.map(loser))) err('zápas o 7. místo neodpovídá poraženým zápasů o umístění');
  const cons = gs.filter((g) => g.bracket === 'consolation');
  const bottom = teams.filter((t) => t.seed >= 9).map((t) => t.team);
  cons.forEach((g) => { if (!same(g.teams, bottom)) err(`consolation: hrají jiné týmy než nasazení 9 a 10`); });

  gs.filter((g) => g.places).forEach((g) => {
    const [wp, lp] = g.places;
    if (byKey.get(winner(g))?.finalRank !== wp || byKey.get(loser(g))?.finalRank !== lp) err(`zápas o ${wp}. místo nesouhlasí s konečným pořadím`);
  });
  const consWins = Object.fromEntries(bottom.map((k) => [k, cons.filter((g) => winner(g) === k).length]));
  const ninth = teams.find((t) => t.finalRank === 9)?.team;
  if (cons.length === 3 && consWins[ninth] < 2) notes.push(`${where}: o 9. místě rozhodl poslední zápas GmC3, ne počet výher (${Object.entries(consWins).map(([k, v]) => `${k} ${v}×`).join(', ')})`);

  const hof = hallOfFame.find((h) => h.season === s.season);
  const champ = teams.find((t) => t.finalRank === 1); const fin = teams.find((t) => t.finalRank === 2);
  if (!hof) err('sezona chybí v seasons.json (Síň slávy)');
  else {
    if (champ?.team !== hof.champion) err(`šampion ${champ?.team} ≠ Síň slávy ${hof.champion}`);
    if (fin?.team !== hof.finalist) err(`finalista ${fin?.team} ≠ Síň slávy ${hof.finalist}`);
  }
  return { errors, warnings: [], notes };
}
