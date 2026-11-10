import { card, DEFENCES_BY_GROUP, WHITE_CARDS } from '../content/openings';
import type { Rng } from '../rng';
import { PHASE_FX, SKILL_SCALE, currentPhase } from '../model';
import type {
  Approach,
  CareerState,
  Decider,
  Format,
  GameReport,
  Opponent,
  PlayerState,
  Setup,
  Side,
  SkillKey,
  Surprise,
} from '../model';

export const ELO_PER_SKILL = 24 / SKILL_SCALE;

export function oppRatingOf(o: Opponent, format: Format): number {
  return format === 'classical' ? o.rating : format === 'rapid' ? o.rapid : o.blitz;
}

/** Szansa, że rywal będzie dociskał Cię zegarem w danej partii. */
export function oppPushChance(o: Opponent): number {
  return Math.max(0.05, Math.min(0.6, 0.1 + o.skills.pressure / 250 + (o.style > 0 ? 0.1 : 0)));
}

export function myRatingOf(p: PlayerState, format: Format): number {
  return format === 'classical' ? p.rating : p[format].rating;
}

export interface RoundContext {
  /** mnożnik dodatniej przewagi debiutowej (mniej czasu na przygotowanie = mniej) */
  prepFactor: number;
  /** zmęczenie rywala (0..100) */
  oppFatigue: number;
  rushed: boolean;
  /** czy rywal był przeskautowany (dopiero wtedy działa głębokie przygotowanie na linię) */
  scouted?: boolean;
}

const W: Record<Format, { mid: number; calc: number; end: number; mat: number; press: number }> = {
  classical: { mid: 0.36, calc: 0.18, end: 0.24, mat: 0.06, press: 0.16 },
  rapid: { mid: 0.34, calc: 0.16, end: 0.18, mat: 0.06, press: 0.26 },
  blitz: { mid: 0.3, calc: 0.12, end: 0.1, mat: 0.08, press: 0.4 },
};

type Skills = Record<SkillKey, number>;

/** Kalkulacja efektywna: kto ma lepszy zegar, ten ma więcej czasu na analizę. */
function calcEff(s: Skills): number {
  return s.calculation + (s.pressure - 50) * 0.25;
}

/**
 * Wiek a styl gry: młodzi grają ostrzej i szybciej liczą, ale gorzej znają końcówki i pozycję;
 * z wiekiem rośnie rozumienie pozycji i końcówek, a maleją ostrość taktyczna, kalkulacja i odporność na presję czasu.
 * Zwraca poprawki do umiejętności (punkty) używane tylko w partiach.
 */
export function ageSkillMods(age: number): Partial<Record<SkillKey, number>> {
  if (age < 24) {
    const t = Math.min(1, (24 - age) / 8);
    return { tactics: 2 * t, calculation: 1 * t, strategy: -1 * t, endgame: -2 * t };
  }
  if (age > 32) {
    const t = Math.min(1, (age - 32) / 18);
    return { strategy: 3 * t, endgame: 2 * t, tactics: -3 * t, calculation: -2 * t, pressure: -2 * t };
  }
  return {};
}

export function ageStyleNote(age: number): string {
  if (age < 24) return 'Młodość: ostrzejsza taktyka i szybsza kalkulacja, ale słabsze rozumienie pozycji i końcówek.';
  if (age > 32) return 'Doświadczenie: lepsza strategia i końcówki, ale słabsza taktyka, kalkulacja i odporność na presję czasu.';
  return 'Wiek szczytowy: brak premii i kar za wiek.';
}

function withAge(sk: Skills, age: number): Skills {
  const m = ageSkillMods(age);
  const out = { ...sk };
  for (const k of Object.keys(m) as SkillKey[]) out[k] = Math.max(1, out[k] + (m[k] ?? 0));
  return out;
}

export function estimateRating(s: Skills, format: Format = 'classical'): number {
  const w = W[format];
  const v = w.mid * ((s.tactics + s.strategy) / 2) + w.calc * calcEff(s) + w.end * s.endgame + w.mat * s.mating + w.press * s.pressure;
  return Math.round(300 + ELO_PER_SKILL * v);
}

export interface Parts {
  middlegame: number;
  calculation: number;
  endgame: number;
  mating: number;
  pressure: number;
}

export function matchParts(p: Skills, o: Skills, format: Format, sharp: number): Parts {
  const w = W[format];
  const pm = p.tactics * sharp + p.strategy * (1 - sharp);
  const om = o.tactics * sharp + o.strategy * (1 - sharp);
  const e = ELO_PER_SKILL;
  return {
    middlegame: e * w.mid * (pm - om),
    calculation: e * w.calc * (calcEff(p) - calcEff(o)),
    endgame: e * w.end * (p.endgame - o.endgame),
    mating: e * w.mat * (p.mating - o.mating),
    pressure: e * w.press * (p.pressure - o.pressure),
  };
}

