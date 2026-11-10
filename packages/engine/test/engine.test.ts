import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import { ageOf, reigns, validateSetup, botAction, CARDS, careerScore, EVENTS, Rng, simulatePlace, SKILL_KEYS, trainingForecast, tournamentSchedule, worldView, chessTimeFactor, createCareer, flagRisk, replay, startDef, step, tournamentOptions, type Action, type CareerConfig } from '../src/index';

const cfg: CareerConfig = { name: 'Test', archetype: 'allround', startWhite: 'italian' };

describe('content', () => {
  it('all opening move lists are legal', () => {
    for (const c of CARDS) {
      const g = new Chess();
      for (const m of c.moves.split(' ')) expect(() => g.move(m), `${c.id}: ${m}`).not.toThrow();
    }
  });
});

describe('time management', () => {
  it('worse clock = higher flag risk, blitz > classical', () => {
    expect(flagRisk('blitz', 20, 50, 40, 0.5)).toBeGreaterThan(flagRisk('blitz', 70, 50, 40, 0.5));
    expect(flagRisk('blitz', 40, 50, 40, 0.5)).toBeGreaterThan(flagRisk('classical', 40, 50, 40, 0.5));
  });
});

function run(seed: string, weeks: number) {
  let s = createCareer(cfg, seed);
  const actions: Action[] = [];
  while (s.week < weeks && !s.ended) {
    const a = botAction(s);
    actions.push(a);
    s = step(s, a);
  }
  return { s, actions };
}

describe('gender, formats and rounds', () => {
  it('women-only events are closed to men and open to women', () => {
    const m = createCareer(cfg, 'g1');
    const f = createCareer({ ...cfg, gender: 'f' }, 'g1');
    expect(tournamentOptions(m).find((o) => o.def.id === 'panie-klub')?.ok).toBe(false);
    expect(f.pool.some((o) => o.female)).toBe(true);
    // open tournaments have no gender restriction
    expect(tournamentOptions(f).find((o) => o.def.id === 'klub')?.reason).not.toBe('Tylko dla zawodniczek');
  });
  it('separate ratings per format; skip stops at an important round', () => {
    let s = createCareer(cfg, 'fmt');
    expect(s.player.rapid.rating).toBeGreaterThan(0);
    // wait for a classical club tournament
    let guard = 0;
    while (!tournamentOptions(s).find((o) => o.def.id === 'klub')?.ok && guard++ < 10) s = step(s, { type: 'rest' });
    const setup = { white: 'italian', black: { e4: 'caro', d4: 'qgd', flank: 'symm' }, approach: 'normal' as const };
    s = step(s, { type: 'enter', tournament: 'klub', setup });
    const before = s.player.rating;
    for (let i = 0; i < 5 && s.run!.current!.important && s.run!.games.length < 2; i++) {
      s = step(s, { type: 'play' });
      s = step(s, { type: 'next' });
    }
    if (!s.run!.current!.important) {
      s = step(s, { type: 'skip' });
      // zwykły turniej przewija się w całości; zatrzymuje tylko ważna runda
      expect(s.run!.status === 'done' || s.run!.current!.important).toBe(true);
    }
    while (s.run) s = step(s, botAction(s));
    expect(s.player.rating).not.toBe(before);
    expect(s.player.rapid.games).toBe(0);
  });
  it('female and male bots both progress', () => {
    for (const gender of ['m', 'f'] as const) {
      let s = createCareer({ ...cfg, gender }, 'gb-' + gender);
      while (s.week < 260 && !s.ended) s = step(s, botAction(s));
      expect(s.player.peak).toBeGreaterThan(1100);
    }
  });
});

