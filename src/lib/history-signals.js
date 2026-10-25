// History Signals – interní redakční náměty vypočtené z ověřených dat. Čisté funkce.
// Každý text („finding“, „why“) se skládá jen z faktů daného signálu; obecné věty bez ověřené podmínky se nepoužívají.
// Relevance = redakční priorita (0–100), ne pravděpodobnost. dataStatus je zatím vždy 'historical'.
import { headToHead, streaks, scoringRecords } from './matches.js';
import { winPct } from './standings.js';
import { draftReturns } from './team-history.js';
import { teamRepeatedPlayers, teamDraftHistory } from './draft-history.js';

export const AREAS = { draft: 'Drafty', results: 'Výsledky', rivalry: 'Rivality', records: 'Rekordy', playoff: 'Play-off' };
const ROUND = { 1: 'čtvrtfinále', 2: 'semifinále', 3: 'finále' };
const slug = (s) => s.replace('/', '-');
const keyOf = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');
const relevance = (f) => ({ score: Math.min(100, Math.round(f.rarity + f.current + f.recurrence + f.surprise)), ...f });
const pctile = (dist, v) => dist.filter((x) => x < v).length / dist.length;
const rec = (r) => `${r.w}–${r.l}${r.t ? `–${r.t}` : ''}`;
const consecutive = (seasons) => seasons.every((s, i) => i === 0 || Number(s.slice(0, 4)) - Number(seasons[i - 1].slice(0, 4)) === 1);
const base = (s) => ({ players: [], dataStatus: 'historical', ...s });
const SEED_WORD = { 1: 'jednička', 2: 'dvojka', 3: 'trojka', 4: 'čtyřka', 5: 'pětka', 6: 'šestka', 7: 'sedmička', 8: 'osmička' };
const COUNT_WORD = { 2: 'dvakrát', 3: 'třikrát', 4: 'čtyřikrát', 5: 'pětkrát' };
const times = (n) => COUNT_WORD[n] ?? `${n}×`;
const games_ = (n) => (n === 1 ? 'zápas' : n >= 2 && n <= 4 ? 'zápasy' : 'zápasů');

/** A/C – kontinuita draftu: tým-sezona s návraty v horních 10 % ligy. */
export function continuitySignals({ drafts, aliases, name, currentSeason }) {
  const rows = drafts.flatMap((d) => d.order.map((team) => ({ team, r: draftReturns(drafts, team, d.season, aliases) }))).filter((x) => x.r);
  const dist = rows.map((x) => x.r.count);
  const max = Math.max(...dist);
  const median = [...dist].sort((a, b) => a - b)[Math.floor(dist.length / 2)];
  return rows.filter((x) => pctile(dist, x.r.count) >= 0.9).map(({ team, r }) => {
    const isMax = r.count === max;
    const isCurrent = r.season === currentSeason;
    const why = [isMax ? 'Nejvyšší počet návratů ze všech tým-sezon s draftovou historií.' : `Patří mezi 10 % nejvyšších hodnot ligy (medián ${median}/${r.total}).`,
      isCurrent ? `Týká se aktuálního draftu ${r.season}.` : null, r.inTop3 >= 3 ? 'Všechny tři první výběry připadly hráčům, které organizace už dříve draftovala.' : null].filter(Boolean).join(' ');
    return base({
      id: `continuity:${team}:${slug(r.season)}`, type: 'continuity', area: 'draft', typeLabel: 'Draftová kontinuita', teams: [team], players: r.picks.map((p) => p.player), seasons: [r.season],
      title: `${name(team)}: ${r.count} z ${r.total} hráčů znovu`, stat: `${r.count}/${r.total}`, statLabel: `návratů v draftu ${r.season}`,
      finding: `${name(team)} v draftu ${r.season} vybrali ${r.count} z ${r.total} hráčů, které už dříve draftovali, z toho ${r.inTop3} v prvních třech kolech. Medián tým-sezon s draftovou historií: ${median}/${r.total}.`,
      evidence: r.picks.map((p) => ({ label: `#${p.pick} ${p.player}`, href: `historie/drafty/${slug(r.season)}/#vyber-${p.pick}` })),
      why, limits: 'Popisuje draftová rozhodnutí, ne výkon hráčů ani současnou soupisku. Návrat nemusí být záměr – může jít o dostupnost hráče v daném okamžiku.',
      uses: ['Power Rankings', 'Matchup Preview'], metrics: { count: r.count, total: r.total, inTop3: r.inTop3, median, max },
      relevance: relevance({ rarity: 40 * pctile(dist, r.count), current: isCurrent ? 25 : 0, recurrence: 0, surprise: r.inTop3 >= 3 ? 10 : 0 }),
    });
  });
}

