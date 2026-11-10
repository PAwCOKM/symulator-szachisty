import { card, CARD_BY_ID } from './content/openings';
import { styleLabel } from './sim/opponents';
import { oppPushChance, oppRatingOf } from './sim/game';
import type { CareerState, Opponent } from './model';

export interface RepLine {
  id: string;
  name: string;
  group: string;
  pct: number;
}

export interface OpponentView {
  opp: Pick<Opponent, 'id' | 'name' | 'rating' | 'title' | 'age' | 'nat'> & { style: string };
  /** ranking rywala w formacie trwającego turnieju (klasyczny, jeśli brak turnieju) */
  fmtRating: number;
  /** pełny repertuar - dostępny po skautingu */
  exact: { white: RepLine[]; black: RepLine[]; deviation: number; pushChance: number; pressure: number } | null;
  /** to, co widziałeś w partiach z tym rywalem (pct = liczba razy) */
  observed: RepLine[];
  games: number;
  rumor: string;
  /** bilans Twoich dotychczasowych partii z tym rywalem */
  h2h: { w: number; d: number; l: number; nemesis: boolean } | null;
}

function hash(n: number): number {
  let x = (n * 2654435761) >>> 0;
  x ^= x >>> 15;
  return (Math.imul(x, 2246822519) >>> 0) / 4294967296;
}

export interface ReignRow {
  name: string;
  /** ile meczów o tytuł z rzędu rozstrzygnięto na jego korzyść */
  matches: number;
  /** orientacyjnie lata panowania (mecz co 2 lata) */
  years: number;
  since: number;
}

/** Panowania mistrzów wyliczone z historii tytułu (kolejne wpisy tego samego mistrza). */
export function reigns(history: { year: number; champion: string }[]): ReignRow[] {
  const out: ReignRow[] = [];
  for (const h of history) {
    const last = out[out.length - 1];
    if (last && last.name === h.champion) {
      last.matches++;
      last.years = last.matches * 2;
    } else out.push({ name: h.champion, matches: 1, years: 2, since: h.year });
  }
  return out;
}

export function opponentView(s: CareerState, oppId: number, scouted: boolean): OpponentView {
  const o = s.pool.find((x) => x.id === oppId)!;
  const seen = s.seen[oppId];
  const lines = (m: Record<string, number>, byGroup: boolean): RepLine[] =>
    Object.entries(m)
      .map(([id, w]) => {
        const c = card(id);
        const t = Object.entries(m)
          .filter(([k]) => !byGroup || CARD_BY_ID[k]!.group === c.group)
          .reduce((a, [, v]) => a + v, 0) || 1;
        return { id, name: c.name, group: c.group, pct: Math.round((w / t) * 100) };
      })
      .sort((a, b) => b.pct - a.pct);
  const observed: RepLine[] = seen
    ? Object.entries(seen.cards).map(([id, n]) => ({ id, name: card(id).name, group: card(id).group, pct: n }))
    : [];
  const groupsW: Record<string, number> = {};
  for (const [id, w] of Object.entries(o.white)) groupsW[card(id).group] = (groupsW[card(id).group] ?? 0) + w;
  const top = Object.entries(groupsW).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'e4';
  const gs = ['e4', 'd4', 'flank'];
  const rumorGroup = hash(oppId + s.week) < 0.7 ? top : gs[Math.floor(hash(oppId * 7 + 3) * 3)]!;
  return {
    opp: { id: o.id, name: o.name, rating: o.rating, title: o.title, age: o.age, nat: o.nat, style: styleLabel(o.style) },
    fmtRating: s.run ? oppRatingOf(o, s.run.format) : o.rating,
    exact: scouted ? { white: lines(o.white, false), black: lines(o.black, true), deviation: o.deviation, pushChance: oppPushChance(o), pressure: o.skills.pressure } : null,
    observed,
    games: seen?.games ?? 0,
    h2h: s.rivals[oppId] ? { w: s.rivals[oppId]!.w, d: s.rivals[oppId]!.d, l: s.rivals[oppId]!.l, nemesis: s.rivals[oppId]!.l - s.rivals[oppId]!.w >= 2 && s.rivals[oppId]!.l >= 3 } : null,
    rumor: `Podobno białymi lubi zaczynać ${rumorGroup === 'flank' ? 'bocznie (c4/Nf3)' : '1.' + rumorGroup}. (plotki, ok. 70% pewności)`,
  };
}
