import { card, CARDS, DEFAULT_BLACK } from './content/openings';
import { startDef } from './content/starts';
import { CITIES, CLUB_NAMES, EVENT_BY_ID, EVENTS, clubName, makeClubNames } from './content/events';
import {
  CATEGORIES,
  CATEGORY_BY_ID,
  COACHES,
  STAFF,
  STAFF_BY_ID,
  catFor,
  effectiveCatIndex,
  FIDE_NORM,
  INTERNATIONAL_IDS,
  TOURNAMENT_BY_ID,
  TOURNAMENTS,
  catIndex,
  type TournamentDef,
} from './content/tournaments';
import {
  ENGINE_VERSION,
  EngineError,
  GROUPS,
  SKILL_KEYS,
  SKILL_MAX,
  SKILL_SCALE,
  SKILL_LABELS,
  PHASE_FX,
  INJURY_INFO,
  currentPhase,
  type Phase,
  type Action,
  type CareerConfig,
  type CareerState,
  type Format,
  type GameReport,
  type Opponent,
  type PlayerState,
  type World,
  type PlannedTournament,
  type Setup,
  type TrainItem,
  type SkillKey,
  type TournamentRun,
} from './model';
import { Rng, hashSeed } from './rng';
import { estimateRating, expected, myRatingOf, oppRatingOf, resolveGame } from './sim/game';
import { driftPool, generatePool } from './sim/opponents';

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const MAX_AGE = 70;

export function ageOf(s: CareerState): number {
  return s.player.startAge + Math.floor(s.week / 52);
}

function log(s: CareerState, text: string) {
  s.log.push({ week: s.week, text });
  if (s.log.length > 400) s.log.shift();
}

export function createCareer(config: CareerConfig, seed: string): CareerState {
  const rng = Rng.fromSeed(seed);
  const jitter = () => rng.int(-2, 2);
  const base = { tactics: 28, strategy: 28, endgame: 26, mating: 24, calculation: 28, pressure: 26, memory: 30, stamina: 30 };
  if (config.archetype === 'tactician') Object.assign(base, { tactics: 40, calculation: 34, mating: 30, strategy: 20, endgame: 20 });
  if (config.archetype === 'positional') Object.assign(base, { strategy: 40, endgame: 34, pressure: 30, tactics: 20, calculation: 24 });
  const skills = {} as Record<SkillKey, number>;
  // start w wieku 8 lat: umiejętności niższe, pamięć i kondycja mniej
  const st = startDef(config.start);
  for (const k of SKILL_KEYS) skills[k] = Math.max(3, Math.round((base[k] + (['memory', 'stamina', 'pressure'].includes(k) ? -4 : -9) + st.skillShift + jitter()) * SKILL_SCALE));
  const city = config.city ?? rng.pick(CITIES);
  const start = card(config.startWhite);
  if (start.side !== 'w') throw new EngineError('startWhite musi być kartą białych');
  const cards: CareerState['cards'] = {};
  cards[start.id] = { mastery: 18, peak: 18, games: 0, wins: 0, draws: 0, losses: 0, lastWeek: 0 };
  for (const g of GROUPS) {
    const id = DEFAULT_BLACK[g];
    cards[id] = { mastery: 8, peak: 8, games: 0, wins: 0, draws: 0, losses: 0, lastWeek: 0 };
  }
  // dodatkowe znane debiuty z punktu startowego
  for (let i = 0; i < st.knownCards; i++) {
    const pool0 = CARDS.filter((x) => !cards[x.id]);
    const c = rng.pick(pool0);
    cards[c.id] = { mastery: 16, peak: 16, games: 0, wins: 0, draws: 0, losses: 0, lastWeek: 0 };
  }
  const rating = estimateRating(skills);
  const s: CareerState = {
    version: ENGINE_VERSION,
    seed,
    config,
    week: 0,
    rng: hashSeed(seed + ':init'),
    player: {
      name: config.name,
      startAge: st.startAge ?? 8,
      skills,
      rating,
      peak: rating,
      ratedGames: 0,
      rapid: { rating: estimateRating(skills, 'rapid'), peak: estimateRating(skills, 'rapid'), games: 0 },
      blitz: { rating: estimateRating(skills, 'blitz'), peak: estimateRating(skills, 'blitz'), games: 0 },
      fatigue: 0,
      form: 0,
      money: st.money,
      coach: null,
      category: 'none',
      norms: {},
      fideNorms: { IM: 0, GM: 0, WIM: 0, WGM: 0 },
      gender: config.gender ?? 'm',
      club: 0,
      city,
      clubNames: makeClubNames(city, (a) => rng.pick(a)),
      timeBonus: st.timeBonus ?? 0,
      grants: [],
      unrated: { classical: true, rapid: true, blitz: true },
      injury: null,
      staff: [],
    },
    cards,
    setup: { white: start.id, black: { ...DEFAULT_BLACK }, approach: 'normal', tempo: 'steady' },
    pool: [],
    seen: {},
    run: null,
    weak: {},
    log: [],
    history: [],
    ratingLog: [[0, rating, estimateRating(skills, 'rapid'), estimateRating(skills, 'blitz')]],
    plan: { phase: 'steady', year: -1, training: [], tournaments: [], done: [], wanted: [], stops: 0 },
    yearBase: { week: 0, rating: [0, 0, 0], skills, money: 0, tournaments: 0 },
    yearSummary: null,
    yearNews: [],
    world: { champion: 0, challenger: null, qualified: false, cycle: -1, titles: 0, history: [] },
    wworld: { champion: 0, challenger: null, qualified: false, cycle: -1, titles: 0, history: [] },
    achievements: [],
    event: null,
    eventsSeen: [],
    records: { open: null, women: null },
    recentEvents: [],
    rivals: {},
    mp: { qualifiedYear: -1, titles: 0 },
    leagues: {},
    stats: { wins: 0, draws: 0, losses: 0, flagLosses: 0, surpriseWins: 0, giantKills: 0, tournamentsWon: 0, tournaments: 0, bookWins: 0, candidatesWon: 0, wcPlayed: 0, white: [0, 0, 0], black: [0, 0, 0], byFormat: { classical: [0, 0, 0], rapid: [0, 0, 0], blitz: [0, 0, 0] }, bestWin: 0, streak: 0, bestStreak: 0 },
    ended: false,
  };
  s.pool = generatePool(rng);
  s.world.champion = [...s.pool].sort((a, b) => b.rating - a.rating)[0]!.id;
  s.wworld.champion = s.pool.filter((o) => o.female).sort((a, b) => b.rating - a.rating)[0]!.id;
  updateRecords(s);
  s.yearBase = { week: 0, rating: [s.player.rating, s.player.rapid.rating, s.player.blitz.rating], skills: { ...skills }, money: s.player.money, tournaments: 0 };
  s.rng = rng.state;
  log(s, `${config.name} siada do pierwszych partii w klubie. Rating: ${rating}.`);
  return s;
}

// ---------- pomocnicze ----------

function learnMult(age: number): number {
  if (age < 10) return 1.7;
  if (age < 14) return 1.5;
  if (age < 18) return 1.3;
  if (age < 25) return 1.0;
  if (age < 35) return 0.75;
  if (age < 45) return 0.55;
  return 0.4;
}

/** Jaką część czasu możesz poświęcić szachom (szkoła/studia/praca ograniczają). */
export function chessTimeFactor(s: CareerState): number {
  const age = ageOf(s);
  const base = age < 14 ? 0.85 : age < 18 ? 0.7 : age < 23 ? 0.6 : 0.5;
  return clamp(base + s.player.timeBonus, 0.25, 1);
}

function fatigueFactor(f: number): number {
  return 1 - Math.max(0, f - 50) / 120;
}

function addFatigue(s: CareerState, v: number) {
  s.player.fatigue = clamp(s.player.fatigue + v * (1 - s.player.skills.stamina / 220), 0, 100);
}

function hasStaff(s: CareerState, id: string): boolean {
  return s.player.staff.includes(id);
}

/** Mnożnik tempa nauki od kontuzji (1 = zdrowy). */
function injuryFactor(s: CareerState): number {
  const inj = s.player.injury;
  return inj && s.week < inj.until ? 1 - 0.2 * inj.severity : 1;
}

function coachMult(s: CareerState, skill: SkillKey | 'opening'): number {
  const c = COACHES.find((x) => x.id === s.player.coach);
  let m = 1;
  if (c) {
    if (skill === 'opening') m = c.openings;
    else m = c.skills === 'all' || c.skills.includes(skill) ? c.mult : 1;
  }
  if (skill === 'opening' && hasStaff(s, 'sekundant')) m *= 1.25;
  if ((skill === 'tactics' || skill === 'calculation') && hasStaff(s, 'analityk')) m *= 1.15;
  return m;
}

/** Styl gry wynikający z grywanych debiutów (0 = pozycyjny, 1 = ostry). */
export function playerStyle(s: CareerState): { value: number; label: string } {
  let w = 0;
  let sum = 0;
  for (const [id, p] of Object.entries(s.cards)) {
    if (!p.games) continue;
    w += p.games;
    sum += p.games * card(id).sharpness;
  }
  const value = w ? sum / w : 0.5;
  return { value, label: value > 0.58 ? 'taktyk' : value < 0.4 ? 'pozycyjniak' : 'uniwersalny' };
}

function addSkill(s: CareerState, k: SkillKey, v: number) {
  s.player.skills[k] = clamp(Math.round((s.player.skills[k] + v) * 100) / 100, 1, SKILL_MAX);
}

function addMastery(s: CareerState, id: string, gain: number) {
  const c = card(id);
  const p = (s.cards[id] ??= { mastery: 0, peak: 0, games: 0, wins: 0, draws: 0, losses: 0, lastWeek: s.week });
  const g = gain * c.difficulty * (0.6 + s.player.skills.memory / 100);
  p.mastery = clamp(Math.round((p.mastery + g) * 100) / 100, 0, 100);
  p.peak = Math.max(p.peak, p.mastery);
  p.lastWeek = s.week;
}

const FAT_PER_GAME: Record<Format, number> = { classical: 8, rapid: 1.5, blitz: 0.7 };
const DOUBLE_DAY_EXTRA = 7;
const FORMAT_PL: Record<Format, string> = { classical: 'klasyczny', rapid: 'szybki', blitz: 'błyskawiczny' };
const NIGHT_RECOVERY = 4;

/** Układ dni: klasyczne 1-2 rundy dziennie, szybkie i błyskawiczne - wszystko jednego dnia. */
export function makeDays(def: TournamentDef): number[] {
  if (def.format !== 'classical') return [def.rounds];
  const doubles = def.invite ? 0 : def.rounds >= 11 ? 2 : def.rounds >= 7 ? 1 : 0;
  return [...Array(def.rounds - 2 * doubles).fill(1), ...Array(doubles).fill(2)] as number[];
}

function slotOf(days: number[], r: number) {
  let acc = 0;
  for (let d = 0; d < days.length; d++) {
    const size = days[d]!;
    if (r < acc + size) return { day: d, slot: r - acc, size };
    acc += size;
  }
  return { day: days.length - 1, slot: 0, size: 1 };
}

