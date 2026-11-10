import type { Format, Gender } from '../model';
import { CITIES } from './cities';
import { EXTRA_TOURNAMENTS } from './tournaments-extra';
import { WOMEN_TOURNAMENTS } from './tournaments-women';
import { SMALL_TOURNAMENTS } from './tournaments-small';
import { FAST_TOURNAMENTS } from './tournaments-fast';
import { ELITE_TOURNAMENTS } from './tournaments-elite';

export interface TournamentDef {
  id: string;
  name: string;
  blurb: string;
  format: Format;
  rounds: number;
  fieldSize: number;
  /** średni rating pola */
  level: number;
  spread: number;
  fee: number;
  prize: number;
  minRating: number;
  maxRating: number;
  /** dostępny gdy (week % period) < window */
  period: number;
  window: number;
  offset: number;
  maxAge?: number;
  minAge?: number;
  /** wymagana minimalna kategoria/tytuł (id z CATEGORIES) */
  minCat?: string;
  /** turniej klasyfikacyjny: można zdobyć normę na tę kategorię (id z CATEGORIES) */
  norm?: string;
  /** norma FIDE (IM/GM) */
  fideNorm?: 'IM' | 'GM' | 'WIM' | 'WGM';
  /** tylko dla zawodniczek */
  women?: boolean;
  /** turniej kołowy/zaproszeniowy */
  invite?: boolean;
  /** turniej drużynowy: wynik i nagroda dotyczą drużyny */
  team?: boolean;
  /** mecz ligowy: id ligi (punkty sezonowe, nagroda za sezon) */
  league?: string;
  /** specjalne zasady: kwalifikacja z Pucharu Świata, Turniej Pretendentów, mecz o mistrzostwo świata */
  special?: 'cup' | 'candidates' | 'wcmatch' | 'mpsemi' | 'mpfinal';
  /** ważny turniej (mistrzostwa, imprezy elitarne): gra zatrzymuje się na decydujących rundach */
  major?: boolean;
  /** minimalny poziom klubu (0..2) */
  minClub?: number;
}

const t = (d: TournamentDef): TournamentDef => d;

