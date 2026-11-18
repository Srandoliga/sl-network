# Jak publikovat na SL Network

Cíl: 5–10 minut týdně. Vše se dělá úpravou souborů. Žádná databáze ani administrace.

## 1. Nový článek

1. Ve složce `src/content/articles/` zkopírujte existující článek a přejmenujte ho.
   **Název souboru = adresa článku** (malá písmena, bez diakritiky, pomlčky), např. `draft-special.md` → `/clanky/draft-special/`.
2. Upravte hlavičku:

```yaml
---
title: "Titulek článku"
headline: "Krátce. Úderně."    # nepovinné – krátký titulek pro Hlavní příběh (2. věta se vysází kurzívou)
subtitle: "Podtitulek?"       # nepovinné – menší kurzíva pod nadpisem; v Messengeru a vyhledávači se připojí za titulek
seoTitle: "Krátce"            # nepovinné – kratší titulek pro Messenger/vyhledávač („Krátce | SL Network“)
seoDescription: "…"           # nepovinné – popis pro Messenger/vyhledávač místo perexu
date: 2026-10-20            # datum publikace (RRRR-MM-DD)
author: vrana                # vrana | benson | brooks
category: zpravy             # zpravy | zakulisi | analyza | komentar | historie | draft
perex: "Jedna dvě věty pod titulek. Použijí se i v náhledu v Messengeru."
teaser: "Vlastní text upoutávky (nepovinné)."
image: obrazky/clanky/nazev.webp  # nepovinné – obrázek článku (karta, Hlavní příběh, náhled v Messengeru)
imageAlt: "Popis obrázku"    # nepovinné
featured: true               # nepovinné – článek se ukáže jako Hlavní příběh
relatedTeams: [los-mustachios, acl-rokycany]  # nepovinné – 1–4 organizace, o kterých článek hlavně JE
draft: true                  # koncept: na veřejném webu se NEzobrazí
---
```

3. Pod hlavičku napište text v Markdownu (`## Mezititulek`, `**tučně**`, `*kurzíva*`, `> citace`, tabulky).
4. Dodržujte typografická pravidla níže.
5. Ostré nebo satirické texty nechte nejdřív jako `draft: true`, ověřte je a pak změňte na `draft: false`.

Homepage, výpis článků, kategorie i profil autora se aktualizují samy.

**Typografická pravidla článků**

- **Názvy týmů** tučně, přesně podle oficiálního názvu (diakritika, velká písmena, typografický apostrof `’`).
  Při první relevantní zmínce jako odkaz na profil: `[**Litice Hoopers**](../../tymy/litice-hoopers/)`.
  Další zmínky už obyčejně – text nemá působit přeformátovaně. Tučné a kurzívu u názvů týmů nekombinujte.
- **Redaktoři:** při první zmínce celé jméno tučně, např. **Charles „Chuck“ Benson**, **Eddie „The Numbers“ Brooks**.
- **Přímé citace redaktorů** jako redakční citace (kurzíva s červenou linkou vlevo a malým podpisem):

  ```markdown
  > „Text citace.“
  >
  > <cite>— **Eddie „The Numbers“ Brooks**, Head of Analytics</cite>
  ```

- **Tučně** střídmě: názvy klubů, důležitá tvrzení, závěrečná pointa. **Kurzíva** hlavně pro podtitulky a citace.
- Dlouhý titulek rozdělte: krátký `title` (např. „Dva nováčci. Dva kmotři.“) + `subtitle`.
- **Obrázek uvnitř článku s popiskem** (soubor připravte `npm run obrazek`):

  ```html
  <figure>
    <img src="../../obrazky/clanky/nazev.webp" alt="Popis" width="1600" height="900" loading="lazy" decoding="async">
    <figcaption>Popisek pod obrázkem.</figcaption>
  </figure>
  ```

**Draftové pořadí v článku:** data jsou v `src/data/draft/<rrrr-rr>.json` (pořadí id týmů; bilance se berou z historických
výsledků sezony `recordsFrom`, build hlídá, že pořadí odpovídá pravidlu). Do textu stačí vložit samostatný řádek
`<!-- draft-order: 2026-27 -->` (tabulka s logy a odkazy) nebo `<!-- snake-rounds: 2026-27 -->` (přehled prvních tří kol).

**Výsledek draftu:** všech 130 výběrů je ve stejném souboru v poli `picks` (číslo výběru, kolo, id týmu, hráč, NBA tým a pozice
opsané z ESPN). Build ověří úplnost, Snake Draft i duplicity. Kontrolní přehled soupisek je jen v redakčním režimu:
`/interni/draft/2026-27/` (odkaz v patičce).