/** B – proměna draftové ceny: tentýž klub, rozpětí aspoň 30 výběrů a nejlepší výběr do #40, jednosměrný pohyb. */
export function priceShiftSignals({ drafts, aliases, name, currentSeason }) {
  const teams = [...new Set(drafts.flatMap((d) => d.order))];
  return teams.flatMap((team) => teamRepeatedPlayers(drafts, team, aliases).map((g) => ({ team, g }))).flatMap(({ team, g }) => {
    const picks = g.entries.map((e) => e.pick);
    const span = Math.max(...picks) - Math.min(...picks);
    const up = picks.every((x, i) => i === 0 || x < picks[i - 1]);
    const down = picks.every((x, i) => i === 0 || x > picks[i - 1]);
    if (!(up || down) || span < 30 || Math.min(...picks) > 40 || (g.entries.length < 3 && (Math.min(...picks) > 15 || span < 40))) return [];
    const seasons = g.entries.map((e) => e.season);
    const delta = picks[0] - picks.at(-1);
    return [base({
      id: `price-shift:${team}:${keyOf(g.name)}`, type: 'price_shift', area: 'draft', typeLabel: 'Proměna draftové ceny', teams: [team], players: [g.name], seasons,
      title: `${name(team)} – ${g.name}: ${picks.map((p) => `#${p}`).join(' → ')}`, stat: `${up ? '−' : '+'}${Math.abs(delta)}`, statLabel: up ? 'pozic dřív než v prvním draftu' : 'pozic později než v prvním draftu',
      finding: `${g.name}: ${g.entries.length} výběry organizace ${name(team)} (${g.entries.map((e) => `${e.season} #${e.pick}`).join(', ')}).`,
      evidence: g.entries.map((e) => ({ label: `${e.season} #${e.pick}`, href: `historie/drafty/${slug(e.season)}/#vyber-${e.pick}` })),
      why: g.entries.length === 2
        ? `Při druhém výběru o ${Math.abs(delta)} pozic ${up ? 'dřív' : 'později'} než poprvé.`
        : `Klub hráče vybírá pokaždé ${up ? 'dřív' : 'později'} – naposledy o ${Math.abs(delta)} pozic ${up ? 'dřív' : 'později'} než poprvé.`,
      limits: 'Popisuje pořadí výběru, ne hodnotu hráče ani jeho fantasy výkon.',
      publicText: g.entries.length === 2
        ? `Hráče ${g.name} draftovali dvakrát, podruhé o ${Math.abs(delta)} pozic ${up ? 'dřív' : 'později'}: #${picks[0]} a #${picks[1]}.`
        : `Hráče ${g.name} draftovali ${times(g.entries.length)}, pokaždé ${up ? 'dřív' : 'později'}: ${picks.map((p) => `#${p}`).join(', ').replace(/, (#\d+)$/, ' a $1')}.`,
      uses: ['Matchup Preview', 'poznámka v článku'], metrics: { picks, span },
      relevance: relevance({ rarity: Math.min(30, span / 3), current: seasons.includes(currentSeason) ? 20 : 0, recurrence: g.entries.length >= 3 ? 10 : 0, surprise: up && Math.min(...picks) <= 10 ? 15 : 5 }),
    })];
  });
}

