import { joinBase } from './url.js';

/** Interní odkaz včetně base path (GitHub Pages). */
export const u = (path = '') => joinBase(import.meta.env.BASE_URL, path);

/** Absolutní URL (Open Graph, upoutávky). */
export const abs = (path: string, site: URL | undefined) => new URL(u(path), site).href;
