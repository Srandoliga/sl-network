// Validace datových souborů. Vrací { errors, warnings }; chyby zastaví build, varování jen upozorní.

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX = /^#[0-9a-f]{6}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SEASON = /^(\d{4})\/(\d{2})$/;
export const TEAM_STATUSES = ['active', 'new', 'former'];
export const TEAM_ICONS = ['letter-a', 'flame', 'beer', 'star', 'mustache', 'monogram'];
export const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'];
export const VERIFICATION = ['unverified', 'partial', 'verified'];
const POINTS_TOLERANCE = 0.05;

const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isBool = (v) => typeof v === 'boolean';

function requireFields(obj, spec, where) {
  return Object.entries(spec)
    .filter(([key, check]) => !check(obj?.[key]))
    .map(([key]) => `${where}: chybí nebo je neplatné pole „${key}“`);
}

function duplicates(values) {
  return [...new Set(values.filter((v, i) => values.indexOf(v) !== i))];
}

export function validateTeams(teams) {
  if (!Array.isArray(teams)) return { errors: ['teams.json: musí obsahovat pole týmů'], warnings: [] };
  const errors = teams.flatMap((t, i) => {
    const where = `teams.json[${i}]${t?.id ? ` (${t.id})` : ''}`;
    return [
      ...requireFields(t, {
        id: (v) => isStr(v) && SLUG.test(v), name: isStr, short: isStr,
        status: (v) => TEAM_STATUSES.includes(v), verified: isBool,
        color: (v) => isStr(v) && HEX.test(v), icon: (v) => TEAM_ICONS.includes(v), story: isStr,
        profile: (v) => v === undefined || isBool(v),
        summary: (v) => v === undefined || isStr(v),
        formerIdentities: (v) => v === undefined || (Array.isArray(v) && v.every((f) => isStr(f?.name) && SLUG.test(f?.id ?? '') && isStr(f?.until))),
      }, where),
    ];
  });
  // Původní identity přejmenovaných týmů (formerIdentities): staré id nesmí patřit jinému týmu ani se opakovat.
  const formerIds = teams.flatMap((t) => (Array.isArray(t?.formerIdentities) ? t.formerIdentities.map((f) => f?.id) : []));
  const currentIds = new Set(teams.map((t) => t?.id));
  const formerClash = formerIds.filter((id) => currentIds.has(id)).map((id) => `teams.json: původní id „${id}“ používá jiný tým`);
  const formerDup = duplicates(formerIds).map((id) => `teams.json: původní id „${id}“ je uvedeno víckrát`);
  const dupIds = duplicates(teams.map((t) => t?.id)).map((id) => `teams.json: duplicitní id týmu „${id}“`);
  const dupNames = duplicates(teams.map((t) => t?.name)).map((n) => `teams.json: duplicitní název týmu „${n}“`);
  const playing = teams.filter((t) => t?.status !== 'former').length;
  const warnings = playing === 10 ? [] : [`teams.json: v sezoně hraje ${playing} týmů, liga má mít 10`];
  return { errors: [...errors, ...dupIds, ...dupNames, ...formerClash, ...formerDup], warnings };
}

export function validateSeasons(seasons, teamIds) {
  if (!Array.isArray(seasons)) return { errors: ['seasons.json: musí obsahovat pole sezon'], warnings: [] };
  const errors = seasons.flatMap((s, i) => {
    const where = `seasons.json[${i}]${s?.season ? ` (${s.season})` : ''}`;
    const base = requireFields(s, {
      season: (v) => isStr(v) && SEASON.test(v) && Number(v.slice(5)) === (Number(v.slice(2, 4)) + 1) % 100,
      number: (v) => Number.isInteger(v) && v > 0,
      champion: isStr, finalist: isStr, awards: Array.isArray, records: Array.isArray,
    }, where);
    const refs = ['champion', 'finalist']
      .filter((k) => isStr(s?.[k]) && !teamIds.has(s[k]))
      .map((k) => `${where}: neexistující tým „${s[k]}“ v poli ${k}`);
    const honours = ['awards', 'records'].flatMap((k) => (Array.isArray(s?.[k]) ? s[k] : []).flatMap((h, j) => [
      ...(isStr(h?.label) ? [] : [`${where}.${k}[${j}]: chybí „label“`]),
      ...(h?.team !== undefined && !teamIds.has(h.team) ? [`${where}.${k}[${j}]: neexistující tým „${h.team}“`] : []),
    ]));
    const same = s?.champion && s.champion === s.finalist ? [`${where}: šampion a finalista nesmí být stejný tým`] : [];
    return [...base, ...refs, ...honours, ...same];
  });
  const dupSeasons = duplicates(seasons.map((s) => s?.season)).map((v) => `seasons.json: duplicitní sezona ${v}`);
  const dupNumbers = duplicates(seasons.map((s) => s?.number)).map((v) => `seasons.json: duplicitní číslo sezony ${v}`);
  return { errors: [...errors, ...dupSeasons, ...dupNumbers], warnings: [] };
}

