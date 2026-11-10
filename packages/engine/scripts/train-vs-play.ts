import { ageOf, botAction, createCareer, step, SKILL_KEYS, type CareerState } from '../src/index';

const FIX_MONEY = process.argv[2] === 'money';

/** Porównanie: ile turniejów w roku vs przyrost umiejętności i ranking po N latach. */
function run(starts: number, seed: string, years: number): { skills: number; rating: number; peak: number } {
  let s: CareerState = createCareer({ name: 'T', archetype: 'allround', startWhite: 'italian' }, seed);
  while (!s.ended && ageOf(s) < 8 + years) {
    if (FIX_MONEY && s.player.money < 3000) s = { ...s, player: { ...s.player, money: 3000 } };
    if (s.event) {
      s = step(s, { type: 'choose', index: 0 });
    } else if (s.run) {
      s = step(s, botAction(s));
    } else if (s.plan.year !== Math.floor(s.week / 52)) {
      const base = botAction(s);
      if (base.type === 'plan') {
        let left = starts;
        const tournaments = base.tournaments.filter(() => left-- > 0).map((t) => ({ ...t, times: Math.min(t.times, 1) }));
        s = step(s, { ...base, tournaments });
      } else s = step(s, base);
    } else {
      s = step(s, botAction(s));
    }
  }
  const avg = SKILL_KEYS.filter((k) => k !== 'stamina').reduce((a, k) => a + s.player.skills[k], 0) / (SKILL_KEYS.length - 1);
  return { skills: Math.round(avg * 10) / 10, rating: s.player.rating, peak: s.player.peak };
}

for (const years of [6, 12]) {
  console.log(`--- po ${years} latach (średnia z 3 seedów) ---`);
  for (const starts of [0, 6, 12, 24]) {
    const rs = ['a', 'b', 'c'].map((sd) => run(starts, `tvp-${sd}-${starts}`, years));
    const m = (k: 'skills' | 'rating' | 'peak') => Math.round(rs.reduce((a, r) => a + r[k], 0) / rs.length);
    console.log(`turniejów/rok: ${String(starts).padStart(2)} | średnia umiejętność ${(rs.reduce((a, r) => a + r.skills, 0) / rs.length).toFixed(1)} | ranking ${m('rating')} (max ${m('peak')})`);
  }
}
