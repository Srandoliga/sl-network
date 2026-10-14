# SL Network

Statický zpravodajský web Srandoligy (NBA Fantasy, ESPN H2H Points). Astro + GitHub Pages, bez databáze a bez nákladů.

- Pravidla projektu: [AGENTS.md](AGENTS.md), plán: [BACKLOG.md](BACKLOG.md)
- **Jak publikovat:** [PUBLIKOVANI.md](PUBLIKOVANI.md)
- Týdenní data (fáze 2): [data/weeks/README.md](data/weeks/README.md)

## Struktura

```
src/content/articles/   články (Markdown)
src/data/               týmy, sezony, rivality, redakce, šablony (JSON)
data/weeks/             jeden JSON na fantasy kolo (fáze 2)
src/pages/              stránky webu
src/components/         komponenty (karta článku, týmová ikona, pixelový avatar…)
src/lib/                výpočty (historie, články) – čisté funkce s testy
scripts/                validace dat před buildem, kontrola odkazů po buildu
public/                 obrázky, robots.txt, favicon, výchozí náhled og-default.png
```

`npm install` → `npm run dev`. Podrobnosti v PUBLIKOVANI.md.