export function validateSetup(su: Setup) {
  if (su.focus) card(su.focus);
  const wc = card(su.white);
  if (wc.side !== 'w') throw new EngineError('Zła karta białych');
  for (const g of GROUPS) {
    const id = su.black[g];
    if (id) {
      const c = card(id);
      if (c.side !== 'b' || c.group !== g) throw new EngineError('Zła obrona w grupie ' + g);
    }
  }
}

export function isInWindow(def: TournamentDef, week: number): boolean {
  const x = (((week - def.offset) % def.period) + def.period) % def.period;
  return x < def.window;
}

export interface TournamentOption {
  def: TournamentDef;
  ok: boolean;
  reason?: string;
}

/** Czy możesz wystartować (bez sprawdzania terminu). */
export function eligibilityReason(s: CareerState, def: TournamentDef): string | undefined {
  const age = ageOf(s);
  const P = s.player;
  let reason: string | undefined;
  {
    const wd = def.women ? s.wworld : s.world;
    const rk = playerWorldRank(s, !!def.women);
    if (def.women && P.gender !== 'f') reason = 'Tylko dla zawodniczek';
    else if (P.injury && P.injury.severity >= 3 && s.week < P.injury.until) reason = `Kontuzja: ${P.injury.name} (jeszcze ${P.injury.until - s.week} tyg.)`;
    else if (def.id === 'mp' && !(s.mp.qualifiedYear === Math.floor(s.week / 52) || P.rating >= 2400)) reason = 'Wymaga awansu z półfinałów MP albo rankingu 2400+';
    else if (def.special === 'candidates' && wd.champion === -1) reason = 'Jesteś mistrzem świata - czekasz na challengera';
    else if (def.special === 'candidates' && !(wd.qualified || rk <= 8)) reason = 'Wymaga kwalifikacji: top 3 Pucharu Świata albo top 8 rankingu';
    else if (def.special === 'wcmatch' && !(wd.champion === -1 || wd.challenger === -1)) reason = 'Tylko mistrz świata i zwycięzca Turnieju Pretendentów';
    else if (def.women && P.gender !== 'f') reason = 'Tylko dla zawodniczek';
    else if (def.maxAge !== undefined && age > def.maxAge) reason = `Tylko do lat ${def.maxAge}`;
    else if (def.minAge !== undefined && age < def.minAge) reason = `Od lat ${def.minAge}`;
    else if (myRatingOf(P, def.format) < def.minRating) reason = `Wymaga rankingu ${def.minRating}`;
    else if (myRatingOf(P, def.format) > def.maxRating) reason = `Tylko do rankingu ${def.maxRating}`;
    else if (def.minCat && effectiveCatIndex(P.category, P.gender) < effectiveCatIndex(def.minCat, 'm')) reason = `Wymaga: ${CATEGORY_BY_ID[def.minCat]!.name}`;
    else if (def.minClub !== undefined && P.club < def.minClub) reason = `Wymaga: ${CLUB_NAMES[def.minClub]}`;
    else if (P.money < def.fee) reason = `Wpisowe ${def.fee} zł`;
  }
  return reason;
}

export function tournamentOptions(s: CareerState): TournamentOption[] {
  return TOURNAMENTS.map((def) => {
    const reason = !isInWindow(def, s.week) ? 'Nie w tym tygodniu' : eligibilityReason(s, def);
    return { def, ok: !reason, reason };
  });
}

// ---------- świat: droga do mistrzostwa (open i kobiet) ----------

function worldOf(s: CareerState, women: boolean): World {
  return women ? s.wworld : s.world;
}

function poolOf(s: CareerState, women: boolean): Opponent[] {
  return women ? s.pool.filter((o) => o.female) : s.pool;
}

function poolByRating(s: CareerState, women = false): Opponent[] {
  return [...poolOf(s, women)].sort((a, b) => b.rating - a.rating);
}

/** Miejsce w światowym rankingu klasycznym (wśród puli rywali; dla kobiet - wśród zawodniczek). */
export function playerWorldRank(s: CareerState, women = false): number {
  return 1 + poolOf(s, women).filter((o) => o.rating > s.player.rating).length;
}

function nameOfId(s: CareerState, id: number): string {
  return id === -1 ? s.player.name : (s.pool.find((o) => o.id === id)?.name ?? '?');
}

function ratingOfId(s: CareerState, id: number): number {
  return id === -1 ? s.player.rating : (s.pool.find((o) => o.id === id)?.rating ?? 2500);
}

export interface WorldRow {
  rank: number;
  id: number;
  name: string;
  rating: number;
  title: string;
  isPlayer: boolean;
  champion: boolean;
  challenger: boolean;
  /** kraj (kod) albo '' dla Ciebie */
  nat: string;
}

export interface WorldView {
  champion: { id: number; name: string; rating: number; isPlayer: boolean };
  challenger: { id: number; name: string; rating: number; isPlayer: boolean } | null;
  playerRank: number;
  qualified: boolean;
  titles: number;
  rows: WorldRow[];
  history: World['history'];
  /** w jakim roku cyklu jesteśmy: parzysty rok gry (Rok 2, 4...) = Pretendenci i mecz, nieparzysty = Puchar Świata */
  cycleYear: 'candidates' | 'cup';
}

export function worldView(s: CareerState, top = 15, women = false): WorldView {
  const w = worldOf(s, women);
  const ranked = poolByRating(s, women);
  const rows: WorldRow[] = ranked.map((o, i) => ({
    rank: i + 1,
    id: o.id,
    name: o.name,
    nat: o.nat,
    rating: o.rating,
    title: o.title,
    isPlayer: false,
    champion: o.id === w.champion,
    challenger: o.id === w.challenger,
  }));
  const pr = playerWorldRank(s, women);
  const me: WorldRow = { rank: pr, id: -1, name: s.player.name, rating: s.player.rating, title: s.player.category, nat: 'POL', isPlayer: true, champion: w.champion === -1, challenger: w.challenger === -1 };
  const list = rows.slice(0, top);
  if (pr <= top) list.splice(pr - 1, 0, me);
  else list.push(me);
  const mk = (id: number) => ({ id, name: nameOfId(s, id), rating: ratingOfId(s, id), isPlayer: id === -1 });
  return {
    champion: mk(w.champion),
    challenger: w.challenger === null ? null : mk(w.challenger),
    playerRank: pr,
    qualified: w.qualified,
    titles: w.titles,
    rows: list,
    history: w.history,
    cycleYear: Math.floor(s.week / 52) % 2 === 1 ? 'candidates' : 'cup',
  };
}

/** Aktualizuje rekordy rankingu (raz w roku, po dryfie puli). */
export function updateRecords(s: CareerState) {
  const year = Math.floor(s.week / 52) + 1;
  const P = s.player;
  const cands: { name: string; rating: number; female: boolean; isPlayer: boolean }[] = s.pool.map((o) => ({ name: o.name, rating: o.rating, female: o.female, isPlayer: false }));
  cands.push({ name: P.name, rating: P.peak, female: P.gender === 'f', isPlayer: true });
  for (const key of ['open', 'women'] as const) {
    const list = key === 'open' ? cands : cands.filter((c) => c.female);
    for (const c of list) {
      const cur = s.records[key];
      if (!cur || c.rating > cur.rating) s.records[key] = { name: c.name, rating: c.rating, year: year, isPlayer: c.isPlayer };
    }
  }
}

function pickAiChallenger(s: CareerState, rng: Rng, women: boolean): number {
  const w = worldOf(s, women);
  const field = poolByRating(s, women).filter((o) => o.id !== w.champion).slice(0, 8);
  return rng.weighted(field, (o) => Math.exp((o.rating - (women ? 2600 : 2700)) / 70)).id;
}

/** Forma rodzajowa czasownika dla gracza (id -1) albo rywala z puli. */
function gv(s: CareerState, id: number, f: string, m: string): string {
  const female = id === -1 ? s.player.gender === 'f' : !!s.pool.find((o) => o.id === id)?.female;
  return female ? f : m;
}

function worldNote(s: CareerState, note: string, champion: string, women: boolean) {
  const w = worldOf(s, women);
  w.history.push({ year: Math.floor(s.week / 52) + 1, champion, note });
  if (w.history.length > 200) w.history.shift();
  const label = women ? 'Mistrzostwa świata kobiet' : 'Mistrzostwa świata';
  s.yearNews.push(`${label}: ${note}`);
  log(s, `${label}: ${note}`);
}

function settleWorldMatch(s: CareerState, won: boolean, oppId: number, notes: string[], women: boolean) {
  const w = worldOf(s, women);
  const who = women ? 'mistrzyni świata' : 'mistrza świata';
  if (w.champion === -1) {
    if (won) {
      notes.push(`${gv(s, -1, 'Obroniłaś', 'Obroniłeś')} tytuł ${who}!`);
      worldNote(s, `${s.player.name} ${gv(s, -1, 'obroniła', 'obronił')} tytuł.`, s.player.name, women);
    } else {
      w.champion = oppId;
      notes.push(`${gv(s, -1, 'Straciłaś', 'Straciłeś')} tytuł ${who} na rzecz: ${nameOfId(s, oppId)}.`);
      worldNote(s, `${nameOfId(s, oppId)} ${gv(s, oppId, 'odebrała', 'odebrał')} tytuł (${s.player.name}).`, nameOfId(s, oppId), women);
    }
  } else if (won) {
    w.champion = -1;
    w.titles++;
    notes.push(women ? 'ZOSTAŁAŚ MISTRZYNIĄ ŚWIATA!' : 'ZOSTAŁEŚ MISTRZEM ŚWIATA!');
    worldNote(s, `${s.player.name} ${gv(s, -1, 'zdobyła', 'zdobył')} tytuł ${who}!`, s.player.name, women);
  } else {
    notes.push(`Mecz przegrany. Tytuł zachowuje: ${nameOfId(s, w.champion)}.`);
    worldNote(s, `${nameOfId(s, w.champion)} ${gv(s, w.champion, 'obroniła', 'obronił')} tytuł w meczu z ${s.player.name}.`, nameOfId(s, w.champion), women);
  }
  w.cycle = Math.floor(s.week / 104);
  w.challenger = null;
  w.qualified = false;
}