**Obrázek článku:** formát na šířku 3:2 (např. 1536×1024 z ChatGPT). Připravíte ho jedním příkazem:
`npm run obrazek -- ~/Downloads/obrazek.png nazev-clanku` → vytvoří `public/obrazky/clanky/nazev-clanku.webp`
a vypíše řádek `image:` pro hlavičku. Prompty pro jednotný styl jsou v [PODKLADY-OBRAZKY.md](PODKLADY-OBRAZKY.md).
Bez vlastního obrázku dostane článek automaticky obrázek své rubriky (`rubrika-<kategorie>.webp`).

⚠️ Obrázky nikdy nedávejte do složky `dist/` – ta se při každém buildu smaže. Originály patří do `podklady/originaly/`
(nejsou v gitu), do webu se dostanou jen přes `npm run obrazek`.

Když v hlavičce něco chybí nebo je chybně (neznámý autor, kategorie…), build selže a řekne proč.

## 1b. Homepage se aktualizuje sama – co musí obsahovat který článek

Homepage se nikdy needituje ručně. Po buildu a nasazení vybere obsah z publikovaných článků a dat:

| Blok homepage | Odkud bere data |
|---|---|
| **Breaking News** | nejnovější publikovaný článek (text i odkaz) |
| **Hlavní příběh** | nejnovější publikovaný článek s `featured: true` (jinak nejnovější článek) |
| **Z redakčního stolu** | 4 nejnovější články, bez hlavního příběhu a bez bloku Beyond the Score |
| **Týden ve Srandolize** | poslední kompletní kolo v `src/data/zapasy/<sezona>.json` + ocenění z frontmatteru `recap` Weekly Recapu toho kola |
| **Power Rankings** | poslední publikovaný článek rubriky Power Rankings s frontmatterem `rankings` |
| **Beyond the Score** | poslední díl rubriky (když není hlavním příběhem) + `nextIssue` do data dalšího dílu |
| **Názory expertů** | nejnovější článek každého redaktora, který ještě na homepage není |
| **Profily týmů** | „Sezona … průběžně“ z dat zápasů, „Články o týmu“ = články s odkazem na profil (`../../tymy/<id>/`) |

Koncepty (`draft: true`) ani články s budoucím `date` se na veřejný web nedostanou. Budoucí článek se objeví až
v buildu po svém čase vydání – nové nasazení zajistí plánované vydání (viz Zveřejnění → Plánované vydání).

**Jeden zdroj každého údaje:** výsledky zápasů jen v `src/data/zapasy/`, redakční ocenění jen ve frontmatteru recapu,
žebříček jen ve frontmatteru Power Rankings. Stejná čísla se nepíšou na víc míst.

### Weekly Recap – postup

1. **Výsledky kola** doplnit do `src/data/zapasy/2026-27.json` (až jsou konečné a potvrzené):
   - do `matchups` nové kolo: `{ "matchup": 4, "kind": "regular", "espnLabel": "Matchup 4", "start": "2026-11-09", "end": "2026-11-15", "days": 7, "status": "final", "source": "ESPN FantasyCast 16. 11. 2026" }`
   - do `games` všech pět zápasů: `{ "matchup": 4, "teams": ["<hosté>", "<domácí>"], "scores": [<hosté>, <domácí>] }`
   - `status`: `final` (konečné skóre) nebo `corrected` (po opravě statistik ESPN). Průběžná skóre se nezapisují.
   - Build zkontroluje kompletní kolo (všech 10 týmů právě jednou), existující týmy, čísla, navazující data a zdroj.
2. **Článek** s frontmatterem ocenění (jen to, co redakce skutečně vyhlásila; nic se nedopočítává):

```yaml
recap:
  round: 4
  mvp: { player: "Jméno Hráče", team: <id-tymu>, points: 210 }
  performance: { player: "…", team: <id-tymu>, points: 190 }   # nepovinné – Výkon týdne
  surprise: { player: "…", team: <id-tymu>, points: 150 }      # nepovinné – Překvapení týdne
  gameOfWeek: { teams: [<id-tymu>, <id-tymu>] }                # nepovinné – redakční Zápas týdne
  highlight: "Jedna věta z článku pro homepage."               # nepovinné, max. 160 znaků
```

**Výsledky se zveřejní současně s recapem:** kolo zapsané v datech se na homepage, profilech ani v H2H nezobrazí,
dokud nevyjde jeho Weekly Recap (`recap.round` a datum vydání po konci kola). Web tak nic neprozradí, ani když se
mezitím nasadí kvůli jinému článku. Výjimku (výsledky bez recapu) je nutné povolit výslovně u kola v datech:
`"publishWithoutRecap": true`.

