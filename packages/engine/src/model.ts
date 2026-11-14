export const ENGINE_VERSION = 28;

/** Maksimum statystyki (0-100). Skala dawnych 112 pkt została przeliczona proporcjonalnie. */
export const SKILL_MAX = 100;
export const SKILL_SCALE = SKILL_MAX / 112;

export const SKILL_KEYS = [
  'tactics',
  'strategy',
  'endgame',
  'mating',
  'calculation',
  'pressure',
  'memory',
  'stamina',
] as const;
export type SkillKey = (typeof SKILL_KEYS)[number];

export const SKILL_LABELS: Record<SkillKey, string> = {
  tactics: 'Taktyka',
  strategy: 'Strategia',
  endgame: 'Końcówki',
  mating: 'Matowanie',
  calculation: 'Kalkulacja',
  pressure: 'Presja czasu i nerwy',
  memory: 'Pamięć',
  stamina: 'Kondycja',
};

export const SKILL_HINTS: Record<SkillKey, string> = {
  tactics: 'Kombinacje, widełki, ataki na króla. Kluczowe w ostrych debiutach.',
  strategy: 'Struktura pionowa, plany, przewaga pozycyjna. Kluczowa w spokojnych debiutach.',
  endgame: 'Techniki końcówek wieżowych, pionkowych i lekkofigurowych.',
  mating: 'Technika matowania i zamiany przewagi w punkt (H+K, 2W, gońce).',
  calculation: 'Głębokość i trafność liczenia wariantów. Pomaga też, gdy rywal zaskoczy debiutem.',
  pressure: 'Gospodarka zegarem, nerwy i odporność na presję. Im niższa, tym większa szansa przegranej na czas (zwłaszcza w rapidzie i blitzu), a rywal łatwiej Cię dociska. Pomaga też, gdy sam dociskasz zegar. Kto ma czas, ten ma na analizę.',
  memory: 'Szybkość uczenia się debiutów i wolniejsze zapominanie.',
  stamina: 'Kondycja: wolniej się męczysz w turniejach i treningu.',
};

export type Group = 'e4' | 'd4' | 'flank';
export const GROUPS: Group[] = ['e4', 'd4', 'flank'];
export const GROUP_LABELS: Record<Group, string> = {
  e4: '1.e4',
  d4: '1.d4',
  flank: 'Boczne (1.c4 / 1.Nf3)',
};
export type Side = 'w' | 'b';
export type Format = 'classical' | 'rapid' | 'blitz';
export const FORMAT_LABELS: Record<Format, string> = {
  classical: 'Klasyczne',
  rapid: 'Szybkie',
  blitz: 'Błyskawiczne',
};
export type Approach = 'solid' | 'normal' | 'sharp';
export type Tempo = 'steady' | 'push';
export const TEMPO_LABELS: Record<Tempo, string> = {
  steady: 'Spokojnie (własne tempo)',
  push: 'Wywieraj presję czasową (graj szybko)',
};
export const APPROACH_LABELS: Record<Approach, string> = {
  solid: 'Solidnie (więcej remisów)',
  normal: 'Normalnie',
  sharp: 'Ostro (na wygraną)',
};

export interface Card {
  id: string;
  name: string;
  side: Side;
  group: Group;
  /** 0 = spokojny/pozycyjny, 1 = ostry/taktyczny */
  sharpness: number;
  /** jak bardzo liczy się głębia znajomości teorii (0..1) */
  theory: number;
  /** mnożnik tempa nauki (mniej = trudniejszy) */
  difficulty: number;
  moves: string;
  blurb: string;
}

export interface Progress {
  mastery: number;
  peak: number;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  lastWeek: number;
}

export interface Opponent {
  id: number;
  name: string;
  /** ranking klasyczny */
  rating: number;
  rapid: number;
  blitz: number;
  title: string;
  age: number;
  /** -1 pozycyjny ... +1 taktyczny */
  style: number;
  skills: Record<SkillKey, number>;
  white: Record<string, number>;
  black: Record<string, number>;
  mastery: Record<string, number>;
  deviation: number;
  prep: number;
  female: boolean;
  /** kraj (kod: POL, USA, IND...) */
  nat: string;
  /** zawodnik już raz losował narodowość przy wejściu do czołówki: nie zmieniamy jej ponownie */
  natLocked?: boolean;
}

export type Gender = 'm' | 'f';