/** Koniec parzystego roku (wyświetlanego jako Rok 2, 4, ...): rozstrzygamy mecz o tytuł, jeśli nie grał go gracz. */
function resolveWorldCycle(s: CareerState, rng: Rng, women: boolean) {
  const w = worldOf(s, women);
  const cyc = Math.floor((s.week - 1) / 104);
  if (w.cycle >= cyc) {
    w.challenger = null;
    w.qualified = false;
    return;
  }
  const chal = w.challenger ?? pickAiChallenger(s, rng, women);
  if (w.champion === -1) {
    // gracz jako mistrz nie stawił się na mecz: oddaje tytuł walkowerem
    w.champion = chal;
    worldNote(s, `${nameOfId(s, chal)} ${gv(s, chal, 'została', 'został')} ${women ? 'mistrzynią' : 'mistrzem'} (tytuł oddany walkowerem).`, nameOfId(s, chal), women);
  } else if (chal === -1) {
    worldNote(s, `${s.player.name} ${gv(s, -1, 'nie stawiła', 'nie stawił')} się na mecz o tytuł; ${nameOfId(s, w.champion)} ${women ? 'zostaje mistrzynią' : 'zostaje mistrzem'}.`, nameOfId(s, w.champion), women);
  } else {
    const p = expected(ratingOfId(s, w.champion) - ratingOfId(s, chal)) + 0.05;
    if (rng.chance(p)) worldNote(s, `${nameOfId(s, w.champion)} ${gv(s, w.champion, 'obroniła', 'obronił')} tytuł w meczu z ${nameOfId(s, chal)}.`, nameOfId(s, w.champion), women);
    else {
      w.champion = chal;
      worldNote(s, `${nameOfId(s, chal)} ${gv(s, chal, 'została', 'został')} ${women ? 'nową mistrzynią' : 'nowym mistrzem'} świata!`, nameOfId(s, chal), women);
    }
  }
  w.cycle = cyc;
  w.challenger = null;
  w.qualified = false;
}

// ---------- plan roku ----------

export const MAX_TRAIN_ITEMS = 3;

export interface ScheduledTournament {
  def: TournamentDef;
  /** tygodnie roku, w których zaczynają się kolejne okna turnieju (od teraz do końca roku) */
  weeks: number[];
  /** dlaczego teraz byś nie wystartował (zmiana rankingu w ciągu roku może to zmienić) */
  reason?: string;
}

export function tournamentSchedule(s: CareerState): ScheduledTournament[] {
  const yearEnd = (Math.floor(s.week / 52) + 1) * 52;
  const out: ScheduledTournament[] = [];
  for (const def of TOURNAMENTS) {
    const weeks: number[] = [];
    for (let w = s.week; w < yearEnd; w++) {
      if (isInWindow(def, w) && (w === s.week || !isInWindow(def, w - 1))) weeks.push(w % 52);
    }
    if (weeks.length) out.push({ def, weeks, reason: eligibilityReason(s, def) });
  }
  return out;
}

const skillGainMean = (learn: number, coach: number, tf: number, v: number) => 0.45 * learn * coach * tf * Math.pow(Math.max(0.02, 1 - v / SKILL_MAX), 1.6);
const masteryGainMean = (base: number, learn: number, coach: number, tf: number, m: number) => base * learn * coach * tf * Math.pow(1 - m / 100, 0.8);

export interface ForecastLine {
  label: string;
  from: number;
  to: number;
  note: string;
}

/** Prognoza przyrostu do końca roku dla zaplanowanego treningu (średnia, bez losowości). */
export function trainingForecast(s: CareerState, items: TrainItem[], tournamentWeeks = 0, phase: Phase = 'steady'): ForecastLine[] {
  const P = s.player;
  const pm = PHASE_FX[phase].train;
  const age = ageOf(s);
  const tf = clamp(chessTimeFactor(s) / 0.7, 0.4, 1.5);
  const learn = learnMult(age);
  const weeksLeft = 52 - (s.week % 52);
  const trainWeeks = Math.max(0, Math.round((weeksLeft - tournamentWeeks) * 0.88));
  const n = items.length;
  const sk = { ...P.skills };
  const ms: Record<string, number> = {};
  for (const it of items) if (it.kind === 'study') ms[it.card] = s.cards[it.card]?.mastery ?? 0;
  const weak = Object.entries(s.weak).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]?.[0] as SkillKey | undefined;
  const startSk = { ...sk };
  const startMs = { ...ms };
  for (let w = 0; w < trainWeeks; w++) {
    for (const it of items) {
      const share = 1 / n;
      if (it.kind === 'skill') sk[it.skill] = Math.min(SKILL_MAX, sk[it.skill] + skillGainMean(learn, coachMult(s, it.skill), tf, sk[it.skill]) * share * pm);
      else if (it.kind === 'study') {
        const c = card(it.card);
        const g = masteryGainMean(6.5, learn, coachMult(s, 'opening'), tf, ms[it.card]!) * share * pm;
        ms[it.card] = Math.min(100, ms[it.card]! + g * c.difficulty * (0.6 + sk.memory / 100));
      } else if (w < 2) {
        sk[weak ?? 'calculation'] += 1.1 * learn * tf * share * (weak ? 1 : 0.3);
      }
    }
  }
  return items.map((it) => {
    if (it.kind === 'skill') return { label: SKILL_LABELS[it.skill], from: startSk[it.skill], to: sk[it.skill], note: 'punkty umiejętności' };
    if (it.kind === 'study') return { label: `Studiuj: ${card(it.card).name}`, from: startMs[it.card]!, to: ms[it.card]!, note: 'poziom znajomości debiutu' };
    return { label: 'Analiza porażek', from: 0, to: 0, note: weak ? `wzmacnia: ${SKILL_LABELS[weak]} (Twoja najczęstsza słabość)` : 'na razie brak słabości do analizy - mały, ogólny zysk kalkulacji' };
  });
}

function validateItem(it: TrainItem) {
  if (it.kind === 'skill') {
    if (!SKILL_KEYS.includes(it.skill)) throw new EngineError('Zła umiejętność');
  } else if (it.kind === 'study') {
    card(it.card);
  } else if (it.kind !== 'analyze') throw new EngineError('Zły rodzaj treningu');
}

/** Jeden tydzień treningu wg planu: pozycje dzielą między siebie czas tygodnia. */
function applyPlannedTraining(s: CareerState, rng: Rng, items: TrainItem[]) {
  const P = s.player;
  const n = items.length;
  if (!n) {
    addFatigue(s, 4);
    return;
  }
  const age = ageOf(s);
  const tf = clamp(chessTimeFactor(s) / 0.7, 0.4, 1.5);
  const learn = learnMult(age);
  const fx = PHASE_FX[currentPhase(s)];
  const ff = fatigueFactor(P.fatigue) * injuryFactor(s) * fx.train;
  const share = 1 / n;
  for (const it of items) {
    if (it.kind === 'skill') {
      addSkill(s, it.skill, skillGainMean(learn, coachMult(s, it.skill), tf, P.skills[it.skill]) * ff * rng.range(0.75, 1.25) * share);
    } else if (it.kind === 'study') {
      const m = s.cards[it.card]?.mastery ?? 0;
      addMastery(s, it.card, masteryGainMean(6.5, learn, coachMult(s, 'opening'), tf, m) * ff * rng.range(0.8, 1.2) * share);
    } else {
      const top = Object.entries(s.weak).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0];
      const k = (top?.[0] as SkillKey | undefined) ?? 'calculation';
      addSkill(s, k, 1.1 * learn * tf * ff * rng.range(0.8, 1.2) * share * (top ? 1 : 0.3));
      if (top) delete s.weak[k];
    }
  }
  addFatigue(s, fx.fatigue);
}

/** Rozgrywa turniej automatycznie do pierwszej ważnej rundy. true = zatrzymaj grę, false = turniej skończony i zamknięty. */
function autoRun(s: CareerState, rng: Rng): boolean {
  const run = s.run!;
  for (let i = 0; i < 60; i++) {
    if (run.status === 'prep') {
      if (run.current!.important) return true;
      playCurrent(s, run, undefined, rng);
    } else if (run.status === 'result') {
      if (run.games.length >= run.rounds) finalize(s, run, rng, false);
      else pairNext(s, run, rng);
    } else {
      s.run = null;
      advanceWeek(s, rng);
      return false;
    }
  }
  return true;
}

/** Przewija rok: trening wg planu, turnieje symulowane automatycznie; zatrzymuje się na ważnych momentach, wydarzeniach i końcu roku. */
function advanceYear(s: CareerState, rng: Rng) {
  const P = s.player;
  const year = Math.floor(s.week / 52);
  for (let guard = 0; guard < 120; guard++) {
    if (s.ended || s.event || Math.floor(s.week / 52) !== year) break;
    const def = pickPlanned(s);
    if (def) {
      beginRun(s, def, s.setup, rng);
      if (autoRun(s, rng)) break;
      continue;
    }
    if (P.fatigue > 72) {
      P.fatigue = clamp(P.fatigue - 35, 0, 100);
      P.form = clamp(P.form + 1, -10, 10);
    } else {
      applyPlannedTraining(s, rng, s.plan.training);
    }
    advanceWeek(s, rng);
  }
}

function windowKey(def: TournamentDef, week: number): string {
  return `${def.id}:${Math.floor((week - def.offset) / def.period)}`;
}

/** Zaplanowany turniej, który zaczyna się w tym tygodniu (i spełniasz warunki). */
function pickPlanned(s: CareerState): TournamentDef | null {
  for (const pt of s.plan.tournaments) {
    if (pt.times <= 0) continue;
    const def = TOURNAMENT_BY_ID[pt.id];
    if (!def || !isInWindow(def, s.week)) continue;
    const key = windowKey(def, s.week);
    if (s.plan.done.includes(key)) continue;
    if (eligibilityReason(s, def)) continue;
    s.plan.done.push(key);
    pt.times--;
    return def;
  }
  // Droga do korony: gdy zdobędziesz awans w trakcie roku (np. wygrasz Turniej Pretendentów w kwietniu),
  // mecz o mistrzostwo świata zostanie dopisany do planu sam. To samo z Turniejem Pretendentów.
  for (const def of TOURNAMENTS) {
    if ((def.special !== 'wcmatch' && def.special !== 'candidates') || !isInWindow(def, s.week)) continue;
    const key = windowKey(def, s.week);
    if (s.plan.done.includes(key) || eligibilityReason(s, def)) continue;
    s.plan.done.push(key);
    return def;
  }
  return null;
}

function beginRun(s: CareerState, d: TournamentDef, setup: Setup, rng: Rng) {
  const P = s.player;
  P.money -= d.fee;
  const run: TournamentRun = {
    id: d.id,
    name: d.name,
    format: d.format,
    rounds: d.rounds,
    fieldSize: d.fieldSize,
    level: d.level,
    spread: d.spread,
    fee: d.fee,
    prize: d.prize,
    startRating: myRatingOf(P, d.format),
    startWeek: s.week,
    games: [],
    used: [],
    scouts: 3 + Math.floor(P.skills.memory / 25) + (hasStaff(s, 'sekundant') ? 2 : 0) + (hasStaff(s, 'analityk') ? 1 : 0),
    setup: structuredClone(setup),
    days: makeDays(d),
    fat: 0,
    status: 'prep',
    current: null,
  };
  if (d.special === 'candidates') {
    const champ = (d.women ? s.wworld : s.world).champion;
    run.fieldIds = poolByRating(s, !!d.women).filter((o) => o.id !== champ).slice(0, 7).map((o) => o.id);
  } else if (d.special === 'wcmatch') {
    const wd = d.women ? s.wworld : s.world;
    run.fieldIds = [wd.champion === -1 ? wd.challenger! : wd.champion];
  } else if (!d.league && !d.team && d.fieldSize >= 4 && d.fieldSize <= 12 && d.rounds % (d.fieldSize - 1) === 0) {
    // turniej kołowy (np. Turniej Fiordów): stały skład, z każdym grasz tyle razy, ile wynika z liczby rund (bywa 2 razy, raz każdym kolorem)
    let base = d.women ? s.pool.filter((o) => o.female) : [...s.pool];
    if (!INTERNATIONAL_IDS.has(d.id)) {
      const pl = base.filter((o) => o.nat === 'POL');
      if (pl.length >= 12) base = pl;
    }
    const ids: number[] = [];
    for (let i = 0; i < d.fieldSize - 1 && base.length; i++) {
      const o = rng.weighted(base, (x) => Math.exp(-(((oppRatingOf(x, d.format) - d.level) / (d.spread * 1.2)) ** 2)) + 1e-6);
      ids.push(o.id);
      base.splice(base.indexOf(o), 1);
    }
    run.fieldIds = ids;
  }
  s.run = run;
  pairNext(s, run, rng);
  log(s, `Zapisujesz się: ${d.name}.`);
}