// Inspiracja typami turniejów z chessarbiter.com (kalendarz PL).
const BASE_TOURNAMENTS: TournamentDef[] = [
  t({ id: 'szkolna', norm: 'v', name: 'Liga Szkolna', blurb: 'Szybkie partie dzieciaków z całej gminy.', format: 'rapid', rounds: 6, fieldSize: 40, level: 900, spread: 160, fee: 0, prize: 40, minRating: 0, maxRating: 1300, period: 4, window: 2, offset: 0, maxAge: 17 }),
  t({ id: 'klub', norm: 'iv', name: 'Turniej klubowy', blurb: 'Wieczorny turniej w klubie. Dobre miejsce na pierwsze partie.', format: 'classical', rounds: 5, fieldSize: 20, level: 1000, spread: 170, fee: 0, prize: 80, minRating: 0, maxRating: 1400, period: 3, window: 1, offset: 0 }),
  t({ id: 'kategorie', norm: 'iii', name: 'Turniej o kategorie szachowe', blurb: 'Klasyfikacyjny - walka o kategorię.', format: 'classical', rounds: 7, fieldSize: 40, level: 1150, spread: 200, fee: 30, prize: 200, minRating: 0, maxRating: 1500, period: 6, window: 2, offset: 1 }),
  t({ id: 'mikolaj', norm: 'iv', name: 'Mikołajkowy Turniej Szachowy', blurb: 'Okolicznościowy, rodzinna atmosfera, szybkie partie.', format: 'rapid', rounds: 7, fieldSize: 50, level: 1200, spread: 300, fee: 20, prize: 250, minRating: 0, maxRating: 1900, period: 52, window: 2, offset: 48 }),
  t({ id: 'open1600', norm: 'iii', name: 'Open do 1600', blurb: 'Grupa rankingowa z ograniczeniem.', format: 'classical', rounds: 7, fieldSize: 60, level: 1350, spread: 190, fee: 60, prize: 600, minRating: 1000, maxRating: 1650, period: 5, window: 1, offset: 2 }),
  t({ id: 'blitz-kawiarnia', name: 'Blitz w kawiarni', blurb: 'Nocny maraton błyskawiczny. Zegar jest bezlitosny.', format: 'blitz', rounds: 9, fieldSize: 30, level: 1450, spread: 280, fee: 20, prize: 300, minRating: 0, maxRating: 9999, period: 4, window: 1, offset: 3 }),
  t({ id: 'niepodleglosc', name: 'Turniej Niepodległości', blurb: 'Okolicznościowy turniej szybki, często bez wpisowego.', format: 'rapid', rounds: 7, fieldSize: 60, level: 1500, spread: 300, fee: 0, prize: 450, minRating: 0, maxRating: 9999, period: 52, window: 2, offset: 44 }),
  t({ id: 'memorial', norm: 'i', name: 'Memoriał (klasyczny)', blurb: 'Lokalny memoriał z porządnym polem.', format: 'classical', rounds: 9, fieldSize: 70, level: 1650, spread: 230, fee: 100, prize: 1500, minRating: 1300, maxRating: 9999, period: 8, window: 1, offset: 4 }),
  t({ id: 'grandprix', name: 'Grand Prix regionu (rapid)', blurb: 'Cykl turniejów szybkich z punktacją.', format: 'rapid', rounds: 9, fieldSize: 80, level: 1800, spread: 260, fee: 80, prize: 1400, minRating: 1400, maxRating: 9999, period: 6, window: 1, offset: 3 }),
  t({ id: 'junior-talenty', name: 'Turniej Młodych Talentów', blurb: 'Dla juniorów, duże pieniądze od sponsora.', format: 'rapid', rounds: 9, fieldSize: 60, level: 1850, spread: 280, fee: 0, prize: 2500, minRating: 1500, maxRating: 9999, period: 26, window: 2, offset: 10, maxAge: 20 }),
  t({ id: 'tal-blitz', name: 'Wielki Blitz Open', blurb: 'Duży blitz z pulą nagród.', format: 'blitz', rounds: 11, fieldSize: 90, level: 1950, spread: 300, fee: 40, prize: 800, minRating: 1500, maxRating: 9999, period: 10, window: 1, offset: 6 }),
  t({ id: 'mistrzostwa-regionu', norm: 'k', name: 'Mistrzostwa Regionu', blurb: 'Klasyczne, solidne pole.', format: 'classical', rounds: 9, fieldSize: 60, level: 2000, spread: 220, fee: 120, prize: 3000, minRating: 1700, maxRating: 9999, period: 13, window: 1, offset: 7 }),
  t({ id: 'open-fide', norm: 'm', fideNorm: 'IM', name: 'Międzynarodowy Open (FIDE)', blurb: 'Silne pole z zagranicznymi mistrzami.', format: 'classical', rounds: 9, fieldSize: 120, level: 2200, spread: 260, fee: 200, prize: 8000, minRating: 1900, maxRating: 9999, period: 13, window: 1, offset: 4 }),
  t({ id: 'mp', special: 'mpfinal', major: true, minCat: 'k', fideNorm: 'IM', name: 'Mistrzostwa Polski mężczyzn (Warszawa, czerwiec)', blurb: 'Finał krajowy. Wstęp: awans z półfinałów albo ranking 2400+.', format: 'classical', rounds: 11, fieldSize: 64, level: 2400, spread: 150, fee: 0, prize: 20000, minRating: 2200, maxRating: 9999, period: 52, window: 1, offset: 24 }),
  t({ id: 'super', major: true, minCat: 'im', fideNorm: 'GM', invite: true, name: 'Superturniej (Londyn, grudzień)', blurb: 'Zaproszenie do elity, kołowy.', format: 'classical', rounds: 9, fieldSize: 10, level: 2650, spread: 80, fee: 0, prize: 60000, minRating: 2450, maxRating: 9999, period: 52, window: 1, offset: 48 }),
  t({ id: 'pretendentow', major: true, special: 'candidates', invite: true, name: 'Turniej Pretendentów (Toronto, kwiecień, lata parzyste)', blurb: 'Osiem osób: zakwalifikowani z Pucharu Świata i czołówka rankingu. Zwycięzca gra mecz o koronę mistrza świata.', format: 'classical', rounds: 14, fieldSize: 8, level: 2740, spread: 60, fee: 0, prize: 150000, minRating: 0, maxRating: 9999, period: 104, window: 1, offset: 66 }),
];

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Turnieje odbywają się raz w roku. "Serie" (dawniej co kilka tygodni) zamieniamy na osobne imprezy
 * w różnych miastach i terminach. Ligi zostają sezonem meczów.
 */
function expand(defs: TournamentDef[]): TournamentDef[] {
  const out: TournamentDef[] = [];
  for (const d of defs) {
    if (d.league || d.period >= 52) {
      out.push(d);
      continue;
    }
    const n = d.period <= 4 ? 6 : d.period <= 8 ? 4 : d.period <= 13 ? 3 : d.period <= 26 ? 2 : 1;
    const used = new Set<string>();
    for (let k = 0; k < n; k++) {
      let city = CITIES[(hash(d.id + k) + k * 7) % CITIES.length]!;
      while (used.has(city)) city = CITIES[(CITIES.indexOf(city) + 1) % CITIES.length]!;
      used.add(city);
      const offset = k === 0 ? d.offset : (d.offset + Math.round((52 * k) / n) + (hash(d.id + k) % 4)) % 52;
      out.push({ ...d, id: k === 0 ? d.id : `${d.id}~${k}`, name: `${d.name} - ${city}`, period: 52, offset });
    }
  }
  return out;
}

