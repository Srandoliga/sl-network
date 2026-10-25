# SL Network – předání pro další práci

Stav k 25. 10. 2026. Pravidla projektu: [AGENTS.md](AGENTS.md), plán: [BACKLOG.md](BACKLOG.md), obsluha a typografie článků: [PUBLIKOVANI.md](PUBLIKOVANI.md).

## Kde co je

| Co | Kde |
|---|---|
| Projekt (lokálně) | `~/Desktop/Srando_/SL_Network_Codex` |
| Repozitář (veřejný!) | https://github.com/Srandoliga/sl-network (organizace `Srandoliga`, účet majitele `Kandelabrus`) |
| Živý web | https://srandoliga.github.io/sl-network/ |
| Nasazení | GitHub Actions → „Build a nasazení“ |
| Podklady (mimo git) | `podklady/originaly/` – originály grafik, screenshoty ESPN (rozpis, transakce, draft). **Obsahují skutečná jména manažerů – nikdy nepublikovat.** |

## Jak se nasazuje (majitel nemá `brew`/`gh`, Claude nemá přístup ke GitHubu)

1. Claude: změny, `npm test`, `npm run build`, commit lokálně (git identita repa: `Kandelabrus` + noreply adresa). Commit jen se souhlasem majitele.
2. Majitel: **GitHub Desktop → Push origin** (push jen sestaví a zkontroluje, deploy job se přeskočí).
3. Majitel: **Actions → Build a nasazení → Run workflow** = veřejné nasazení. Alternativa: jednorázový `schedule` ve workflow (viz níže).
4. Claude: ověří živý web (GitHub API – JSON číst se `strict=False`, `curl` stránek, prohlížeč 375/320 px) a potvrdí, že lze poslat Messenger.

**Veřejné nasazení vždy jen po výslovném schválení majitele.** Repozitář je veřejný – text článku je po pushi vidět na GitHubu ještě před nasazením.

Pozor: hook `block-no-verify` blokuje příkaz, kde je `grep -n` ve stejném Bash volání jako `git commit` – commit spouštět samostatně.

## Aktuální stav (25. 10. 2026)

- **Na webu:** Week 2 Preview (hlavní, vydáno 25. 10. v 8:24 ručním Run workflow; plánovač naběhl v 8:25 a nasadil totéž, oba běhy `857dd9c` úspěšné), Opening Week Preview, Draft Report, Draftová válka začíná, Dva nováčci. Dva kmotři., Srandoliga má vlastní redakci, Čtyři sezony. Živý web ověřen (pořadí, metadata, obrázky, 375/320 px).
- **TODO workflow:** `.github/workflows/deploy.yml` má ještě `schedule` `'50 6 25 10 *'` a krok `gate` (pustí plán jen v roce 2026, takže už nic nespustí). Smazat samostatným commitem až s dalším pushem – nepřibalovat k nečemu jinému bez souhlasu.
- **Větev `feat/draft-archiv` (HA-FP):** historické drafty a výsledky, 400 zápasů, knihovny, archiv draftů, historie klubu a sezon, interní History Signals, dokumentace – commity od `origin/main` (857dd9c). Před pushem 25. 10. byla nepushnutá historie očištěna od neveřejného redakčního pravidla (viz Soukromí). Nasazení jen se souhlasem majitele.
- Messenger zprávy posílá majitel ručně až po potvrzení živého webu.

## Hotovo

