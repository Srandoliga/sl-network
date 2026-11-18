import { getCollection } from 'astro:content';
import { visibleArticles } from './articles.js';
import { EDITORIAL } from './site.js';
import { allLiveGames, currentMatchSeason } from './data.js';
import { publicGames } from './home.js';

export async function getArticles() {
  return visibleArticles(await getCollection('articles'), EDITORIAL);
}

/**
 * Zápasy pro zobrazení (homepage, profily, H2H): dokončené sezony + jen ta kola rozehrané sezony,
 * ke kterým už vyšel Weekly Recap (nebo mají výslovně publishWithoutRecap: true).
 */
export async function getPublicGames() {
  return publicGames(allLiveGames, currentMatchSeason, await getArticles());
}