// ---------- tydzień ----------

function advanceWeek(s: CareerState, rng: Rng) {
  const P = s.player;
  s.week++;
  P.fatigue = clamp(P.fatigue - 15, 0, 100);
  P.form = Math.round(P.form * 0.8 * 100) / 100;
  const age = ageOf(s);
  if (age < 18) P.money += 30;
  const coach = COACHES.find((c) => c.id === P.coach);
  if (coach) {
    if (P.money >= coach.cost) P.money -= coach.cost;
    else {
      P.coach = null;
      log(s, `Brak funduszy - rezygnujesz z trenera (${coach.name}).`);
    }
  }
  // zespół: pensje co tydzień
  for (const id of [...P.staff]) {
    const st = STAFF_BY_ID[id];
    if (!st) continue;
    if (P.money >= st.cost) P.money -= st.cost;
    else {
      P.staff = P.staff.filter((x) => x !== id);
      log(s, `Brak funduszy - odchodzi: ${st.name}.`);
    }
  }
  if (hasStaff(s, 'fizjo')) P.fatigue = clamp(P.fatigue - 4, 0, 100);
  // kontuzje
  if (P.injury) {
    if (s.week >= P.injury.until) {
      log(s, `Wracasz do zdrowia: ${P.injury.name}.`);
      P.injury = null;
    } else {
      P.form = Math.min(P.form, -P.injury.severity);
    }
  }
  if (!P.injury && !s.ended) {
    let risk = 0.003 + Math.max(0, P.fatigue - 60) * 0.0003 + (age > 35 ? 0.002 : 0);
    if (hasStaff(s, 'fizjo')) risk *= 0.4;
    if (rng.chance(risk)) {
      const u = rng.float();
      const severity: 1 | 2 | 3 = u < 0.6 ? 1 : u < 0.9 ? 2 : 3;
      const kind = rng.pick(['back', 'eyes', 'nerves', 'illness'] as const);
      let weeks = severity === 1 ? rng.int(2, 4) : severity === 2 ? rng.int(5, 10) : rng.int(12, 24);
      if (hasStaff(s, 'fizjo')) weeks = Math.max(1, Math.round(weeks * 0.7));
      P.injury = { name: INJURY_INFO[kind].names[severity - 1]!, kind, until: s.week + weeks, severity };
      log(s, `Kontuzja: ${P.injury.name} (ok. ${weeks} tyg.).`);
      if (!s.event) s.event = { id: 'uraz' };
    }
  }
  // stypendia, kontrakty, pensje
  for (const g of [...P.grants]) {
    P.money += g.perWeek;
    if (s.week >= g.expires) {
      P.grants = P.grants.filter((x) => x !== g);
      log(s, `Koniec: ${g.name}.`);
    }
  }
  // zapominanie nieużywanych kart
  for (const p of Object.values(s.cards)) {
    if (s.week - p.lastWeek > 12 && p.mastery > p.peak * 0.6) {
      p.mastery = Math.max(p.peak * 0.6, p.mastery - 0.12 * (1 - P.skills.memory / 150));
    }
  }
  if (s.week % 52 === 0) {
    // podsumowanie roku
    {
      const yb = s.yearBase;
      const now: [number, number, number] = [P.rating, P.rapid.rating, P.blitz.rating];
      const gains: Partial<Record<SkillKey, number>> = {};
      for (const k of SKILL_KEYS) {
        const d = Math.round((P.skills[k] - yb.skills[k]) * 10) / 10;
        if (Math.abs(d) >= 0.1) gains[k] = d;
      }
      s.yearSummary = {
        year: s.week / 52,
        results: s.history.filter((h) => h.week >= yb.week),
        news: [...s.yearNews],
        rating: now,
        ratingDelta: [now[0] - yb.rating[0], now[1] - yb.rating[1], now[2] - yb.rating[2]],
        tournaments: s.stats.tournaments - yb.tournaments,
        skillGains: gains,
        money: P.money - yb.money,
      };
      s.yearNews = [];
      s.yearBase = { week: s.week, rating: now, skills: { ...P.skills }, money: P.money, tournaments: s.stats.tournaments };
      s.ratingLog.push([s.week, now[0], now[1], now[2]]);
    }
    // podsumowanie sezonu ligowego: punkty z Twoich meczów decydują o miejscu klubu
    for (const [id, l] of Object.entries(s.leagues)) {
      if (l.played < 2) continue;
      const teams = 12;
      const ratio = l.points / l.played;
      const place = clamp(Math.round(1 + (1 - ratio) * (teams - 1) + rng.normal(0, 1.3)), 1, teams);
      const ldef = TOURNAMENTS.find((t) => t.league === id);
      const reward = place <= 3 && ldef ? ldef.prize * (place === 1 ? 12 : place === 2 ? 8 : 5) : 0;
      P.money += reward;
      if (place <= 3) P.form = clamp(P.form + 1, -10, 10);
      log(s, `Sezon ligowy (${ldef?.name ?? id}): ${l.points}/${l.played} pkt, klub na miejscu ${place}/${teams}${reward ? `, premia ${reward} zł` : ''}.`);
    }
    s.leagues = {};
    if (!s.event && !s.ended) {
      const forced = EVENTS.find((e) => e.forced && e.cond(s) && !s.eventsSeen.includes(e.id));
      if (forced) {
        s.event = { id: forced.id };
        s.eventsSeen.push(forced.id);
      }
    }
    s.pool = structuredClone(s.pool);
    driftPool(s.pool, rng);
    // zawodnicy, którzy zmienili narodowość przy wejściu do czołówki, mają nowe nazwisko: odświeżamy bilanse rywali
    for (const [id, rv] of Object.entries(s.rivals)) {
      const o = s.pool.find((x) => x.id === Number(id));
      if (o) rv.name = o.name;
    }
    updateRecords(s);
    if (age > 38) {
      for (const k of SKILL_KEYS) addSkill(s, k, -(age - 36) * 0.12 * (k === 'stamina' || k === 'calculation' ? 1.6 : 1));
    }
    log(s, `Nowy sezon. Masz ${age} lat. Rating: ${P.rating}.`);
    if (age >= MAX_AGE) {
      s.ended = true;
      s.endReason = 'Wiek emerytalny - kariera dobiegła końca.';
    }
  }
  if (rng.chance(0.03)) randomEvent(s, rng);
  // wydarzenia z wyborem: ok. 3-4 razy w roku, bez powtarzania świeżo widzianych
  if (!s.event && !s.ended && rng.chance(0.07)) {
    const eligible = EVENTS.filter((e) => !e.forced && e.cond(s) && !(e.once && s.eventsSeen.includes(e.id)) && !s.recentEvents.includes(e.id));
    if (eligible.length) {
      const e = rng.weighted(eligible, (x) => x.weight ?? 1);
      s.event = { id: e.id };
      if (e.once) s.eventsSeen.push(e.id);
      s.recentEvents.push(e.id);
      if (s.recentEvents.length > 6) s.recentEvents.shift();
    }
  }
  P.peak = Math.max(P.peak, P.rating);
  const wk = s.week % 104;
  for (const women of [false, true]) {
    const wd = worldOf(s, women);
    if (wk === 72 && wd.challenger === null) wd.challenger = pickAiChallenger(s, rng, women);
    if (wk === 0) resolveWorldCycle(s, rng, women);
  }
}

function randomEvent(s: CareerState, rng: Rng) {
  const P = s.player;
  const e = rng.int(0, 6);
  if (e === 0) {
    const k = rng.pick(SKILL_KEYS.filter((x) => x !== 'stamina'));
    addSkill(s, k, 1.5);
    log(s, `Olśnienie nad szachownicą: ${SKILL_LABELS[k]} +1.5.`);
  } else if (e === 1) {
    P.fatigue = clamp(P.fatigue + 30, 0, 100);
    log(s, 'Przeziębienie - jesteś wyraźnie zmęczony.');
  } else if (e === 2) {
    const m = 60 + rng.int(0, 120);
    P.money += m;
    log(s, `Lokalny sponsor wspiera klub: +${m} zł.`);
  } else if (e === 3) {
    const ids = Object.keys(s.cards);
    const id = rng.pick(ids);
    addMastery(s, id, 8);
    log(s, `Znalazłeś świetną książkę o debiucie: ${card(id).name} +.`);
  } else if (e === 4) {
    P.form = clamp(P.form - 4, -10, 10);
    log(s, 'Kryzys formy po nieprzespanej nocy z komputerem.');
  } else if (e === 5) {
    P.form = clamp(P.form + 4, -10, 10);
    log(s, 'Świetny nastrój - czujesz, że wszystko widzisz.');
  } else {
    const k = rng.pick(['tactics', 'strategy', 'endgame'] as SkillKey[]);
    addSkill(s, k, 1);
    log(s, `Trening z lokalnym mistrzem: ${SKILL_LABELS[k]} +1.`);
  }
}

// ---------- turniej ----------

