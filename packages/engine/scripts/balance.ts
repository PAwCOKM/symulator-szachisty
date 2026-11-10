import { ageOf, botAction, careerScore, createCareer, step } from '../src/index';

const N = Number(process.argv[2] ?? 6);
const archs = ['tactician', 'positional', 'allround'] as const;
for (let i = 0; i < N; i++) {
  let s = createCareer({ name: 'Bot', archetype: archs[i % 3]!, startWhite: 'italian' }, 'bal-' + i);
  const marks: string[] = [];
  let n = 0;
  while (!s.ended && n++ < 40000) {
    s = step(s, botAction(s));
    if (s.week % 104 === 0 && s.run === null && !marks.includes(String(s.week))) marks.push(`${s.week / 52}y:${s.player.rating}`);
    if (ageOf(s) >= 40) break;
  }
  console.log(i, archs[i % 3], 'age', ageOf(s), 'rating', s.player.rating, 'peak', s.player.peak, 'cat', s.player.category, 'flags', s.stats.flagLosses, 'W/D/L', s.stats.wins, s.stats.draws, s.stats.losses, 'score', careerScore(s));
  console.log('   ', marks.join(' '));
}
