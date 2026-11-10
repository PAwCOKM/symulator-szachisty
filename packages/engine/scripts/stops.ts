import { ageOf, botAction, createCareer, step } from '../src/index';

for (const [i, g] of (['m', 'f', 'm'] as const).entries()) {
  let s = createCareer({ name: 'Bot', gender: g, archetype: 'allround', startWhite: 'italian' }, 'stops-' + i);
  let plays = 0;
  let stopsTournaments = 0;
  let lastRun = '';
  while (!s.ended && ageOf(s) < 30) {
    const a = botAction(s);
    if (a.type === 'play') plays++;
    if (s.run && s.run.current && s.run.status === 'prep' && `${s.run.id}${s.run.startWeek}` !== lastRun) {
      stopsTournaments++;
      lastRun = `${s.run.id}${s.run.startWeek}`;
    }
    s = step(s, a);
  }
  const games = s.stats.wins + s.stats.draws + s.stats.losses;
  const years = ageOf(s) - 8;
  console.log(`bot ${i} (${g}): ${years} lat, turniejów ${s.stats.tournaments}, partii ${games}, ręcznych partii ${plays} (${((plays / games) * 100).toFixed(0)}%), zatrzymań na turnieju ${stopsTournaments} (${(stopsTournaments / years).toFixed(1)}/rok)`);
}