- **Fáze 1 a 1.5:** Astro 7 web, design, články z Markdownu, redakce (Vrána, Benson, Brooks + „Redakce SL Network“), Síň slávy, týmy s logy, Open Graph, noindex, validace dat, redakční režim, Historické výsledky 2022/23–2025/26.
- **Nováčci Sezony V:** Litice Hoopers (`litice-hoopers`, doporučení Little Barns Fireballs; dříve chybně „Litice Hoops“ – oprava názvu, `formerIdentities` typ `correction`) a MC Rising Stars (`mc-rising-stars`, doporučení Pilsen Beers; do 18. 10. Michal’s Balls of Fire – přejmenování). Staré adresy profilů jsou statické přesměrovací stránky (meta refresh, canonical, odkaz) generované v `src/pages/tymy/[id].astro` z `formerIdentities`.
- **Draft 2026/27:** `src/data/draft/2026-27.json` – pořadí (`order`) + všech 130 výběrů (`picks`: pick, round, team, player, nbaTeam, positionShown = ESPN snapshot, ne `eligible_positions`). Build validuje úplnost, Snake Draft, duplicity a pravidlo pořadí (obrácená bilance 2025/26, při shodě horší konečné umístění). `src/lib/draft.js` (`draftRosters()`, `overallPick()`…). Interní přehled soupisek jen v redakčním režimu: `/interni/draft/2026-27/`.
- **Články (rubriky):** Draft speciál, Draft Report (známky `.grade`, rozbory `.review-head`), Matchup Preview (duely `.matchup-head`, hlavní zápas `--main`, predikce `.predictions`). Vkládání draftové tabulky: značky `<!-- draft-order: 2026-27 -->`, `<!-- snake-rounds: 2026-27 -->` (Astro 7 nepoužívá remark pluginy – náhrada v `src/pages/clanky/[slug].astro`).
- **Šablona článku:** nepovinná pole `subtitle`, `seoTitle`, `seoDescription`; upoutávka obsahující adresu článku se nepřipojuje znovu; hero obrázek ve skutečném poměru stran (rozměry přes `sharp`), bez ořezu.

## Klíčová rozhodnutí (neměnit bez majitele)

- Názvy: **AbuKaufí VzdejTo**, **Tachovský Gadžo**, **Litice Hoopers**, **MC Rising Stars**, apostrof `’` (Kutlak’s Amateurs). Každá organizace má jedno stálé ID v `src/data/teams.json`; 10 hrajících, 2 nováčci.
- Historické organizace bez profilu: Uganda Paopice, Budějce Gotcha, O.J. Přeštice Mighty Ducks a Irish Airballers už nehrají, profily zůstávají.
- Konečné umístění vždy podle ESPN; divize jako „East“ / „West“.
- **Bodování ligy** (ESPN H2H Points): PTS +1, REB +1, AST +2, STL +4, BLK +4, TO −2, FGM +2, FGA −1, FTM +1, FTA −1, 3PM +1; 10 aktivních slotů, lavička 3, **2× IR, max 4× C**. Zdroj: interní revize `podklady/originaly/SL_Network_Draft_Report_rizikova_revizie_2026-27.md` (původní screenshoty nastavení nejsou na disku).
- Nikdy nevymýšlet výsledky, statistiky ani výroky manažerů; fiktivní jsou jen výroky redaktorů.
- **Soukromí:** Veřejný repozitář nesmí obsahovat osobní údaje manažerů ani neveřejná redakční pravidla týkající se konkrétních osob.
- Dobové ilustrace se nepřekreslují: nástěnka „Akce Bílý kůň?“ (Michal’s Balls of Fire, Litice Hoops) a dostihová grafika Velké ceny (Litice Hoops, s poznámkou pod obrázkem).
- „Finálová odveta“ ACL × Pilsen = finále 2023/24 (ne 2025/26, to bylo ACL × Chlumčany JZD).

## Historické drafty a výsledky – metodika (24. 10. 2026, zatím necommitnuto, nic veřejného)

