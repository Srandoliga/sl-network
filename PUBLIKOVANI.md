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
date: 2026-10-20            # datum publikace (RRRR-MM-DD)
author: vrana                # vrana | benson | brooks
category: zpravy             # zpravy | zakulisi | analyza | komentar | historie
perex: "Jedna dvě věty pod titulek. Použijí se i v náhledu v Messengeru."
teaser: "Vlastní text upoutávky (nepovinné)."
image: obrazky/clanky/nazev.webp  # nepovinné – obrázek článku (karta, Hlavní příběh, náhled v Messengeru)
imageAlt: "Popis obrázku"    # nepovinné
featured: true               # nepovinné – článek se ukáže jako Hlavní příběh
draft: true                  # koncept: na veřejném webu se NEzobrazí
---
```

3. Pod hlavičku napište text v Markdownu (`## Mezititulek`, `**tučně**`, `*kurzíva*`, `> citace`, tabulky).
4. Ostré nebo satirické texty nechte nejdřív jako `draft: true`, ověřte je a pak změňte na `draft: false`.

Homepage, výpis článků, kategorie i profil autora se aktualizují samy.

**Obrázek článku:** formát na šířku 3:2 (např. 1536×1024 z ChatGPT). Připravíte ho jedním příkazem:
`npm run obrazek -- ~/Downloads/obrazek.png nazev-clanku` → vytvoří `public/obrazky/clanky/nazev-clanku.webp`
a vypíše řádek `image:` pro hlavičku. Prompty pro jednotný styl jsou v [PODKLADY-OBRAZKY.md](PODKLADY-OBRAZKY.md).
Bez vlastního obrázku dostane článek automaticky obrázek své rubriky (`rubrika-<kategorie>.webp`).

⚠️ Obrázky nikdy nedávejte do složky `dist/` – ta se při každém buildu smaže. Originály patří do `podklady/originaly/`
(nejsou v gitu), do webu se dostanou jen přes `npm run obrazek`.

Když v hlavičce něco chybí nebo je chybně (neznámý autor, kategorie…), build selže a řekne proč.

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

## Limity

- Web je **veřejně dostupný každému, kdo má odkaz**. `noindex` jen žádá vyhledávače, aby ho neindexovaly. Není to ochrana přístupu.
  Nepište sem nic, co nesmí vidět cizí lidé, a žádné osobní údaje manažerů bez jejich souhlasu.
- `robots.txt` na adrese `uživatel.github.io/sl-network/` roboti nečtou (platí jen v kořeni domény). Proto má noindex každá stránka v HTML.
- Exporty šablon do PNG jsou ruční (snímek obrazovky).
- Statistiky (výsledky kol, MVP, All-Fantasy tým) přijdou ve fázi 2 po datovém pilotu.
