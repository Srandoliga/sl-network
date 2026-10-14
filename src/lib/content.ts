import { getCollection } from 'astro:content';
import { visibleArticles } from './articles.js';
import { SHOW_DRAFTS } from './site.js';

export async function getArticles() {
  return visibleArticles(await getCollection('articles'), SHOW_DRAFTS);
}