/** D – stejná draftová pozice aspoň ve třech draftech po sobě. */
export function slotRepeatSignals({ drafts, name }) {
  const teams = [...new Set(drafts.flatMap((d) => d.order))];
  const all = teams.flatMap((team) => {
    const h = teamDraftHistory(drafts, team);
    const runs = [];
    for (let i = 0; i < h.length;) {
      let k = i;
      while (k + 1 < h.length && h[k + 1].slot === h[i].slot && Number(h[k + 1].season.slice(0, 4)) - Number(h[k].season.slice(0, 4)) === 1) k += 1;
      if (k - i + 1 >= 3) runs.push(h.slice(i, k + 1));
      i = k + 1;
    }
    return runs.map((run) => base({
      id: `slot-repeat:${team}:${slug(run[0].season)}`, type: 'slot_repeat', area: 'draft', typeLabel: 'Opakovaná draftová pozice', teams: [team], seasons: run.map((r) => r.season),
      title: `${name(team)}: ${run.length}× za sebou z pozice #${run[0].slot}`, stat: `#${run[0].slot}`, statLabel: `${run.length} drafty po sobě`,
      finding: `${name(team)} vybírali z pozice #${run[0].slot} v draftech ${run.map((r) => r.season).join(', ')}.`,
      evidence: run.map((r) => ({ label: `${r.season} – první výběr #${r.firstPick.pick} ${r.firstPick.player}`, href: `historie/drafty/${slug(r.season)}/#${team}` })),
      why: null,
      limits: 'O kvalitě draftu ani výsledku nic neříká; pořadí pozic je dané pravidlem ligy.',
      publicText: `${times(run.length).replace(/^./, (c) => c.toUpperCase())} po sobě vybírali v draftu z pozice #${run[0].slot} (${run[0].season}–${run.at(-1).season}).`,
      uses: ['poznámka v článku'], metrics: { slot: run[0].slot, length: run.length },
      relevance: relevance({ rarity: 25 + 5 * (run.length - 3), current: 5, recurrence: 15, surprise: 0 }),
    }));
  });
  const longest = Math.max(0, ...all.map((s) => s.metrics.length));
  return all.map((s) => ({ ...s, why: all.filter((x) => x.metrics.length >= s.metrics.length).length === 1
    ? `Žádná jiná organizace nevybírala ze stejné pozice ${s.metrics.length}× po sobě.`
    : `Stejně dlouhou nebo delší řadu má v lize ${all.filter((x) => x.metrics.length >= s.metrics.length).length - 1} další organizace (nejdelší řada: ${longest}).` }));
}

