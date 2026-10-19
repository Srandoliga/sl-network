// Validace draftového pořadí (src/data/draft/<rrrr-rr>.json).
import { expectedContinuingOrder, snakeRound } from '../../src/lib/draft.js';

const SEASON = /^\d{4}\/\d{2}$/;
const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'];
const normalize = (name) => String(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, "'").toLowerCase().trim();

/** Výsledek draftu (pole `picks`): úplnost, souvislá čísla, Snake Draft, duplicity hráčů. */
export function validatePicks(draft, at) {
  const errors = [];
  const warnings = [];
  const { order, picks } = draft;
  const n = order.length;
  const rounds = draft.rounds;
  if (!Array.isArray(picks)) return { errors: [`${at}: pole picks musí být seznam`], warnings };
  if (!Number.isInteger(rounds) || rounds < 1) return { errors: [`${at}: chybí počet kol (rounds)`], warnings };
  if (picks.length !== n * rounds) errors.push(`${at}: výběrů je ${picks.length}, má jich být ${n * rounds} (${rounds} kol × ${n})`);
  picks.forEach((p, i) => {
    const where = `${at}: výběr #${p?.pick ?? i + 1}`;
    if (p?.pick !== i + 1) { errors.push(`${where}: čísla výběrů musí jít souvisle od 1 (na pozici ${i + 1})`); return; }
    const round = Math.ceil(p.pick / n);
    if (p.round !== round) errors.push(`${where}: kolo ${p.round}, podle čísla výběru má být ${round}`);
    const expectedTeam = order[snakeRound(round, n)[(p.pick - 1) % n] - 1];
    if (p.team !== expectedTeam) errors.push(`${where}: vybírá ${p.team}, podle Snake Draftu má vybírat ${expectedTeam}`);
    if (typeof p.player !== 'string' || !p.player.trim()) errors.push(`${where}: chybí jméno hráče`);
    if (p.positionShown !== undefined && !POSITIONS.includes(p.positionShown)) warnings.push(`${where}: neobvyklá pozice „${p.positionShown}“`);
    if (p.nbaTeam !== undefined && (typeof p.nbaTeam !== 'string' || !p.nbaTeam.trim())) warnings.push(`${where}: prázdný NBA tým`);
  });
  for (let r = 1; r <= rounds; r += 1) {
    const count = picks.filter((p) => p?.round === r).length;
    if (count !== n) errors.push(`${at}: v ${r}. kole je ${count} výběrů, má jich být ${n}`);
  }
  for (const id of order) {
    const count = picks.filter((p) => p?.team === id).length;
    if (count !== rounds) errors.push(`${at}: ${id} má ${count} výběrů, má jich mít ${rounds}`);
  }
  const names = picks.map((p) => normalize(p?.player ?? ''));
  const dupes = [...new Set(names.filter((x, i) => x && names.indexOf(x) !== i))];
  if (dupes.length) errors.push(`${at}: hráč draftován víckrát: ${dupes.join(', ')}`);
  return { errors, warnings };
}

export function validateDraft(draft, file, { playingIds, newIds, history }) {
  const errors = [];
  const at = `src/data/draft/${file}`;
  if (!draft || typeof draft !== 'object') return { errors: [`${at}: neplatná struktura`], warnings: [] };
  if (!SEASON.test(draft.season ?? '')) errors.push(`${at}: chybí nebo je neplatné pole season`);
  if (Number.isNaN(Date.parse(draft.start))) errors.push(`${at}: neplatné datum start`);
  if (draft.format !== 'snake') errors.push(`${at}: podporovaný formát je jen „snake“`);
  const order = Array.isArray(draft.order) ? draft.order : [];
  const dupes = order.filter((id, i) => order.indexOf(id) !== i);
  if (dupes.length) errors.push(`${at}: tým je v pořadí víckrát: ${[...new Set(dupes)].join(', ')}`);
  const unknown = order.filter((id) => !playingIds.has(id));
  if (unknown.length) errors.push(`${at}: neznámý nebo nehrající tým: ${unknown.join(', ')}`);
  const missing = [...playingIds].filter((id) => !order.includes(id));
  if (missing.length) errors.push(`${at}: v pořadí chybí: ${missing.join(', ')}`);
  if (errors.length) return { errors, warnings: [] };

  // Nováčci vybírají první, pokračující organizace podle bilance (viz expectedContinuingOrder).
  const firstContinuing = order.findIndex((id) => !newIds.has(id));
  if (order.slice(firstContinuing).some((id) => newIds.has(id))) errors.push(`${at}: nováčci musí vybírat před pokračujícími organizacemi`);
  if (!history) return { errors: [...errors, `${at}: chybí historické výsledky sezony ${draft.recordsFrom}`], warnings: [] };
  const continuing = order.slice(firstContinuing);
  const noRecord = continuing.filter((id) => !history.teams.some((t) => t.team === id));
  if (noRecord.length) return { errors: [...errors, `${at}: v sezoně ${draft.recordsFrom} chybí bilance: ${noRecord.join(', ')}`], warnings: [] };
  const expected = expectedContinuingOrder(continuing, history);
  if (expected.join() !== continuing.join()) {
    errors.push(`${at}: pořadí neodpovídá bilancím ${draft.recordsFrom} – podle dat má být ${expected.join(', ')}`);
  }
  if (draft.picks === undefined) return { errors, warnings: [] };
  const picks = validatePicks(draft, at);
  return { errors: [...errors, ...picks.errors], warnings: picks.warnings };
}
