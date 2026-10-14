// Základní nastavení webu na jednom místě.
export const SITE = {
  name: 'SL Network',
  league: 'Srandoliga',
  seasonLabel: 'Sezona V',
  season: '2026/27',
  chapter: 'Pátá kapitola',
  tagline: ['Deset týmů.', 'Příběhy, které zůstávají.'],
  description: 'Neoficiální zpravodajství Srandoligy – soukromé NBA Fantasy ligy. Satira, příběhy a historie.',
  locale: 'cs_CZ',
};

export const CATEGORIES = [
  { id: 'zpravy', label: 'Zprávy' },
  { id: 'zakulisi', label: 'Zákulisí' },
  { id: 'analyza', label: 'Analýza' },
  { id: 'komentar', label: 'Komentář' },
  { id: 'historie', label: 'Historie' },
  { id: 'redakce', label: 'Redakce' },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export const categoryLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label ?? id;

export const NAV = [
  { href: '', label: 'Domů' },
  { href: 'clanky/', label: 'Články' },
  { href: 'sin-slavy/', label: 'Síň slávy' },
  { href: 'historie/', label: 'Historické výsledky' },
  { href: 'tymy/', label: 'Týmy' },
  { href: 'redakce/', label: 'Redakce' },
];

// Redakční režim (`npm run dev`, `npm run build:redakce`): koncepty, šablony pro Messenger, upoutávky.
// Veřejný web (`npm run build`, GitHub) nic z toho neobsahuje.
export const EDITORIAL = import.meta.env?.DEV === true || process.env.REDAKCE === '1';