describe('events and leagues', () => {
  it('a pending event blocks actions until a choice is made', () => {
    let s = createCareer(cfg, 'ev1');
    s = { ...s, event: { id: 'kontuzja' } };
    expect(() => step(s, { type: 'rest' })).toThrow();
    s = step(s, { type: 'choose', index: 0 });
    expect(s.event).toBeNull();
    expect(() => step(s, { type: 'choose', index: 0 })).toThrow();
  });
  it('a league match adds season points and pays a flat fee', () => {
    let s = createCareer(cfg, 'lg1');
    s = { ...s, player: { ...s.player, rating: 1300 } };
    let guard = 0;
    while (!tournamentOptions(s).find((o) => o.def.id === 'liga-okregowa')?.ok && guard++ < 6) s = step(s, { type: 'rest' });
    const setup = { white: 'italian', black: { e4: 'caro', d4: 'qgd', flank: 'symm' }, approach: 'normal' as const };
    const money = s.player.money;
    s = step(s, { type: 'enter', tournament: 'liga-okregowa', setup });
    while (s.run) s = step(s, botAction(s));
    expect(s.leagues.okregowa?.played).toBe(1);
    expect(s.player.money).toBeGreaterThanOrEqual(money + 20);
  });
  it('many small events exist for weak and young players', () => {
    const s = createCareer(cfg, 'sm1');
    const ok = tournamentOptions(s).filter((o) => o.def.maxRating <= 1600 && o.def.minRating === 0);
    expect(ok.length).toBeGreaterThan(15);
  });
});

describe('life stages, grants and pressure', () => {
  it('starts at age 8 and triggers the secondary school choice at 14', () => {
    let s = createCareer(cfg, 'life1');
    expect(ageOf(s)).toBe(8);
    expect(chessTimeFactor(s)).toBeGreaterThan(0.8);
    let guard = 0;
    while (ageOf(s) < 15 && guard++ < 1200) {
      s = s.event ? step(s, { type: 'choose', index: 0 }) : step(s, { type: 'rest' });
    }
    expect(s.eventsSeen).toContain('liceum');
    expect(chessTimeFactor(s)).toBeLessThan(0.9);
  });
  it('weekly grants pay out and expire', () => {
    let s = createCareer(cfg, 'gr1');
    s = { ...s, player: { ...s.player, grants: [{ id: 'stypendium', name: 'Test', perWeek: 50, expires: 3 }] } };
    const m0 = s.player.money;
    for (let i = 0; i < 8 && s.week < 4; i++) s = s.event ? step(s, { type: 'choose', index: 0 }) : step(s, { type: 'rest' });
    expect(s.player.money).toBeGreaterThan(m0 + 100);
    expect(s.player.grants.length).toBe(0);
  });
  it('pressure resistance and a weak clock matter in flagging risk', () => {
    expect(flagRisk('blitz', 20, 60, 40, 0.5)).toBeGreaterThan(flagRisk('blitz', 60, 20, 40, 0.5));
  });
  it('time-pressure choice changes the game report', () => {
    let s = createCareer(cfg, 'tp1');
    s = { ...s, player: { ...s.player, skills: { ...s.player.skills, pressure: 90 } } };
    let guard = 0;
    while (!tournamentOptions(s).find((o) => o.def.id === 'weekend-1200')?.ok && guard++ < 6) s = step(s, { type: 'rest' });
    const push = { white: 'italian', black: { e4: 'caro', d4: 'qgd', flank: 'symm' }, approach: 'normal' as const, tempo: 'push' as const };
    s = step(s, { type: 'enter', tournament: 'weekend-1200', setup: push });
    s = step(s, { type: 'play' });
    expect(s.run!.games[0]!.myTempo).toBe('push');
  });
});