export interface CareerConfig {
  name: string;
  /** punkt startowy (id z STARTS); wpływa na start i mnożnik wyniku */
  start?: string;
  city?: string;
  gender?: Gender;
  archetype: 'tactician' | 'positional' | 'allround';
  startWhite: string;
}

export interface Setup {
  white: string;
  black: Record<Group, string | null>;
  approach: Approach;
  tempo?: Tempo;
  /** po skautingu: linia rywala, na którą głęboko się przygotowujesz (id karty debiutu rywala) */
  focus?: string | null;
}

export type Surprise = 'none' | 'opp-deviation' | 'unprepared';
export type Decider =
  | 'opening'
  | 'middlegame'
  | 'calculation'
  | 'endgame'
  | 'mating'
  | 'time'
  | 'balance';

export interface GameReport {
  round: number;
  oppId: number;
  oppName: string;
  oppRating: number;
  color: Side;
  whiteCard: string;
  blackCard: string | null;
  playerCard: string | null;
  surprise: Surprise;
  edge: number;
  sharpness: number;
  diff: number;
  pWin: number;
  pDraw: number;
  pLoss: number;
  result: 1 | 0.5 | 0;
  flagged: boolean;
  flagRisk: number;
  myTempo: Tempo;
  /** rywal dociskał Cię zegarem */
  oppPush: boolean;
  /** rywal przekroczył czas */
  oppFlagged: boolean;
  /** druga partia tego samego dnia / skrócone przygotowanie */
  rushed: boolean;
  myFatigue: number;
  oppFatigue: number;
  moves: number;
  decider: Decider;
  text: string[];
}

export interface RoundInfo {
  oppId: number;
  color: Side;
  scouted: boolean;
  important: boolean;
  reason: string;
  day: number;
  slot: number;
  size: number;
  rushed: boolean;
}

export interface TournamentRun {
  id: string;
  name: string;
  format: Format;
  rounds: number;
  fieldSize: number;
  level: number;
  spread: number;
  fee: number;
  prize: number;
  startRating: number;
  startWeek: number;
  games: GameReport[];
  used: number[];
  scouts: number;
  /** plan wybrany przed turniejem: obowiązuje w nieważnych rundach */
  setup: Setup;
  /** liczba rund w kolejnych dniach (klasyczne: 1-2 dziennie, szybkie i blitz: wszystko jednego dnia) */
  days: number[];
  /** zmęczenie turniejowe bazowe (przed skalowaniem kondycją) */
  fat: number;
  status: 'prep' | 'result' | 'done';
  current: RoundInfo | null;
  /** gra już zatrzymała się w tym turnieju (liczy się do rocznego limitu) */
  stopped?: boolean;
  /** z góry ustalona lista rywali (Turniej Pretendentów, mecz o tytuł) */
  fieldIds?: number[];
  place?: number;
  team?: boolean;
  league?: string;
  prizeWon?: number;
  ratingDelta?: number;
  notes?: string[];
}

export type TrainItem =
  | { kind: 'skill'; skill: SkillKey }
  | { kind: 'study'; card: string }
  | { kind: 'analyze' };

export interface PlannedTournament {
  id: string;
  /** ile razy w roku chcesz zagrać w tym turnieju (kolejne wystąpienia) */
  times: number;
}

/** Faza roku: przygotowawcza (więcej nauki, cięższe nogi w turniejach), standardowa, startowa (świeżość w turniejach, mniej nauki). */
export type Phase = 'steady' | 'build' | 'peak';

export interface Plan {
  phase: Phase;
  /** rok kariery, którego dotyczy plan */
  year: number;
  /** do 3 pozycji treningu, dzielą między siebie tygodniowy czas */
  training: TrainItem[];
  tournaments: PlannedTournament[];
  /** okna turniejów już rozegrane w tym roku */
  done: string[];
  /** pierwotnie zaplanowane starty (podpowiedź przy planowaniu kolejnego roku) */
  wanted: PlannedTournament[];
  /** ile razy w tym roku gra zatrzymała się na zwykłym (nie ważnym) turnieju */
  stops: number;
}

