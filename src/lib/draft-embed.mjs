// Vložené bloky v článcích: značky <!-- draft-order: 2026-27 --> a <!-- snake-rounds: 2026-27 --> v Markdownu
// nahradí v hotovém HTML tabulkou draftového pořadí a jednoduchým přehledem prvních tří kol Snake Draftu.
// Data: src/data/draft/<id>.json, týmy z src/data/teams.json, bilance z src/data/historie/<recordsFrom>.json.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { draftRows, snakeRound } from './draft.js';
import { joinBase } from './url.js';

const MARKER = /<!--\s*(draft-order|snake-rounds):\s*([0-9-]+)\s*-->/g;
const SNAKE_ROUNDS = 3;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const readJson = (root, path) => JSON.parse(readFileSync(join(root, path), 'utf8'));

function logoUrl(root, base, id) {
  const path = `obrazky/tymy/${id}.webp`;
  const file = join(root, 'public', path);
  if (!existsSync(file)) return undefined;
  const v = createHash('md5').update(readFileSync(file)).digest('hex').slice(0, 8);
  return `${joinBase(base, path)}?v=${v}`;
}

function loadDraft(root, id) {
  const draft = readJson(root, `src/data/draft/${id}.json`);
  const teams = readJson(root, 'src/data/teams.json');
  const historyPath = `src/data/historie/${draft.recordsFrom.replace('/', '-')}.json`;
  const history = existsSync(join(root, historyPath)) ? readJson(root, historyPath) : undefined;
  return { draft, rows: draftRows(draft.order, (tid) => teams.find((t) => t.id === tid), history) };
}

export function draftOrderHtml({ draft, rows }, { root, base }) {
  const body = rows.map(({ pick, team, record }) => {
    const href = joinBase(base, `tymy/${team.id}/`);
    const logo = logoUrl(root, base, team.id);
    const mark = logo
      ? `<img src="${esc(logo)}" alt="" width="40" height="40" loading="lazy" decoding="async">`
      : `<span class="draft-table__mono" style="--team:${esc(team.color)}">${esc(team.short)}</span>`;
    const result = record ? `${record.w}–${record.l}${record.t ? `–${record.t}` : ''}` : '<span class="tag">Nováček</span>';
    return `<tr${record ? '' : ' class="is-new"'}><td class="draft-table__pick">${pick}</td>`
      + `<td><a class="draft-table__team" href="${esc(href)}">${mark}<span>${esc(team.name)}</span></a></td>`
      + `<td class="draft-table__record">${result}</td></tr>`;
  }).join('');
  return `<table class="draft-table"><caption>1. kolo draftu · Sezona ${esc(draft.season)}</caption>`
    + `<thead><tr><th scope="col">Výběr</th><th scope="col">Organizace</th><th scope="col">Bilance ${esc(draft.recordsFrom)}</th></tr></thead>`
    + `<tbody>${body}</tbody></table>`;
}

export function snakeRoundsHtml({ rows }) {
  const n = rows.length;
  const items = Array.from({ length: SNAKE_ROUNDS }, (_, i) => {
    const round = i + 1;
    const forward = round % 2 === 1;
    // Pozice vždy zleva 1–n; zvýrazněná je ta, která kolo zahajuje, šipka ukazuje směr výběrů.
    const first = snakeRound(round, n)[0];
    const slots = Array.from({ length: n }, (_, i) => i + 1)
      .map((s) => `<span${s === first ? ' class="is-start"' : ''}>${s}</span>`).join('');
    return `<li><span class="snake-rounds__label">${round}. kolo <span aria-hidden="true">${forward ? '→' : '←'}</span></span>`
      + `<span class="snake-rounds__slots" aria-label="pořadí výběrů ${snakeRound(round, n).join(', ')}">${slots}</span></li>`;
  }).join('');
  return `<ol class="snake-rounds">${items}</ol>`;
}

/** Nahradí značky v HTML článku. Bez značek vrací HTML beze změny. */
export function embedDraftBlocks(html, { base = '/', root = process.cwd() } = {}) {
  const render = { 'draft-order': draftOrderHtml, 'snake-rounds': snakeRoundsHtml };
  return html.replace(MARKER, (_, kind, id) => render[kind](loadDraft(root, id), { root, base }));
}