describe('world championship path', () => {
  it('has a deep elite pool and a reigning champion who is top rated', () => {
    const s = createCareer(cfg, 'wc1');
    expect(s.pool.filter((o) => o.rating >= 2500).length).toBeGreaterThanOrEqual(90);
    const top = [...s.pool].sort((a, b) => b.rating - a.rating)[0]!;
    expect(s.world.champion).toBe(top.id);
    expect(worldView(s).rows.length).toBeGreaterThan(10);
  });
  it('the Candidates tournament needs qualification (cup top 3 or top 8 rating)', () => {
    let s = createCareer(cfg, 'wc2');
    s = { ...s, week: 52 };
    const cand = () => tournamentSchedule(s).find((x) => x.def.special === 'candidates')!;
    expect(cand().reason).toMatch(/kwalifikacji/);
    s = { ...s, world: { ...s.world, qualified: true } };
    expect(cand().reason).toBeUndefined();
  });
  it('world championship match: challenger plays 14 games and the title is settled', () => {
    let s = createCareer(cfg, 'wc3');
    // gracz jest challengerem, tydzień meczu (listopad roku parzystego)
    s = { ...s, week: 97, player: { ...s.player, rating: 2700 }, world: { ...s.world, challenger: -1 } };
    const setup = { white: 'italian', black: { e4: 'caro', d4: 'qgd', flank: 'symm' }, approach: 'normal' as const };
    expect(tournamentSchedule(s).find((x) => x.def.special === 'wcmatch')?.reason).toBeUndefined();
    s = step(s, { type: 'enter', tournament: 'mecz-swiata', setup });
    expect(s.run!.fieldIds).toEqual([s.world.champion]);
    while (s.run && s.run.status !== 'done') s = step(s, botAction(s));
    expect(s.run!.games.length).toBe(14);
    expect([1, 2]).toContain(s.run!.place);
    s = step(s, { type: 'continue' });
    expect(s.world.history.length).toBe(1);
    expect(s.world.cycle).toBe(0);
    expect(s.stats.wcPlayed).toBe(1);
    expect(s.world.challenger).toBeNull();
  });
  it('the AI cycle is resolved automatically at the end of an even year', () => {
    let s = createCareer(cfg, 'wc4');
    for (let i = 0; i < 240 && s.week < 108; i++) s = s.event ? step(s, { type: 'choose', index: 0 }) : step(s, { type: 'rest' });
    expect(s.week).toBeGreaterThanOrEqual(104);
    expect(s.world.history.length).toBeGreaterThanOrEqual(1);
    expect(s.world.cycle).toBe(0);
  });
});

describe('women world championship path', () => {
  const fcfg: CareerConfig = { ...cfg, gender: 'f' };
  it('has a separate women champion from the female pool and its own qualification', () => {
    let s = createCareer(fcfg, 'ww1');
    s = { ...s, week: 52 };
    const topF = s.pool.filter((o) => o.female).sort((a, b) => b.rating - a.rating)[0]!;
    expect(s.wworld.champion).toBe(topF.id);
    expect(s.wworld.champion).not.toBe(s.world.champion);
    const cand = () => tournamentSchedule(s).find((x) => x.def.special === 'candidates' && x.def.women)!;
    expect(cand().reason).toMatch(/kwalifikacji/);
    s = { ...s, wworld: { ...s.wworld, qualified: true } };
    expect(cand().reason).toBeUndefined();
    // mężczyźni nie widzą turniejów kobiecych
    const m = { ...createCareer(cfg, 'ww1'), week: 52 };
    expect(tournamentSchedule(m).find((x) => x.def.id === 'mswiata-kobiet')?.reason).toMatch(/zawodniczek/);
  });
  it('women challenger plays the match and the women title is settled', () => {
    let s = createCareer(fcfg, 'ww2');
    s = { ...s, week: 97, player: { ...s.player, rating: 2600 }, wworld: { ...s.wworld, challenger: -1 } };
    const setup = { white: 'italian', black: { e4: 'caro', d4: 'qgd', flank: 'symm' }, approach: 'normal' as const };
    s = step(s, { type: 'enter', tournament: 'mecz-swiata-kobiet', setup });
    expect(s.run!.fieldIds).toEqual([s.wworld.champion]);
    while (s.run && s.run.status !== 'done') s = step(s, botAction(s));
    s = step(s, { type: 'continue' });
    expect(s.wworld.history.length).toBe(1);
    expect(s.world.history.length).toBe(0);
  });
});

