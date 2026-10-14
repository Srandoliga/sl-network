import { getCollection } from 'astro:content';
import { visibleArticles } from './articles.js';
import { EDITORIAL } from './site.js';

export async function getArticles() {
  return visibleArticles(await getCollection('articles'), EDITORIAL);
}