export function validateRivalries(rivalries, teamIds) {
  if (!Array.isArray(rivalries)) return { errors: ['rivalries.json: musí obsahovat pole'], warnings: [] };
  const errors = rivalries.flatMap((r, i) => {
    const where = `rivalries.json[${i}]`;
    const base = requireFields(r, {
      id: (v) => isStr(v) && SLUG.test(v), title: isStr, story: isStr,
      teams: (v) => Array.isArray(v) && v.length === 2 && v[0] !== v[1],
    }, where);
    const refs = (Array.isArray(r?.teams) ? r.teams : [])
      .filter((id) => !teamIds.has(id))
      .map((id) => `${where}: neexistující tým „${id}“`);
    return [...base, ...refs];
  });
  return { errors, warnings: [] };
}

export function validateStaff(staff, avatarIds) {
  if (!Array.isArray(staff)) return { errors: ['staff.json: musí obsahovat pole'], warnings: [] };
  const errors = staff.flatMap((s, i) => requireFields(s, {
    id: (v) => isStr(v) && SLUG.test(v), name: isStr, shortName: isStr, role: isStr,
    beat: isStr, bio: isStr, signature: isStr, avatar: (v) => avatarIds.includes(v),
  }, `staff.json[${i}]`));
  const dup = duplicates(staff.map((s) => s?.id)).map((id) => `staff.json: duplicitní id „${id}“`);
  return { errors: [...errors, ...dup], warnings: [] };
}

export function validateTemplates(templates, staffIds) {
  if (!Array.isArray(templates)) return { errors: ['templates.json: musí obsahovat pole'], warnings: [] };
  const errors = templates.flatMap((t, i) => requireFields(t, {
    id: (v) => isStr(v) && SLUG.test(v), name: isStr, kicker: isStr, headline: isStr, text: isStr,
    author: (v) => staffIds.has(v), demo: isBool,
  }, `templates.json[${i}]`));
  const dup = duplicates(templates.map((t) => t?.id)).map((id) => `templates.json: duplicitní id „${id}“`);
  return { errors: [...errors, ...dup], warnings: [] };
}

// --- Týdenní data (fáze 2, PROZATÍMNÍ formát – finální až po datovém pilotu) ---

function validatePlayer(p, where, teamIds) {
  const base = requireFields(p, { name: isStr, owner: (v) => teamIds.has(v) }, where);
  const numbers = ['counted_points', 'bench_points']
    .filter((k) => p?.[k] !== undefined && !isNum(p[k]))
    .map((k) => `${where}: pole „${k}“ musí být číslo`);
  const positions = p?.eligible_positions !== undefined
    && !(Array.isArray(p.eligible_positions) && p.eligible_positions.every((x) => POSITIONS.includes(x)))
    ? [`${where}: eligible_positions smí obsahovat jen ${POSITIONS.join('/')}`] : [];
  return [...base, ...numbers, ...positions];
}

function pointsWarnings(m, where) {
  const players = Array.isArray(m?.players) ? m.players : [];
  return ['home', 'away'].flatMap((side) => {
    const own = players.filter((p) => p?.owner === m[side]);
    if (own.length === 0 || !own.every((p) => isNum(p.counted_points)) || !isNum(m[`${side}_score`])) return [];
    const sum = own.reduce((acc, p) => acc + p.counted_points, 0);
    const diff = Math.abs(sum - m[`${side}_score`]);
    return diff > POINTS_TOLERANCE
      ? [`${where}: součet započtených bodů hráčů týmu ${m[side]} (${sum.toFixed(1)}) nesedí s oficiálním skóre ${m[`${side}_score`]} – zkontrolujte ručně, skóre se nemění`]
      : [];
  });
}