function pairNext(s: CareerState, run: TournamentRun, rng: Rng) {
  const P = s.player;
  const played = run.games.length;
  const score = run.games.reduce((a, g) => a + g.result, 0);
  const target = run.level + (score - played / 2) * run.spread * 0.35;
  const women = !!TOURNAMENT_BY_ID[run.id]?.women;
  let field = women ? s.pool.filter((o) => o.female) : s.pool;
  // turnieje krajowe (mistrzostwa Polski, ligi, turnieje klubowe i szkolne) gromadzą głównie Polaków; międzynarodowe - zawodników z całego świata
  if (!INTERNATIONAL_IDS.has(run.id)) {
    const pl = field.filter((o) => o.nat === 'POL');
    if (pl.length >= 12) field = pl;
  }
  let cands = field.filter((o) => !run.used.includes(o.id));
  if (cands.length < 3) cands = field;
  const forced = run.fieldIds?.length ? s.pool.find((o) => o.id === run.fieldIds![played % run.fieldIds!.length]) : undefined;
  const opp = forced ?? rng.weighted(cands, (o) => Math.exp(-(((oppRatingOf(o, run.format) - target) / (run.spread * 0.9)) ** 2)));
  const color = played === 0 ? (rng.chance(0.5) ? 'w' : 'b') : run.games[played - 1]!.color === 'w' ? 'b' : 'w';
  run.used.push(opp.id);
  const info = slotOf(run.days, played);
  // nowy dzień klasycznego turnieju: noc regeneruje tylko odrobinę
  if (played > 0 && run.format === 'classical' && info.slot === 0) {
    P.fatigue = clamp(P.fatigue - NIGHT_RECOVERY, 0, 100);
    run.fat = clamp(run.fat - NIGHT_RECOVERY, 0, 100);
  }
  const myR = myRatingOf(P, run.format);
  const left = run.rounds - played;
  const tdef = TOURNAMENT_BY_ID[run.id];
  // Zatrzymujemy się tylko na naprawdę ważnych momentach: ważny turniej w decydujących rundach,
  // walka o zwycięstwo w trudnym turnieju albo o normę. Reszta jest symulowana automatycznie.
  const contention = played >= 2 && score >= played - 0.5 && run.level >= myR - 100;
  let reason = '';
  if (tdef?.special === 'wcmatch') reason = 'Mecz o mistrzostwo świata - każda partia się liczy';
  else if (left <= 2) {
    if (tdef?.major) reason = 'Decydujące rundy ważnego turnieju';
    else if (contention) reason = 'Walka o zwycięstwo w turnieju';
  }
  if (!reason && tdef && normAtStake(s, run, tdef, played, score)) reason = 'Walka o normę';
  if (!reason && tdef?.major && contention && played >= 3) reason = 'Walka o czołówkę';
  // limit zatrzymań na zwykłych turniejach: 3 w roku (ważne turnieje zatrzymują zawsze)
  if (reason && !tdef?.major && !run.stopped) {
    if (s.plan.stops >= 3) reason = '';
    else {
      run.stopped = true;
      s.plan.stops++;
    }
  }
  const rushed = run.format === 'classical' && info.size === 2 && info.slot === 1;
  run.current = { oppId: opp.id, color, scouted: false, important: reason !== '', reason, day: info.day, slot: info.slot, size: info.size, rushed };
  run.status = 'prep';
}

/** Czy norma jest jeszcze w grze (osiągalna, ale niepewna) - warto się zatrzymać. */
function normAtStake(s: CareerState, run: TournamentRun, def: TournamentDef, played: number, score: number): boolean {
  const P = s.player;
  const left = run.rounds - played;
  if (left <= 0 || left > 3 || def.format === 'blitz') return false;
  const oppSum = run.games.reduce((a, g) => a + Math.max(1000, g.oppRating), 0);
  const avgOpp = (oppSum + left * Math.max(1000, run.level)) / run.rounds;
  const need = (perf: number) => {
    const p = 1 / (1 + Math.pow(10, -(perf - avgOpp) / 400));
    return Math.max(run.rounds / 3, Math.ceil(p * run.rounds * 2) / 2);
  };
  const open = (perf: number, games: number) => {
    if (run.rounds < games) return false;
    const gap = need(perf) - score;
    return gap > left * 0.2 && gap <= left;
  };
  if (def.norm) {
    const max = catIndex(def.norm);
    for (let i = polishIndex(P) + 1; i <= max; i++) {
      const cat = catFor(CATEGORIES[i]!.id, P.gender);
      if (!cat.normPerf || !cat.normGames) continue;
      if (def.format === 'rapid' && !['v', 'iv'].includes(cat.id)) continue;
      if (cat.id === 'm' && !def.fideNorm) continue;
      // normy na niskie kategorie (V-II) symulujemy automatycznie; zatrzymujemy się dopiero od I kategorii wzwyż
      if (catIndex(cat.id) < catIndex('i')) break;
      if (open(cat.normPerf, cat.normGames)) return true;
      break;
    }
  }
  if (def.fideNorm) {
    const keys: ('IM' | 'GM' | 'WIM' | 'WGM')[] = [def.fideNorm];
    if (P.gender === 'f' && (def.fideNorm === 'IM' || def.fideNorm === 'GM')) keys.push(def.fideNorm === 'IM' ? 'WIM' : 'WGM');
    for (const key of keys) {
      const fn = FIDE_NORM[key];
      if (catIndex(P.category) >= catIndex(fn.cat) || avgOpp < fn.opp) continue;
      if (open(fn.perf, fn.games)) return true;
    }
  }
  return false;
}

function playCurrent(s: CareerState, run: TournamentRun, override: Setup | undefined, rng: Rng) {
  const cur = run.current!;
  let su = run.setup;
  if (cur.important && override) {
    validateSetup(override);
    su = override;
    s.setup = structuredClone(override);
    delete s.setup.focus;
  }
  const opp0 = s.pool.find((o) => o.id === cur.oppId)!;
  // nemezis (rywal, który regularnie Cię pokonuje) przygotowuje się na Ciebie staranniej
  const rv = s.rivals[opp0.id];
  const nemesis = !!rv && rv.l - rv.w >= 2 && rv.l >= 3;
  const opp = nemesis ? { ...opp0, prep: Math.min(0.95, opp0.prep + 0.12) } : opp0;
  const prepFactor = (cur.rushed ? 0.6 : run.format === 'classical' ? 1 : run.format === 'rapid' ? 0.9 : 0.8) * (hasStaff(s, 'sekundant') ? 1.15 : 1);
  const oppFatigue = clamp(run.fat * (1 - opp.skills.stamina / 220), 0, 100);
  const res = resolveGame(s, opp, cur.color, su, run.format, run.games.length + 1, rng, { prepFactor, oppFatigue, rushed: cur.rushed, scouted: cur.scouted });
  run.games.push(res.report);
  run.status = 'result';
  applyGameEffects(s, run, opp, res.report, res.playerCard, res.book, rng);
}

function perfOf(avgOpp: number, pct: number): number {
  const p = clamp(pct, 0.01, 0.99);
  return avgOpp + 400 * Math.log10(p / (1 - p));
}

/**
 * Miejsce w turnieju. Wyniki pola są losowane tak, by średnia całego pola wynosiła 50% (suma punktów się zgadza),
 * a potem ściśnięte regułami systemu szwajcarskiego: lider rzadko ma komplet (zwykle 6-6,5 z 7),
 * a słaby wynik oznacza dół tabeli, wynik 50% - środek.
 */
export function simulatePlace(rng: Rng, fieldSize: number, rounds: number, level: number, spread: number, score: number): number {
  const others = Math.max(0, fieldSize - 1);
  if (others === 0) return 1;
  const raw: number[] = [];
  for (let i = 0; i < others; i++) {
    const r = rng.normal(level, spread);
    raw.push(rng.normal(rounds * expected(0.9 * (r - level)), Math.sqrt(rounds * 0.12)));
  }
  const total = (fieldSize * rounds) / 2 - score;
  const shift = (total - raw.reduce((a, b) => a + b, 0)) / others;
  const vals = raw.map((x) => clamp(Math.round(2 * (x + shift)) / 2, 0, rounds)).sort((a, b) => b - a);
  // Lider (jeśli to nie Ty). Krótkie turnieje (do 7 rund): komplet rzadko (8%), najczęściej 6,5 z 7 (47%), potem 6 (35%), czasem 5,5 (10%).
  // Im więcej rund, tym więcej punktów traci zwycięzca: ok. 10-11 z 13 i ok. 13-14 z 17 (komplet w długim turnieju praktycznie się nie zdarza).
  const u = rng.float();
  let lost: number;
  if (rounds <= 7) lost = u < 0.08 ? 0 : u < 0.55 ? 0.5 : u < 0.9 ? 1 : 1.5;
  else {
    const mean = 0.735 * Math.pow(rounds / 7, 1.7);
    lost = clamp(Math.round(2 * rng.normal(mean, 0.2 + 0.04 * rounds)) / 2, 0.5, rounds);
  }
  const leaderCap = rounds - lost;
  let better = 0;
  let ties = 0;
  vals.forEach((v0, i) => {
    const rank = v0 > score ? i + 1 : i + 2;
    const drop = 0.5 * Math.ceil(Math.log2(Math.max(2, rank)));
    const cap = rank === 1 ? leaderCap : Math.min(leaderCap - drop, rounds - drop - 0.5);
    const v = Math.min(v0, cap);
    if (v > score) better++;
    else if (v === score) ties++;
  });
  return 1 + better + Math.floor(ties / 2);
}

/** Turniej kołowy: prawdziwy skład. Partie rywali między sobą są losowane wg ich rankingów, Twoje wyniki są faktyczne. */
function closedPlace(s: CareerState, run: TournamentRun, rng: Rng, score: number): number {
  const ids = run.fieldIds!;
  const opps = ids.map((id) => s.pool.find((o) => o.id === id)!).filter(Boolean);
  const pts = new Map<number, number>();
  for (const o of opps) pts.set(o.id, 0);
  for (const g of run.games) if (pts.has(g.oppId)) pts.set(g.oppId, pts.get(g.oppId)! + (1 - g.result));
  const times = Math.max(1, Math.round(run.rounds / (run.fieldSize - 1)));
  const dFloor = run.format === 'classical' ? 0.5 : run.format === 'rapid' ? 0.35 : 0.25;
  for (let i = 0; i < opps.length; i++) {
    for (let j = i + 1; j < opps.length; j++) {
      const a = opps[i]!;
      const b = opps[j]!;
      const e = expected(oppRatingOf(a, run.format) - oppRatingOf(b, run.format));
      const pd = Math.min(dFloor * (1 - Math.abs(2 * e - 1) * 0.6), 2 * Math.min(e, 1 - e));
      for (let t = 0; t < times; t++) {
        const r = rng.float();
        const aWin = Math.max(0, e - pd / 2);
        const sa = r < aWin ? 1 : r < aWin + pd ? 0.5 : 0;
        pts.set(a.id, pts.get(a.id)! + sa);
        pts.set(b.id, pts.get(b.id)! + 1 - sa);
      }
    }
  }
  let better = 0;
  let ties = 0;
  for (const v of pts.values()) {
    if (v > score) better++;
    else if (v === score) ties++;
  }
  return 1 + better + Math.floor(ties / 2);
}