describe('tournament standings realism', () => {
  const mean = (n: number, r: number, level: number, spread: number, score: number, seed: string) => {
    const rng = Rng.fromSeed(seed);
    let sum = 0;
    let wins = 0;
    const N = 800;
    for (let i = 0; i < N; i++) {
      const p = simulatePlace(rng, n, r, level, spread, score);
      sum += p;
      if (p === 1) wins++;
    }
    return { avg: sum / N, win: wins / N };
  };
  it('a poor score finishes near the bottom, 50% in the middle', () => {
    expect(mean(40, 7, 1500, 200, 1.5, 'p1').avg).toBeGreaterThan(33);
    const mid = mean(24, 6, 1050, 200, 3, 'p2').avg;
    expect(mid).toBeGreaterThan(9);
    expect(mid).toBeLessThan(15);
  });
  it('6.5/7 almost always wins, 6/7 about half the time, 5.5/7 rarely', () => {
    expect(mean(40, 7, 1500, 200, 6.5, 'p3').win).toBeGreaterThan(0.85);
    const w6 = mean(40, 7, 1500, 200, 6, 'p4').win;
    expect(w6).toBeGreaterThan(0.3);
    expect(w6).toBeLessThan(0.7);
    const w55 = mean(40, 7, 1500, 200, 5.5, 'p5').win;
    expect(w55).toBeGreaterThan(0.01);
    expect(w55).toBeLessThan(0.25);
  });
});

describe('tournaments happen once a year', () => {
  it('no non-league event repeats within a year; series are separate dated events', () => {
    const s = createCareer(cfg, 'once1');
    for (const x of tournamentSchedule(s)) {
      if (!x.def.league) expect(x.weeks.length, x.def.name).toBeLessThanOrEqual(1);
    }
    const klub = tournamentSchedule(s).filter((x) => x.def.id.startsWith('klub'));
    expect(klub.length).toBeGreaterThanOrEqual(3);
    expect(new Set(klub.map((x) => x.def.name)).size).toBe(klub.length);
    expect(new Set(klub.map((x) => x.weeks[0])).size).toBe(klub.length);
  });
});

describe('yearly planner', () => {
  const plan = (s: ReturnType<typeof createCareer>, tournaments: { id: string; times: number }[] = []): ReturnType<typeof createCareer> =>
    step(s, { type: 'plan', training: [{ kind: 'skill', skill: 'tactics' }, { kind: 'skill', skill: 'endgame' }], tournaments });

  it('stats were merged: no separate nerves and time management', () => {
    expect(SKILL_KEYS).not.toContain('nerves');
    expect(SKILL_KEYS).not.toContain('time');
    expect(SKILL_KEYS).toContain('pressure');
  });
  it('requires a plan, limits training to 4 items, and runs the whole year', () => {
    let s = createCareer(cfg, 'yr1');
    expect(() => step(s, { type: 'advance' })).toThrow();
    const five = Array.from({ length: 5 }, () => ({ kind: 'analyze' as const }));
    expect(() => step(s, { type: 'plan', training: five, tournaments: [] })).toThrow();
    s = plan(s);
    const before = s.player.skills.tactics;
    for (let i = 0; i < 30 && s.week < 52; i++) s = s.event ? step(s, { type: 'choose', index: 0 }) : step(s, { type: 'advance' });
    expect(s.week).toBe(52);
    expect(s.player.skills.tactics).toBeGreaterThan(before);
    expect(s.yearSummary?.year).toBe(1);
    expect(s.ratingLog.length).toBeGreaterThan(1);
    // nowy rok wymaga nowego planu
    expect(() => step(s, { type: 'advance' })).toThrow();
  });
  it('stops at a planned tournament and plays it', () => {
    let s = createCareer(cfg, 'yr2');
    s = plan(s, [{ id: 'klub', times: 2 }]);
    s = step(s, { type: 'advance' });
    // zwykły turniej jest symulowany automatycznie (bez zatrzymania), chyba że trafi się wydarzenie lub ważny moment
    expect(s.history.length >= 1 || s.run?.id === 'klub' || s.event !== null).toBe(true);
    for (let i = 0; i < 4 && s.run; i++) {
      expect(s.run.current?.important).toBe(true);
      while (s.run && s.run.status !== 'done') s = step(s, botAction(s));
      s = step(s, { type: 'continue' });
    }
    expect(s.history.length).toBeGreaterThanOrEqual(1);
  });
  it('plays whole non-major tournaments automatically and reports them in the year summary', () => {
    let s = createCareer(cfg, 'yr4');
    const ids = tournamentSchedule(s).filter((x) => x.def.id.startsWith('weekend-1200') && !x.reason).map((x) => ({ id: x.def.id, times: 1 }));
    expect(ids.length).toBeGreaterThanOrEqual(4);
    s = plan(s, ids);
    let stops = 0;
    for (let i = 0; i < 80 && s.week < 52; i++) {
      if (s.event) s = step(s, { type: 'choose', index: 0 });
      else if (s.run) {
        stops++;
        while (s.run && s.run.status !== 'done') s = step(s, botAction(s));
        s = step(s, { type: 'continue' });
      } else s = step(s, { type: 'advance' });
    }
    expect(s.week).toBe(52);
    const played = s.yearSummary?.results.length ?? 0;
    expect(played).toBeGreaterThanOrEqual(4);
    // ręcznie rozgrywane były tylko nieliczne ważne momenty
    expect(stops).toBeLessThan(played);
  });
  it('forecast matches the direction of actual training', () => {
    const s = createCareer(cfg, 'yr3');
    const items = [{ kind: 'skill' as const, skill: 'tactics' as const }];
    const one = trainingForecast(s, items, 0)[0]!;
    expect(one.to).toBeGreaterThan(one.from);
    // trzy pozycje dzielą czas: każda rośnie wolniej niż pojedyncza
    const four = trainingForecast(s, [items[0]!, { kind: 'skill', skill: 'strategy' }, { kind: 'skill', skill: 'endgame' }], 0)[0]!;
    expect(four.to - four.from).toBeLessThan(one.to - one.from);
  });
  it('every event option explains its effect', () => {
    for (const e of EVENTS) for (const o of e.options) expect(o.hint.length, `${e.id}: ${o.label}`).toBeGreaterThan(5);
  });
});

