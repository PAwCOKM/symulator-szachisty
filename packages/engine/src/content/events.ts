import type { CareerState, SkillKey } from '../model';
import { COACHES } from './tournaments';
import type { Rng } from '../rng';

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const skill = (s: CareerState, k: SkillKey, v: number) => {
  s.player.skills[k] = clamp(Math.round((s.player.skills[k] + v) * 100) / 100, 1, 100);
};
export const CLUB_NAMES = ['Klub lokalny', 'Klub ligowy', 'Klub ekstraligowy'];
import { CITIES } from './cities';
export { CITIES };
const CLUB_PREFIX: string[][] = [
  ['UKS Skoczek', 'SKSz Pionek', 'KSz Gambit'],
  ['MKS Hetman', 'KSz Wieża', 'KSz Roszada'],
  ['KSz Przekątna', 'KSz Debiut', 'KSz Mat'],
];
export function makeClubNames(city: string, pick: <T>(a: T[]) => T): string[] {
  return CLUB_PREFIX.map((p) => `${pick(p)} ${city}`);
}
export function clubName(p: { clubNames: string[] }, level: number): string {
  return p.clubNames[level] ?? CLUB_NAMES[level] ?? 'Klub';
}
const age = (s: CareerState) => s.player.startAge + Math.floor(s.week / 52);
const ageOf = age;

export interface EventOption {
  label: string;
  /** co dokładnie się stanie (pokazywane pod przyciskiem) */
  hint: string;
  /** zwraca tekst do kroniki */
  apply: (s: CareerState, rng: Rng) => string;
}
export interface GameEvent {
  id: string;
  title: string;
  text: string;
  once?: boolean;
  /** wydarzenie etapu życia - wyzwala się na początku sezonu */
  forced?: boolean;
  weight?: number;
  cond: (s: CareerState) => boolean;
  options: EventOption[];
}

