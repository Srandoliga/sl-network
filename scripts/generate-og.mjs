// Jednorázově vytvoří výchozí náhledový obrázek pro Messenger (public/og-default.png, 1200×630).
// Spuštění: node scripts/generate-og.mjs  (vyžaduje balíček sharp, který instaluje Astro)
import sharp from 'sharp';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="p" cx="0" cy="1" r="0.9"><stop offset="0" stop-color="#8b5cf6" stop-opacity=".45"/><stop offset="1" stop-color="#8b5cf6" stop-opacity="0"/></radialGradient>
    <radialGradient id="r" cx="1" cy="1" r="0.9"><stop offset="0" stop-color="#ef4444" stop-opacity=".45"/><stop offset="1" stop-color="#ef4444" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="630" fill="#0b0d10"/>
  <rect width="1200" height="630" fill="url(#p)"/><rect width="1200" height="630" fill="url(#r)"/>
  <g font-family="Arial Narrow, Arial, Helvetica, sans-serif" font-weight="900" font-style="italic">
    <text x="600" y="300" text-anchor="middle" font-size="150" fill="#ffffff"><tspan fill="#e5322d">SL</tspan> NETWORK</text>
  </g>
  <path d="M520 110l26 20 28-40 28 40 26-20-10 52h-88z" fill="#e0b44c"/>
  <text x="600" y="370" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="34" letter-spacing="18" fill="#e0b44c">SEZONA V · 2026/27</text>
  <rect x="560" y="410" width="80" height="6" fill="#e5322d"/>
  <text x="600" y="480" text-anchor="middle" font-family="Georgia, serif" font-size="36" fill="#c9ced6">Zpravodajství Srandoligy</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(new URL('../public/og-default.png', import.meta.url).pathname);
console.log('Hotovo: public/og-default.png');