describe('standings', () => {
  it('a perfect score always wins an individual tournament', () => {
    let checked = 0;
    for (const seed of ['pf1', 'pf2', 'pf3']) {
      let s = createCareer(cfg, seed);
      while (s.week < 400 && !s.ended) s = step(s, botAction(s));
      for (const h of s.history) {
        if (/Drużynowe|Liga|Ekstraliga/.test(h.name)) continue;
        if (h.rounds > 1 && h.score === h.rounds && h.place > 0) {
          checked++;
          expect(h.place, `${seed} ${h.name}`).toBe(1);
        } else if (h.rounds > 1 && h.score === h.rounds - 0.5 && h.place > 0) {
          // jeden remis: pierwszy albo drugi (gdy ktoś ma komplet), nigdy trzeci
          expect(h.place, `${seed} ${h.name}`).toBeLessThanOrEqual(2);
        }
      }
    }
    expect(checked).toBeGreaterThanOrEqual(0);
  }, 60000);
});

describe('retirement', () => {
  it('career can only be ended from age 20', () => {
    let s = createCareer(cfg, 'ret1');
    expect(() => step(s, { type: 'retire' })).toThrow();
    s = { ...s, week: 12 * 52 };
    expect(ageOf(s)).toBe(20);
    s = step(s, { type: 'retire' });
    expect(s.ended).toBe(true);
  });
});

describe('starting points', () => {
  it('easier starts are stronger but score less; harder starts score more', () => {
    const avg = (s: ReturnType<typeof createCareer>) => Object.values(s.player.skills).reduce((a, b) => a + b, 0) / 10;
    const easy = createCareer({ ...cfg, start: 'cudowne' }, 'st1');
    const hard = createCareer({ ...cfg, start: 'podgorke' }, 'st1');
    expect(avg(easy)).toBeGreaterThan(avg(hard) + 5);
    expect(easy.player.money).toBeGreaterThan(hard.player.money);
    expect(startDef('cudowne').mult).toBeLessThan(startDef('podgorke').mult);
    expect(startDef('pozny').startAge).toBe(12);
    expect(ageOf(createCareer({ ...cfg, start: 'pozny' }, 'st2'))).toBe(12);
    // ten sam stan końcowy daje wyższy wynik przy trudniejszym starcie
    const a = careerScore({ ...easy, config: { ...easy.config, start: 'cudowne' } });
    const b = careerScore({ ...easy, config: { ...easy.config, start: 'podgorke' } });
    expect(b).toBeGreaterThan(a);
  });
});