3. Schválení → build a nasazení. Homepage ukáže nové kolo, MVP, Zápas týdne a odkaz „Celé hodnocení týdne“;
   profily týmů přepočtou bilanci a body. Bez `gameOfWeek` se zobrazí jen statistika „Nejtěsnější zápas“.
   S `publishWithoutRecap: true` ukáže homepage výsledky s poznámkou, že hodnocení teprve vyjde.

**Opravy ESPN:** opravené skóre se zapíše do dat (stav `corrected`, zdroj s datem opravy). Už vydaný článek se
nepřepisuje – rozdíl se zapíše do `verificationNote` v souboru zápasů. Příklad: kolo 1 sezony 2026/27
(opravená skóre ESPN z 30. 10. 2026; Weekly Recap #1 z 26. 10. uvádí původní hodnoty).

**Historie:** rozehraná sezona (`"inProgress": true`) se započítává do průběžných H2H bilancí a sérií na profilech,
ne do konečných umístění, titulů a rekordů skóre. Po skončení sezony přibude `src/data/historie/<sezona>.json`,
z `zapasy` se odstraní `inProgress` a build začne sezonu kontrolovat jako dokončenou.

### Power Rankings – postup

1. Článek rubriky `power-rankings` s frontmatterem žebříčku (pořadí = pořadí položek, všech 10 týmů):

```yaml
rankings:
  edition: 2
  afterRound: 4
  entries:
    - { team: los-mustachios, record: "4–0", points: 5480 }   # points nepovinné (pak bez sloupce FP)
    - { team: little-barns-fireballs, record: "3–1" }
    # … všech 10 týmů
```

2. Do textu na místo tabulky vložit samostatný řádek `<!-- power-rankings -->` – tabulka se vygeneruje z dat
   (logo, bilance, pohyb ▲/▼ proti minulému vydání). Odkaz týmu vede na sekci `id="tym-<id>"` v článku, jinak na profil.
3. Schválení → build a nasazení. Homepage přepne na nové vydání (číslo, datum, prvních pět, pohyb, odkaz).
   Žebříček je redakční hodnocení – nic se nepřepočítává podle tabulky ESPN. (Power Rankings #1 má tabulku
   psanou ručně a k ní stejná data ve frontmatteru.)

### Beyond the Score – ohlášení dalšího dílu

```yaml
nextIssue:
  date: 2026-11-25
  title: "Titulek dalšího dílu"
  teaser: "Krátká věta z ohlášení."   # nepovinné
```

Ohlášení se na homepage zobrazuje do data dalšího dílu. Když je díl Beyond the Score hlavním příběhem,
velká karta se pod ním neopakuje – zůstane jen ohlášení.

### Propojení článků (automaticky)

- **Konec článku:** u Weekly Recapu, Matchup Preview, Power Rankings a Beyond the Score předchozí a další vydání
  rubriky (další se objeví samo po zveřejnění) a nejvýš dva **související** články. Souvislost = společné hlavní
  organizace (`relatedTeams`), přímý odkaz mezi články, odkaz zaměřeného článku na profil, společná sezona
  (odkazy na `historie/<sezona>/`). Když nic nesouvisí, blok se nezobrazí – nic se nedoplňuje „nejnovějšími“.
- **Profil týmu – Články o týmu:** nejdřív tematické články s týmem v `relatedTeams` (Beyond the Score, FLASH…),
  pak ligové souhrny s týmem v `relatedTeams`, pak ostatní odkazy na profil; tři viditelné, zbytek v „Další zmínky“.
- **Stránka sezony – Články o sezoně:** nejvýš tři články, které na stránku sezony skutečně odkazují (víc odkazů = vyšší
  váha). Letopočet v textu ani odkaz do archivu draftů nestačí.
- `relatedTeams` vyplňujte jen hlavními organizacemi (ne výčtem všech zmíněných týmů). Ligové souhrny bez něj
  fungují dál – na profilech se jen ukážou jako zmínky.

## 2. Upoutávka do Messengeru

Upoutávky a šablony jsou jen v **redakčním režimu** na vašem počítači (žlutá lišta nahoře) – čtenáři je neuvidí.

**Nejjednodušší cesta:** dvojklik na **Redakce SL Network** na Ploše (nebo `Redakce SL Network.command` ve složce projektu).
Otevře se okno Terminálu a v prohlížeči redakční verze webu na `http://localhost:4400/sl-network/`.
Úpravy článků se v prohlížeči projeví samy. Hotovo = zavřít okno Terminálu.
(Při úplně prvním spuštění se macOS může zeptat, zda soubor otevřít – potvrďte **Otevřít**.)
Spusťte `npm run dev` (nebo `npm run build:redakce` a `npm run preview`), otevřete článek, sjeďte dolů a klepněte na **Zkopírovat upoutávku**. Pak ji vložte do skupiny.
Náhled odkazu (titulek, perex, obrázek) si Messenger stáhne sám.
Když se náhled po úpravě článku nezmění, Messenger ho drží v mezipaměti. Pomůže počkat nebo použít
[Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) → „Scrape Again“.

## 3. Obrázkové šablony

Texty šablon (Breaking News, Draft Special, Weekly Recap) jsou v `src/data/templates.json`.
V redakčním režimu: odkaz **Šablony pro Messenger** v hlavičce nebo patičce → otevřít → snímek obrazovky.
Šablona s `"demo": true` má razítko DEMO – nepoužívat se skutečnými výsledky, dokud se nepřepíše.

## 4. Týmy a historie

- `src/data/teams.json` – týmy. Nový tým: doplňte název, zkratku (`short`) a barvu. Po potvrzení majitelem nastavte `"verified": true`.
  Typy ikon: `letter-a`, `flame`, `beer`, `star`, `mustache`, `monogram` (zkratka ve štítu).
- `src/data/seasons.json` – šampioni a finalisté. Po skončení sezony přidejte řádek.
  Ocenění/rekordy: `"awards": [{ "label": "MVP sezony", "value": "Jméno", "team": "id-tymu" }]`.
- **Logo týmu jako obrázek:** `npm run logo -- <obrázek> <id-tymu>` → `public/obrazky/tymy/<id>.webp`. Web ho použije místo kreslené ikony.
- `src/data/rivalries.json` – rivality (dvojice týmů + příběh).
- **Historické výsledky:** `src/data/historie/<rrrr-rr>.json` – jeden soubor na sezonu (konečné pořadí, bilance základní části, PF/PA,
  divize, nasazení a 15 zápasů play-off). Po skončení sezony zkopírujte poslední soubor a přepište čísla podle ESPN.
  Týmy se zapisují jen přes ID z `teams.json`. Build zkontroluje součty (PF = PA, výhry = prohry), pavouk i shodu se Síní slávy.
- `src/data/staff.json` – redakce.

### Drafty, zápasy a historie klubů

- **Po draftu nové sezony:** `src/data/draft/<rrrr-rr>.json` (pořadí, 130 výběrů, `espnLabels`). Archiv draftů, profily klubů i interní signály se aktualizují samy.
- **Po skončení sezony:** vedle `src/data/historie/<rrrr-rr>.json` přidat `src/data/zapasy/<rrrr-rr>.json` (100 zápasů základní části a kalendář kol podle ESPN League Schedule). Build zkontroluje, že bilance a body ze zápasů sedí s archivem.
- **Odkazy z článků do historie** (stabilní, nemění se):
  - výběr v draftu: `[#46](../../historie/drafty/2023-24/#vyber-46)` (celkové číslo výběru, ne pořadí v kole),
  - organizace v draftu: `../../historie/drafty/2026-27/#acl-rokycany`,
  - zápas základní části: `../../historie/2025-26/#2025-26-z19-irish-airballers--little-barns-fireballs` (sezona, kolo, hosté--domácí).
- **Rekordy skóre** se počítají jen ze 7denních kol (zkrácené 1. kolo a dvoutýdenní kolo s All-Star přestávkou se nesrovnávají) – v textu to vždy uveďte.
- **Interní náměty:** v redakčním režimu odkaz **Interní: History Signals** v patičce. Jsou to historické souvislosti, ne hotové texty; ostré formulace podléhají schválení.

## 5. Kontrola a náhled na počítači

Jednou: nainstalovat [Node.js](https://nodejs.org) 22+ a ve složce projektu spustit `npm install`.

| Příkaz | Co dělá |
|---|---|
| `npm run dev` | živý náhled na http://localhost:4321/sl-network/ (ukazuje i koncepty) |
| `npm run build` | sestaví web jako na GitHubu: zkontroluje data, odkazy a noindex |
| `npm run build:redakce` | redakční verze: navíc koncepty, šablony pro Messenger a upoutávky (jen pro vás, nezveřejňuje se) |
| `npm run preview` | zobrazí sestavený web |
| `npm test` | spustí testy |

## 6. Zveřejnění na GitHub Pages

### Jednorázové nastavení

1. **Účet a repozitář:** na github.com založte (nebo použijte) účet → **New repository** → název `sl-network`,
   **Public**, bez README. (GitHub Pages zdarma vyžaduje veřejný repozitář → zdrojové soubory včetně konceptů
   jsou vidět každému, kdo repozitář najde. Do konceptů proto nepište nic citlivého.)
2. **Přihlášení na Macu:** nainstalovat GitHub CLI (`brew install gh`) a spustit `gh auth login`
   (GitHub.com → HTTPS → přihlásit v prohlížeči). Alternativa: aplikace GitHub Desktop.
3. **Identita pro git** (objeví se u každé změny, ve veřejném repozitáři je vidět):
   `git config --global user.name "Přezdívka"` a `git config --global user.email "<id>+<login>@users.noreply.github.com"`
   (anonymní adresa z GitHubu: Settings → Emails).
4. **První odeslání:** `git add -A && git commit -m "feat: SL Network fáze 1"`,
   `git remote add origin https://github.com/<login>/sl-network.git`, `git push -u origin main`.
5. **Zapnout Pages:** repozitář → Settings → Pages → *Build and deployment* → Source: **GitHub Actions**.
6. Push spustí workflow **Build a nasazení** (záložka Actions): testy, validace dat, build. Zatím **nic nezveřejní**.
7. **Zveřejnění:** Actions → Build a nasazení → **Run workflow**. Web bude na `https://<login>.github.io/sl-network/`.
8. Až bude vše odladěné, lze zapnout automatické zveřejnění při každém pushi: v `.github/workflows/deploy.yml`
   smazat řádek `if: github.event_name == 'workflow_dispatch'`.

### Běžný provoz

Úprava článku na GitHubu v prohlížeči nebo `git add -A && git commit -m "..." && git push` → build → (Run workflow).
Pokud build selže, v Actions je u červeného křížku vypsané, který soubor a proč.

### Plánované vydání (automaticky každých 30 minut)

Pro vydání stačí schválený článek s `draft: false` a datem a časem vydání (`date: 2026-11-23T07:00:00+01:00`)
commitnout a v GitHub Desktop udělat **Push origin**. Nic dalšího (ani Run workflow, ani úprava cronu).

- Workflow **Build a nasazení** každých 30 minut ověří, zda nastal čas vydání některého článku s `draft: false`,
  který na webu ještě není. Pokud ano, sestaví a nasadí **celý obsah `main`** (schválený zdroj).
- Co je na webu, eviduje manifest `publikovano.json` (zapisuje ho každý build, nasadí se spolu s webem).
  Neúspěšné nasazení se nepočítá – další běh to zkusí znovu. Bez platného manifestu se automaticky nenasazuje.
- Koncepty (`draft: true`) a budoucí články zůstávají neveřejné, i když jsou na `main`.
- Výsledky kola se ukážou až s vydaným Weekly Recapem (viz výše, výjimka `publishWithoutRecap: true`).
- **GitHub Actions nezaručuje vydání přesně na minutu.** Plánované běhy GitHub zpožďuje (i o desítky minut)
  a výjimečně vynechá – počítejte s vydáním zhruba 0–60 minut po plánovaném čase. Časově důležité vydání
  nasaďte po plánovaném čase ručně: Actions → **Build a nasazení** → **Run workflow**.
- **Ruční Run workflow** nasadí vždy celý `main` – i opravy už vydaných článků (ty plánovač sám nenasadí).
  Ruční i plánované nasazení čekají ve stejné frontě, nikdy neběží současně.
- Každý plánovaný běh zapíše do souhrnu v Actions rozhodnutí, poslední úspěšné nasazení a nejbližší plánované
  články. Chyba = červený běh a e-mail od GitHubu. Článek, který build opakovaně vynechá („uvízlý“), nespustí
  nekonečné nasazování – běh skončí chybou a je potřeba zkontrolovat jeho hlavičku.
- Na `main` patří jen schválené změny: s nejbližším nasazením odejde všechno, co tam je.
- Po 60 dnech bez commitu GitHub plánované běhy u veřejného repozitáře vypne (stačí je v Actions znovu zapnout).

## Limity

- Web je **veřejně dostupný každému, kdo má odkaz**. `noindex` jen žádá vyhledávače, aby ho neindexovaly. Není to ochrana přístupu.
  Nepište sem nic, co nesmí vidět cizí lidé, a žádné osobní údaje manažerů bez jejich souhlasu.
- `robots.txt` na adrese `uživatel.github.io/sl-network/` roboti nečtou (platí jen v kořeni domény). Proto má noindex každá stránka v HTML.
- Exporty šablon do PNG jsou ruční (snímek obrazovky).
- Statistiky (výsledky kol, MVP, All-Fantasy tým) přijdou ve fázi 2 po datovém pilotu.
