// Jediný vstupní bod k datům webu.
import teams from '../data/teams.json';
import seasons from '../data/seasons.json';
import rivalries from '../data/rivalries.json';
import staff from '../data/staff.json';
import templates from '../data/templates.json';

export { teams, seasons, rivalries, staff, templates };

// Loga týmů jako obrázky (public/obrazky/tymy/<id>.webp, přidává `npm run logo`). Když logo chybí, kreslí se SVG ikona.
const logoFiles = import.meta.glob('/public/obrazky/tymy/*.webp');
const logoIds = new Set(Object.keys(logoFiles).map((p) => p.split('/').pop().replace('.webp', '')));
export const teamLogo = (id) => (logoIds.has(id) ? `obrazky/tymy/${id}.webp` : undefined);

export const teamById = (id) => teams.find((t) => t.id === id);
export const staffById = (id) => staff.find((s) => s.id === id);
// Redaktoři s vlastním profilem (bez společného autora „Redakce SL Network“, `collective: true`).
export const staffMembers = staff.filter((s) => !s.collective);
export const currentTeams = teams.filter((t) => t.status !== 'former');
// Týmy s veřejným profilem: nepotvrzení nováčci (`verified: false`) se zatím neodhalují.
export const publicTeams = teams.filter((t) => t.verified);
export const pendingNewcomers = currentTeams.filter((t) => t.status === 'new' && !t.verified);
export const formerTeams = teams.filter((t) => t.status === 'former');
export const seasonsDesc = [...seasons].sort((a, b) => b.number - a.number);