/** Neobvyklá cesta do finále: šampion nebo finalista s úspěšností základní části nejvýše .500 (seskupeno po klubu a roli). */
export function championshipRunSignals({ history, games, name }) {
  const rows = history.flatMap((h) => h.teams.filter((t) => t.finalRank <= 2).map((t) => ({ season: h.season, t, champion: t.finalRank === 1 })));
  const finalists = rows.length;
  const low = rows.filter((x) => winPct(x.t.record) <= 0.5);
  const groups = Object.values(Object.groupBy(low, (x) => `${x.t.team}|${x.champion}`));
  return groups.map((list) => {
    const { team } = list[0].t;
    const champion = list[0].champion;
    const othersLow = low.filter((x) => x.t.team !== team && x.champion === champion).length;
    const seeds = list.map((x) => x.t.seed);
    const lowerHalf = seeds.every((s) => s >= 5);
    const paths = list.flatMap((x) => games.filter((g) => g.season === x.season && g.competition === 'championship' && g.teams.includes(team)).sort((a, b) => a.round - b.round)
      .map((g) => { const i = g.teams.indexOf(team); return { season: x.season, round: g.round, opp: g.teams[1 - i], oppSeed: g.seeds[1 - i], score: g.scores[i], oppScore: g.scores[1 - i], won: g.winner === team }; }));
    const beatHigher = paths.filter((p) => p.won && p.oppSeed < seeds[list.findIndex((x) => x.season === p.season)]).length;
    const role = champion ? (list.length === 2 ? 'dva tituly' : 'titul') : (list.length === 2 ? 'dvě finále' : 'finále');
    const why = [
      othersLow === 0 ? `Žádný jiný ${champion ? 'šampion' : 'poražený finalista'} neměl úspěšnost .500 nebo nižší (${finalists / 2} sezony).` : `Dalších ${othersLow} ${champion ? 'šampionů' : 'finalistů'} mělo také úspěšnost nejvýše .500.`,
      lowerHalf ? `Nasazení ${seeds.map((s) => `#${s}`).join(' a ')} – dolní polovina pavouku.` : null,
      beatHigher ? `Cestou porazili ${beatHigher}× lépe nasazený tým.` : null,
    ].filter(Boolean).join(' ');
    return base({
      id: `${champion ? 'title' : 'final'}-run:${team}:${list.map((x) => slug(x.season)).join('+')}`, type: 'championship_run', area: 'results', typeLabel: champion ? 'Cesta k titulu' : 'Cesta do finále', teams: [team], seasons: list.map((x) => x.season),
      title: `${name(team)}: ${role} z bilance ${[...new Set(list.map((x) => rec(x.t.record)))].join(' a ')}${list.length > 1 && new Set(list.map((x) => rec(x.t.record))).size === 1 ? ' (pokaždé)' : ''}`, stat: seeds.map((s) => `#${s}`).join(' a '), statLabel: 'nasazení do play-off',
      finding: list.map((x) => `${x.season}: základní část ${rec(x.t.record)}, nasazení #${x.t.seed}, ${champion ? 'šampion' : 'finalista'}`).join('; ') + '.',
      evidence: paths.map((p) => ({ label: `${p.season} ${ROUND[p.round]}: ${p.score}:${p.oppScore} vs ${name(p.opp)} (#${p.oppSeed})`, href: `historie/${slug(p.season)}/` })),
      why, limits: 'Čtyři dokončené sezony; zápas play-off je jediný týden s velkým rozptylem. Nelze z toho vyvozovat záměr ani „šetření sil“.',
      publicText: champion
        ? `${list.length === 2 ? 'Oba tituly' : 'Titul'} (${list.map((x) => x.season).join(' a ')}) vyhráli z bilance ${[...new Set(list.map((x) => rec(x.t.record)))].join(' a ')} – jako nasazená ${list.map((x) => SEED_WORD[x.t.seed]).join(' a ')}.`
        : `Do finále ${list.map((x) => x.season).join(' a ')} došli s bilancí ${list.map((x) => rec(x.t.record)).join(' a ')} jako nasazená ${list.map((x) => SEED_WORD[x.t.seed]).join(' a ')}.`,
      uses: champion ? ['statistický speciál', 'Matchup Preview v play-off'] : ['Matchup Preview v play-off'], metrics: { seeds, beatHigher, othersLow },
      relevance: relevance({ rarity: champion ? (list.length >= 2 ? 40 : 30) : 30, current: 10, recurrence: list.length >= 2 ? 15 : 0, surprise: lowerHalf ? 15 : 8 }),
    });
  });
}

