import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import staff from './data/staff.json';
import teams from './data/teams.json';
import { CATEGORY_IDS, OWN_IMAGE_CATEGORY_IDS } from './lib/site.js';

const staffIds = staff.map((s) => s.id) as [string, ...string[]];
const currentTeamIds = teams.filter((t) => t.status !== 'former').map((t) => t.id) as [string, ...string[]];
const RECORD = /^\d+–\d+(–\d+)?$/;
// Všechna ID organizací včetně bývalých (historické články) – pro relatedTeams.
const allTeamIds = teams.map((t) => t.id) as [string, ...string[]];

// Power Rankings: jeden zdroj pro tabulku článku i homepage. Pořadí = pořadí položek (1. položka = PR #1).
// Jde o redakční hodnocení – nic se nepřepočítává podle tabulky ESPN.
const rankings = z.object({
  edition: z.number().int().positive(),
  afterRound: z.number().int().positive(),
  entries: z.array(z.object({
    team: z.enum(currentTeamIds),
    record: z.string().regex(RECORD, 'bilance ve tvaru 2–0 nebo 2–1–1 (pomlčka –)'),
    points: z.number().int().nonnegative().optional(),
  })).length(currentTeamIds.length),
}).refine((r) => new Set(r.entries.map((e) => e.team)).size === r.entries.length, {
  message: 'tým je v žebříčku dvakrát', path: ['entries'],
});

// Weekly Recap: redakční ocenění kola (jediný zdroj; výsledky zápasů jsou v src/data/zapasy/<sezona>.json).
const playerAward = z.object({
  player: z.string().min(2),
  team: z.enum(currentTeamIds),
  points: z.number().int(),
});
const recap = z.object({
  round: z.number().int().positive(),
  mvp: playerAward.optional(),
  performance: playerAward.optional(),
  surprise: playerAward.optional(),
  // Redakčně zvolený Zápas týdne (dvojice týmů daného kola). Bez něj homepage ukáže jen nejtěsnější zápas.
  gameOfWeek: z.object({ teams: z.tuple([z.enum(currentTeamIds), z.enum(currentTeamIds)]) }).optional(),
  // Krátká redakční zajímavost kola pro homepage (věta z článku).
  highlight: z.string().min(5).max(160).optional(),
});

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string().min(3),
    // Krátký titulek pro Hlavní příběh a šablony, např. „Dvě dynastie. Jedna liga.“ (nepovinné).
    headline: z.string().min(3).optional(),
    // Podtitulek pod hlavním nadpisem článku (nepovinné). Do SEO titulku a náhledu v Messengeru se připojí za titulek.
    subtitle: z.string().min(3).optional(),
    // Kratší titulek a popis pro vyhledávač a náhled v Messengeru (nepovinné; jinak titulek + podtitulek a perex).
    seoTitle: z.string().min(3).max(70).optional(),
    seoDescription: z.string().min(10).max(200).optional(),
    date: z.coerce.date(),
    author: z.enum(staffIds),
    category: z.enum(CATEGORY_IDS as [string, ...string[]]),
    perex: z.string().min(10),
    // Cesta k obrázku ve složce public/, např. "obrazky/clanek.png". Pro Messenger ideálně PNG/JPG 1200×630.
    image: z.string().regex(/^[a-z0-9/_.-]+\.(png|jpe?g|webp)$/i).optional(),
    imageAlt: z.string().optional(),
    teaser: z.string().optional(),
    // Ohlášení dalšího dílu rubriky (Beyond the Score): datum, titulek a krátký text. Na homepage se ukazuje do daného data.
    nextIssue: z.object({
      date: z.coerce.date(),
      title: z.string().min(3),
      teaser: z.string().min(3).optional(),
    }).optional(),
    // Hlavní organizace článku (1–4), o kterých článek skutečně je – ne výčet všech zmíněných týmů.
    // Určuje „Související články“ a pořadí „Článků o týmu“ na profilu.
    relatedTeams: z.array(z.enum(allTeamIds)).min(1).max(4)
      .refine((ids) => new Set(ids).size === ids.length, { message: 'tým je v relatedTeams dvakrát' }).optional(),
    // Preferované související články (nejvýš 2, ID = název souboru bez .md). Existenci ověří build;
    // na webu se ukážou jen už vydané, chybějící místo doplní automatický výběr.
    relatedArticles: z.array(z.string().regex(/^[a-z0-9-]+$/, 'ID článku = název souboru bez .md')).min(1).max(2)
      .refine((ids) => new Set(ids).size === ids.length, { message: 'článek je v relatedArticles dvakrát' }).optional(),
    rankings: rankings.optional(),
    recap: recap.optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    demo: z.boolean().default(false),
  }).refine((a) => !a.rankings || a.category === 'power-rankings', {
    message: 'žebříček (rankings) patří jen do rubriky power-rankings',
    path: ['rankings'],
  }).refine((a) => !a.recap || a.category === 'weekly-recap', {
    message: 'ocenění kola (recap) patří jen do rubriky weekly-recap',
    path: ['recap'],
  }).refine((a) => a.image || !OWN_IMAGE_CATEGORY_IDS.includes(a.category), {
    message: 'rubrika nemá výchozí obrázek – doplňte vlastní image (npm run obrazek)',
    path: ['image'],
  }),
});

export const collections = { articles };