function finalize(s: CareerState, run: TournamentRun, rng: Rng, withdrew: boolean) {
  const def = TOURNAMENT_BY_ID[run.id]!;
  const P = s.player;
  const n = run.games.length;
  const score = run.games.reduce((a, g) => a + g.result, 0);
  const avgOpp = n ? run.games.reduce((a, g) => a + g.oppRating, 0) / n : run.level;
  const pct = n ? score / n : 0;
  const notes: string[] = [];

  // rating
  const age = ageOf(s);
  let delta = 0;
  const fr = run.format === 'classical' ? null : P[run.format];
  let rated = fr ? fr.games : P.ratedGames;
  for (const g of run.games) {
    // K wg zasad FIDE: nowi (<30 partii) i juniorzy 40 (junior powyżej 2300: 20), dorośli 20, powyżej 2400: 10
    const r0 = run.startRating;
    const K = rated < 30 ? 40 : age < 18 ? (r0 > 2300 ? 20 : 40) : r0 > 2400 ? 10 : 20;
    delta += K * (g.result - expected(run.startRating - g.oppRating));
    rated++;
  }
  delta = Math.round(delta);
  // pierwszy ranking: po 5 partiach dostajesz ranking równy wynikowi z turnieju (stąd duże skoki na starcie)
  if (P.unrated[run.format] && rated >= 5 && n >= 3 && !withdrew) {
    const first = clamp(Math.round(perfOf(avgOpp, pct)), 1000, 1900);
    delta = first - (fr ? fr.rating : P.rating);
    P.unrated[run.format] = false;
    notes.push(`Pierwszy ranking (${FORMAT_PL[run.format]}): ${first}`);
  }
  // dolna granica rankingu FIDE: 1000; osobne rankingi: klasyczny, szybki, błyskawiczny
  if (fr) {
    fr.games = rated;
    fr.rating = Math.max(1000, fr.rating + delta);
    fr.peak = Math.max(fr.peak, fr.rating);
  } else {
    P.ratedGames = rated;
    P.rating = Math.max(1000, P.rating + delta);
    P.peak = Math.max(P.peak, P.rating);
  }
  run.ratingDelta = delta;

  // miejsce
  const others = Math.max(0, run.fieldSize - 1);
  const closed = !!run.fieldIds && run.fieldSize >= 4 && run.fieldIds.length === run.fieldSize - 1;
  let place = withdrew ? run.fieldSize : closed ? closedPlace(s, run, rng, score) : simulatePlace(rng, run.fieldSize, run.rounds, run.level, run.spread, score);
  let matchWon: boolean | null = null;
  if (def.special === 'wcmatch') {
    const oppId = run.fieldIds?.[0] ?? -2;
    const mo = s.pool.find((o) => o.id === oppId);
    if (withdrew) matchWon = false;
    else if (score > run.rounds / 2) matchWon = true;
    else if (score < run.rounds / 2) matchWon = false;
    else {
      matchWon = rng.chance(expected(P.rapid.rating - (mo?.rapid ?? 2700)));
      notes.push(`Dogrywka (rapid): ${matchWon ? 'wygrana' : 'porażka'}.`);
    }
    place = matchWon ? 1 : 2;
    s.stats.wcPlayed++;
    settleWorldMatch(s, matchWon, oppId, notes, !!def.women);
  }
  if (def.team && !withdrew) {
    // turniej drużynowy: miejsce drużyny zależy od Twojej szachownicy i siły klubu
    const teamStr = run.level + (pct - 0.5) * run.spread * 2 + rng.normal(0, run.spread * 0.25);
    let tb = 0;
    for (let i = 0; i < others; i++) if (rng.normal(run.level, run.spread) > teamStr) tb++;
    place = 1 + tb;
    run.team = true;
    notes.push(`Twoja drużyna: miejsce ${place}/${run.fieldSize}`);
  }
  run.place = place;
  const pctPlace = place / run.fieldSize;
  const cut = place === 1 ? 1 : place === 2 ? 0.5 : place === 3 ? 0.3 : pctPlace <= 0.1 ? 0.1 : pctPlace <= 0.25 ? 0.04 : 0;
  let prize = withdrew ? 0 : Math.round(def.prize * cut * (def.team ? 0.35 : 1));
  if (matchWon !== null) prize = matchWon ? def.prize : Math.round(def.prize * 0.6);
  if (def.special === 'candidates' && !withdrew && place === 1) {
    (def.women ? s.wworld : s.world).challenger = -1;
    s.stats.candidatesWon++;
    notes.push('Wygrałeś Turniej Pretendentów! Zagrasz mecz o mistrzostwo świata.');
  }
  if (def.special === 'mpsemi' && !withdrew && place <= 6) {
    s.mp.qualifiedYear = Math.floor(s.week / 52);
    notes.push('Awans do finału Mistrzostw Polski!');
  }
  if (def.special === 'mpfinal' && !withdrew && place === 1) {
    s.mp.titles++;
    notes.push(def.women ? 'Zostajesz Mistrzynią Polski!' : 'Zostajesz Mistrzem Polski!');
  }
  if (def.special === 'cup' && !withdrew && place <= 3) {
    (def.women ? s.wworld : s.world).qualified = true;
    notes.push('Awans do Turnieju Pretendentów (top 3 Pucharu Świata)!');
  }
  if (def.league) {
    // mecz ligowy: ryczałt zamiast nagrody; punkty zbierane na koniec sezonu
    const l = (s.leagues[def.league] ??= { played: 0, points: 0 });
    l.played += n;
    l.points += score;
    run.league = def.league;
    run.place = 0;
    place = 0;
    prize = withdrew ? 0 : def.prize;
  }
  run.prizeWon = prize;
  P.money += prize;

  // normy
  if (!withdrew) {
    if (def.norm && def.format !== 'blitz') {
      // wg regulaminu PZSzach: wynik rankingowy >= Rmin, min. liczba partii, min. 1/3 punktów;
      // rywale bez kategorii liczą się jako 1000; normę na mistrza można zdobyć tylko w turnieju międzynarodowym
      const plAvg = n ? run.games.reduce((a, g) => a + Math.max(1000, g.oppRating), 0) / n : 0;
      const plPerf = perfOf(plAvg, pct);
      const maxIdx = catIndex(def.norm);
      for (let i = 1; i <= maxIdx; i++) {
        const cat = catFor(CATEGORIES[i]!.id, P.gender);
        if (!cat.normPerf || !cat.normGames) continue;
        // masz już tę kategorię (lub wyższą) - kolejna norma nic nie daje
        if (polishIndex(P) >= catIndex(cat.id)) continue;
        if (def.format === 'rapid' && !['v', 'iv'].includes(cat.id)) continue;
        if (cat.id === 'm' && !def.fideNorm) continue;
        if (n >= cat.normGames && pct >= 1 / 3 && plPerf >= cat.normPerf) {
          P.norms[cat.id] = (P.norms[cat.id] ?? 0) + 1;
          notes.push(`Norma na: ${cat.name} (${P.norms[cat.id]}/${cat.central ? 2 : 1})`);
        }
      }
    }
    const tryFide = (key: 'IM' | 'GM' | 'WIM' | 'WGM') => {
      const fn = FIDE_NORM[key];
      if (catIndex(P.category) >= catIndex(fn.cat)) return;
      if (n >= fn.games && perfOf(avgOpp, pct) >= fn.perf && avgOpp >= fn.opp) {
        P.fideNorms[key]++;
        notes.push(`Norma ${key} (${P.fideNorms[key]}/${fn.need})!`);
      }
    };
    if (def.fideNorm === 'IM' || def.fideNorm === 'GM') {
      tryFide(def.fideNorm);
      if (P.gender === 'f') tryFide(def.fideNorm === 'IM' ? 'WIM' : 'WGM');
    } else if (def.fideNorm) {
      tryFide(def.fideNorm);
    }
  }
  const before = P.category;
  updateCategory(s);
  if (P.category !== before) {
    const nm = CATEGORY_BY_ID[P.category]!.name;
    notes.push(`Nowy tytuł/kategoria: ${nm}!`);
    log(s, `Awans: ${nm}.`);
    grantFor(s, P.category, notes);
  }
  run.notes = notes;
  if (notes.length) s.yearNews.push(`${run.name}: ${notes.join('; ')}`);
  s.stats.tournaments++;
  if (place === 1 && !withdrew) s.stats.tournamentsWon++;
  s.history.push({ week: s.week, format: run.format, name: run.name, place, field: run.fieldSize, score, rounds: run.rounds, ratingDelta: delta, prize, id: def.id, major: !!def.major });
  s.ratingLog.push([s.week, P.rating, P.rapid.rating, P.blitz.rating]);
  log(s, `${run.name}: ${score}/${n}, ${def.league ? 'mecz ligowy' : `miejsce ${place}/${run.fieldSize}`}, ranking ${delta >= 0 ? '+' : ''}${delta}${prize ? `, nagroda ${prize} zł` : ''}.`);
  run.status = 'done';
}

/** Nagrody za wyniki: stypendia sportowe za kategorie i tytuły. */
function grantFor(s: CareerState, cat: string, notes: string[]) {
  const T: Record<string, [string, number]> = {
    ii: ['Stypendium sportowe miasta', 20],
    i: ['Stypendium sportowe miasta', 30],
    k: ['Stypendium wojewódzkie', 50],
    m: ['Stypendium wojewódzkie', 70],
    wcm: ['Stypendium ministra sportu', 30],
    wfm: ['Stypendium ministra sportu', 50],
    cm: ['Stypendium ministra sportu', 40],
    wim: ['Stypendium ministra sportu', 90],
    fm: ['Stypendium ministra sportu', 70],
    wgm: ['Stypendium ministra sportu', 160],
    im: ['Stypendium ministra sportu', 120],
    gm: ['Stypendium ministra sportu', 250],
  };
  const t = T[cat];
  if (!t) return;
  const [name, perWeek] = t;
  const P = s.player;
  const ex = P.grants.find((g) => g.id === 'stypendium');
  if (ex && ex.perWeek >= perWeek) {
    ex.expires = s.week + 104;
    return;
  }
  P.grants = P.grants.filter((g) => g.id !== 'stypendium');
  P.grants.push({ id: 'stypendium', name, perWeek, expires: s.week + 104 });
  notes.push(`${name}: +${perWeek} zł tygodniowo!`);
  log(s, `${name}: +${perWeek} zł tygodniowo.`);
}

/** Czy polska kategoria (V-M) jest już zdobyta: komplet norm i ranking FIDE (liczony wg maksimum). */
function polishAchieved(P: PlayerState, id: string): boolean {
  const cf = catFor(id, P.gender);
  return (P.norms[id] ?? 0) >= (cf.central ? 2 : 1) && P.peak >= (cf.minFide ?? 0);
}

/**
 * Indeks najwyższej zdobytej polskiej kategorii. Polskie kategorie i tytuły FIDE to dwie osobne ścieżki:
 * tytuł CM/FM/IM/GM nie blokuje zbierania norm na kategorię kandydata i mistrza krajowego.
 */
function polishIndex(P: PlayerState): number {
  let best = 0;
  CATEGORIES.forEach((c, i) => {
    if (c.normPerf && polishAchieved(P, c.id) && i > best) best = i;
  });
  return best;
}

export interface TitleRow {
  id: string;
  name: string;
  kind: 'polish' | 'fide';
  achieved: boolean;
  /** opis wymagań i postępu */
  detail: string;
}