/** Opakovaný souboj v hlavním pavouku: aspoň dvě střetnutí, pokaždé stejný vítěz. */
export function playoffSeriesSignals({ games, name }) {
  const main = games.filter((g) => g.competition === 'championship');
  const pairs = [...new Set(main.map((g) => [...g.teams].sort().join('|')))].map((k) => k.split('|'));
  return pairs.map(([a, b]) => headToHead(games, a, b, ['championship']))
    .filter((h) => h.games.length >= 2 && (h.w === h.games.length || h.l === h.games.length))
    .map((h) => {
      const winner = h.w ? h.a : h.b;
      const loser = winner === h.a ? h.b : h.a;
      const list = [...h.games].reverse();
      const seedOf = (g, t) => g.seeds[g.teams.indexOf(t)];
      const meetings = list.map((g) => ({ season: g.season, round: g.round, ws: seedOf(g, winner), ls: seedOf(g, loser), score: g.scores[g.teams.indexOf(winner)], opp: g.scores[g.teams.indexOf(loser)] }));
      const allUpsets = meetings.every((m) => m.ws > m.ls);
      const loserTop = meetings.every((m) => m.ls === 1);
      const sameRound = meetings.every((m) => m.round === meetings[0].round);
      const seasons = meetings.map((m) => m.season);
      const why = [
        allUpsets ? `Pokaždé vyhrál hůře nasazený tým (${meetings.map((m) => `#${m.ws} proti #${m.ls}`).join(', ')}).` : null,
        loserTop ? `${name(loser)} byli v obou případech nasazenou jedničkou.` : null,
        consecutive(seasons) ? 'Střetnutí v po sobě jdoucích sezonách.' : null,
        sameRound ? `Vždy ve stejné fázi (${ROUND[meetings[0].round]}).` : null,
      ].filter(Boolean).join(' ') || `${name(winner)} vyhráli ${meetings.length === 2 ? 'obě' : `všech ${meetings.length}`} vzájemná střetnutí v hlavním pavouku.`;
      return base({
        id: `playoff-series:${winner}:${loser}`, type: 'playoff_series', area: 'playoff', typeLabel: 'Opakovaný souboj', teams: [winner, loser], seasons,
        title: `${name(winner)} – ${name(loser)} ${meetings.length}–0 v play-off`, stat: `${meetings.length}–0`, statLabel: 'v hlavním pavouku',
        finding: meetings.map((m) => `${m.season} ${ROUND[m.round]}: ${name(winner)} (#${m.ws}) ${m.score}:${m.opp} ${name(loser)} (#${m.ls})`).join('; ') + '.',
        evidence: meetings.map((m) => ({ label: `${m.season} – ${ROUND[m.round]}`, href: `historie/${slug(m.season)}/` })),
        why, limits: `${meetings.length} zápasy; o bilanci v základní části nic neříkají.`,
        publicText: sameRound
          ? `V play-off porazili ${name(loser)} ${times(meetings.length)} – pokaždé ${meetings[0].round === 1 ? 've' : 'v'} ${ROUND[meetings[0].round]} (${meetings.map((m) => m.season).join(' a ')}).`
          : `V play-off porazili ${name(loser)} ${times(meetings.length)}: ${meetings.map((m) => `${m.season} (${ROUND[m.round]})`).join(' a ')}.`,
        uses: ['Matchup Preview'], metrics: { meetings: meetings.length, allUpsets, loserTop, sameRound },
        relevance: relevance({ rarity: 18 + (allUpsets ? 10 : 0) + (loserTop ? 6 : 0), current: 10, recurrence: consecutive(seasons) ? 10 : 4, surprise: allUpsets ? 15 : 0 }),
      });
    });
}

