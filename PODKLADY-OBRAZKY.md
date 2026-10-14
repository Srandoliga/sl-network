# Podklady obrázků – prompty pro ChatGPT

**Stav 14. 10. 2026:** hotové – Dvě dynastie s názvy na dresech, 5 obrázků rubrik, portréty redakce (nový Vrána a Benson),
loga ACL, Fireballs, Pilsen Beers, Chlumčany JZD, Los Mustachios, AbuKuafi Vzdejto. **Chybí:** loga Kutlak’s Amateurs a Tachovsky gadzo (zatím kreslený štít se zkratkou).
Originály jsou v `podklady/originaly/`.

Cíl: **80 % čistý sportovní web, 20 % pixelový charakter.** Pixel art drží hlavně portréty redakce,
ilustrace článků jsou detailní „hi-bit“ pixel art jako na zdrojových obrázcích, ale bez textu a log.

## Pravidla pro všechny obrázky

- **Žádný text, nápisy, čísla ani loga** (web si titulky doplní sám; zapečený text se nedá upravit).
- Žádná loga skutečných značek (NBA, ESPN, Marvel/Avengers…) – týmy jen barvami a jednoduchými symboly.
- Žádné fotorealistické obličeje. Postavy zezadu nebo stylizované.
- Na šířku **3:2 (1536×1024)**, tmavé pozadí, důležitý obsah uprostřed (web obrázek ořezává na 16:9 i 3:2).

Hotový obrázek: `npm run obrazek -- <soubor> <nazev>` a do článku `image: obrazky/clanky/<nazev>.webp`.

---

## 1. Hlavní příběh „Dvě dynastie“ (úvodní článek)

Název souboru: `ctyri-sezony-dva-sampioni`

```
Detailed hi-bit pixel art illustration, cinematic sports poster mood, landscape 3:2, 1536x1024.
Two basketball players seen from behind, standing side by side in a dark arena.
Left player: dark purple jersey with violet trim. Right player: white jersey with red and orange trim.
Between them a glowing golden championship trophy on a dark pedestal.
Background: hanging banners in purple (left) and deep red (right) with simple abstract symbols
(a purple circle with a bold geometric letter shape, a stylized red-orange flame), soft arena lights,
subtle pixel bokeh in purple and red.
Dark, moody, high contrast, rich detail, crisp pixels.
No text, no letters, no numbers, no logos, no watermarks. Jerseys are plain without names or numbers.
```

## 2. Univerzální obrázky rubrik (když článek nemá vlastní)

Název souboru např. `rubrika-zakulisi`, `rubrika-analyza`, `rubrika-komentar`, `rubrika-zpravy`, `rubrika-historie`.

```
Detailed hi-bit pixel art illustration, dark sports newsroom mood, landscape 3:2, 1536x1024.
Scene: [ZÁKULISÍ: a dim stadium tunnel with a phone glowing on a bench /
        ANALÝZA: a tactics board with glowing charts in a dark locker room /
        KOMENTÁŘ: an empty TV studio desk with red accent lights /
        ZPRÁVY: a basketball court at night under a single spotlight /
        HISTORIE: a trophy cabinet with four golden trophies in warm light].
Color palette: near-black background, red accents, subtle purple glow.
No people's faces, no text, no letters, no numbers, no logos, no watermarks.
```

## 3. Portréty redakce – odlišení Vrány a Bensona

Formát **4:5 (1024×1280)**, pak pošlete nebo uložte do `podklady/originaly/` (zpracuji na `public/obrazky/redakce/<id>.webp`).
Eddie Brooks zůstává. Vrána a Benson si byli moc podobní, proto jsou postavy výrazně rozdílné (věk, vlasy, postava, oblečení).

**Vincent „Two Sources“ Vrána – Senior Insider (starší, uhlazený „zákulisní“ novinář):**
```
Pixel art character portrait, head and shoulders, 4:5, 1024x1280, same style as a consistent series:
visible pixels, soft shading, plain deep red background.
A fictional man in his late 50s, silver-grey hair slicked back, clean-shaven with light grey stubble,
thin black rectangular glasses, sharp nose, knowing half-smile, one eyebrow slightly raised.
Dark charcoal blazer over a black turtleneck, a smartphone held near his chest.
Serious newsroom insider vibe. Not a real person. No text, no logos, no watermark.
```