const BASE_EVENTS: GameEvent[] = [
  {
    id: 'uraz',
    title: 'Dolegliwość',
    text: 'Dopada Cię dolegliwość, która utrudnia grę (szczegóły w nagłówku). Co robisz?',
    cond: () => false,
    options: [
      { label: 'Leczenie u specjalisty (−250 zł)', hint: '−250 zł; czas rekonwalescencji skrócony o połowę (jeśli stać Cię na leczenie)', apply: (s) => { const inj = s.player.injury; if (!inj) return 'Nic Ci nie dolega.'; if (s.player.money < 250) return 'Nie stać Cię na specjalistę - leczysz się domowymi sposobami.'; s.player.money -= 250; inj.until = s.week + Math.max(1, Math.ceil((inj.until - s.week) / 2)); return `Specjalista stawia Cię na nogi szybciej: ${inj.name}.`; } },
      { label: 'Odpoczywaj i czekaj', hint: 'Zmęczenie −10; kontuzja trwa swoje', apply: (s) => { s.player.fatigue = clamp(s.player.fatigue - 10, 0, 100); return 'Dajesz organizmowi czas.'; } },
      { label: 'Ignoruj ból i trenuj', hint: 'Kontuzja trwa o 30% dłużej; 35% szans na pogorszenie (ciężej)', apply: (s, rng) => { const inj = s.player.injury; if (!inj) return 'Nic Ci nie dolega.'; inj.until = s.week + Math.ceil((inj.until - s.week) * 1.3); if (rng.chance(0.35) && inj.severity < 3) { inj.severity = (inj.severity + 1) as 1 | 2 | 3; return 'Ból się nasila: kontuzja jest poważniejsza.'; } return 'Zaciskasz zęby.'; } },
    ],
  },
  {
    id: 'stypendium',
    title: 'Stypendium sportowe',
    text: 'Miasto proponuje stypendium za wyniki szachowe. Wymaga reprezentowania szkoły na zawodach.',
    once: true,
    cond: (s) => age(s) < 20 && s.player.peak >= 1400,
    options: [
      { label: 'Przyjmij (+25 zł tygodniowo przez 2 lata, więcej obowiązków)', hint: '+25 zł co tydzień przez 2 lata; zmęczenie +10 od razu', apply: (s) => { s.player.grants = s.player.grants.filter((g) => g.id !== 'stypendium'); s.player.grants.push({ id: 'stypendium', name: 'Stypendium miasta', perWeek: 25, expires: s.week + 104 }); s.player.fatigue = clamp(s.player.fatigue + 10, 0, 100); return 'Przyjmujesz stypendium sportowe: +25 zł tygodniowo.'; } },
      { label: 'Odmów (więcej czasu na naukę)', hint: 'Strategia +0,6; bez dochodu', apply: (s) => { skill(s, 'strategy', 0.6); return 'Odmawiasz stypendium i skupiasz się na grze.'; } },
    ],
  },
  {
    id: 'kontuzja',
    title: 'Przemęczenie',
    text: 'Czujesz, że organizm odmawia posłuszeństwa. Ból głowy, koszmarne partie w głowie.',
    weight: 2,
    cond: (s) => s.player.fatigue > 65,
    options: [
      { label: 'Zrób tydzień przerwy', hint: 'Zmęczenie −40, forma +1', apply: (s) => { s.player.fatigue = clamp(s.player.fatigue - 40, 0, 100); s.player.form = clamp(s.player.form + 1, -10, 10); return 'Odpoczywasz i wracasz świeży.'; } },
      { label: 'Graj dalej (ryzyko spadku formy)', hint: '60% szans na spadek formy o 3; zmęczenie zostaje', apply: (s, rng) => { if (rng.chance(0.6)) { s.player.form = clamp(s.player.form - 3, -10, 10); return 'Wciskasz się w turnieje i forma spada.'; } return 'Zacisnąłeś zęby i udało się.'; } },
    ],
  },
  {
    id: 'zmiana-klubu',
    title: 'Oferta od silniejszego klubu',
    text: 'Klub z wyższej ligi proponuje Ci grę w barwach. Lepsze mecze, ale wymagania i większa konkurencja.',
    once: true,
    cond: (s) => s.player.club < 2 && s.player.rating >= (s.player.club === 0 ? 1500 : 2000),
    options: [
      { label: 'Przejdź do nowego klubu (premia 300 zł + kontrakt)', hint: '+300 zł premii; kontrakt 45 zł/tydz. (klub ligowy) lub 140 zł/tydz. (ekstraliga) przez 2 lata; otwiera wyższe ligi', apply: (s) => { s.player.club += 1; s.player.money += 300; const pw = [0, 45, 140][s.player.club] ?? 0; s.player.grants = s.player.grants.filter((g) => g.id !== 'kontrakt'); if (pw) s.player.grants.push({ id: 'kontrakt', name: `Kontrakt: ${clubName(s.player, s.player.club)}`, perWeek: pw, expires: s.week + 104 }); return `Zmieniasz barwy: ${clubName(s.player, s.player.club)}.`; } },
      { label: 'Zostań lojalny', hint: 'Forma +1; zostajesz w obecnym klubie (bez wyższych lig)', apply: (s) => { s.player.form = clamp(s.player.form + 1, -10, 10); return 'Zostajesz w swoim klubie. Kibice są zadowoleni.'; } },
    ],
  },
  {
    id: 'sponsor',
    title: 'Sponsor lokalnej firmy',
    text: 'Lokalna firma chce Cię sponsorować w zamian za logo i udział w kilku wydarzeniach.',
    once: true,
    cond: (s) => s.player.rating >= 1700,
    options: [
      { label: 'Podpisz umowę (+800 zł, mniej spokoju)', hint: '+800 zł jednorazowo; forma −1', apply: (s) => { s.player.money += 800; s.player.form = clamp(s.player.form - 1, -10, 10); return 'Sponsor wpłaca 800 zł.'; } },
      { label: 'Odmów', hint: 'Nic się nie zmienia', apply: () => 'Odmawiasz sponsoringu.' },
    ],
  },
  {
    id: 'oboz',
    title: 'Obóz szkoleniowy',
    text: 'Zaproszenie na tygodniowy obóz z doświadczonym trenerem. Kosztuje, ale daje sporo.',
    cond: (s) => age(s) < 22 && s.player.rating >= 1300 && s.player.money >= 100,
    options: [
      { label: 'Jedź (-100 zł, +umiejętności)', hint: '−100 zł; 2 losowe umiejętności z taktyki, strategii, końcówek i kalkulacji +1,2; zmęczenie +12', apply: (s, rng) => { s.player.money -= 100; const ks: SkillKey[] = ['tactics', 'strategy', 'endgame', 'calculation']; for (let i = 0; i < 2; i++) skill(s, rng.pick(ks), 1.2); s.player.fatigue = clamp(s.player.fatigue + 12, 0, 100); return 'Wracasz z obozu: kilka nowych pomysłów w głowie.'; } },
      { label: 'Nie jedź', hint: 'Nic się nie zmienia', apply: () => 'Rezygnujesz z obozu.' },
    ],
  },
  {
    id: 'klasowka',
    title: 'Klasówka kontra turniej',
    text: 'Duży sprawdzian w szkole przypada na twój trening. Rodzice patrzą na oceny.',
    weight: 0.7,
    cond: (s) => age(s) < 18,
    options: [
      { label: 'Ucz się do klasówki', hint: '+40 zł kieszonkowego; zmęczenie −8', apply: (s) => { s.player.money += 40; s.player.fatigue = clamp(s.player.fatigue - 8, 0, 100); return 'Dobra ocena, rodzice dorzucają kieszonkowe (+40 zł).'; } },
      { label: 'Trenuj szachy', hint: 'Kalkulacja +0,8; forma −1', apply: (s) => { skill(s, 'calculation', 0.8); s.player.money -= 0; s.player.form = clamp(s.player.form - 1, -10, 10); return 'Siedzisz nad szachami zamiast zeszytów.'; } },
    ],
  },
  {
    id: 'konflikt-trener',
    title: 'Konflikt z trenerem',
    text: 'Trener ma inne zdanie na temat Twojego repertuaru. Atmosfera gęstnieje.',
    cond: (s) => s.player.coach !== null,
    options: [
      { label: 'Przeprosić i pogodzić się', hint: 'Forma +1; trener zostaje', apply: (s) => { s.player.form = clamp(s.player.form + 1, -10, 10); return 'Zgoda buduje, współpraca trwa.'; } },
      { label: 'Zmienić trenera (zostajesz bez trenera)', hint: 'Tracisz obecnego trenera (jego premia do treningu); innego wybierzesz w planie roku', apply: (s) => { const c = COACHES.find((x) => x.id === s.player.coach); s.player.coach = null; return `Rozstajesz się z trenerem${c ? ` (${c.name})` : ''}.`; } },
    ],
  },
  {
    id: 'silnik',
    title: 'Silnik szachowy',
    text: 'Dostajesz do dyspozycji potężny silnik. Analizować z nim czy zaufać głowie?',
    once: true,
    cond: (s) => s.player.rating >= 1200,
    options: [
      { label: 'Analizuj z silnikiem', hint: 'Taktyka +1,2', apply: (s) => { skill(s, 'tactics', 1.2); return 'Silnik pokazuje Ci wiele taktycznych motywów.'; } },
      { label: 'Polegaj na własnej głowie (+kalkulacja)', hint: 'Kalkulacja +1,2', apply: (s) => { skill(s, 'calculation', 1.2); return 'Liczysz sam i czujesz, że to procentuje.'; } },
    ],
  },
  {
    id: 'wypalenie',
    title: 'Wypalenie',
    text: 'Po serii turniejów masz dość szachów. Pojawia się pytanie, czy to wszystko ma sens.',
    cond: (s) => s.player.fatigue > 80 && s.stats.losses > 20,
    options: [
      { label: 'Weź dłuższą przerwę', hint: 'Zmęczenie spada do 10, forma wraca do 0', apply: (s) => { s.player.fatigue = 10; s.player.form = 0; return 'Tydzień bez szachów w głowie. Wracasz z głodem gry.'; } },
      { label: 'Przeczekaj', hint: 'Forma −2', apply: (s) => { s.player.form = clamp(s.player.form - 2, -10, 10); return 'Zaciskasz zęby, ale radość z gry spada.'; } },
    ],
  },
  {
    id: 'zaproszenie',
    title: 'Zaproszenie do kadry',
    text: 'Selekcjoner proponuje udział w zgrupowaniu kadry wojewódzkiej.',
    once: true,
    cond: (s) => age(s) < 20 && s.player.rating >= 1600,
    options: [
      { label: 'Przyjmij', hint: 'Presja czasu i nerwy +2; zmęczenie +10', apply: (s) => { skill(s, 'pressure', 2.0); s.player.fatigue = clamp(s.player.fatigue + 10, 0, 100); return 'Zgrupowanie kadry: dobra szkoła rywalizacji.'; } },
      { label: 'Odmów', hint: 'Zmęczenie −5', apply: (s) => { s.player.fatigue = clamp(s.player.fatigue - 5, 0, 100); return 'Zostajesz przy swoim planie.'; } },
    ],
  },
  {
    id: 'ksiazka',
    title: 'Książka z debiutu',
    text: 'W antykwariacie trafiasz na rzadką monografię. Kosztuje 60 zł.',
    cond: (s) => s.player.money >= 60,
    options: [
      { label: 'Kup (-60 zł, +wiedza)', hint: '−60 zł; jeden losowy znany debiut +9 punktów znajomości', apply: (s, rng) => { s.player.money -= 60; const ids = Object.keys(s.cards); const id = rng.pick(ids); const p = s.cards[id]!; p.mastery = clamp(p.mastery + 9, 0, 100); p.peak = Math.max(p.peak, p.mastery); return 'Książka rozjaśnia kilka wariantów.'; } },
      { label: 'Odpuść', hint: 'Nic się nie zmienia', apply: () => 'Odkładasz książkę na półkę.' },
    ],
  },
  {
    id: 'kontrakt',
    title: 'Kontrakt klubowy',
    text: 'Klub proponuje Ci umowę: regularna pensja za grę w lidze i dbanie o wynik drużyny.',
    cond: (s) => s.player.club >= 1 && s.player.rating >= 1900 && ageOf(s) >= 16 && !s.player.grants.some((g) => g.id === 'kontrakt'),
    options: [
      { label: 'Podpisz kontrakt (pensja co tydzień przez 2 lata)', hint: 'Pensja 45 zł/tydz. (klub ligowy) lub 140 zł/tydz. (ekstraliga) przez 2 lata', apply: (s) => { const pw = s.player.club >= 2 ? 140 : 45; s.player.grants.push({ id: 'kontrakt', name: `Kontrakt: ${clubName(s.player, s.player.club)}`, perWeek: pw, expires: s.week + 104 }); return `Podpisujesz kontrakt: ${pw} zł tygodniowo.`; } },
      { label: 'Odmów (zachowasz swobodę)', hint: 'Forma +1; bez pensji', apply: (s) => { s.player.form = clamp(s.player.form + 1, -10, 10); return 'Zostajesz wolnym strzelcem.'; } },
    ],
  },
  {
    id: 'liceum',
    title: 'Wybór liceum',
    text: 'Kończysz szkołę podstawową. Wybierasz, jaki rodzaj nauki będzie towarzyszył szachom.',
    once: true,
    forced: true,
    cond: (s) => ageOf(s) >= 14 && ageOf(s) < 17,
    options: [
      { label: 'Klasa mistrzostwa sportowego (więcej czasu na szachy)', hint: 'Czas na szachy +20 pkt proc. (skuteczniejszy trening)', apply: (s) => { s.player.timeBonus = 0.2; return 'Idziesz do klasy sportowej - elastyczny plan i więcej czasu na trening.'; } },
      { label: 'Liceum ogólne (stabilniej, mniej czasu)', hint: 'Bez zmiany czasu na szachy; +100 zł', apply: (s) => { s.player.timeBonus = 0; s.player.money += 100; return 'Liceum ogólne. Szachy po lekcjach i w weekendy.'; } },
    ],
  },
  {
    id: 'studia',
    title: 'Co po maturze?',
    text: 'Kończysz szkołę. Czas wybrać, ile miejsca zostanie na szachy.',
    once: true,
    forced: true,
    cond: (s) => ageOf(s) >= 18 && ageOf(s) < 21,
    options: [
      { label: 'Studia dzienne (mało czasu na szachy)', hint: 'Czas na szachy −5 pkt proc.', apply: (s) => { s.player.timeBonus = -0.05; return 'Zaczynasz studia dzienne.'; } },
      { label: 'Studia zaoczne lub online (więcej czasu, bardziej męczące)', hint: 'Czas na szachy +15 pkt proc.; zmęczenie +8', apply: (s) => { s.player.timeBonus = 0.15; s.player.fatigue = clamp(s.player.fatigue + 8, 0, 100); return 'Studiujesz zaocznie i trenujesz więcej.'; } },
      { label: 'Rzucam studia, stawiam na szachy (dużo czasu, brak dochodu)', hint: 'Czas na szachy +30 pkt proc.; bez dochodu z pracy', apply: (s) => { s.player.timeBonus = 0.3; return 'Stawiasz wszystko na jedną kartę.'; } },
    ],
  },
  {
    id: 'praca',
    title: 'Kariera po studiach',
    text: 'Zaczyna się dorosłe życie. Praca zabiera czas, ale daje stabilność.',
    once: true,
    forced: true,
    cond: (s) => ageOf(s) >= 23 && ageOf(s) < 27,
    options: [
      { label: 'Pełny etat (stała pensja 45 zł/tydz., mało czasu na szachy)', hint: 'Pensja 45 zł/tydz.; czas na szachy −10 pkt proc.', apply: (s) => { s.player.timeBonus = -0.1; s.player.grants.push({ id: 'praca', name: 'Praca na etacie', perWeek: 45, expires: 99999 }); return 'Zaczynasz pracę na etacie.'; } },
      { label: 'Zawodowy szachista (dużo czasu, utrzymujesz się z turniejów)', hint: 'Czas na szachy +35 pkt proc.; brak stałej pensji', apply: (s) => { s.player.timeBonus = 0.35; return 'Zostajesz zawodowcem. Nie ma bezpiecznika.'; } },
      { label: 'Trener i instruktor (pensja 35 zł/tydz., wiedza rośnie)', hint: 'Pensja 35 zł/tydz.; czas na szachy +10 pkt proc.; Pamięć +1', apply: (s) => { s.player.timeBonus = 0.1; s.player.grants.push({ id: 'praca', name: 'Praca trenera', perWeek: 35, expires: 99999 }); skill(s, 'memory', 1); return 'Uczysz dzieciaki szachów i sam się rozwijasz.'; } },
    ],
  },
];

import { EXTRA_EVENTS } from './events-extra';
export const EVENTS: GameEvent[] = [...BASE_EVENTS, ...EXTRA_EVENTS];
export const EVENT_BY_ID: Record<string, GameEvent> = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
