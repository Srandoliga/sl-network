# AGENTS.md – SL Network (Srandoliga, Season V, 2026/27)

## Co stavíme
Statický zpravodajský web pro soukromou NBA Fantasy ligu (ESPN, H2H Points, 10 manažerů).
Mediální nadstavba nad ESPN, ne jeho náhrada. Veškerý obsah česky.

**Priorita č. 1:** minimum práce pro majitele (cíl 5–10 min týdně), nulové provozní náklady.

## Priority fází
1. **Fáze 1 = zábava:** identita, články, redaktoři, Síň slávy, týmy, rivality. Zatím bez živých statistik; pouze připrav strukturu pro pozdější přidání.
2. **Fáze 2 = týdenní výsledky a ocenění:** nejprve ověř, jaká data skutečně získáme ze screenshotů **jednoho kompletního matchupu** ESPN; až potom definuj finální formát vstupu. ChatGPT může převést čitelné údaje do JSON. Následně výsledky kola, MVP, All-Fantasy First Team, Fantasy Hero.
3. **Fáze 3 = pozdější statistiky** (Skokan, Zklamání, Výkon týdne, Bench Disaster) jen při dostatku relevantních dat. Výkon týdne vyžaduje údaje za jednotlivá NBA utkání, které zatím nemáme potvrzené.

## Technické zásady
- Statický web, GitHub Pages + GitHub Actions. Doporučený základ: Astro (pokud se ukáže zbytečně složitý, navrhni jednodušší variantu a zdůvodni).
- Články: Markdown (frontmatter: title, date, author, category, perex, image).
- Data: JSON. **Jeden JSON na odehrané fantasy kolo** (`data/weeks/<id-kola>.json`) plní statistické moduly i homepage; eviduj skutečné datum začátku a konce kola (některá kola mohou trvat déle než 7 dní), číslo kola, zdroj a stav ověření.
- Bez databáze, API klíčů, registrací, admin systému, placených služeb.
- Řazení příspěvků a homepage se aktualizují automaticky z obsahu.
- `noindex` + rozumný `robots.txt` bez plošného blokování botů nutných pro náhledy odkazů v Messengeru. Neindexování není ochrana přístupu. Správné adresy článků na GitHub Pages (base path!).
- Open Graph metadata pro každý článek (Messenger náhledy).
- **Validace dat při buildu:** build musí selhat při neplatném JSONu, chybějících povinných polích, neexistujícím týmu, duplicitním hráči v First Team nebo neplatné struktuře. **Nesoulad součtu viditelných bodů hráčů s oficiálním skóre H2H nejprve hlásit k ručnímu ověření**, nikoli automaticky přepisovat skóre nebo blokovat publikaci: snapshot soupisky nemusí vystihovat denní započítávání bodů.

## Pravidla pro data (nezpochybnitelná)
1. **Nikdy nevymýšlej** výsledky, statistiky ani výroky manažerů.
2. Chybí-li podklad pro ocenění, zobraz „data nejsou k dispozici“, ne odhad.
3. Demo data označ viditelně `DEMO` (v JSON `"demo": true` i na webu).
4. Bodování = nastavení naší ESPN ligy, ne obecné NBA fantasy.
5. Rozlišuj body započítané do H2H vs. body na lavičce; žádné body na lavičce automaticky nepřičítej do týmového výsledku. MVP a Fantasy Hero vycházejí primárně z **bodů započtených do H2H**, jsou-li ověřeny. Když chybějí, ocenění označ jako nevyhodnotitelné.
6. Vlastnictví hráče se mění během sezony; ukládej vlastníka k danému fantasy kolu a rozliš případný přestup během kola, pokud ho zdroj doloží.
7. ESPN lineup slot (např. G/F/UTIL/Bench) není totéž co hráčova způsobilost PG/SG/SF/PF/C. Pro First Team vyžaduj ověřené způsobilé pozice (`eligible_positions`); neodvozuj je jen ze slotu. Hráče nezařazuj na nepotvrzenou pozici.
8. Redakční interpretace (např. Fantasy Hero bez doložitelného vlivu) označ jako interpretaci. Žádná smyšlená kauzalita typu „bez hráče by tým prohrál“, pokud ji data nepotvrzují.

## Redakce (fiktivní, jednotné pixelové avatary)
- **Vincent „Two Sources“ Vrána** – Senior Insider: zákulisí, přestupy, kontroverze. Vážný tón + absurdní humor.
- **Charles „Chuck“ Benson** – Basketball Analyst: ostrý trash talk, ironie.
- **Eddie „The Numbers“ Brooks** – Head of Analytics: čísla, predikce, Power Rankings, suchý humor.

Tón: ~30 % analytika, 45 % humor, 25 % přátelský roast. Satira a smyšlené citace musí být z kontextu zjevně fikce. Ostré texty podléhají schválení před publikací.

## Vizuální styl
Tmavé pozadí, bílá/světle šedá typografie, červené akcenty, **zlatá jen pro tituly a ocenění**. Vzdušné, čitelné na telefonu (mobile first). Pixel-art/ilustrované postavy a jednoduché týmové ikony. **Žádné** fotorealistické AI obličeje, záře, zbytečné animace. Redakční Power Rankings musí být jasně odlišené od oficiálního pořadí ESPN.

## Soukromí
Web je veřejně dostupný komukoli s odkazem. Žádné osobní údaje manažerů (jen přezdívky/názvy týmů) bez jejich souhlasu.

## Čemu se vyhnout
Videa, mobilní app, fórum, chatbot, automatické publikování na Messenger, uživatelské účty, vlastní DB, složitý CMS, automatická integrace ESPN (zatím jen návrh struktury).

## Způsob práce
- Pracuj samostatně, běžná technická rozhodnutí nekonzultuj.
- **Ptej se jen** při významném dopadu na vzhled, náklady, bezpečnost nebo rozsah.
- Nejdřív jednoduché řešení; rozšiřitelnost řeš strukturou dat, ne funkcemi navíc.
- **Před prvním veřejným nasazením vyžádej schválení.** Nejprve předlož lokálně sestavený web / náhled a návod, teprve se schválením zapni veřejný deploy GitHub Pages.
- Po každém úkolu: ověř build, popiš, co se změnilo, uveď limity.
