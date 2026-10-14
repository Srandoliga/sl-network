# BACKLOG – SL Network

Dělej úkoly postupně. Po každém ověř build a shrň výsledek. Dodrž `AGENTS.md`.

**Filozofie:** Fáze 1 = zábava, příběhy, identita. Statistiky přijdou později a budou jednoduché.

## FÁZE 1 – ZÁBAVA (před draftem)

### 1. Základ projektu
- Inicializace (Astro nebo jednodušší), příprava GitHub Pages workflow přes Actions, `noindex` a `robots.txt` vhodný i pro Messenger náhledy.
- **Hotovo když:** web lze lokálně sestavit a zobrazit, build ověřuje správnou base path; **veřejný deploy až po výslovném schválení**. Nezveřejňuj prázdný web jen kvůli testu.

### 2. Design systém a layout
- Barvy, typografie, komponenty (karta článku, odznak titulu, hlavička redaktora), navigace, mobil first.
- **Hotovo když:** stránky jsou konzistentní a čitelné na telefonu.

### 3. Články
- Markdown → samostatná stránka (adresa, datum, autor, titulek, perex, kategorie), výpis, filtr kategorií.
- Open Graph + tlačítko „Zkopírovat upoutávku“.
- **Hotovo když:** nový `.md` soubor se po buildu objeví na webu i na homepage bez další úpravy.

### 4. Redaktoři
- Profily Vrány, Bensona, Brookse, pixelové SVG avatary (konzistentní styl), krátké bio a „podpisový“ styl.

### 5. Síň slávy
- Tabulka titulů z dat, počty titulů, příběh „Čtyři sezony. Dva šampioni.“
- Struktura pro doplňování rekordů, finalistů, ocenění a **rivalit** (např. ACL vs. Little Barns).

| Sezona | Šampion | Finalista |
|---|---|---|
| 2022/23 | Little Barns Fireballs | Kutlak’s Amateurs |
| 2023/24 | ACL Rokycany | Pilsen Beers |
| 2024/25 | Little Barns Fireballs | Pilsen Beers |
| 2025/26 | ACL Rokycany | Chlumčany JZD |

### 6. Franchises
- 8 pokračujících: ACL Rokycany, Little Barns Fireballs, Pilsen Beers, Chlumčany JZD, Los Mustachios, Kutlak’s Amateurs, AbuKuafi Vzdejto, Tachovsky gadzo.
- Odcházející (jen v historii): Přeštice Mighty Ducks, Irish Airballers.
- 2 nové týmy: doplnění přes jeden datový soubor. Názvy `verified: false`, dokud je majitel nepotvrdí.
- Jednoduchá týmová ikona (SVG), kolonka „mediální příběh“ pro každý tým.

### 7. Homepage
- Hlavní zpráva, nejnovější články, titulky z Haly slávy, zajímavost z historie. Moduly bez dat se skryjí nebo zobrazí hravý prázdný stav (např. „Redakce čeká na první kolo“).

### 8. Šablony pro Messenger
- 3 jednoduché opakovaně použitelné šablony (Breaking News, Draft Special, Weekly Recap) jako HTML/CSS/SVG pro mobil. Export do PNG zatím ručně, bez placených služeb.

### 9. Úvodní článek
- „Čtyři sezony. Dva šampioni. Srandoliga vstupuje do nové éry.“ Jen skutečná historie. Autor: Vrána. Ke schválení.

### 10. Návod a předání
- `PUBLIKOVANI.md`: jak přidat článek a upoutávku. Shrnutí limitů. **Požádej o schválení před veřejným nasazením.**

---

## FÁZE 2 – TÝDENNÍ VÝSLEDKY A OCENĚNÍ (po draftu)

Vstup: **skutečné údaje z ESPN H2H Points**, předběžně dodané screenshoty. ChatGPT může čitelná data převést do JSON, Codex je zobrazí a provede validaci.

**Nejdříve datový pilot:** vyžádej ukázku **jednoho kompletního matchupu** (výsledné skóre, hráči, fantasy body, aktivní body vs. lavička, pokud jsou dostupné). Ověř, co z ní lze spolehlivě zjistit a kolik screenshotů to vyžaduje. Teprve pak stanov minimalistický sběr podkladů pro všech pět zápasů. Nepředpokládej, že stačí vždy 1–2 fotky na matchup.

### 11. Týdenní JSON (ke schválení)
- Identifikátor kola, datum začátku/konce, 5 matchupů, týmy, oficiální H2H skóre; u hráčů jen prokazatelně zjištěné údaje (jméno, NBA tým, majitel, slot, známé způsobilé pozice, týdenní body a pokud možno započtené body vs. lavička).
- U nejistých údajů pole `needs_review: true` a vysvětlení; nepublikuj neověřené jméno jako fakt.
- Ulož i stručný odkaz/popis zdrojového screenshotu a stav kompletnosti dat.
- Validace buildu: platná struktura, existující týmy, žádná duplicita ve First Team, číselná skóre. **Rozdíl mezi oficiálním H2H skóre a součtem viditelných hráčských bodů je varování ke kontrole, ne automaticky chyba buildu.**

### 12. Stránka „Týden ve Srandolize“
- Výsledky kola, nejtěsnější zápas, největší rozdíl, nejvyšší skóre týdne.
- Bilance týmů se dopočítá ze všech uložených týdnů.

### 13. MVP týdne
- Hráč s nejvyšším ověřeným **započteným přínosem do H2H** za dané kolo (jen hráči vlastnění v Srandolize). Jméno, NBA tým, majitel, body, komentář analytika. Pokud snímky nerozlišují aktivní/lavičku, MVP zatím nevyhlašuj.

### 14. All-Fantasy First Team
- PG, SG, SF, PF, C podle ověřených týdenních H2H bodů; jeden hráč jen na jedné pozici, zvol bodově nejlepší přípustnou kombinaci.
- **Pozice určuj podle ověřené hráčské způsobilosti (`eligible_positions`), ne pouze podle slotu v zápasové soupisce** (G/F/UTIL/Bench není důkaz PG/SG/SF/PF/C). Pokud chybí údaj, vyžádej ho nebo ocenění odlož; `position_override` lze použít jen u doložené způsobilosti a zobrazit jej jako redakční rozhodnutí.

### 15. Fantasy Hero
- Hráč s významným ověřeným přínosem k výsledku konkrétního matchupu. Propoj body započtené do H2H s rozdílem skóre; neodvozuj z celkových týdenních bodů automaticky, že hráč „rozhodl“ zápas. Neprokazatelnou kauzalitu označ jako redakční interpretaci.

### 16. Power Rankings
- Redakční žebříček psaný ChatGPT, na webu jasně odlišený od oficiálního pořadí ESPN.

### 17. Zbylé šablony pro Messenger
- Weekly Recap, Power Rankings, MVP, First Team, Fantasy Hero, Championship Special.

---

## FÁZE 3 – POZDĚJI (jen pokud budou data a chuť)
- **Skokan týdne:** až bude dost uložených týdnů pro srovnání (min. počet zápasů/týdnů stanovit při návrhu).
- **Zklamání týdne:** jen jako pokles proti předchozím týdnům, odlišit zranění. Bez očekávání nelze hodnotit proti projekcím.
- **Výkon týdne** (nejvíc bodů v jednom NBA zápase) vyžaduje denní výkony hráčů; ty zatím nejsou součástí potvrzených podkladů. **Bench Disaster** vyžaduje skutečné nezapočtené body na lavičce a znalost denních sestav, ne jen konečný snapshot. Rozhodnout až podle dostupných podkladů.
- Případná automatizace dat z ESPN.
