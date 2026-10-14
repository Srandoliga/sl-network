// Týdenní data (fáze 2). Jeden JSON na kolo v data/weeks/<id-kola>.json; validace ve scripts/validate-data.mjs.
const modules = import.meta.glob('/data/weeks/*.json', { eager: true, import: 'default' });

export const weeks = Object.values(modules).sort((a, b) => b.number - a.number);
export const latestWeek = weeks[0];