/** Cykl roku: wpływ fazy na tempo nauki, tygodniowe zmęczenie treningiem i siłę w partiach (punkty różnicy ratingowej). */
export const PHASE_FX: Record<Phase, { train: number; fatigue: number; game: number; label: string; desc: string }> = {
  steady: { train: 1, fatigue: 13, game: 0, label: 'Standardowa', desc: 'Bez modyfikatorów.' },
  build: { train: 1.2, fatigue: 16, game: -5, label: 'Przygotowawcza', desc: 'Nauka +20%, ale cięższe nogi: więcej zmęczenia po treningu i słabsza gra w partiach (-5 pkt rankingu).' },
  peak: { train: 0.85, fatigue: 10, game: 5, label: 'Startowa', desc: 'Nauka -15%, ale świeższa gra w partiach (+5 pkt rankingu) i mniej zmęczenia.' },
};

export function currentPhase(s: { plan: Plan; week: number }): Phase {
  return s.plan.year === Math.floor(s.week / 52) ? s.plan.phase : 'steady';
}

export interface YearBase {
  week: number;
  rating: [number, number, number];
  skills: Record<SkillKey, number>;
  money: number;
  tournaments: number;
}

export interface YearSummary {
  year: number;
  /** wszystkie turnieje roku (także rozegrane automatycznie) */
  results: HistoryEntry[];
  /** ważne zdarzenia: normy, kategorie, tytuły */
  news: string[];
  rating: [number, number, number];
  ratingDelta: [number, number, number];
  tournaments: number;
  skillGains: Partial<Record<SkillKey, number>>;
  money: number;
}

/** Rekord rankingu w historii tej gry. */
export interface RatingRecord {
  name: string;
  rating: number;
  /** rok gry (od 1) */
  year: number;
  isPlayer: boolean;
}

export interface Records {
  open: RatingRecord | null;
  women: RatingRecord | null;
}

export interface World {
  /** id panującego mistrza świata z puli (-1 = Ty) */
  champion: number;
  /** challenger z Turnieju Pretendentów w tym cyklu (-1 = Ty, null = jeszcze nie ustalony) */
  challenger: number | null;
  /** zakwalifikowałeś się do Turnieju Pretendentów (Puchar Świata, top 3) */
  qualified: boolean;
  /** ostatni rozstrzygnięty cykl dwuletni */
  cycle: number;
  titles: number;
  history: { year: number; champion: string; note: string }[];
}

export interface LogEntry {
  week: number;
  text: string;
}

export interface HistoryEntry {
  format: Format;
  week: number;
  name: string;
  place: number;
  field: number;
  score: number;
  rounds: number;
  ratingDelta: number;
  prize: number;
  id: string;
  major: boolean;
}

export interface Grant {
  id: string;
  name: string;
  perWeek: number;
  expires: number;
}

export interface FormatRating {
  rating: number;
  peak: number;
  games: number;
}

export interface PlayerState {
  name: string;
  startAge: number;
  skills: Record<SkillKey, number>;
  /** ranking klasyczny (kategorie i tytuły liczone z niego) */
  rating: number;
  peak: number;
  ratedGames: number;
  rapid: FormatRating;
  blitz: FormatRating;
  fatigue: number;
  form: number;
  money: number;
  coach: string | null;
  /** id z CATEGORIES */
  category: string;
  /** zdobyte normy (id kategorii -> liczba) */
  norms: Record<string, number>;
  fideNorms: { IM: number; GM: number; WIM: number; WGM: number };
  gender: Gender;
  /** poziom klubu: 0 lokalny, 1 ligowy, 2 ekstraligowy */
  club: number;
  city: string;
  /** nazwy klubów dla poziomów 0..2 */
  clubNames: string[];
  /** modyfikator czasu na szachy (szkoła/studia/praca) */
  timeBonus: number;
  grants: Grant[];
  /** brak jeszcze pierwszego rankingu (potrzeba 5 partii); pierwszy ranking = wynik z turnieju */
  unrated: { classical: boolean; rapid: boolean; blitz: boolean };
  /** aktualna kontuzja (null = zdrowy) */
  injury: Injury | null;
  /** zatrudniony zespół (sekundant, analityk, fizjoterapeuta) */
  staff: string[];
}

/** Rodzaj dolegliwości: każdy inaczej przeszkadza w szachach. */
export type InjuryKind = 'back' | 'eyes' | 'nerves' | 'illness';