export const TOURNAMENTS: TournamentDef[] = expand([...BASE_TOURNAMENTS, ...EXTRA_TOURNAMENTS, ...WOMEN_TOURNAMENTS, ...SMALL_TOURNAMENTS, ...FAST_TOURNAMENTS, ...ELITE_TOURNAMENTS]);
export const TOURNAMENT_BY_ID: Record<string, TournamentDef> = Object.fromEntries(TOURNAMENTS.map((x) => [x.id, x]));

export interface CoachDef {
  id: string;
  name: string;
  cost: number;
  skills: string[] | 'all';
  openings: number;
  mult: number;
  minRating: number;
}

/**
 * Turnieje międzynarodowe: pole złożone z zawodników z całego świata. Wszystkie pozostałe turnieje
 * (mistrzostwa Polski, ligi, turnieje klubowe i szkolne, otwarte krajowe) gromadzą głównie Polaków.
 */
export const INTERNATIONAL_IDS = new Set([
  'freestyle', 'me-open', 'superbet', 'tal', 'dortmund', 'biel', 'grand-swiss', 'gct-final', 'champions-tour',
  'superbet-kobiet', 'grand-swiss-kobiet', 'wgp-final', 'me-juniorow', 'ms-juniorow', 'senior65', 'olimpiada',
  'gibraltar', 'tata-challengers', 'tata-masters', 'grenke', 'norway', 'gct-rapid', 'sinquefield', 'puchar-swiata',
  'mecz-swiata', 'rapid-open', 'blitz-open', 'titled-blitz', 'me-szybkie', 'me-blitz', 'ms-szybkie', 'ms-blitz',
  'showdown', 'me-kobiet-szybkie', 'ms-kobiet-szybkie', 'ms-kobiet-blitz', 'gp-kobiet-rapid', 'ms-juniorek',
  'olimpiada-kobiet', 'mswiata-kobiet', 'puchar-swiata-kobiet', 'mecz-swiata-kobiet', 'open-fide', 'super',
  'pretendentow', 'tal-blitz',
]);

export interface StaffDef {
  id: string;
  name: string;
  cost: number;
  minRating: number;
  desc: string;
}

/** Zespół wokół zawodnika: dostępny dopiero na wysokim poziomie, kosztuje co tydzień. */
export const STAFF: StaffDef[] = [
  { id: 'fizjo', name: 'Fizjoterapeuta', cost: 60, minRating: 2000, desc: 'Kontuzje zdarzają się 2,5 razy rzadziej i krócej trwają; szybsza regeneracja po partiach.' },
  { id: 'sekundant', name: 'Sekundant debiutowy', cost: 90, minRating: 2200, desc: 'Lepsze przygotowanie pod rywala (+2 punkty przygotowania w turnieju), przewaga debiutowa większa o 15%, szybsza nauka debiutów.' },
  { id: 'analityk', name: 'Analityk komputerowy', cost: 140, minRating: 2400, desc: 'Taktyka i kalkulacja rosną o 15% szybciej, +1 punkt przygotowania w turnieju.' },
];
export const STAFF_BY_ID: Record<string, StaffDef> = Object.fromEntries(STAFF.map((x) => [x.id, x]));

export const COACHES: CoachDef[] = [
  { id: 'klubowy', name: 'Trener klubowy', cost: 25, skills: 'all', openings: 1.1, mult: 1.12, minRating: 0 },
  { id: 'taktyk', name: 'Trener taktyki', cost: 45, skills: ['tactics', 'calculation', 'mating'], openings: 1.0, mult: 1.35, minRating: 1000 },
  { id: 'pozycyjny', name: 'Trener strategii i końcówek', cost: 45, skills: ['strategy', 'endgame', 'pressure'], openings: 1.0, mult: 1.35, minRating: 1000 },
  { id: 'psycholog', name: 'Trener mentalny', cost: 50, skills: ['pressure', 'stamina'], openings: 1.0, mult: 1.35, minRating: 1300 },
  { id: 'arcymistrz', name: 'Arcymistrz-trener', cost: 180, skills: 'all', openings: 1.4, mult: 1.35, minRating: 1900 },
];

export interface CategoryDef {
  id: string;
  name: string;
  /** punktacja rankingowa kategorii (mężczyźni, regulamin klasyfikacyjny PZSzach) */
  rating: number;
  /** norma rankingowa Rmin: wymagany wynik rankingowy (performance) w turnieju */
  normPerf?: number;
  /** minimalna liczba partii normy */
  normGames?: number;
  /** kategoria centralna: wymaga wielokrotnej normy (min. 17 partii łącznie) */
  central?: boolean;
  /** minimalny ranking FIDE (kandydat 2100, mistrz 2300) */
  minFide?: number;
}

