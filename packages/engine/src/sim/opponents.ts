import { BLACK_CARDS, DEFENCES_BY_GROUP, WHITE_CARDS } from '../content/openings';
import { CATEGORIES } from '../content/tournaments';
import { GROUPS, SKILL_KEYS, SKILL_MAX, type Opponent, type SkillKey } from '../model';
import { ELO_PER_SKILL, estimateRating } from './game';
import type { Rng } from '../rng';
import { foreignName, polishShare } from './names';

const FIRST = ['Adam', 'Piotr', 'Michał', 'Jakub', 'Kacper', 'Szymon', 'Bartosz', 'Mateusz', 'Tomasz', 'Paweł', 'Krzysztof', 'Marcin', 'Łukasz', 'Filip', 'Antoni', 'Igor', 'Wojciech', 'Jan', 'Radosław', 'Maciej', 'Oskar', 'Hubert', 'Dawid', 'Karol', 'Franciszek', 'Aleksander', 'Nikodem', 'Stanisław', 'Zbigniew', 'Andrzej'];
const LAST = ['Kowalski', 'Nowak', 'Wiśniewski', 'Wójcik', 'Kamiński', 'Lewandowski', 'Zieliński', 'Szymański', 'Woźniak', 'Dąbrowski', 'Kozłowski', 'Jankowski', 'Mazur', 'Krawczyk', 'Piotrowski', 'Grabowski', 'Pawłowski', 'Michalski', 'Król', 'Wieczorek', 'Jabłoński', 'Wróbel', 'Majewski', 'Olszewski', 'Stępień', 'Malinowski', 'Jaworski', 'Adamczyk', 'Dudek', 'Zając', 'Sokołowski'];

const FIRST_F = ['Anna', 'Maria', 'Zofia', 'Julia', 'Hanna', 'Alicja', 'Natalia', 'Oliwia', 'Karolina', 'Magdalena', 'Aleksandra', 'Agnieszka', 'Weronika', 'Monika', 'Kinga', 'Iga', 'Paulina', 'Olga', 'Elżbieta', 'Marta', 'Dominika', 'Katarzyna'];
const LAST_F = ['Kowalska', 'Nowak', 'Wiśniewska', 'Wójcik', 'Kamińska', 'Lewandowska', 'Zielińska', 'Szymańska', 'Woźniak', 'Dąbrowska', 'Kozłowska', 'Jankowska', 'Mazur', 'Krawczyk', 'Piotrowska', 'Grabowska', 'Michalska', 'Król', 'Wieczorek', 'Jabłońska', 'Majewska', 'Olszewska', 'Stępień'];

/** Pasma siły zawodniczek: mniej graczek na szczycie. */
const BANDS_F: [number, number, number][] = [
  [700, 1000, 28],
  [1000, 1400, 34],
  [1400, 1800, 28],
  [1800, 2100, 18],
  [2100, 2300, 12],
  [2300, 2500, 7],
  [2500, 2600, 2],
];

const BANDS: [number, number, number][] = [
  [700, 1000, 80],
  [1000, 1400, 100],
  [1400, 1800, 90],
  [1800, 2100, 60],
  [2100, 2400, 45],
  [2400, 2500, 30],
  [2500, 2600, 45],
  [2600, 2700, 38],
  [2700, 2780, 15],
  [2780, 2840, 4],
];

