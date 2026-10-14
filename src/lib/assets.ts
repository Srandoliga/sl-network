// Obrázky z public/ s otiskem obsahu (?v=…): po výměně souboru prohlížeč i Messenger načtou novou verzi.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { u, abs } from './paths';

const cache = new Map<string, string>();

function version(path: string) {
  if (!cache.has(path)) {
    try {
      const data = readFileSync(join(process.cwd(), 'public', path));
      cache.set(path, createHash('md5').update(data).digest('hex').slice(0, 8));
    } catch {
      cache.set(path, ''); // chybějící soubor odhalí kontrola odkazů po buildu
    }
  }
  return cache.get(path);
}

const withVersion = (url: string, path: string) => (version(path) ? `${url}?v=${version(path)}` : url);

/** Interní URL obrázku z public/ s verzí. */
export const asset = (path: string) => withVersion(u(path), path);

/** Absolutní URL obrázku s verzí (Open Graph). */
export const absAsset = (path: string, site: URL | undefined) => withVersion(abs(path, site), path);
