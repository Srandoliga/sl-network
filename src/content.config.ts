import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import staff from './data/staff.json';
import { CATEGORY_IDS } from './lib/site.js';

const staffIds = staff.map((s) => s.id) as [string, ...string[]];

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
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    demo: z.boolean().default(false),
  }),
});

export const collections = { articles };
