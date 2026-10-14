// Připraví obrázek článku pro web do public/obrazky/clanky/:
//   <nazev>.webp     – šířka 1600 px pro web
//   <nazev>-og.jpg   – 1200×630 pro náhled odkazu v Messengeru
// Použití: npm run obrazek -- <cesta/k/obrazku.png> <nazev-bez-pripony>
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const [, , input, name] = process.argv;
if (!input || !name || !/^[a-z0-9-]+$/.test(name)) {
  console.error('Použití: npm run obrazek -- <obrázek> <nazev>   (název: malá písmena, číslice, pomlčky)');
  process.exit(1);
}
const dir = new URL('../public/obrazky/clanky/', import.meta.url).pathname;
mkdirSync(dir, { recursive: true });
try {
  const web = await sharp(input).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toFile(`${dir}${name}.webp`);
  await sharp(input).resize({ width: 1200, height: 630, fit: 'cover' }).jpeg({ quality: 82, mozjpeg: true }).toFile(`${dir}${name}-og.jpg`);
  console.log(`✅ public/obrazky/clanky/${name}.webp (${web.width}×${web.height}) + ${name}-og.jpg (1200×630)`);
  console.log(`Do hlavičky článku přidejte:  image: obrazky/clanky/${name}.webp`);
} catch (err) {
  console.error(`❌ Obrázek se nepodařilo zpracovat: ${err.message}`);
  process.exit(1);
}
