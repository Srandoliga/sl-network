// Připraví logo týmu: čtverec 256×256 s průhledností do public/obrazky/tymy/<id-tymu>.webp.
// Použití: npm run logo -- <cesta/k/logu.png> <id-tymu>   (id podle src/data/teams.json, např. acl-rokycany)
// Web pak logo použije automaticky místo kreslené SVG ikony.
import sharp from 'sharp';
import { mkdirSync, readFileSync } from 'node:fs';

const [, , input, id] = process.argv;
const teams = JSON.parse(readFileSync(new URL('../src/data/teams.json', import.meta.url), 'utf8'));
if (!input || !teams.some((t) => t.id === id)) {
  console.error(`Použití: npm run logo -- <obrázek> <id-tymu>\nPlatná id: ${teams.map((t) => t.id).join(', ')}`);
  process.exit(1);
}
const dir = new URL('../public/obrazky/tymy/', import.meta.url).pathname;
mkdirSync(dir, { recursive: true });
try {
  await sharp(input).trim({ threshold: 10 }).resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 90, alphaQuality: 100 }).toFile(`${dir}${id}.webp`);
  console.log(`✅ public/obrazky/tymy/${id}.webp – logo se na webu použije automaticky.`);
} catch (err) {
  console.error(`❌ Logo se nepodařilo zpracovat: ${err.message}`);
  process.exit(1);
}