- **Drafty:** `src/data/draft/<rrrr-rr>.json`, 5 sezon × 130 výběrů. 2022/23–2025/26 přepsané z ESPN Draft Recap PDF (soubor bez `recordsFrom` = historický draft, účastníci se ověřují proti archivu téže sezony). Shoda 650/650 s auditem II (`podklady/originaly/sl_draft_picks_650.json`). PDF `26-27_Draft Recap…` je ve skutečnosti draft 2025/26 – nepoužívat. NBA tým u hráče je údaj ze stránky historie ESPN (u vyměněných hráčů pozdější tým, ne k datu draftu); pozice = zobrazená primární, ne eligibility.
- **Aliasy hráčů:** `src/data/hraci-aliasy.json` (Jimmy Butler / Jimmy Butler III, O.G. / OG Anunoby). Validace varuje před dalšími variantami jmen.
- **Výsledky 40 tým-sezon:** `src/data/historie/*.json` ověřené proti ESPN PDF League Standings (Final Standings i Regular Season) bez rozdílu. Odvozená pole počítá `src/lib/standings.js`, archiv se nemění:
  - `playoffSeed` = ESPN nasazení #1–#8 (hlavní pavouk), #9/#10 → `null`. Nasazení není celkové pořadí: vítězové divizí dostávají #1 a #2 (doloženo chováním ESPN, např. 2025/26 Kutlak’s 12-8 #2 před Little Barns 16-4 #3; nastavení ligy doložené není).
  - `divisionRank`, `finalRank` = údaje ESPN beze změny.
  - `regularSeasonRank` = jen z bilance (PCT, remíza = ½ výhry). Jednoznačné u 18 tým-sezon; u 22 shodných bilancí `null` + `regularSeasonRankReason` a pomocná `tieGroup` (rozpětí, týmy) – ta nenahrazuje oficiální pořadí.
  - Tiebreak pravidla se **nevymýšlejí ani nedopočítávají**: PF pořadí ESPN uvnitř shod nevysvětluje, zápasy základní části (vzájemné zápasy) nemáme. Majitel 24. 10. rozhodl: shody zůstávají neověřené.
  - **Screenshot dnešního nastavení ESPN by spory nevyřešil**, dokud se nepotvrdí, že stejné nastavení platilo v dané historické sezoně; ani pak ne u pravidel, která potřebují vzájemné zápasy.