export function expected(diff: number): number {
  return 1 / (1 + Math.pow(10, -diff / 400));
}

/** Ryzyko przegrania na czas (0..0.45). */
export function flagRisk(format: Format, pTime: number, oTime: number, pCalc: number, sharp: number): number {
  const base = { classical: 0.012, rapid: 0.04, blitz: 0.085 }[format];
  let f = 1 + (55 - pTime) / 35;
  f = Math.max(0.25, Math.min(3.4, f));
  f *= 1 + (oTime - pTime) / 160;
  // kto dużo liczy, a ma słaby zegar - wpada w niedoczas
  f *= 1 + Math.max(0, pCalc - pTime) / 160;
  f *= 0.8 + 0.5 * sharp;
  return Math.max(0.002, Math.min(0.45, base * f));
}

const bookEdge = (pm: number, om: number, theory: number) => (pm - om) * (0.4 + 0.35 * theory);

export interface Resolved {
  report: GameReport;
  /** karta, której użył gracz (jeśli w ogóle) */
  playerCard: string | null;
  /** czy teoria odegrała rolę */
  book: boolean;
}

export function resolveGame(
  s: CareerState,
  opp: Opponent,
  color: Side,
  setup: Setup,
  format: Format,
  round: number,
  rng: Rng,
  ctx: RoundContext,
): Resolved {
  const P = s.player;
  const text: string[] = [];
  let surprise: Surprise = 'none';
  let edge = 0;
  let sharpBase = 0.5;
  let whiteId: string;
  let blackId: string | null;
  let playerCard: string | null = null;
  let oppLine: string | null = null;

  const prog = (id: string | null) => (id ? (s.cards[id]?.mastery ?? 0) : 0);

  if (color === 'w') {
    const pc = card(setup.white);
    const defs = DEFENCES_BY_GROUP[pc.group];
    let oc;
    if (rng.chance(opp.deviation)) {
      oc = rng.pick(defs);
      surprise = 'opp-deviation';
    } else {
      oc = rng.weighted(defs, (d) => opp.black[d.id] ?? 0);
    }
    whiteId = pc.id;
    blackId = oc.id;
    oppLine = surprise === 'none' ? oc.id : null;
    playerCard = pc.id;
    const pm = prog(pc.id);
    const om = opp.mastery[oc.id] ?? 8;
    sharpBase = (pc.sharpness + oc.sharpness) / 2;
    if (surprise === 'opp-deviation') {
      edge = 0;
      text.push(`${opp.name} zaskoczył rzadką odpowiedzią (${oc.name}). Teoria idzie w kąt - liczy się siła gry.`);
    } else {
      edge = bookEdge(pm, om, (pc.theory + oc.theory) / 2);
      if (pm < 8) surprise = 'unprepared';
      if (edge < 0) edge *= 1 - Math.max(0, calcEff(P.skills)) / 200;
      text.push(`Ty: ${pc.name} (${Math.round(pm)}), rywal: ${oc.name} (${Math.round(om)}).`);
    }
  } else {
    let wc;
    if (rng.chance(opp.deviation)) {
      wc = rng.pick(WHITE_CARDS);
      surprise = 'opp-deviation';
    } else {
      wc = rng.weighted(WHITE_CARDS, (c) => {
        const w0 = opp.white[c.id] ?? 0;
        if (w0 <= 0) return 0;
        // dobrze przygotowany rywal omija Twoje mocne strony
        const mine = prog(setup.black[c.group]);
        return w0 * Math.exp((-opp.prep * mine) / 45);
      });
    }
    whiteId = wc.id;
    oppLine = surprise === 'none' ? wc.id : null;
    const dId = setup.black[wc.group];
    const dc = dId ? card(dId) : null;
    blackId = dc ? dc.id : null;
    playerCard = dc ? dc.id : null;
    const pm = prog(dId);
    const om = opp.mastery[wc.id] ?? 8;
    sharpBase = dc ? (wc.sharpness + dc.sharpness) / 2 : wc.sharpness;
    if (surprise === 'opp-deviation') {
      edge = 0;
      text.push(`${opp.name} zagrał coś niespodziewanego (${wc.name}). Przygotowanie na nic - grasz na siłę gry.`);
    } else if (!dc || pm < 8) {
      surprise = 'unprepared';
      edge = bookEdge(0, om, wc.theory);
      edge *= 1 - Math.max(0, calcEff(P.skills)) / 200;
      text.push(`Rywal gra ${wc.name}, a Ty nie masz na to przygotowanej obrony. Improwizujesz.`);
    } else {
      edge = bookEdge(pm, om, (wc.theory + (dc?.theory ?? 0.5)) / 2);
      text.push(`Rywal: ${wc.name} (${Math.round(om)}), Ty: ${dc!.name} (${Math.round(pm)}).`);
    }
  }

  if (edge > 0) edge *= ctx.prepFactor;
  // głębokie przygotowanie na wskazaną linię rywala (wymaga skautingu): trafienie daje przewagę, pudło lekko kosztuje
  let focusFx = 0;
  if (setup.focus && ctx.scouted && !ctx.rushed && oppLine) {
    if (oppLine === setup.focus) {
      focusFx = 9 * ctx.prepFactor;
      text.push(`Trafione: przygotowałeś się na ${card(setup.focus).name} i rywal w to wszedł.`);
    } else {
      focusFx = -3;
      text.push(`Rywal zagrał inaczej, niż zakładało Twoje głębokie przygotowanie (${card(setup.focus).name}).`);
    }
  }
  const sharp = Math.max(0.05, Math.min(0.95, sharpBase + (setup.approach === 'sharp' ? 0.2 : setup.approach === 'solid' ? -0.2 : 0)));
  // dolegliwości wpływają na grę zależnie od rodzaju (patrz INJURY_INFO)
  const inj = P.injury && s.week < P.injury.until ? P.injury : null;
  const mySkills = withAge(P.skills, P.startAge + Math.floor(s.week / 52));
  let injuryFx = 0;
  if (inj) {
    const sv = inj.severity;
    if (inj.kind === 'eyes') {
      mySkills.calculation = Math.max(1, mySkills.calculation - 4 * sv);
      mySkills.tactics = Math.max(1, mySkills.tactics - 3 * sv);
    } else if (inj.kind === 'nerves') mySkills.pressure = Math.max(1, mySkills.pressure - 5 * sv);
    else if (inj.kind === 'illness') injuryFx -= 4 * sv;
    injuryFx -= 1.5 * sv;
  }
  const parts = matchParts(mySkills, withAge(opp.skills, opp.age), format, sharp);
  const colorEdge = color === 'w' ? 30 : -30;
  const fatigueMalus = Math.max(0, P.fatigue - 40) * 0.7 * (inj?.kind === 'back' ? 1 + 0.3 * inj.severity : 1);
  const formBonus = P.form * 1.5;
  // presja czasowa: możesz dociskać rywala (grasz szybko), rywal może dociskać Ciebie; liczy się odporność na presję
  const myPush = setup.tempo === 'push';
  const oppPush = rng.chance(oppPushChance(opp));
  const fmtP = { classical: 0.6, rapid: 1, blitz: 1.2 }[format];
  const resist = (a: number, b: number) => Math.max(-12, Math.min(20, (a - b) * 0.35));
  const myPushFx = myPush ? (resist(P.skills.pressure, opp.skills.pressure) - 5) * fmtP : 0;
  const oppPushFx = oppPush ? -(resist(opp.skills.pressure, P.skills.pressure) - 5) * fmtP : 0;
  const skillDiff = parts.middlegame + parts.calculation + parts.endgame + parts.mating + parts.pressure;
  const oppTiredBonus = Math.max(0, ctx.oppFatigue - 40) * 0.7;
  const phaseFx = PHASE_FX[currentPhase(s)].game;
  const diff = skillDiff + injuryFx + phaseFx + edge + focusFx + colorEdge + formBonus - fatigueMalus + oppTiredBonus + myPushFx + oppPushFx;

  const E = expected(diff);
  const oppR = oppRatingOf(opp, format);
  const avg = (myRatingOf(P, format) + oppR) / 2;
  const apprMul: Record<Approach, number> = { solid: 1.45, normal: 1, sharp: 0.65 };
  const fmtMul: Record<Format, number> = { classical: 1, rapid: 0.85, blitz: 0.65 };
  let pd = (0.1 + 0.00006 * (avg - 1000) + 0.2 * (1 - Math.abs(2 * E - 1))) * apprMul[setup.approach] * fmtMul[format] * (1 - 0.35 * sharp);
  pd = Math.max(0.02, Math.min(0.7, pd, 1.96 * Math.min(E, 1 - E)));
  let pWin = Math.max(0, E - pd / 2);
  let pLoss = Math.max(0, 1 - E - pd / 2);
  // realizm: nawet przy dużej przewadze zdarzają się remisy i wpadki, a słabszy czasem wygrywa
  const dFloor = { classical: 0.14, rapid: 0.1, blitz: 0.07 }[format];
  const uFloor = { classical: 0.05, rapid: 0.06, blitz: 0.08 }[format];
  if (pd < dFloor) {
    const need = dFloor - pd;
    if (pWin >= pLoss) pWin -= need;
    else pLoss -= need;
    pd = dFloor;
  }
  if (pLoss < uFloor) {
    pWin -= uFloor - pLoss;
    pLoss = uFloor;
  }
  if (pWin < uFloor) {
    pLoss -= uFloor - pWin;
    pWin = uFloor;
  }
  pWin = Math.max(0, pWin);
  pLoss = Math.max(0, pLoss);
  const pTot = pWin + pd + pLoss;
  pWin /= pTot;
  pd /= pTot;
  pLoss /= pTot;

  const r = rng.float();
  let result: 1 | 0.5 | 0 = r < pWin ? 1 : r < pWin + pd ? 0.5 : 0;

  const pushMul = (pusherPressure: number, otherPressure: number) => 1 + 0.8 * fmtP * (1 + Math.max(-0.5, Math.min(1, (pusherPressure - otherPressure) / 100)));
  const risk = flagRisk(format, P.skills.pressure, opp.skills.pressure, calcEff(P.skills), sharp) * (oppPush ? pushMul(opp.skills.pressure, P.skills.pressure) : 1);
  const oppRisk = flagRisk(format, opp.skills.pressure, P.skills.pressure, calcEff(opp.skills), sharp) * (myPush ? pushMul(P.skills.pressure, opp.skills.pressure) : 1);
  let flagged = false;
  let oppFlagged = false;
  if (result !== 0 && rng.chance(Math.min(0.6, risk) * (result === 1 ? 1 : 0.55))) {
    flagged = true;
    result = 0;
  } else if (result !== 1 && rng.chance(Math.min(0.6, oppRisk) * (result === 0 ? 0.3 : 0.6))) {
    oppFlagged = true;
    result = 1;
  }
  const moves = rng.int(format === 'blitz' ? 25 : 22, format === 'classical' ? 62 : 55);

  let decider: Decider = 'balance';
  const contrib: [Decider, number][] = [
    ['opening', edge],
    ['middlegame', parts.middlegame],
    ['calculation', parts.calculation],
    ['endgame', parts.endgame],
    ['mating', parts.mating],
    ['time', parts.pressure],
  ];
  if (flagged || oppFlagged) decider = 'time';
  else if (result === 1) decider = contrib.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  else if (result === 0) decider = contrib.reduce((a, b) => (b[1] < a[1] ? b : a))[0];

  if (myPush) text.push('Grasz szybko i wywierasz presję czasową.');
  if (oppPush) text.push('Rywal gra szybko i dociska Cię zegarem.');
  const verb = result === 1 ? 'Wygrana' : result === 0.5 ? 'Remis' : 'Porażka';
  if (oppFlagged) text.push(`Wygrana na czas - rywal przekroczył limit w ${moves}. posunięciu${myPush ? ' pod Twoją presją' : ''}.`);
  else if (flagged) text.push(`${verb} - przekroczyłeś czas w ${moves}. posunięciu. Pozycja była do utrzymania.`);
  else text.push(`${verb} po ${moves} posunięciach. Rozstrzygnęło: ${DECIDER_PL[decider]}.`);

  return {
    report: {
      round,
      oppId: opp.id,
      oppName: opp.name,
      oppRating: oppR,
      color,
      whiteCard: whiteId,
      blackCard: blackId,
      playerCard,
      surprise,
      edge: Math.round(edge * 10) / 10,
      sharpness: Math.round(sharp * 100) / 100,
      diff: Math.round(diff),
      pWin: Math.round(pWin * 1000) / 1000,
      pDraw: Math.round(pd * 1000) / 1000,
      pLoss: Math.round(pLoss * 1000) / 1000,
      result,
      flagged,
      myTempo: myPush ? 'push' : 'steady',
      oppPush,
      oppFlagged,
      flagRisk: Math.round(risk * 1000) / 1000,
      rushed: ctx.rushed,
      myFatigue: Math.round(P.fatigue),
      oppFatigue: Math.round(ctx.oppFatigue),
      moves,
      decider,
      text,
    },
    playerCard,
    book: surprise === 'none',
  };
}

export const DECIDER_PL: Record<Decider, string> = {
  opening: 'przewaga debiutowa',
  middlegame: 'gra w środku',
  calculation: 'kalkulacja',
  endgame: 'końcówka',
  mating: 'technika matowania',
  time: 'zegar i presja',
  balance: 'równowaga sił',
};
