# SL Network – předání pro další práci

Stav k 14. 10. 2026. Pravidla projektu: [AGENTS.md](AGENTS.md), plán: [BACKLOG.md](BACKLOG.md), obsluha: [PUBLIKOVANI.md](PUBLIKOVANI.md).

## Kde co je

| Co | Kde |
|---|---|
| Projekt (lokálně) | `~/Desktop/Srando_/SL_Network_Codex` |
| Repozitář (veřejný) | https://github.com/Srandoliga/sl-network (organizace `Srandoliga`, účet majitele `Kandelabrus`) |
| Živý web | https://srandoliga.github.io/sl-network/ |
| Nasazení | GitHub Actions → „Build a nasazení“ |
| Podklady (mimo git) | `podklady/originaly/` – originály obrázků a screenshoty ESPN (obsahují jména manažerů – nikdy nepublikovat) |

## Jak se nasazuje (majitel nemá `brew`/`gh`, Claude nemá přístup ke GitHubu)

1. Claude: změny, `npm test`, `npm run build`, commit lokálně (git identita repa: `Kandelabrus` + noreply adresa).
2. Majitel: **GitHub Desktop → Push origin** (push jen sestaví a zkontroluje, nic nezveřejní).
3. Majitel: **Actions → Build a nasazení → Run workflow** = veřejné nasazení.
4. Claude: ověří živý web (stav běhu přes GitHub API, `curl` stránek, prohlížeč 375/320 px).

**Veřejné nasazení vždy jen po výslovném schválení majitele.**

## Hotovo

- **Fáze 1** (úkoly 1–10): Astro 7 web, design (Barlow Condensed / Source Serif 4 / Inter, tmavý styl, zlatá jen pro tituly), články z Markdownu, redakce (Vrána, Benson, Brooks + společný autor „Redakce SL Network“), Síň slávy, týmy s logy, Open Graph pro Messenger, noindex, validace dat při buildu.
- **Publikované články:** „Srandoliga má vlastní redakci. Nikdo si o ni neřekl.“ (hlavní, `featured`) a „Čtyři sezony. Dva šampioni…“ (historie).
- **Redakční režim** (jen lokálně): ikona „Redakce SL Network“ na Ploše / `npm run dev` / `npm run build:redakce` – koncepty, šablony pro Messenger, upoutávky. Veřejný build je nesmí obsahovat (hlídá `scripts/check-dist.mjs`).
- **Fáze 1.5 – Historické výsledky** (`/historie/`): 4 sezony 2022/23–2025/26 z ESPN – konečné pořadí, bilance základní části, PF/PA, divize East/West, nasazení, 15 zápasů play-off na sezonu (hlavní pavouk, o umístění, consolation). Souhrnné statistiky, profily týmů „sezona po sezoně“, odkazy ze Síně slávy.
- **Nováčci:** dva nepotvrzení (`novy-tym-1/2`, `verified: false`) – na webu skryti, místo nich oznámení na stránce Týmy. Skutečná jména ani loga zatím do repa nepatří.

## Klíčová rozhodnutí (neměnit bez majitele)

- Názvy: **AbuKaufí VzdejTo**, **Tachovský Gadžo** (zápisy v ESPN jsou chybné). Každá organizace má jedno stálé ID v `src/data/teams.json`.
- Historické organizace bez profilu (`profile: false`): Uganda Paopice, Budějce Gotcha (2022/23), O.J. (2023/24). Žádné vazby na současné týmy.
- Přeštice Mighty Ducks a Irish Airballers: už nehrají, profily zůstávají.
- ACL Rokycany v lize od 2023/24, Tachovský Gadžo od 2024/25.
- Konečné umístění vždy podle ESPN (i 9. místo Tachovský Gadžo 2024/25, kde rozhodl GmC3).
- Divize zobrazovat jako „East“ / „West“ (plný název v ESPN oříznutý).
- Nikdy nevymýšlet výsledky, statistiky ani výroky manažerů; žádná osobní data manažerů.

## Důležité soubory

- `src/content/articles/*.md` – články (frontmatter: title, headline, date, author, category, perex, teaser, image, featured, draft)
- `src/data/teams.json`, `seasons.json` (Síň slávy), `historie/<rrrr-rr>.json`, `staff.json`, `rivalries.json`, `templates.json`
- `data/weeks/` – prozatímní formát pro fázi 2 (README uvnitř)
- `scripts/validate-data.mjs` + `scripts/lib/validate*.mjs` – validace; `scripts/check-dist.mjs` – kontrola buildu
- `npm run obrazek -- <soubor> <nazev>` (obrázek článku + OG JPG), `npm run logo -- <soubor> <id-tymu>`
- `PODKLADY-OBRAZKY.md` – prompty pro ChatGPT (styl obrázků, loga, portréty)

## Další krok podle BACKLOGu: Fáze 2 – týdenní výsledky

Začíná **datovým pilotem**: vyžádat screenshoty **jednoho kompletního matchupu** z ESPN (skóre, hráči, body, aktivní vs. lavička), ověřit, co z nich jde spolehlivě vyčíst a kolik snímků je potřeba. Teprve pak finalizovat formát `data/weeks/<id>.json` a stavět výsledky kola, MVP, All-Fantasy First Team, Fantasy Hero, Power Rankings.

## Drobnosti / limity

- Homepage má zatím prázdné moduly „Power Rankings“ a „Týden ve Srandolize“ („Redakce čeká na první kolo“) – záměrně do fáze 2.
- GitHub Actions hlásí zastaralý Node 20 v akcích – zatím jen varování; aktualizovat verze akcí, až vyjdou.
- Lokální náhled: `npx astro preview --port 4321` (běží na pozadí) nebo ikona Redakce (port 4400).