// Źródło: Regulamin Klasyfikacyjny PZSzach 2025 (tabele 1 i 3), kolumna mężczyźni.
// Wymagane też min. 1/3 punktów w turnieju. Normę na mistrza można zdobyć tylko w turnieju międzynarodowym/FIDE.
export const CATEGORIES: CategoryDef[] = [
  { id: 'none', name: 'Bez kategorii', rating: 1000 },
  { id: 'v', name: 'V kategoria', rating: 1200, normPerf: 1050, normGames: 5 },
  { id: 'iv', name: 'IV kategoria', rating: 1400, normPerf: 1300, normGames: 5 },
  { id: 'iii', name: 'III kategoria', rating: 1600, normPerf: 1550, normGames: 7 },
  { id: 'ii', name: 'II kategoria', rating: 1800, normPerf: 1800, normGames: 7 },
  { id: 'i', name: 'I kategoria', rating: 2000, normPerf: 2000, normGames: 9, central: true },
  { id: 'k', name: 'Kandydat na mistrza', rating: 2200, normPerf: 2200, normGames: 9, central: true, minFide: 2100 },
  { id: 'm', name: 'Mistrz krajowy', rating: 2400, normPerf: 2400, normGames: 9, central: true, minFide: 2300 },
  { id: 'wcm', name: 'WCM (FIDE kobiet)', rating: 2000 },
  { id: 'wfm', name: 'WFM (FIDE kobiet)', rating: 2100 },
  { id: 'cm', name: 'CM (FIDE)', rating: 2200 },
  { id: 'wim', name: 'WIM (FIDE kobiet)', rating: 2200 },
  { id: 'fm', name: 'FM (FIDE)', rating: 2300 },
  { id: 'wgm', name: 'WGM (FIDE kobiet)', rating: 2300 },
  { id: 'im', name: 'IM (FIDE)', rating: 2400 },
  { id: 'gm', name: 'GM (FIDE)', rating: 2500 },
];
export const CATEGORY_BY_ID: Record<string, CategoryDef> = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
export function catIndex(id: string): number {
  return CATEGORIES.findIndex((c) => c.id === id);
}

/** Normy FIDE: wymagany performance i średnia rywali. IM: 2450/2230, GM: 2600/2380; 9+ partii. */
export const FIDE_NORM = {
  IM: { perf: 2450, opp: 2230, games: 9, need: 3, rating: 2400, cat: 'im' },
  GM: { perf: 2600, opp: 2380, games: 9, need: 3, rating: 2500, cat: 'gm' },
  WIM: { perf: 2250, opp: 2030, games: 9, need: 3, rating: 2200, cat: 'wim' },
  WGM: { perf: 2400, opp: 2130, games: 9, need: 3, rating: 2300, cat: 'wgm' },
} as const;

/** Progi polskich kategorii dla kobiet (Regulamin Klasyfikacyjny PZSzach, tabele 1 i 3). */
const WOMEN: Record<string, Partial<CategoryDef>> = {
  v: { rating: 1100, normPerf: 1000 },
  iv: { rating: 1250, normPerf: 1150 },
  iii: { rating: 1400, normPerf: 1350, normGames: 5 },
  ii: { rating: 1600, normPerf: 1600 },
  i: { rating: 1800, normPerf: 1800, normGames: 7 },
  k: { rating: 2000, normPerf: 2000, minFide: 1900 },
  m: { rating: 2200, normPerf: 2200, minFide: 2100 },
};

export function catFor(id: string, gender: Gender): CategoryDef {
  const base = CATEGORY_BY_ID[id]!;
  return gender === 'f' && WOMEN[id] ? { ...base, ...WOMEN[id] } : base;
}

/**
 * Kategoria dla bramek wejścia do turniejów otwartych. Polskie kategorie kobiet mają niższe progi
 * rankingowe, więc liczą się jako kategoria męska o tej samej punktacji rankingowej; tytuły kobiece
 * (WCM...WGM) wg punktacji rankingowej. Dzięki temu turnieje open nie są otwierane "taniej" kobietom.
 */
export function effectiveCatIndex(id: string, gender: Gender): number {
  if (gender === 'm') return catIndex(id);
  const WTITLE: Record<string, number> = { wcm: 2000, wfm: 2100, wim: 2250, wgm: 2300 };
  const pts = WOMEN[id]?.rating ?? WTITLE[id];
  if (pts === undefined) return catIndex(id);
  let best = 0;
  CATEGORIES.forEach((c, i) => {
    if (c.id === 'none' || WTITLE[c.id] !== undefined || ['cm', 'fm', 'im', 'gm'].includes(c.id)) return;
    if (c.rating <= pts) best = i;
  });
  return best;
}
