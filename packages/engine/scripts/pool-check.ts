import { ageOf, botAction, createCareer, step, type CareerState } from '../src/index';

let s: CareerState = createCareer({ name: 'T', archetype: 'allround', startWhite: 'italian' }, 'pool-check');
let last = -1;
while (!s.ended && ageOf(s) < 45) {
  if (s.event) s = step(s, { type: 'choose', index: 0 });
  else s = step(s, botAction(s));
  const y = Math.floor(s.week / 52);
  if (y !== last && y % 5 === 0) {
    last = y;
    const top = [...s.pool].sort((a, b) => b.rating - a.rating).slice(0, 8).map((o) => o.rating);
    const fem = s.pool.filter((o) => o.female).map((o) => o.rating).sort((a, b) => b - a).slice(0, 5).join(' ');
    const men = s.pool.filter((o) => !o.female && o.title.startsWith('W')).length;
    console.log(`rok ${y}: top ${top.join(' ')} | mężczyźni z tytułem W: ${men} | kobiety top: ${fem}`);
  }
}
console.log('wygrane turnieje', s.stats.tournamentsWon, 'wcPlayed', s.stats.wcPlayed, 'cand', s.stats.candidatesWon);