- **Analytika:** `src/lib/draft-history.js` (`picksWithResults`, `slotCorrelations`, `resultsBySlot`…) a `src/lib/stats.js`. Hlavní ukazatele: W%, playoff seed (jen 32 týmů v play-off), finále, konečné umístění. Korelace s `regularSeasonRank` jen jako dílčí analýza nad 18 případy, nereprezentativní. Rozehraná sezona 2026/27 se do výsledků nezapočítává, dokud nemá archiv.
- **Zápasy základní části:** `src/data/zapasy/<rrrr-rr>.json`, 4 × 100 zápasů (matchup 1–20) + kalendář kol. Zdroj: ESPN League Schedule PDF (`podklady/originaly/`, mimo git); převod podle sloupců hosté/domácí v PDF (tučné skóre vítěze se v textu PDF vypisuje mimo řádek – převod jen z textu dává chybné výsledky). Nezávisle ověřeno: bilance W-L-T i PF/PA všech 40 tým-sezon = archiv, 60 zápasů play-off = `historie/*.json` (ty se v `zapasy/` neopakují), pavouky ESPN (nasazení #1–#10, divize, pořadí v divizi, sekce) = archiv, 460/460 shodných s Auditem IV.
  - `teams` = [hosté, domácí] podle ESPN (platí i pro `games` v archivu). Stabilní ID zápasu `gameId()` = sezona + kolo + dvojice (`2025-26-z01-irish-airballers--little-barns-fireballs`), nezávisí na pořadí v souboru.
  - Kalendář opsaný z nadpisů ESPN „Matchup N (od – do)“ / „Playoff Round N“; `days` = kalendářní dny včetně krajních. Kola nejsou stejně dlouhá (1. kolo 6 dní od 2023/24, kolo 17/18 = 14 dní); příčiny zdroj neuvádí – nedomýšlet. Absolutní rekordy vždy s délkou kola.
  - Soutěže rozlišovat: `regular` / `championship` (hlavní pavouk #1–#8) / `placement` (zápasy o umístění) / `consolation` (#9–#10). Audit IV: H2H list počítá jen základní část; korelace seed ~ konečné umístění je nafouknutá zařazením #9–#10 (+0,60 vs. +0,21 jen pro #1–#8).
  - Jména manažerů (jsou v PDF i v xlsx auditu) se do repozitáře nepřebírají.
- **Veřejné části (větev `feat/draft-archiv`):** archiv draftů `/historie/drafty/` a `/historie/drafty/<sezona>/` (kotvy `#vyber-<celkové číslo>`, `#kolo-<n>`, `#<id-organizace>`; kola a soupisky rozbalovací, bez JS vše otevřené), „Historie klubu“ na profilech (`src/components/ClubHistory.astro`; nováček = „První sezona“, žádné nuly), na stránkách sezon cesta šampiona, rekordy a rozpis 20 kol (`SeasonMatches.astro`, kotva = ID zápasu). Rekordy skóre a výher jen ze 7denních kol a vždy tak označené. „Z historie“ = `publicText` signálu + odkaz Zdroj.
- **Interní History Signals:** `/interni/history-signals/` jen v redakčním buildu; `src/lib/history-signals.js` (8 typů, texty jen z ověřených podmínek, `topSignals` pro pestrost, `signalsFor` pro organizaci/hráče/dvojici soupeřů/sezonu/typ článku). Všechny signály mají `dataStatus: 'historical'`; propojení s aktuálními událostmi až s ověřenými týdenními daty. Repo je veřejné → kód i texty signálů jsou vidět na GitHubu („interní“ ≠ tajné).
- **Build hlídá kotvy:** `scripts/check-dist.mjs` selže i při odkazu na neexistující `#kotvu`.

## Postup u nového článku (osvědčený)

1. Text od majitele převzít beze změn; jen forma: mezititulky (`##`/`###`, věty malými), citace `> „…“` + `<cite>— **Jméno**, funkce</cite>`, tučné jméno redaktora a týmu (s odkazem na profil) při první zmínce, řádky Autor/Kategorie/Datum do metadat.
2. Ověřit fakta: hráče a čísla výběrů proti `src/data/draft/2026-27.json`, finále proti `src/data/historie/`, rozpis proti screenshotům ESPN (`IMG_0134–0145`), transakce proti `Změny-1st_week*.jpg`, zdravotní/NBA fakta webovým vyhledáváním se zdroji. Rozpory hlásit, neopravovat svévolně (výjimka: oficiální názvy týmů).
3. Obrázek: `npm run obrazek -- <soubor> <slug>`; zkontrolovat ořez OG 1200×630. Překlepy v grafice opravovat jen po souhlasu a jen čistě (transplantace písmen ze stejného obrázku).
4. `draft: true`, náhled v redakčním režimu (`npm run build:redakce` + `npx astro preview --port 4321`), kontrola 1280/375/320 px, metadata, veřejný build bez interních částí. Teprve po schválení `draft: false` a jeden commit.

## Podklady v `podklady/originaly/`

- `draft_sezona_v_2026_27.json`, `soupisky_podle_tymu.json`, `draft_kontrola_a_prehlad.md` – zdroj importu draftu.
- `IMG_0134–0145.jpg` – rozpis zápasů ESPN (všechna kola, týdny Po–Ne; 1. kolo 20.–25. 10., 2. kolo 26. 10.–1. 11.).
- `Změny-1st_week0156–0158.jpg` – transakce 21.–22. 10.
- Opravené grafiky: `… (opraven Benson).png`, `… (opraveno Litice).png`, `SL-Network-Week-2-oprava-DISCIPLINE.png`.

## Další kroky

- Po vydání Week 2: ověření, smazání plánovače (viz výše).
- **Fáze 2 – týdenní výsledky:** datový pilot – screenshoty jednoho kompletního matchupu z ESPN (skóre, hráči, body, aktivní vs. lavička), pak formát `data/weeks/<id>.json`, výsledky kola, MVP, All-Fantasy First Team, Fantasy Hero, Power Rankings. Homepage moduly „Power Rankings“ a „Týden ve Srandolize“ zatím prázdné záměrně.

## Drobnosti / limity

- GitHub Actions hlásí zastaralý Node 20 v akcích – zatím jen varování.
- Lokální náhled: `npx astro preview --port 4321` (servíruje `dist/` – po veřejném buildu nejsou vidět koncepty) nebo ikona „Redakce SL Network“ na Ploše (port 4400).
- Vestavěný prohlížeč Claude nenačítá lazy obrázky bez vykreslení – při kontrole nastavit `loading='eager'`.
