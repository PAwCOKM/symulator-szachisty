import { BLACK_CARDS, WHITE_CARDS } from './content/openings';
import { COACHES } from './content/tournaments';
import { tournamentSchedule } from './career';
import { GROUPS, SKILL_KEYS, type Action, type CareerState, type Group, type PlannedTournament, type Setup, type TrainItem } from './model';

function bestSetup(s: CareerState): Setup {
  const m = (id: string) => s.cards[id]?.mastery ?? 0;
  const white = [...WHITE_CARDS].sort((a, b) => m(b.id) - m(a.id))[0]!.id;
  const black = {} as Record<Group, string | null>;
  for (const g of GROUPS) black[g] = BLACK_CARDS.filter((c) => c.group === g).sort((a, b) => m(b.id) - m(a.id))[0]!.id;
  return { white, black, approach: 'normal' };
}

/** Prosty automatyczny gracz do testów i balansu: planuje rok, potem go przewija. */
export function botAction(s: CareerState): Action {
  if (s.event) return { type: 'choose', index: 0 };
  if (s.run) {
    const r = s.run;
    if (r.status === 'prep') {
      if (r.current && !r.current.scouted && r.scouts > 0 && r.current.important && !r.current.rushed) return { type: 'scout' };
      return { type: 'play', setup: bestSetup(s) };
    }
    if (r.status === 'result') return { type: 'next' };
    return { type: 'continue' };
  }
  const P = s.player;
  if (!P.coach && P.money > 300) {
    const c = [...COACHES].filter((x) => x.minRating <= P.rating && x.cost <= P.money / 10).sort((a, b) => b.cost - a.cost)[0];
    if (c) return { type: 'coach', id: c.id };
  }
  const year = Math.floor(s.week / 52);
  if (s.plan.year !== year) {
    const weakest = [...SKILL_KEYS].filter((k) => k !== 'stamina').sort((a, b) => P.skills[a] - P.skills[b]);
    const su = bestSetup(s);
    const m = (id: string) => s.cards[id]?.mastery ?? 0;
    const lowCard = [su.white, ...GROUPS.map((g) => su.black[g]!)].sort((a, b) => m(a) - m(b))[0]!;
    // maksymalnie 3 pozycje: gdy trzeba doszkolić debiut, bot trenuje 2 słabsze umiejętności i debiut
    const needStudy = m(lowCard) < 80;
    const training: TrainItem[] = weakest.slice(0, needStudy ? 2 : 3).map((skill) => ({ kind: 'skill', skill }));
    if (needStudy) training.push({ kind: 'study', card: lowCard });
    const rOf = (f: 'classical' | 'rapid' | 'blitz') => (f === 'classical' ? P.rating : P[f].rating);
    const sched = tournamentSchedule(s)
      .filter((x) => !x.reason && x.def.level <= rOf(x.def.format) + 300)
      .sort((a, b) => Number(b.def.format === 'classical') - Number(a.def.format === 'classical') || b.def.level - a.def.level);
    const tournaments: PlannedTournament[] = [];
    let total = 0;
    for (const x of sched) {
      const times = Math.min(x.weeks.length, 6, 26 - total);
      if (times <= 0) break;
      tournaments.push({ id: x.def.id, times });
      total += times;
    }
    return { type: 'plan', training, tournaments, setup: su };
  }
  return { type: 'advance' };
}