/** Stan wszystkich kategorii i tytułów (polskich i FIDE), niezależny od tego, który jest "najwyższy". */
export function categoryStatus(s: CareerState): TitleRow[] {
  const P = s.player;
  const rows: TitleRow[] = [];
  for (const c0 of CATEGORIES.filter((x) => x.normPerf)) {
    const c = catFor(c0.id, P.gender);
    const need = c.central ? 2 : 1;
    const have = P.norms[c.id] ?? 0;
    const parts = [`wynik rankingowy ${c.normPerf}+ w ${c.normGames}+ partiach (min. 1/3 pkt)`, `norm ${Math.min(have, need)}/${need}`];
    if (c.minFide) parts.push(`ranking FIDE ${c.minFide}+ (max ${P.peak})`);
    if (c.id === 'm') parts.push('tylko turniej międzynarodowy');
    rows.push({ id: c.id, name: c.name, kind: 'polish', achieved: polishAchieved(P, c.id), detail: parts.join(', ') });
  }
  const female = P.gender === 'f';
  const byRating = (id: string, label: string): TitleRow => {
    const c = CATEGORY_BY_ID[id]!;
    return { id, name: label, kind: 'fide', achieved: P.peak >= c.rating, detail: `ranking ${c.rating}+ (max ${P.peak})` };
  };
  const byNorms = (id: 'IM' | 'GM' | 'WIM' | 'WGM', label: string): TitleRow => {
    const fn = FIDE_NORM[id];
    const have = P.fideNorms[id];
    return {
      id: fn.cat,
      name: label,
      kind: 'fide',
      achieved: P.peak >= fn.rating && have >= fn.need,
      detail: `ranking ${fn.rating}+ (max ${P.peak}), normy ${Math.min(have, fn.need)}/${fn.need} (perf. ${fn.perf}, średnia rywali ${fn.opp}+)`,
    };
  };
  if (female) rows.push(byRating('wcm', 'WCM (kandydatka na mistrzynię FIDE)'), byRating('wfm', 'WFM (mistrzyni FIDE kobiet)'));
  rows.push(byRating('cm', 'CM (kandydat na mistrza FIDE)'), byRating('fm', 'FM (mistrz FIDE)'));
  if (female) rows.push(byNorms('WIM', 'WIM (międzynarodowa mistrzyni)'));
  rows.push(byNorms('IM', 'IM (międzynarodowy mistrz)'));
  if (female) rows.push(byNorms('WGM', 'WGM (arcymistrzyni)'));
  rows.push(byNorms('GM', 'GM (arcymistrz)'));
  return rows;
}

export function updateCategory(s: CareerState) {
  const P = s.player;
  const female = P.gender === 'f';
  let best = catIndex(P.category);
  CATEGORIES.forEach((c, i) => {
    let ok = false;
    if (c.id === 'none') ok = true;
    else if (c.id === 'im') ok = P.rating >= c.rating && P.fideNorms.IM >= FIDE_NORM.IM.need;
    else if (c.id === 'gm') ok = P.rating >= c.rating && P.fideNorms.GM >= FIDE_NORM.GM.need;
    else if (c.id === 'wim') ok = female && P.rating >= FIDE_NORM.WIM.rating && P.fideNorms.WIM >= FIDE_NORM.WIM.need;
    else if (c.id === 'wgm') ok = female && P.rating >= FIDE_NORM.WGM.rating && P.fideNorms.WGM >= FIDE_NORM.WGM.need;
    else if (c.id === 'wcm' || c.id === 'wfm') ok = female && P.rating >= c.rating;
    else if (c.id === 'cm' || c.id === 'fm') ok = P.rating >= c.rating;
    else {
      const cf = catFor(c.id, P.gender);
      ok = (P.norms[c.id] ?? 0) >= (cf.central ? 2 : 1) && P.rating >= (cf.minFide ?? 0);
    }
    if (ok && i > best) best = i;
  });
  P.category = CATEGORIES[best]!.id;
}

// ---------- reducer ----------

function requireIdle(s: CareerState) {
  if (s.ended) throw new EngineError('Kariera zakończona');
  if (s.event) throw new EngineError('Najpierw rozstrzygnij wydarzenie');
  if (s.run) throw new EngineError('Trwa turniej');
}

export function step(prev: CareerState, action: Action): CareerState {
  // pula przeciwników jest duża i zmienia się tylko na koniec sezonu - kopiujemy ją wtedy
  const { pool, ...rest } = prev;
  const s: CareerState = { ...structuredClone(rest), pool };
  const rng = new Rng(s.rng);
  const P = s.player;
  const age = ageOf(s);
  const tf = clamp(chessTimeFactor(s) / 0.7, 0.4, 1.5);

  switch (action.type) {
    case 'train': {
      requireIdle(s);
      if (!SKILL_KEYS.includes(action.skill)) throw new EngineError('Zła umiejętność');
      const k = action.skill;
      const gain = 0.45 * learnMult(age) * coachMult(s, k) * fatigueFactor(P.fatigue) * Math.pow(Math.max(0.02, 1 - P.skills[k] / SKILL_MAX), 1.6) * rng.range(0.75, 1.25) * tf;
      addSkill(s, k, gain);
      addFatigue(s, 14);
      log(s, `Trening: ${SKILL_LABELS[k]} +${gain.toFixed(2)}.`);
      advanceWeek(s, rng);
      break;
    }
    case 'study': {
      requireIdle(s);
      const c = card(action.card);
      const m = s.cards[c.id]?.mastery ?? 0;
      const gain = 6.5 * Math.pow(1 - m / 100, 0.8) * learnMult(age) * coachMult(s, 'opening') * fatigueFactor(P.fatigue) * rng.range(0.8, 1.2) * tf;
      addMastery(s, c.id, gain);
      addFatigue(s, 12);
      log(s, `Studiujesz: ${c.name} (${Math.round(s.cards[c.id]!.mastery)}).`);
      advanceWeek(s, rng);
      break;
    }
    case 'analyze': {
      requireIdle(s);
      const entries = Object.entries(s.weak).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0)).slice(0, 2);
      if (entries.length === 0) {
        addSkill(s, 'calculation', 0.3);
        log(s, 'Analiza partii bez wielkich odkryć. Kalkulacja +0.3.');
      } else {
        for (const [k] of entries) {
          const g = 1.1 * learnMult(age) * rng.range(0.8, 1.2) * tf;
          addSkill(s, k as SkillKey, g);
          log(s, `Analiza porażek: ${SKILL_LABELS[k as SkillKey]} +${g.toFixed(2)}.`);
        }
        s.weak = {};
      }
      addFatigue(s, 8);
      advanceWeek(s, rng);
      break;
    }
    case 'rest': {
      requireIdle(s);
      P.fatigue = clamp(P.fatigue - 35, 0, 100);
      P.form = clamp(P.form + 1, -10, 10);
      log(s, 'Tydzień odpoczynku.');
      advanceWeek(s, rng);
      break;
    }
    case 'coach': {
      requireIdle(s);
      if (action.id === null) {
        P.coach = null;
      } else {
        const c = COACHES.find((x) => x.id === action.id);
        if (!c) throw new EngineError('Nie ma takiego trenera');
        if (P.rating < c.minRating) throw new EngineError('Za niski ranking na tego trenera');
        P.coach = c.id;
        log(s, `Nowy trener: ${c.name}.`);
      }
      break;
    }
    case 'staff': {
      requireIdle(s);
      const st = STAFF.find((x) => x.id === action.id);
      if (!st) throw new EngineError('Nie ma takiego członka zespołu');
      if (P.staff.includes(st.id)) {
        P.staff = P.staff.filter((x) => x !== st.id);
        log(s, `Zespół: rezygnujesz z usług (${st.name}).`);
      } else {
        if (P.rating < st.minRating) throw new EngineError(`Wymaga rankingu ${st.minRating}`);
        if (P.money < st.cost * 4) throw new EngineError(`Potrzebujesz zapasu ${st.cost * 4} zł (4 tygodnie pensji)`);
        P.staff.push(st.id);
        log(s, `Zespół: zatrudniasz (${st.name}).`);
      }
      break;
    }
    case 'enter': {
      requireIdle(s);
      const opt = tournamentOptions(s).find((o) => o.def.id === action.tournament);
      if (!opt) throw new EngineError('Nie ma takiego turnieju');
      if (!opt.ok) throw new EngineError(opt.reason ?? 'Niedostępny');
      validateSetup(action.setup);
      s.setup = structuredClone(action.setup);
      beginRun(s, opt.def, action.setup, rng);
      break;
    }
    case 'plan': {
      requireIdle(s);
      if (action.training.length > MAX_TRAIN_ITEMS) throw new EngineError(`Maksymalnie ${MAX_TRAIN_ITEMS} pozycje treningu`);
      for (const it of action.training) validateItem(it);
      const byId = new Map<string, PlannedTournament>();
      for (const t of action.tournaments) {
        if (!TOURNAMENT_BY_ID[t.id]) throw new EngineError('Nie ma takiego turnieju');
        if (!(t.times >= 0 && t.times <= 60)) throw new EngineError('Zła liczba startów');
        byId.set(t.id, { id: t.id, times: Math.floor(t.times) });
      }
      if (action.setup) {
        validateSetup(action.setup);
        s.setup = structuredClone(action.setup);
      }
      const year = Math.floor(s.week / 52);
      s.plan = { phase: action.phase ?? 'steady', year, training: structuredClone(action.training), tournaments: [...byId.values()].filter((t) => t.times > 0), done: s.plan.year === year ? s.plan.done : [], wanted: [...byId.values()].filter((t) => t.times > 0), stops: s.plan.year === year ? s.plan.stops : 0 };
      break;
    }
    case 'advance': {
      requireIdle(s);
      if (s.plan.year !== Math.floor(s.week / 52)) throw new EngineError('Najpierw zaplanuj rok');
      advanceYear(s, rng);
      break;
    }
    case 'continue': {
      const run = s.run;
      if (!run || run.status !== 'done') throw new EngineError('Turniej nie jest zakończony');
      s.run = null;
      advanceWeek(s, rng);
      if (!s.ended && !s.event && s.plan.year === Math.floor(s.week / 52)) advanceYear(s, rng);
      break;
    }
    case 'scout': {
      const run = s.run;
      if (!run || run.status !== 'prep' || !run.current) throw new EngineError('Brak rundy do skautingu');
      if (run.current.rushed) throw new EngineError('Druga partia dnia - brak czasu na przygotowanie');
      if (run.current.scouted) break;
      if (run.scouts <= 0) throw new EngineError('Brak punktów przygotowania w tym turnieju');
      run.scouts--;
      run.current.scouted = true;
      break;
    }
    case 'play': {
      const run = s.run;
      if (!run || run.status !== 'prep' || !run.current) throw new EngineError('Brak rundy do zagrania');
      playCurrent(s, run, action.setup, rng);
      break;
    }
    case 'skip': {
      const run = s.run;
      if (!run || run.status !== 'prep' || !run.current) throw new EngineError('Brak rundy do zagrania');
      if (run.current.important) throw new EngineError('To ważna runda - zagraj ją sam');
      while (run.status === 'prep' && run.current && !run.current.important) {
        playCurrent(s, run, undefined, rng);
        if (run.games.length >= run.rounds) {
          finalize(s, run, rng, false);
          break;
        }
        pairNext(s, run, rng);
      }
      break;
    }
    case 'next': {
      const run = s.run;
      if (!run || run.status !== 'result') throw new EngineError('Nie ma następnej rundy');
      if (run.games.length >= run.rounds) finalize(s, run, rng, false);
      else pairNext(s, run, rng);
      break;
    }
    case 'withdraw': {
      const run = s.run;
      if (!run || run.status === 'done') throw new EngineError('Brak turnieju');
      finalize(s, run, rng, true);
      break;
    }
    case 'close': {
      const run = s.run;
      if (!run || run.status !== 'done') throw new EngineError('Turniej nie jest zakończony');
      s.run = null;
      advanceWeek(s, rng);
      break;
    }
    case 'choose': {
      const ev = s.event ? EVENT_BY_ID[s.event.id] : undefined;
      if (!s.event || !ev) throw new EngineError('Brak wydarzenia do rozstrzygnięcia');
      const opt = ev.options[action.index];
      if (!opt) throw new EngineError('Zły wybór');
      log(s, `${ev.title}: ${opt.apply(s, rng)}`);
      s.event = null;
      // wydarzenie w środku zaplanowanego roku: po wyborze gra płynie dalej
      if (!s.ended && !s.run && s.plan.year === Math.floor(s.week / 52) && s.week % 52 !== 0) advanceYear(s, rng);
      break;
    }
    case 'retire': {
      if (s.run) throw new EngineError('Dokończ turniej');
      if (age < 20) throw new EngineError('Karierę można zakończyć dopiero od 20. roku życia');
      s.ended = true;
      s.endReason = 'Przechodzisz na szachową emeryturę.';
      break;
    }
    default:
      throw new EngineError('Nieznana akcja');
  }

  s.rng = rng.state;
  checkAchievements(s);
  return s;
}