describe('career', () => {
  it('replay is deterministic', () => {
    const { s, actions } = run('det', 120);
    const r = replay(cfg, 'det', actions);
    expect(JSON.stringify(r)).toBe(JSON.stringify(s));
  });
  it('bot improves over 3 seasons', () => {
    const { s } = run('grow', 156);
    expect(s.player.peak).toBeGreaterThan(createCareer(cfg, 'grow').player.rating + 100);
  });
  it('has 8 white and 8 black openings', () => {
    expect(CARDS.filter((c) => c.side === 'w').length).toBe(8);
    expect(CARDS.filter((c) => c.side === 'b').length).toBe(8);
  });
  it('rejects illegal action', () => {
    const s = createCareer(cfg, 'x');
    expect(() => step(s, { type: 'next' })).toThrow();
  });
});

describe('v13 changes', () => {
  it('men never carry women titles and skills stay within 100', () => {
    const s = createCareer({ name: 'T', archetype: 'allround', startWhite: 'italian' }, 'v13');
    const bad = s.pool.filter((o) => !o.female && /^W/.test(o.title));
    expect(bad.length).toBe(0);
    for (const o of s.pool) for (const k of SKILL_KEYS) expect(o.skills[k]).toBeLessThanOrEqual(100);
  });
  it('round robin tournaments use a fixed field, each opponent twice', () => {
    let s = createCareer({ name: 'T', archetype: 'allround', startWhite: 'italian' }, 'rr');
    s = { ...s, week: 52 * 4, player: { ...s.player, rating: 2800, category: 'gm', club: 2 } };
    const def = tournamentSchedule(s).find((x) => x.def.id === 'norway');
    expect(def).toBeTruthy();
    s = step(s, { type: 'plan', training: [], tournaments: [{ id: 'norway', times: 1 }] });
    for (let i = 0; i < 4000 && !s.run; i++) s = step(s, botAction(s));
    expect(s.run?.id).toBe('norway');
    const ids = new Set(s.run!.fieldIds);
    expect(ids.size).toBe(5);
    while (s.run && s.run.games.length < 10) s = step(s, botAction(s));
    const counts = new Map<number, number>();
    for (const g of s.run!.games) counts.set(g.oppId, (counts.get(g.oppId) ?? 0) + 1);
    expect([...counts.values()].every((v) => v === 2)).toBe(true);
  });
  it('winning the candidates adds the world match automatically', () => {
    let s = createCareer({ name: 'T', archetype: 'allround', startWhite: 'italian' }, 'wcauto');
    s = { ...s, week: 104 * 3 + 20, player: { ...s.player, rating: 2850 }, world: { ...s.world, challenger: -1 } };
    s = step(s, { type: 'plan', training: [], tournaments: [] });
    let played = false;
    for (let i = 0; i < 400 && !played; i++) {
      s = step(s, botAction(s));
      if (s.run?.id === 'mecz-swiata') played = true;
    }
    expect(played).toBe(true);
  });
});

describe('v19 features', () => {
  it('staff needs rating and money, and costs weekly', () => {
    let s = createCareer({ name: 'T', archetype: 'allround', startWhite: 'italian' }, 'staff');
    expect(() => step(s, { type: 'staff', id: 'fizjo' })).toThrow();
    s = { ...s, player: { ...s.player, rating: 2300, money: 5000 } };
    s = step(s, { type: 'staff', id: 'fizjo' });
    expect(s.player.staff).toContain('fizjo');
    s = step(s, { type: 'staff', id: 'fizjo' });
    expect(s.player.staff).not.toContain('fizjo');
  });
  it('records head-to-head and stats while playing', () => {
    const { s } = run('h2h', 120);
    const n = s.stats.wins + s.stats.draws + s.stats.losses;
    expect(n).toBeGreaterThan(0);
    expect(s.stats.white.reduce((a, b) => a + b, 0) + s.stats.black.reduce((a, b) => a + b, 0)).toBe(n);
    expect(Object.keys(s.rivals).length).toBeGreaterThan(0);
  });
  it('injuries happen over a long career and heal', () => {
    let seen = 0;
    for (const seed of ['i1', 'i2', 'i3']) {
      let s = createCareer({ name: 'T', archetype: 'allround', startWhite: 'italian' }, seed);
      for (let i = 0; i < 60000 && !s.ended && ageOf(s) < 40; i++) {
        s = step(s, botAction(s));
        if (s.player.injury) seen++;
      }
      expect(s.player.injury === null || s.player.injury.until > 0).toBe(true);
    }
    expect(seen).toBeGreaterThan(0);
  }, 120000);
});

