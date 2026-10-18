// Validace draftového pořadí (src/data/draft/<rrrr-rr>.json).
import { expectedContinuingOrder } from '../../src/lib/draft.js';

const SEASON = /^\d{4}\/\d{2}$/;

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
  return { errors, warnings: [] };
}