/** Výrazná převaha v základní části: aspoň 8 zápasů a nejvýše jedna porážka. */
export function headToHeadSignals({ games, name }) {
  const ids = [...new Set(games.flatMap((g) => g.teams))].sort();
  return ids.flatMap((a, i) => ids.slice(i + 1).map((b) => headToHead(games, a, b))).filter((h) => (h.games.length >= 8 && Math.min(h.w, h.l) === 0) || (h.games.length >= 10 && Math.min(h.w, h.l) <= 1))
    .map((h) => {
      const [top, low, w, l] = h.w >= h.l ? [h.a, h.b, h.w, h.l] : [h.b, h.a, h.l, h.w];
      const seasons = [...new Set(h.games.map((g) => g.season))].sort();
      return base({
        id: `h2h:${top}:${low}`, type: 'head_to_head', area: 'rivalry', typeLabel: 'Vzájemná bilance', teams: [top, low], seasons,
        title: `${name(top)} proti ${name(low)}: ${w}–${l}${h.t ? `–${h.t}` : ''}`, stat: `${w}–${l}${h.t ? `–${h.t}` : ''}`, statLabel: `základní část, ${h.games.length} zápasů`,
        finding: `V základní části sezon ${seasons.join(', ')} se potkali ${h.games.length}×; ${name(top)} vyhráli ${w}×${l ? `, prohráli ${l}×` : ' a ani jednou neprohráli'}${h.t ? `, ${h.t}× remizovali` : ''}.`,
        evidence: h.games.slice(0, 5).map((g) => ({ label: `${g.season} kolo ${g.matchup}: ${g.scores[g.teams.indexOf(top)]}:${g.scores[g.teams.indexOf(low)]}`, href: `historie/${slug(g.season)}/#${g.id}` })),
        why: l === 0 ? 'Bez jediné porážky v základní části.' : 'Jediná porážka za všechny vzájemné zápasy základní části.',
        limits: 'Jen základní část; síla obou týmů se mezi sezonami měnila.',
        publicText: l === 0 ? `Proti ${name(low)} v základní části neprohráli: ${w}–0${h.t ? `–${h.t}` : ''}.` : `Proti ${name(low)} vyhráli v základní části ${w} z ${h.games.length} zápasů.`,
        uses: ['Matchup Preview'], metrics: { w, l, t: h.t, n: h.games.length },
        relevance: relevance({ rarity: 20 + 2 * (h.games.length - 8) + (l === 0 ? 10 : 0), current: 10, recurrence: 10, surprise: 0 }),
      });
    });
}

/** Rekordní série v základní části (nejdelší vítězná a porážková v rámci sezony). */
export function streakSignals({ games, name, active }) {
  const all = [...new Set(games.flatMap((g) => g.teams))].flatMap((t) => streaks(games, t));
  return ['w', 'l'].flatMap((kind) => {
    const list = all.filter((s) => s.kind === kind).sort((a, b) => b.length - a.length || a.season.localeCompare(b.season));
    const [best, second] = list;
    if (!best || best.length === second?.length) return [];
    return [base({
      id: `streak:${kind}:${best.team}:${slug(best.season)}`, type: 'streak', area: 'records', typeLabel: kind === 'w' ? 'Rekordní vítězná série' : 'Rekordní porážková série', teams: [best.team], seasons: [best.season],
      title: `${name(best.team)}: ${best.length} ${kind === 'w' ? 'výher' : 'porážek'} v řadě`, stat: String(best.length), statLabel: `kola ${best.from}–${best.to}, ${best.season}`,
      finding: `${name(best.team)} v sezoně ${best.season} ${kind === 'w' ? 'vyhráli' : 'prohráli'} ${best.length} zápasů základní části po sobě (kola ${best.from}–${best.to}). Druhá nejdelší série: ${second.length} (${name(second.team)}, ${second.season}).`,
      evidence: [{ label: `Rozpis ${best.season}`, href: `historie/${slug(best.season)}/#rozpis` }],
      why: `Rekord ligy o ${best.length - second.length} ${games_(best.length - second.length)} před druhou nejdelší sérií.`,
      limits: 'Série v rámci jedné sezony základní části; přes konec sezony se nepočítá.',
      uses: kind === 'w' ? ['Weekly Recap (při ověřené aktuální sérii)', 'poznámka v článku'] : ['historická poznámka'], metrics: { length: best.length, second: second.length },
      relevance: relevance({ rarity: 35, current: active.has(best.team) ? 15 : 0, recurrence: 0, surprise: 10 }),
    })];
  });
}