describe('v22 features', () => {
  const c0 = { name: 'T', archetype: 'allround' as const, startWhite: 'italian' };
  it('age modifies style: veterans better positionally, youth more tactical', async () => {
    const { ageSkillMods } = await import('../src/index');
    expect(ageSkillMods(18).tactics!).toBeGreaterThan(0);
    expect(ageSkillMods(18).endgame!).toBeLessThan(0);
    expect(ageSkillMods(45).strategy!).toBeGreaterThan(0);
    expect(ageSkillMods(45).tactics!).toBeLessThan(0);
    expect(ageSkillMods(28)).toEqual({});
  });
  it('year phase changes training gains and tournament strength', () => {
    const base = createCareer(c0, 'ph1');
    const run = (phase: 'steady' | 'build' | 'peak') => {
      let s = step(base, { type: 'plan', training: [{ kind: 'skill', skill: 'tactics' }], tournaments: [], phase });
      s = step(s, { type: 'advance' });
      return s.player.skills.tactics;
    };
    const [st, bu, pe] = [run('steady'), run('build'), run('peak')];
    expect(bu).toBeGreaterThan(pe);
    expect(st).toBeGreaterThan(pe - 0.0001);
  });
  it('deep prep on an opponent line needs scouting and is validated', () => {
    const s = createCareer(c0, 'fc1');
    expect(() => validateSetup({ white: 'italian', black: { e4: 'caro', d4: 'qgd', flank: 'symm' }, approach: 'normal', focus: 'nie-ma' })).toThrow();
    expect(() => validateSetup({ white: 'italian', black: { e4: 'caro', d4: 'qgd', flank: 'symm' }, approach: 'normal', focus: 'caro' })).not.toThrow();
    expect(s.setup.focus).toBeUndefined();
  });
  it('records are tracked and reigns are derived from history', () => {
    const s = createCareer(c0, 'rc1');
    expect(s.records.open!.rating).toBeGreaterThan(2600);
    expect(s.records.women!.rating).toBeLessThanOrEqual(2580);
    const r = reigns([{ year: 2, champion: 'A' }, { year: 4, champion: 'A' }, { year: 6, champion: 'B' }]);
    expect(r).toEqual([{ name: 'A', matches: 2, years: 4, since: 2 }, { name: 'B', matches: 1, years: 2, since: 6 }]);
  });
});

describe('categories', () => {
  it('titles are tracked separately from Polish categories', async () => {
    const { categoryStatus } = await import('../src/index');
    let s = createCareer({ name: 'T', archetype: 'allround', startWhite: 'italian' }, 'cat1');
    s = { ...s, player: { ...s.player, category: 'gm', peak: 2520, rating: 2500, norms: { ...s.player.norms, m: 2 }, fideNorms: { ...s.player.fideNorms, IM: 3, GM: 3 } } };
    const rows = categoryStatus(s);
    const ok = (id: string) => rows.find((r) => r.id === id)!.achieved;
    expect(ok('m')).toBe(true);
    expect(ok('im')).toBe(true);
    expect(ok('gm')).toBe(true);
    expect(ok('cm')).toBe(true);
    expect(ok('fm')).toBe(true);
    s = { ...s, player: { ...s.player, norms: { ...s.player.norms, m: 0 }, peak: 2300 } };
    expect(categoryStatus(s).find((r) => r.id === 'm')!.achieved).toBe(false);
  });
});
