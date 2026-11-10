import { ageOf, botAction, createCareer, step, tournamentSchedule, type CareerState } from '../src/index';
let s: CareerState = createCareer({ name: 'T', archetype: 'allround', startWhite: 'italian' }, 'pool-check');
let seen = false;
while (!s.ended && ageOf(s) < 45) {
  if (s.event) s = step(s, { type: 'choose', index: 0 });
  else s = step(s, botAction(s));
  if (s.stats.candidatesWon > 0 && !s.run && !seen) {
    seen = true;
    console.log('week', s.week, 'wk104', s.week % 104, 'challenger', s.world.challenger);
  }
  if (seen && !s.run && s.week % 104 >= 40 && s.week % 104 <= 52) {
    const m = tournamentSchedule(s).find((x) => x.def.id === 'mecz-swiata');
    console.log('wk', s.week % 104, m ? `weeks ${m.weeks} reason ${m.reason}` : 'no sched', 'plan', s.plan.tournaments.map((t) => t.id).includes('mecz-swiata'), 'ch', s.world.challenger);
    if (s.week % 104 === 52) break;
  }
}