function validateMatchup(m, where, teamIds) {
  const base = requireFields(m, {
    home: (v) => teamIds.has(v), away: (v) => teamIds.has(v),
    home_score: (v) => isNum(v) && v >= 0, away_score: (v) => isNum(v) && v >= 0,
  }, where);
  const same = m?.home && m.home === m.away ? [`${where}: tým nemůže hrát sám se sebou`] : [];
  const players = Array.isArray(m?.players)
    ? m.players.flatMap((p, j) => validatePlayer(p, `${where}.players[${j}]`, teamIds))
    : m?.players === undefined ? [] : [`${where}: players musí být pole`];
  return [...base, ...same, ...players];
}

function validateFirstTeam(week, where) {
  if (week.first_team === undefined) return [];
  if (!Array.isArray(week.first_team)) return [`${where}: first_team musí být pole`];
  const allPlayers = (week.matchups ?? []).flatMap((m) => (Array.isArray(m?.players) ? m.players : []));
  const entries = week.first_team.flatMap((e, i) => {
    const w = `${where}.first_team[${i}]`;
    const base = requireFields(e, { position: (v) => POSITIONS.includes(v), player: isStr }, w);
    if (base.length) return base;
    const player = allPlayers.find((p) => p?.name === e.player);
    const eligible = Array.isArray(player?.eligible_positions) && player.eligible_positions.includes(e.position);
    // position_override = doložené zdůvodnění redakce; web ho zobrazí jako redakční rozhodnutí.
    const override = isStr(e.position_override);
    return eligible || override ? [] : [`${w}: hráč „${e.player}“ nemá ověřenou způsobilost pro pozici ${e.position}`];
  });
  const dupPlayers = duplicates(week.first_team.map((e) => e?.player)).map((p) => `${where}: hráč „${p}“ je ve First Team vícekrát`);
  const dupPos = duplicates(week.first_team.map((e) => e?.position)).map((p) => `${where}: pozice ${p} je ve First Team vícekrát`);
  return [...entries, ...dupPlayers, ...dupPos];
}

export function validateWeek(week, fileId, teamIds) {
  const where = `data/weeks/${fileId}.json`;
  if (week === null || typeof week !== 'object' || Array.isArray(week)) return { errors: [`${where}: musí obsahovat objekt`], warnings: [] };
  const base = requireFields(week, {
    id: (v) => v === fileId, number: (v) => Number.isInteger(v) && v > 0,
    start_date: (v) => isStr(v) && DATE.test(v) && !Number.isNaN(Date.parse(v)),
    end_date: (v) => isStr(v) && DATE.test(v) && !Number.isNaN(Date.parse(v)),
    source: isStr, verification: (v) => VERIFICATION.includes(v), demo: isBool,
    matchups: Array.isArray,
  }, where);
  const order = DATE.test(week.start_date ?? '') && DATE.test(week.end_date ?? '') && week.end_date < week.start_date
    ? [`${where}: end_date je dřív než start_date`] : [];
  const matchups = Array.isArray(week.matchups) ? week.matchups : [];
  const matchupErrors = matchups.flatMap((m, i) => validateMatchup(m, `${where}.matchups[${i}]`, teamIds));
  const doubleBooked = duplicates(matchups.flatMap((m) => [m?.home, m?.away]))
    .map((id) => `${where}: tým „${id}“ hraje v kole víc než jeden zápas`);
  return {
    errors: [...base, ...order, ...matchupErrors, ...doubleBooked, ...validateFirstTeam(week, where)],
    warnings: matchups.flatMap((m, i) => pointsWarnings(m, `${where}.matchups[${i}]`)),
  };
}

export function mergeResults(...results) {
  return {
    errors: results.flatMap((r) => r.errors),
    warnings: results.flatMap((r) => r.warnings),
  };
}
