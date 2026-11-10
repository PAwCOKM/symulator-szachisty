import { ageOf, botAction, createCareer, step } from '../src/index';

for (let i = 0; i < 3; i++) {
  let s = createCareer({ name: 'Bot', gender: 'f', archetype: 'allround', startWhite: 'italian' }, 'balf-' + i);
  const marks: string[] = [];
  while (!s.ended && ageOf(s) < 40) {
    s = step(s, botAction(s));
    if (s.week % 104 === 0 && !s.run && !marks.includes(String(s.week))) marks.push(`${s.week / 52}y:${s.player.rating}/${s.player.rapid.rating}/${s.player.blitz.rating}`);
  }
  console.log(i, 'rating', s.player.rating, 'peak', s.player.peak, 'cat', s.player.category, 'norms', JSON.stringify(s.player.norms), JSON.stringify(s.player.fideNorms));
  console.log('   ', marks.join(' '));
}
