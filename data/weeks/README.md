# Týdenní data (fáze 2) – PROZATÍMNÍ formát

Jeden soubor na odehrané fantasy kolo: `data/weeks/<id-kola>.json` (např. `kolo-01.json`).
Finální formát se stanoví **až po datovém pilotu** (screenshoty jednoho kompletního matchupu z ESPN).

Build už teď kontroluje:

- platný JSON a povinná pole (`id` = název souboru, `number`, `start_date`, `end_date`, `source`, `verification`, `demo`, `matchups`),
- `end_date` není dřív než `start_date` (kolo může trvat i déle než 7 dní),
- existující týmy (id z `src/data/teams.json`), každý tým max. jeden zápas v kole, číselná skóre,
- All-Fantasy First Team: žádný hráč dvakrát, každá pozice jednou, pozice jen podle ověřených `eligible_positions`
  (nebo `position_override` se zdůvodněním – web ho zobrazí jako redakční rozhodnutí).

Nesoulad součtu `counted_points` hráčů s oficiálním skóre je jen **varování ke kontrole** – skóre se nikdy nepřepisuje.

```json
{
  "id": "kolo-01",
  "number": 1,
  "start_date": "2026-10-20",
  "end_date": "2026-10-26",
  "source": "ESPN screenshoty 1–12, nahrál majitel 27. 10.",
  "verification": "partial",
  "demo": false,
  "matchups": [
    {
      "home": "acl-rokycany",
      "away": "pilsen-beers",
      "home_score": 0,
      "away_score": 0,
      "players": [
        {
          "name": "Jméno hráče",
          "nba_team": "BOS",
          "owner": "acl-rokycany",
          "slot": "UTIL",
          "eligible_positions": ["SF", "PF"],
          "counted_points": 0,
          "bench_points": 0,
          "needs_review": true,
          "review_note": "Jméno na screenshotu nečitelné"
        }
      ]
    }
  ],
  "first_team": [{ "position": "SF", "player": "Jméno hráče" }]
}
```

`verification`: `unverified` | `partial` | `verified`. Ukázková data vždy `"demo": true`.