/** Rekordní skóre v běžném (7denním) kole základní části. */
export function scoringRecordSignals({ games, name, active }) {
  const r = scoringRecords(games, { standardOnly: true });
  const any = scoringRecords(games);
  const h = r.highest;
  const longer = any.highest.score > h.score ? any.highest : null;
  return [base({
    id: `scoring-record:high:${h.game.id}`, type: 'scoring_record', area: 'records', typeLabel: 'Rekord skóre', teams: [h.team], seasons: [h.game.season],
    title: `${name(h.team)}: ${h.score} bodů v 7denním kole`, stat: String(h.score), statLabel: `${h.game.season}, kolo ${h.game.matchup} (7 dní)`,
    finding: `Nejvyšší skóre v běžném sedmidenním kole základní části: ${name(h.team)} ${h.score} proti ${name(h.opp)} (${h.game.season}, kolo ${h.game.matchup}).${longer ? ` Vyšší skóre ${longer.score} (${name(longer.team)}) padlo v ${longer.game.days}denním kole, s týdenními koly ho nelze srovnávat.` : ''}`,
    evidence: [{ label: `${h.game.season} kolo ${h.game.matchup}`, href: `historie/${slug(h.game.season)}/#${h.game.id}` }, ...(longer ? [{ label: `${longer.game.season} kolo ${longer.game.matchup} (${longer.game.days} dní)`, href: `historie/${slug(longer.game.season)}/#${longer.game.id}` }] : [])],
    why: 'Rekord ligy mezi 7denními koly (ne absolutní rekord všech kol); srovnává se jen se stejně dlouhými koly.',
    limits: 'Počet NBA zápasů v týdnu se liší; ani sedmidenní kola nejsou zcela stejná.',
    uses: ['Weekly Recap (při ověřeném aktuálním skóre)', 'poznámka v článku'], metrics: { score: h.score, longer: longer?.score ?? null },
    relevance: relevance({ rarity: 30, current: active.has(h.team) ? 10 : 0, recurrence: 0, surprise: 10 }),
  })];
}

/** Úplný katalog signálů, seřazený podle relevance (při shodě podle ID). */
export function historySignals(ctx) {
  const active = ctx.active ?? new Set(ctx.drafts.at(-1).order);
  const all = [continuitySignals, priceShiftSignals, slotRepeatSignals, championshipRunSignals, playoffSeriesSignals, headToHeadSignals, streakSignals, scoringRecordSignals]
    .flatMap((fn) => fn({ ...ctx, active }));
  return all.sort((x, y) => y.relevance.score - x.relevance.score || x.id.localeCompare(y.id));
}

/**
 * Selektivní přehled: nejvýš `perArea` signálů z každé oblasti a `perType` z každého typu, dokud není `n` signálů.
 * Pestrost má přednost před pořadím relevance.
 */
export function topSignals(signals, { n = 6, perArea = 1, perType = 1 } = {}) {
  const pick = [];
  const count = (key, val) => pick.filter((s) => s[key] === val).length;
  for (const limitArea of [perArea, perArea + 1]) {
    for (const s of signals) {
      if (pick.length >= n) break;
      if (!pick.includes(s) && count('area', s.area) < limitArea && count('type', s.type) < perType + (limitArea - perArea)) pick.push(s);
    }
  }
  return pick;
}

/** Signály pro konkrétní použití (organizace, hráč, dvojice soupeřů, sezona, typ článku). */
export function signalsFor(signals, { team, player, opponents, season, use } = {}) {
  const norm = (x) => String(x).toLowerCase();
  return signals.filter((s) => (!team || s.teams.includes(team))
    && (!player || s.players.some((p) => norm(p) === norm(player)))
    && (!opponents || opponents.every((t) => s.teams.includes(t)))
    && (!season || s.seasons.includes(season))
    && (!use || s.uses.some((u) => norm(u).includes(norm(use)))));
}