function applyGameEffects(
  s: CareerState,
  run: TournamentRun,
  opp: Opponent,
  rep: GameReport,
  cardId: string | null,
  book: boolean,
  rng: Rng,
) {
  const P = s.player;
  const age = ageOf(s);
  const seen = (s.seen[opp.id] ??= { games: 0, cards: {} });
  seen.games++;
  const oppCard = rep.color === 'w' ? rep.blackCard : rep.whiteCard;
  if (oppCard) seen.cards[oppCard] = (seen.cards[oppCard] ?? 0) + 1;

  if (cardId) {
    const p = (s.cards[cardId] ??= { mastery: 0, peak: 0, games: 0, wins: 0, draws: 0, losses: 0, lastWeek: s.week });
    p.games++;
    if (rep.result === 1) p.wins++;
    else if (rep.result === 0.5) p.draws++;
    else p.losses++;
    addMastery(s, cardId, (rep.result === 0 ? 3.0 : 2.2) * Math.pow(1 - p.mastery / 100, 0.7) * 1.4);
  }
  // bilans z rywalem
  const rv = (s.rivals[opp.id] ??= { name: opp.name, w: 0, d: 0, l: 0, last: s.week });
  rv.name = opp.name;
  rv.last = s.week;
  if (rep.result === 1) rv.w++;
  else if (rep.result === 0.5) rv.d++;
  else {
    rv.l++;
    if (rv.l === 3 && rv.l - rv.w >= 2) log(s, `${opp.name} staje się Twoim nemezis (bilans ${rv.w}-${rv.d}-${rv.l}).`);
  }
  // statystyki kariery
  const col = rep.color === 'w' ? s.stats.white : s.stats.black;
  const fm = s.stats.byFormat[run.format];
  const idx = rep.result === 1 ? 0 : rep.result === 0.5 ? 1 : 2;
  col[idx]++;
  fm[idx]++;
  if (rep.result === 1) {
    s.stats.streak++;
    s.stats.bestStreak = Math.max(s.stats.bestStreak, s.stats.streak);
    s.stats.bestWin = Math.max(s.stats.bestWin, rep.oppRating);
  } else s.stats.streak = 0;
  // styl: ostre debiuty podbijają taktykę, spokojne - strategię
  if (cardId) {
    const sh = card(cardId).sharpness;
    addSkill(s, 'tactics', 0.012 * sh * learnMult(age));
    addSkill(s, 'strategy', 0.012 * (1 - sh) * learnMult(age));
  }
  // doświadczenie
  const exp = 0.012 * learnMult(age);
  for (const k of ['tactics', 'strategy', 'endgame', 'calculation', 'pressure'] as SkillKey[]) addSkill(s, k, exp);

  if (rep.result === 1) {
    s.stats.wins++;
    if (rep.surprise === 'opp-deviation') s.stats.surpriseWins++;
    if (rep.oppRating >= myRatingOf(P, run.format) + 200) s.stats.giantKills++;
    if (rep.edge >= 20 && book) s.stats.bookWins++;
    P.form = clamp(P.form + 1, -10, 10);
  } else if (rep.result === 0.5) {
    s.stats.draws++;
  } else {
    s.stats.losses++;
    if (rep.flagged) {
      s.stats.flagLosses++;
      s.weak.pressure = (s.weak.pressure ?? 0) + 2;
    } else {
      const map: Record<string, SkillKey | undefined> = { middlegame: rep.sharpness > 0.5 ? 'tactics' : 'strategy', calculation: 'calculation', endgame: 'endgame', mating: 'mating', time: 'pressure' };
      const k = map[rep.decider];
      if (k) s.weak[k] = (s.weak[k] ?? 0) + 1;
    }
    P.form = clamp(P.form - (1 - P.skills.pressure / 130), -10, 10);
  }
  // zmęczenie: klasyczne męczy, szybkie mało, blitz prawie wcale; dwie partie dziennie - po pierwszej dodatkowy zjazd
  const cur = run.current!;
  const extra = run.format === 'classical' && cur.size === 2 && cur.slot === 0 ? DOUBLE_DAY_EXTRA : 0;
  const inj = P.injury && s.week < P.injury.until ? P.injury : null;
  const add = FAT_PER_GAME[run.format] * (inj?.kind === 'back' ? 1 + 0.35 * inj.severity : 1) + extra;
  addFatigue(s, add);
  run.fat = clamp(run.fat + add, 0, 100);
  void rng;
}

// ---------- osiągnięcia ----------

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  check: (s: CareerState) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-win', name: 'Pierwsza wygrana', desc: 'Wygraj partię turniejową.', check: (s) => s.stats.wins >= 1 },
  { id: 'r1400', name: 'Powyżej 1400', desc: 'Osiągnij ranking 1400.', check: (s) => s.player.peak >= 1400 },
  { id: 'r1800', name: 'Powyżej 1800', desc: 'Osiągnij ranking 1800.', check: (s) => s.player.peak >= 1800 },
  { id: 'r2200', name: 'Mistrzowski poziom', desc: 'Osiągnij ranking 2200.', check: (s) => s.player.peak >= 2200 },
  { id: 'r2500', name: 'Arcymistrzowska siła', desc: 'Osiągnij ranking 2500.', check: (s) => s.player.peak >= 2500 },
  { id: 'win-tournament', name: 'Zwycięzca turnieju', desc: 'Wygraj turniej.', check: (s) => s.stats.tournamentsWon >= 1 },
  { id: 'master-card', name: 'Mistrz debiutu', desc: 'Doprowadź jeden debiut do 90 pkt.', check: (s) => Object.values(s.cards).some((c) => c.mastery >= 90) },
  { id: 'wide-rep', name: 'Szeroki repertuar', desc: 'Miej 8 debiutów na poziomie 40+.', check: (s) => Object.values(s.cards).filter((c) => c.mastery >= 40).length >= 8 },
  { id: 'surprise', name: 'Na siłę gry', desc: 'Wygraj, gdy rywal zaskoczył Cię debiutem.', check: (s) => s.stats.surpriseWins >= 1 },
  { id: 'giant', name: 'Pogromca gigantów', desc: 'Pokonaj rywala o 200+ pkt wyższego rankingu.', check: (s) => s.stats.giantKills >= 1 },
  { id: 'book', name: 'Teoria się opłaca', desc: 'Wygraj partię z przewagą debiutową 20+.', check: (s) => s.stats.bookWins >= 1 },
  { id: 'flag', name: 'Zegar nie wybacza', desc: 'Przegraj na czas.', check: (s) => s.stats.flagLosses >= 1 },
  { id: 'norm', name: 'Pierwsza norma', desc: 'Zdobądź normę na kategorię.', check: (s) => Object.values(s.player.norms).some((n) => n > 0) },
  { id: 'cat-k', name: 'Kandydat na mistrza', desc: 'Zdobądź kategorię K.', check: (s) => catIndex(s.player.category) >= catIndex('k') },
  { id: 'im', name: 'Międzynarodowy Mistrz', desc: 'Zdobądź tytuł IM.', check: (s) => catIndex(s.player.category) >= catIndex('im') },
  { id: 'gm', name: 'Arcymistrz', desc: 'Zdobądź tytuł GM.', check: (s) => catIndex(s.player.category) >= catIndex('gm') },
  { id: 'cup', name: 'Awans na Pretendentów', desc: 'Zajmij miejsce 1-3 w Pucharze Świata.', check: (s) => s.world.qualified || s.stats.candidatesWon > 0 || s.stats.wcPlayed > 0 },
  { id: 'cand', name: 'Pretendent do korony', desc: 'Wygraj Turniej Pretendentów.', check: (s) => s.stats.candidatesWon >= 1 },
  { id: 'wcmatch', name: 'Mecz o koronę', desc: 'Zagraj mecz o mistrzostwo świata.', check: (s) => s.stats.wcPlayed >= 1 },
  { id: 'wrapid', name: 'Mistrz świata w rapid', desc: 'Wygraj Mistrzostwa Świata w szachach szybkich.', check: (s) => s.history.some((h) => h.place === 1 && h.name.startsWith('Mistrzostwa Świata') && h.name.includes('szybkich')) },
  { id: 'wblitz', name: 'Mistrz świata w blitzu', desc: 'Wygraj Mistrzostwa Świata w szachach błyskawicznych.', check: (s) => s.history.some((h) => h.place === 1 && h.name.startsWith('Mistrzostwa Świata') && h.name.includes('błyskawicznych')) },
  { id: 'mp-title', name: 'Mistrz Polski', desc: 'Wygraj finał Mistrzostw Polski.', check: (s) => s.mp.titles >= 1 },
  { id: 'rival', name: 'Rywalizacja', desc: 'Zagraj z jednym rywalem co najmniej 6 razy.', check: (s) => Object.values(s.rivals).some((r) => r.w + r.d + r.l >= 6) },
  { id: 'world', name: 'Mistrz świata', desc: 'Zdobądź tytuł mistrza świata.', check: (s) => s.world.titles + s.wworld.titles >= 1 },
];

function checkAchievements(s: CareerState) {
  for (const a of ACHIEVEMENTS) {
    if (!s.achievements.includes(a.id) && a.check(s)) {
      s.achievements.push(a.id);
      log(s, `Osiągnięcie: ${a.name}!`);
    }
  }
}

export function careerScore(s: CareerState): number {
  const masters = Object.values(s.cards).filter((c) => c.mastery >= 90).length;
  const raw = s.player.peak + catIndex(s.player.category) * 25 + s.stats.tournamentsWon * 20 + masters * 15 + s.achievements.length * 5 + (s.world.titles + s.wworld.titles) * 400;
  return Math.round(raw * startDef(s.config.start).mult);
}

export function replay(config: CareerConfig, seed: string, actions: Action[]): CareerState {
  let s = createCareer(config, seed);
  for (const a of actions) s = step(s, a);
  return s;
}

export { CARDS };

/** Ogólna ocena zawodnika (OVR): średnia ośmiu statystyk, bez debiutów. */
export function ovrOf(skills: Record<SkillKey, number>): number {
  return Math.round(SKILL_KEYS.reduce((a, k) => a + skills[k], 0) / SKILL_KEYS.length);
}