**Charles „Chuck“ Benson – Basketball Analyst (mladší, hlučný trash-talker):**
```
Pixel art character portrait, head and shoulders, 4:5, 1024x1280, same style as a consistent series:
visible pixels, soft shading, plain deep purple background.
A fictional stocky man in his early 30s with ginger hair and a big full ginger beard, freckles,
black snapback cap worn backwards with no logo, wide loud laughing grin showing teeth,
oversized red-and-black varsity bomber jacket over a white t-shirt, a small gold chain.
Loud, confident trash-talk energy. Not a real person. No text, no logos, no watermark.
```

## 4. „Dvě dynastie“ s názvy na zádech (úprava existujícího obrázku)

Na webu je teď dočasná verze s názvy dopsanými v počítači. Přirozenější výsledek: nahrajte do ChatGPT
`podklady/originaly/Dve-dynastie.png` a napište:

```
Edit this image. Keep everything exactly the same (composition, players, lighting, trophy, style).
Only add printed lettering on the backs of the two jerseys, following the fabric folds and shading:
- left purple jersey: the word "ROKYCANY" arched across the upper back in light violet with a dark outline,
  and a large number "2" below it in the same style;
- right white jersey: the word "FIREBALLS" arched across the upper back in red with a thin orange outline,
  and a large number "2" below it.
Classic basketball jersey lettering, condensed bold athletic font. No other text anywhere.
```
(Číslo 2 = počet titulů obou týmů.)

## 5. Loga klubů ve stylu ESPN

ESPN loga fantasy týmů jsou výrazné odznaky: jeden symbol, silné obrysy, 2–3 barvy, čitelné i v malé velikosti.
Generujte **každé logo zvlášť**, čtverec **1024×1024 s průhledným pozadím**, uložte do `podklady/originaly/`
a pak `npm run logo -- <soubor> <id-tymu>` (logo se na webu použije automaticky všude).

Společný začátek promptu:
```
Design a sports team logo badge in the style of ESPN fantasy basketball team logos:
bold flat vector illustration, thick dark outlines, 2–3 strong colors with simple shading,
centered emblem, highly legible at 48 px, transparent background, 1024x1024.
No text, no letters except where specified, no real brand marks, no watermark.
```

Pak doplňte podle týmu:

| Tým (id) | Doplněk promptu |
|---|---|
| ACL Rokycany (`acl-rokycany`) | `Emblem: a bold geometric capital letter "A" with an arrow-shaped crossbar, inside a thick purple ring; violet and deep purple with white highlights. Original design, must NOT resemble the Avengers logo.` |
| Little Barns Fireballs (`little-barns-fireballs`) | `Emblem: a fiery comet / flame bird swooping upward, layered red, orange and yellow flames, dynamic motion.` |
| Pilsen Beers (`pilsen-beers`) | `Emblem: a frosty golden lager mug with overflowing white foam dripping down, small bubbles, amber and white, slight tilt like it is cheering.` |
| Chlumčany JZD (`chlumcany-jzd`) | `Emblem: a white five-pointed star with black outline flying right, trailing light-blue speed stripes, sky blue and white.` |
| Los Mustachios (`los-mustachios`) | `Emblem: a cartoon mascot head of a cheerful man with blond hair and a huge brown handlebar mustache, green collar, friendly but cocky look, circle badge in green.` |
| Kutlak’s Amateurs (`kutlaks-amateurs`) | `Emblem: an ORIGINAL cheerful cartoon mouse mascot in vintage 1930s rubber-hose animation style – big round black ears, white gloves, wide grin, spinning a basketball on one finger, wearing a teal basketball jersey; inside a teal circle badge. Must be an original character, NOT Mickey Mouse or any Disney character (no red shorts with buttons, no Disney features).` |
| AbuKuafi Vzdejto (`abukuafi-vzdejto`) | `Emblem: [doplnit podle loga v ESPN] in orange and black.` |
| Tachovsky gadzo (`tachovsky-gadzo`) | `Emblem: a single crisp white high-top basketball sneaker in dynamic three-quarter view, mid-jump with small speed lines, light grey shading, magenta laces and sole accent, fresh and clean look. Generic shoe with NO brand logos, no swoosh, no stripes, no text.` |

Kutlak’s Amateurs a Tachovsky gadzo: prompty doplněny podle zadání (myš ve stylu starých kreslených filmů, bílá sportovní bota).