export function titleFor(rating: number, female = false): string {
  let name = 'bez kat.';
  for (const c of CATEGORIES) {
    if (c.id === 'none') continue;
    if (!female && ['wcm', 'wfm', 'wim', 'wgm'].includes(c.id)) continue;
    if (rating >= c.rating + 40 && !['cm', 'fm', 'im', 'gm'].includes(c.id)) name = c.name.replace(' kategoria', '');
  }
  if (rating >= 2530) return 'GM';
  if (rating >= 2430) return 'IM';
  if (rating >= 2330) return 'FM';
  if (rating >= 2230) return 'CM';
  return name;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Realny sufit rankingu kobiet (jak 2950 u mężczyzn: pojedyncze 2500+, nikt nie dobija do 2600). */
const FEMALE_CAP = 2580;

/**
 * Rankingi w puli kobiet są zawyżone względem realnej siły (do +80 pkt na szczycie): mniejsza pula
 * i mniejsza głębia. W turniejach open, gdzie rywale grają pełną siłą, taka zawodniczka traci ranking.
 */
function femaleBoost(strength: number): number {
  return clamp(Math.round((strength - 1200) / 15), 0, 80) * (strength > 2200 ? 0.35 : 1);
}

function genOpponent(id: number, rating: number, rng: Rng, female = false): Opponent {
  const style = clamp(rng.normal(0, 0.55), -1, 1);
  const a = (rating - 300) / ELO_PER_SKILL;
  const n = (sd: number) => rng.normal(0, sd);
  const skills = {
    tactics: a + 9 * style + n(4),
    strategy: a - 9 * style + n(4),
    endgame: a + n(5),
    mating: a + n(5),
    calculation: a + 4 * style + n(4),
    pressure: a + n(7),
    memory: a + n(6),
    stamina: a + n(8),
  } as Record<SkillKey, number>;
  for (const k of SKILL_KEYS) skills[k] = clamp(Math.round(skills[k] * 10) / 10, 3, SKILL_MAX);

  const sharpPref = (s: number) => Math.exp(style * (s - 0.5) * 3);
  const white: Record<string, number> = {};
  const nW = 1 + (rating > 1300 ? 1 : 0) + rng.int(0, 1);
  const wc = [...WHITE_CARDS];
  for (let i = 0; i < nW && wc.length; i++) {
    const c = rng.weighted(wc, (x) => sharpPref(x.sharpness));
    white[c.id] = i === 0 ? 0.6 : 0.4 / Math.max(1, nW - 1);
    wc.splice(wc.indexOf(c), 1);
  }
  const black: Record<string, number> = {};
  for (const g of GROUPS) {
    const defs = [...DEFENCES_BY_GROUP[g]];
    const k = g === 'flank' ? 1 : rng.int(1, 2);
    for (let i = 0; i < k; i++) {
      const c = rng.weighted(defs, (x) => sharpPref(x.sharpness));
      black[c.id] = i === 0 ? 0.7 : 0.3;
      defs.splice(defs.indexOf(c), 1);
    }
  }
  const mastery: Record<string, number> = {};
  const base = clamp((rating - 500) / 22, 12, 96);
  for (const id2 of [...Object.keys(white), ...Object.keys(black)]) {
    mastery[id2] = clamp(Math.round(base + rng.normal(0, 9)), 10, 99);
  }
  const young = rating < 1400 ? rng.chance(0.6) : rating < 2300 ? rng.chance(0.2) : rng.chance(0.1);
  const age = young ? rng.int(8, 17) : rng.int(18, 62);
  // narodowość: w niższych kategoriach niemal sami Polacy, na szczycie głównie zawodnicy z zagranicy
  let fullName: string;
  let nat = 'POL';
  if (rng.chance(polishShare(rating))) {
    fullName = `${female ? rng.pick(FIRST_F) : rng.pick(FIRST)} ${female ? rng.pick(LAST_F) : rng.pick(LAST)}`;
  } else {
    const fn = foreignName(rng, female);
    fullName = fn.name;
    nat = fn.nat;
  }
  const boost = female ? Math.round(Math.min(femaleBoost(rating), Math.max(0, FEMALE_CAP - 20 - rating))) : 0;
  return {
    id,
    name: fullName,
    nat,
    ...(rating >= 2480 ? { natLocked: true } : {}),
    rating: Math.min(rating + boost, female ? FEMALE_CAP : 9999),
    rapid: boost + Math.max(600, estimateRating(skills, 'rapid') + Math.round(rng.normal(0, 40)) + (rating - estimateRating(skills))),
    blitz: boost + Math.max(600, estimateRating(skills, 'blitz') + Math.round(rng.normal(0, 55)) + (rating - estimateRating(skills))),
    title: titleFor(rating + boost, female),
    age,
    female,
    style,
    skills,
    white,
    black,
    mastery,
    deviation: Math.round((0.03 + 0.06 * rng.float()) * 1000) / 1000,
    prep: rating > 1700 ? Math.round(clamp((rating - 1600) / 1100, 0, 0.9) * 100) / 100 : 0,
  };
}

export function generatePool(rng: Rng): Opponent[] {
  const pool: Opponent[] = [];
  let id = 1;
  for (const [lo, hi, n] of BANDS) {
    for (let i = 0; i < n; i++) {
      const r = Math.round(lo + (hi - lo) * rng.float());
      pool.push(genOpponent(id++, r + Math.round(rng.normal(0, 30)), rng));
    }
  }
  for (const [lo, hi, n] of BANDS_F) {
    for (let i = 0; i < n; i++) {
      const r = Math.round(lo + (hi - lo) * rng.float());
      pool.push(genOpponent(id++, Math.min(r + Math.round(rng.normal(0, 30)), 2470), rng, true));
    }
  }
  return pool;
}

export function styleLabel(style: number): string {
  if (style > 0.35) return 'taktyk';
  if (style < -0.35) return 'pozycyjniak';
  return 'uniwersalny';
}

/** Dryf rankingów na koniec sezonu. */
export function driftPool(pool: Opponent[], rng: Rng): void {
  for (const o of pool) {
    o.age += 1;
    // polski zawodnik, który wchodzi do światowej czołówki, w większości okazuje się graczem z zagranicy (kadra krajowa jest niewielka)
    if (o.nat === 'POL' && !o.natLocked && o.rating >= 2480) {
      o.natLocked = true;
      if (rng.chance(0.7)) {
        const fn = foreignName(rng, o.female);
        o.name = fn.name;
        o.nat = fn.nat;
      }
    }
    let d = rng.normal(0, 22);
    if (o.age < 20) d += 45;
    else if (o.age < 26) d += 20;
    else if (o.age < 45) d += 5;
    else if (o.age > 55) d -= 15;
    // miękki sufit: im wyżej, tym mocniejszy powrót do średniej (bez twardego limitu)
    if (o.female) {
      if (o.rating > 2420) d -= (o.rating - 2420) * 0.35;
    } else if (o.rating > 2720) d -= (o.rating - 2720) * 0.25;
    const cap = o.female ? FEMALE_CAP : 2900;
    o.rating = clamp(Math.round(o.rating + d), 600, cap);
    o.title = titleFor(o.rating, o.female);
    o.rapid = clamp(Math.round(o.rapid + d + rng.normal(0, 15)), 600, cap);
    o.blitz = clamp(Math.round(o.blitz + d + rng.normal(0, 20)), 600, cap);
    for (const k of SKILL_KEYS) o.skills[k] = clamp(o.skills[k] + d / ELO_PER_SKILL, 3, SKILL_MAX);
    for (const k of Object.keys(o.mastery)) o.mastery[k] = clamp((o.mastery[k] ?? 10) + rng.normal(1, 1.5), 5, 99);
  }
}

export { BLACK_CARDS };