export const INJURY_INFO: Record<InjuryKind, { label: string; desc: string; names: [string, string, string] }> = {
  back: { label: 'Kręgosłup', desc: 'Długie partie męczą bardziej: zmęczenie rośnie szybciej w turnieju i mocniej szkodzi grze.', names: ['Ból pleców od siedzenia', 'Rwa kulszowa', 'Dyskopatia (operacja)'] },
  eyes: { label: 'Wzrok i głowa', desc: 'Słabsza kalkulacja i taktyka: trudniej utrzymać koncentrację nad szachownicą.', names: ['Zmęczenie oczu i bóle głowy', 'Migreny', 'Poważne problemy ze wzrokiem'] },
  nerves: { label: 'Nerwy i sen', desc: 'Słabsza odporność na presję czasu i nerwy w ostrych momentach.', names: ['Bezsenność przed turniejami', 'Wypalenie nerwowe', 'Załamanie nerwowe'] },
  illness: { label: 'Choroba', desc: 'Ogólny spadek formy: słabsza gra w każdej fazie partii.', names: ['Przeziębienie', 'Zapalenie zatok', 'Ciężkie zapalenie płuc'] },
};

export interface Injury {
  name: string;
  kind: InjuryKind;
  /** do którego tygodnia trwa (wyłącznie) */
  until: number;
  /** 1 lekka, 2 średnia, 3 poważna (blokuje turnieje) */
  severity: 1 | 2 | 3;
}

/** Bilans z rywalem, z którym już grałeś. */
export interface Rival {
  name: string;
  w: number;
  d: number;
  l: number;
  last: number;
}

export interface MpState {
  /** awans z półfinałów do finału MP w danym roku (rok 0..) */
  qualifiedYear: number;
  titles: number;
}

export interface Stats {
  wins: number;
  draws: number;
  losses: number;
  flagLosses: number;
  surpriseWins: number;
  giantKills: number;
  tournamentsWon: number;
  tournaments: number;
  bookWins: number;
  candidatesWon: number;
  wcPlayed: number;
  /** [wygrane, remisy, porażki] białymi i czarnymi */
  white: [number, number, number];
  black: [number, number, number];
  /** wyniki wg formatu */
  byFormat: Record<Format, [number, number, number]>;
  /** ranking najsilniejszego pokonanego rywala */
  bestWin: number;
  streak: number;
  bestStreak: number;
}

export interface CareerState {
  version: number;
  seed: string;
  config: CareerConfig;
  week: number;
  rng: [number, number, number, number];
  player: PlayerState;
  cards: Record<string, Progress>;
  setup: Setup;
  pool: Opponent[];
  seen: Record<number, { games: number; cards: Record<string, number> }>;
  run: TournamentRun | null;
  weak: Partial<Record<SkillKey, number>>;
  log: LogEntry[];
  history: HistoryEntry[];
  /** [tydzień, klasyczny, szybki, błyskawiczny] */
  ratingLog: [number, number, number, number][];
  plan: Plan;
  yearBase: YearBase;
  yearSummary: YearSummary | null;
  yearNews: string[];
  world: World;
  /** osobna droga do tytułu mistrzyni świata (pula zawodniczek) */
  wworld: World;
  achievements: string[];
  /** oczekujące wydarzenie z wyborem */
  event: { id: string } | null;
  eventsSeen: string[];
  /** rekordy rankingu w tej grze (świat open i kobiet) */
  records: Records;
  /** bilans z rywalami */
  rivals: Record<number, Rival>;
  mp: MpState;
  /** ostatnio pokazane wydarzenia z wyborem (żeby się nie powtarzały) */
  recentEvents: string[];
  /** statystyki sezonu ligowego */
  leagues: Record<string, { played: number; points: number }>;
  stats: Stats;
  ended: boolean;
  endReason?: string;
}

export type Action =
  | { type: 'train'; skill: SkillKey }
  | { type: 'study'; card: string }
  | { type: 'analyze' }
  | { type: 'rest' }
  | { type: 'coach'; id: string | null }
  | { type: 'staff'; id: string }
  | { type: 'enter'; tournament: string; setup: Setup }
  | { type: 'plan'; training: TrainItem[]; tournaments: PlannedTournament[]; setup?: Setup; phase?: Phase }
  | { type: 'advance' }
  | { type: 'continue' }
  | { type: 'scout' }
  | { type: 'play'; setup?: Setup }
  | { type: 'skip' }
  | { type: 'next' }
  | { type: 'withdraw' }
  | { type: 'close' }
  | { type: 'choose'; index: number }
  | { type: 'retire' };

export class EngineError extends Error {}
