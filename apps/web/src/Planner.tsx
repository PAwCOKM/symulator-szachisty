import { useState } from 'react';
import {
  CARDS,
  CARD_BY_ID,
  CATEGORY_BY_ID,
  COACHES,
  PHASE_FX,
  type Phase,
  STAFF,
  FORMAT_LABELS,
  MAX_TRAIN_ITEMS,
  catIndex,
  SKILL_HINTS,
  SKILL_KEYS,
  SKILL_LABELS,
  chessTimeFactor,
  trainingForecast,
  tournamentSchedule,
  type CareerState,
  type Setup,
  type SkillKey,
  type TrainItem,
} from '@chess/engine';
import { SetupForm } from './SetupForm';
import { useGame } from './store';
import { FormatIcon, FormatTag, Icon } from './ui';

const fmt1 = (n: number) => n.toFixed(1).replace('.', ',');
const startsWord = (n: number) => (n === 1 ? 'start' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'starty' : 'startów');

function itemKey(it: TrainItem | null): string {
  if (!it) return '';
  if (it.kind === 'skill') return `skill:${it.skill}`;
  if (it.kind === 'study') return `study:${it.card}`;
  return 'analyze';
}

function parseKey(k: string): TrainItem | null {
  if (!k) return null;
  const [kind, id] = k.split(':');
  if (kind === 'skill') return { kind: 'skill', skill: id as SkillKey };
  if (kind === 'study') return { kind: 'study', card: id! };
  if (kind === 'analyze') return { kind: 'analyze' };
  return null;
}

function itemHint(it: TrainItem): string {
  if (it.kind === 'skill') return SKILL_HINTS[it.skill];
  if (it.kind === 'study') return `Nauka teorii: ${CARD_BY_ID[it.card]!.blurb} Zwiększa znajomość debiutu (najszybciej na niskim poziomie).`;
  return 'Analiza własnych porażek: wzmacnia umiejętność, w której najczęściej przegrywasz (po jednej analizie dla każdej słabości).';
}

export function Planner({ s }: { s: CareerState }) {
  const dispatch = useGame((x) => x.dispatch);
  const P = s.player;
  const year = Math.floor(s.week / 52);
  const planned = s.plan.year === year;
  const weekOfYear = s.week % 52;

  const defaultTraining = (): TrainItem[] => {
    if (s.plan.training.length) return s.plan.training;
    const weakest = [...SKILL_KEYS].filter((k) => k !== 'stamina').sort((a, b) => P.skills[a] - P.skills[b]).slice(0, 2);
    return weakest.map((skill) => ({ kind: 'skill' as const, skill }));
  };
  const [phase, setPhase] = useState<Phase>(() => (planned ? s.plan.phase : 'steady'));
  const [training, setTraining] = useState<(TrainItem | null)[]>(() => (planned ? s.plan.training : defaultTraining()));
  const sched = tournamentSchedule(s);
  const [times, setTimes] = useState<Record<string, number>>(() => {
    const src = planned ? s.plan.tournaments : s.plan.wanted;
    const out: Record<string, number> = {};
    for (const t of src) {
      const sc = sched.find((x) => x.def.id === t.id);
      if (sc && !sc.reason) out[t.id] = Math.min(t.times, sc.weeks.length);
    }
    return out;
  });
  const [setup, setSetup] = useState<Setup>(() => structuredClone(s.setup));

  const items = training.filter((x): x is TrainItem => x !== null);
  const totalStarts = Object.values(times).reduce((a, b) => a + b, 0);
  const forecast = trainingForecast(s, items, totalStarts, phase);
  const trainWeeks = Math.max(0, Math.round((52 - weekOfYear - totalStarts) * 0.88));
  const [showLocked, setShowLocked] = useState(false);
  const [fmts, setFmts] = useState<Record<string, boolean>>({ classical: true, rapid: true, blitz: true });
  const [sortBy, setSortBy] = useState<'date' | 'elo-desc' | 'elo-asc'>('date');
  const [minElo, setMinElo] = useState('');
  const [maxElo, setMaxElo] = useState('');
  const lo = minElo === '' ? -Infinity : Number(minElo);
  const hi = maxElo === '' ? Infinity : Number(maxElo);
  const shown = sched
    .filter((x) => fmts[x.def.format] && (showLocked || (!x.reason && x.def.level <= (x.def.format === 'classical' ? P.rating : P[x.def.format].rating) + 350)))
    .filter((x) => x.def.level >= lo && x.def.level <= hi)
    .sort((a, b) => {
      if (sortBy === 'elo-desc') return b.def.level - a.def.level || a.weeks[0]! - b.weeks[0]!;
      if (sortBy === 'elo-asc') return a.def.level - b.def.level || a.weeks[0]! - b.weeks[0]!;
      return a.weeks[0]! - b.weeks[0]!;
    });
  const leagues = shown.filter((x) => x.def.league);
  const events = shown.filter((x) => !x.def.league);
  const span = (id: string) => {
    const x = sched.find((y) => y.def.id === id)!;
    return [x.weeks[0]!, x.weeks[0]! + x.def.window - 1] as const;
  };
  const conflictsOf = (id: string) => {
    const [a0, a1] = span(id);
    return sched.filter((y) => !y.def.league && y.def.id !== id && (times[y.def.id] ?? 0) > 0).filter((y) => {
      const [b0, b1] = span(y.def.id);
      return a0 <= b1 && b0 <= a1;
    });
  };
  const chosenEvents = sched.filter((x) => !x.def.league && (times[x.def.id] ?? 0) > 0).sort((a, b) => a.weeks[0]! - b.weeks[0]!);
  const MONTHS = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
  const monthOf = (w: number) => MONTHS[Math.min(11, Math.floor((w / 52) * 12))];

  const [presetNote, setPresetNote] = useState('');
  const ratingOfFmt = (f: 'classical' | 'rapid' | 'blitz') => (f === 'classical' ? P.rating : P[f].rating);
  const PRESETS: { id: string; label: string; hint: string }[] = [
    { id: 'ranking', label: 'Optymalnie pod ranking', hint: 'Do 16 imprez o sile zbliżonej do Twojej (najlepiej klasyczne i z dużą liczbą rund) plus ligi na Twoim poziomie. Bez kolizji terminów.' },
    { id: 'all', label: 'Wszystkie możliwe', hint: 'Każda dostępna impreza, której termin nie koliduje z wcześniejszą, w granicach pieniędzy na wpisowe. Dużo gry i zmęczenia.' },
    { id: 'free', label: 'Wszystkie darmowe', hint: 'Tylko imprezy bez wpisowego (bez kolizji terminów).' },
    { id: 'norms', label: 'Pod normy i kategorie', hint: 'Do 10 imprez z normą na kategorię wyższą niż Twoja albo z normą FIDE.' },
    { id: 'money', label: 'Pod nagrody', hint: 'Do 12 imprez z najwyższymi nagrodami, jakie możesz zagrać.' },
    { id: 'major', label: 'Tylko ważne', hint: 'Mistrzostwa i imprezy elitarne, w których gra zatrzymuje się na decydujących rundach.' },
    { id: 'clear', label: 'Wyczyść', hint: 'Odznacza wszystkie turnieje i ligi.' },
  ];
  const applyPreset = (kind: string) => {
    // presety działają na widocznych imprezach (zgodnie z filtrami tempa i poziomu)
    const visible = (x: (typeof sched)[number]) => !x.reason && !!fmts[x.def.format] && (showLocked || x.def.level <= ratingOfFmt(x.def.format) + 350);
    const cands = sched.filter((x) => visible(x) && !x.def.league);
    const leagueCands = sched.filter((x) => visible(x) && x.def.league);
    let ordered = [...cands];
    let limit = Infinity;
    let leagueTimes = 0;
    let leagueFilter = (_l: (typeof sched)[number]) => true;
    if (kind === 'clear') {
      setTimes({});
      setPresetNote('Wyczyszczono plan turniejów.');
      return;
    }
    if (kind === 'ranking') {
      const score = (x: (typeof sched)[number]) => {
        const fit = 1 - Math.min(1, Math.abs(x.def.level - (ratingOfFmt(x.def.format) + 80)) / 350);
        const fmtW = x.def.format === 'classical' ? 1.25 : x.def.format === 'rapid' ? 1 : 0.8;
        return fit < 0.15 ? 0 : x.def.rounds * fit * fmtW * (x.def.major ? 1.2 : 1);
      };
      ordered = cands.filter((x) => score(x) > 0).sort((a, b) => score(b) - score(a));
      limit = 16;
      leagueTimes = 8;
      leagueFilter = (l) => Math.abs(l.def.level - P.rating) <= 300;
    } else if (kind === 'all') {
      ordered = cands.sort((a, b) => b.def.prize - a.def.prize || b.def.rounds - a.def.rounds);
      leagueTimes = 10;
    } else if (kind === 'free') {
      ordered = cands.filter((x) => x.def.fee === 0).sort((a, b) => b.def.rounds - a.def.rounds || b.def.prize - a.def.prize);
      leagueTimes = 10;
      leagueFilter = (l) => l.def.fee === 0;
    } else if (kind === 'norms') {
      ordered = cands
        .filter((x) => !!x.def.fideNorm || (x.def.norm && catIndex(x.def.norm) > catIndex(P.category)))
        .sort((a, b) => (b.def.fideNorm ? 99 : catIndex(b.def.norm!)) - (a.def.fideNorm ? 99 : catIndex(a.def.norm!)) || b.def.level - a.def.level);
      limit = 10;
    } else if (kind === 'money') {
      ordered = cands.sort((a, b) => b.def.prize - a.def.prize);
      limit = 12;
    } else if (kind === 'major') {
      ordered = cands.filter((x) => x.def.major).sort((a, b) => b.def.level - a.def.level);
    }
    const chosen: Record<string, number> = {};
    const spans: [number, number][] = [];
    let fees = 0;
    let count = 0;
    for (const x of ordered) {
      if (count >= limit) break;
      const a0 = x.weeks[0]!;
      const a1 = a0 + x.def.window - 1;
      if (spans.some(([b0, b1]) => a0 <= b1 && b0 <= a1)) continue;
      if (fees + x.def.fee > P.money) continue;
      chosen[x.def.id] = 1;
      spans.push([a0, a1]);
      fees += x.def.fee;
      count++;
    }
    let leaguesAdded = 0;
    if (leagueTimes > 0) {
      for (const l of leagueCands.filter(leagueFilter)) {
        chosen[l.def.id] = Math.min(l.weeks.length, leagueTimes);
        leaguesAdded++;
      }
    }
    setTimes(chosen);
    const label = PRESETS.find((x) => x.id === kind)!.label;
    setPresetNote(`${label}: ustawiono ${count} imprez${leaguesAdded ? ` i ${leaguesAdded} lig` : ''}${count === 0 && leaguesAdded === 0 ? ' (nic nie pasuje do Twojej sytuacji)' : ''}. Wpisowe łącznie: ${fees} zł.`);
  };

  const setSlot = (i: number, k: string) => setTraining((t) => t.map((x, j) => (j === i ? parseKey(k) : x)));
  const addSlot = () => setTraining((t) => (t.length < MAX_TRAIN_ITEMS ? [...t, null] : t));
  const removeSlot = (i: number) => setTraining((t) => t.filter((_, j) => j !== i));
  const bump = (id: string, d: number, max: number) => setTimes((t) => ({ ...t, [id]: Math.max(0, Math.min(max, (t[id] ?? 0) + d)) }));

  const start = () => {
    dispatch({
      type: 'plan',
      training: items,
      tournaments: Object.entries(times).filter(([, n]) => n > 0).map(([id, n]) => ({ id, times: n })),
      setup,
      phase,
    });
    dispatch({ type: 'advance' });
  };

  const sum = s.yearSummary;
  const ratingName = ['klasyczny', 'szybki', 'błyskawiczny'];

  return (
    <>
      {sum && weekOfYear === 0 && (
        <div className="panel">
          <h3><Icon name="trophy" /> Podsumowanie roku {sum.year}</h3>
          <p>
            Rankingi:{' '}
            {sum.rating.map((r, i) => (
              <span key={i} className="num">
                {ratingName[i]} <b>{r}</b> <span className={sum.ratingDelta[i]! >= 0 ? 'good' : 'bad'}>({sum.ratingDelta[i]! >= 0 ? '+' : ''}{sum.ratingDelta[i]})</span>
                {i < 2 ? ' · ' : ''}
              </span>
            ))}
          </p>
          <p className="muted">
            Turnieje: {sum.tournaments} · Pieniądze: {sum.money >= 0 ? '+' : ''}{sum.money} zł · Umiejętności:{' '}
            {Object.entries(sum.skillGains).map(([k, v]) => `${SKILL_LABELS[k as SkillKey]} ${v! >= 0 ? '+' : ''}${fmt1(v!)}`).join(', ') || 'bez zmian'}
          </p>
          {sum.news.length > 0 && (
            <div>
              <h4>Ważne wydarzenia</h4>
              {sum.news.map((n, i) => <div key={i} className="good"><Icon name="star" filled /> {n}</div>)}
            </div>
          )}
          <details open={sum.results.length <= 12}>
            <summary>Wszystkie turnieje roku ({sum.results.length})</summary>
            <div className="scroll">
              <table>
                <tbody>
                  {sum.results.map((h, i) => (
                    <tr key={i}>
                      <td><FormatIcon f={h.format} /></td>
                      <td>{h.name}</td>
                      <td className="num">{String(h.score).replace('.', ',')}/{h.rounds}</td>
                      <td>{h.place ? `m. ${h.place}/${h.field}` : 'mecz'}</td>
                      <td className={`num ${h.ratingDelta >= 0 ? 'good' : 'bad'}`}>{h.ratingDelta >= 0 ? '+' : ''}{h.ratingDelta}</td>
                      <td className="num">{h.prize ? `${h.prize} zł` : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}

      <div className="panel train">
        <div className="train-head">
          <h3><Icon name="book" /> Trening</h3>
          <div className="train-chips">
            <span className="chip">Pozycje <b>{items.length}/{MAX_TRAIN_ITEMS}</b></span>
            <span className="chip">Tygodnie treningu <b>ok. {trainWeeks}</b></span>
            {items.length > 0 && <span className="chip">Czas na pozycję <b>{Math.round(100 / items.length)}%</b></span>}
          </div>
        </div>
        <p className="muted">Pozycje dzielą między siebie tygodniowy czas treningu. Jedna pozycja uczy się najszybciej, trzy po jednej trzeciej czasu każda (suma przyrostu ta sama). Reszta roku to turnieje i regeneracja.</p>

        <h4 className="train-sub">Faza roku</h4>
        <div className="phases" role="radiogroup" aria-label="Faza roku">
          {(Object.keys(PHASE_FX) as Phase[]).map((p) => {
            const fx = PHASE_FX[p];
            return (
              <button key={p} type="button" role="radio" aria-checked={phase === p} className={`phasecard ${phase === p ? 'on' : ''}`} onClick={() => setPhase(p)}>
                <b>{fx.label}</b>
                <span className="pc-tags">
                  <span className={fx.train > 1 ? 'good' : fx.train < 1 ? 'bad' : ''}>Nauka {fx.train === 1 ? 'bez zmian' : `${fx.train > 1 ? '+' : ''}${Math.round((fx.train - 1) * 100)}%`}</span>
                  <span className={fx.game > 0 ? 'good' : fx.game < 0 ? 'bad' : ''}>W partiach {fx.game === 0 ? 'bez zmian' : `${fx.game > 0 ? '+' : ''}${fx.game} pkt rankingu`}</span>
                  <span className={fx.fatigue > 13 ? 'bad' : fx.fatigue < 13 ? 'good' : ''}>Zmęczenie {fx.fatigue === 13 ? 'normalne' : fx.fatigue > 13 ? 'wyższe' : 'niższe'}</span>
                </span>
              </button>
            );
          })}
        </div>

        <p className="muted">„Pkt rankingu” w partiach: w każdej partii turnieju grasz tak, jakbyś miał ranking wyższy (+) albo niższy (-) o tyle punktów. 5 pkt to ok. 0,7% punktu na partię, więc to subtelna zmiana, która nakłada się z całego roku.</p>

        <h4 className="train-sub">Pozycje treningu</h4>
        <div className="tslots">
          {(() => {
            let idx = -1;
            return training.map((it, i) => {
              if (it) idx++;
              const f = it ? forecast[idx] : undefined;
              const showBar = f && (it!.kind === 'skill' || it!.kind === 'study');
              return (
                <div key={i} className="tslot">
                  <div className="tslot-top">
                    <span className="muted">Pozycja {i + 1}</span>
                    <button className="ghost small" onClick={() => removeSlot(i)} aria-label={`Usuń pozycję ${i + 1}`}>Usuń</button>
                  </div>
                  <select value={itemKey(it)} onChange={(e) => setSlot(i, e.target.value)} aria-label={`Pozycja treningu ${i + 1}`}>
                    <option value="">- wybierz -</option>
                    <optgroup label="Umiejętności">
                      {SKILL_KEYS.map((k) => <option key={k} value={`skill:${k}`}>{SKILL_LABELS[k]} (teraz {fmt1(P.skills[k])})</option>)}
                    </optgroup>
                    <optgroup label="Nauka debiutu (teoria)">
                      {CARDS.map((c) => <option key={c.id} value={`study:${c.id}`}>{c.side === 'w' ? 'Białe' : 'Czarne'}: {c.name} · {Math.round(s.cards[c.id]?.mastery ?? 0)}</option>)}
                    </optgroup>
                    <optgroup label="Inne">
                      <option value="analyze">Analiza własnych porażek</option>
                    </optgroup>
                  </select>
                  {it && <div className="muted tslot-hint">{itemHint(it)}</div>}
                  {showBar && f && (
                    <div className="proj" role="status" aria-live="polite">
                      <div className="proj-bar" aria-hidden="true">
                        <span className="proj-to" style={{ inlineSize: `${Math.min(100, f.to)}%` }} />
                        <span className="proj-from" style={{ inlineSize: `${Math.min(100, f.from)}%` }} />
                      </div>
                      <div className="proj-text num">{fmt1(f.from)} → <b>{fmt1(f.to)}</b> <span className="good">(+{fmt1(f.to - f.from)})</span></div>
                    </div>
                  )}
                  {f && !showBar && <div className="muted tslot-hint">{f.note}</div>}
                </div>
              );
            });
          })()}
          {training.length < MAX_TRAIN_ITEMS && (
            <button type="button" className="tslot add" onClick={addSlot}>
              <Icon name="star" /> Dodaj pozycję treningu
            </button>
          )}
        </div>
        {items.length > 0 && <p className="muted">Pasek pokazuje stan teraz (ciemny) i prognozę do końca roku (jasny). Prognoza jest średnia: nie uwzględnia losowości, wydarzeń i spadku wartości przy zmęczeniu.</p>}

        <h4 className="train-sub">Trener</h4>
        <div className="coachrow">
          <select value={P.coach ?? ''} onChange={(e) => dispatch({ type: 'coach', id: e.target.value || null })} aria-label="Trener">
            <option value="">Bez trenera</option>
            {COACHES.map((c) => (
              <option key={c.id} value={c.id} disabled={P.rating < c.minRating}>
                {c.name} · {c.cost} zł{P.rating < c.minRating ? ` · od ${c.minRating}` : ''}
              </option>
            ))}
          </select>
          <span className="muted">
            {P.coach
              ? (() => { const c = COACHES.find((x) => x.id === P.coach)!; return c.skills === 'all' ? `Przyspiesza naukę wszystkiego (×${c.mult}), debiutów ×${c.openings}.` : `Przyspiesza: ${c.skills.map((k) => SKILL_LABELS[k as SkillKey]).join(', ')} (×${c.mult}); debiuty ×${c.openings}.`; })()
              : 'Trener przyspiesza naukę. Koszt (w zł) płacisz co tydzień; wyższy trener wymaga odpowiedniego rankingu.'}
          </span>
        </div>
      </div>

      {P.rating >= 2000 && (
        <div className="panel">
          <h3><Icon name="users" /> Zespół</h3>
          <p className="muted">Dostępny od rankingu 2000. Pensje płacisz co tydzień, a przy zatrudnieniu potrzebujesz zapasu na 4 tygodnie.</p>
          {STAFF.map((st) => {
            const hired = P.staff.includes(st.id);
            const locked = P.rating < st.minRating;
            return (
              <div key={st.id} className="staffrow">
                <div>
                  <b>{st.name}</b> <span className="muted">{st.cost} zł/tydz.{locked ? ` (od rankingu ${st.minRating})` : ''}</span>
                  <div className="muted">{st.desc}</div>
                </div>
                <button className={hired ? 'ghost small' : 'small'} disabled={!hired && (locked || P.money < st.cost * 4)} onClick={() => dispatch({ type: 'staff', id: st.id })}>{hired ? 'Zwolnij' : 'Zatrudnij'}</button>
              </div>
            );
          })}
        </div>
      )}

      <div className="panel">
        <h3><Icon name="trophy" /> Kalendarz turniejów ({totalStarts} {startsWord(totalStarts)})</h3>
        <p className="muted">
          Każdy turniej odbywa się raz w roku, w stałym terminie i mieście. Zaznacz, w których chcesz zagrać. Dwóch imprez w tym samym terminie nie da się połączyć. Przed ważnymi momentami turnieju gra się zatrzyma, resztę rozegra automatycznie.
        </p>
        <p className="muted">Szybkie ustawienia (działają na widocznych imprezach, czyli zgodnie z filtrami poniżej):</p>
        <div className="presets" role="group" aria-label="Szybkie ustawienia kalendarza">
          {PRESETS.map((pr) => (
            <button key={pr.id} className="ghost preset" onClick={() => applyPreset(pr.id)} title={pr.hint}>
              <b>{pr.label}</b>
              <span className="hint">{pr.hint}</span>
            </button>
          ))}
        </div>
        <div className="muted" role="status" aria-live="polite">{presetNote}</div>
        {chosenEvents.length > 0 && (
          <div className="chosen" aria-label="Wybrane turnieje w kolejności terminów">
            {chosenEvents.map((x) => (
              <span key={x.def.id} className="tag norm">tydz. {x.weeks[0]! + 1} ({monthOf(x.weeks[0]!)}): {x.def.name}</span>
            ))}
          </div>
        )}
        <div className="row filters">
          {(['classical', 'rapid', 'blitz'] as const).map((f) => (
            <label key={f} className={`filter ${fmts[f] ? 'on' : ''}`}>
              <input type="checkbox" checked={!!fmts[f]} onChange={(e) => setFmts((m) => ({ ...m, [f]: e.target.checked }))} /> {FORMAT_LABELS[f]}
            </label>
          ))}
          <label className={`filter ${showLocked ? 'on' : ''}`}>
            <input type="checkbox" checked={showLocked} onChange={(e) => setShowLocked(e.target.checked)} /> Pokaż też niedostępne i za trudne
          </label>
          <span className="muted">{events.length} imprez, {leagues.length} lig</span>
        </div>
        <div className="elobar" role="group" aria-label="Sortowanie i filtr średniego elo">
          <div className="eb-group">
            <span className="eb-label">Sortuj</span>
            <div className="seg">
              {([['date', 'Termin'], ['elo-desc', 'Elo od najwyższego'], ['elo-asc', 'Elo od najniższego']] as const).map(([v, label]) => (
                <label key={v}>
                  <input type="radio" name="tsort" checked={sortBy === v} onChange={() => setSortBy(v)} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="eb-group">
            <span className="eb-label">Średnie elo rywali</span>
            <div className="eb-range">
              <input type="number" inputMode="numeric" min={0} max={3000} step={50} placeholder="od" aria-label="Średnie elo od" value={minElo} onChange={(e) => setMinElo(e.target.value)} />
              <span aria-hidden="true">-</span>
              <input type="number" inputMode="numeric" min={0} max={3000} step={50} placeholder="do" aria-label="Średnie elo do" value={maxElo} onChange={(e) => setMaxElo(e.target.value)} />
              {(sortBy !== 'date' || minElo !== '' || maxElo !== '') && (
                <button type="button" className="ghost small" onClick={() => { setSortBy('date'); setMinElo(''); setMaxElo(''); }}>Wyczyść</button>
              )}
            </div>
            <div className="eb-chips">
              {([['do 1400', '', '1400'], ['1400-1800', '1400', '1800'], ['1800-2200', '1800', '2200'], ['2200-2600', '2200', '2600'], ['2600+', '2600', '']] as const).map(([label, from, to]) => (
                <button key={label} type="button" className={`chipbtn ${minElo === from && maxElo === to ? 'on' : ''}`} aria-pressed={minElo === from && maxElo === to} onClick={() => { const on = minElo === from && maxElo === to; setMinElo(on ? '' : from); setMaxElo(on ? '' : to); }}>{label}</button>
              ))}
            </div>
          </div>
        </div>

        {leagues.length > 0 && (
          <>
            <h4 style={{ marginBlockStart: 12 }}>Ligi (sezon meczów)</h4>
            <div className="tgrid">
              {leagues.map(({ def, weeks, reason }) => {
                const n = times[def.id] ?? 0;
                const max = Math.min(weeks.length, 12);
                return (
                  <div key={def.id} className={`tcard ${reason ? 'locked' : ''} ${n > 0 ? 'picked' : ''}`}>
                    <h4>{def.name}{def.women && <span className="good"><Icon name="female" label="tylko dla kobiet" /></span>}</h4>
                    <div className="tags"><FormatTag f={def.format} /><span className="tag league"><Icon name="flag" /> liga</span></div>
                    <div className="blurb">{def.blurb}</div>
                    <div className="muted">Średni ranking rywali ~{def.level} · mecz co kilka tygodni ({weeks.length} w tym roku)</div>
                    <div className="foot">
                      <span>ryczałt {def.prize} zł za mecz + premia za sezon</span>
                      {reason ? (
                        <span className="bad">{reason}</span>
                      ) : (
                        <span className="stepper" role="group" aria-label={`Liczba meczów: ${def.name}`}>
                          <button className="ghost small" onClick={() => bump(def.id, -1, max)} disabled={n === 0} aria-label="Mniej meczów">−</button>
                          <b className="num" aria-live="polite">{n}</b>
                          <button className="small" onClick={() => bump(def.id, 1, max)} disabled={n >= max} aria-label="Więcej meczów">+</button>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <h4 style={{ marginBlockStart: 14 }}>Imprezy (w kolejności terminów)</h4>
        {events.length === 0 && <p className="muted">Brak imprez dla wybranych filtrów w tym roku.</p>}
        <div className="tgrid">
          {events.map(({ def, weeks, reason }, idx) => {
            const n = times[def.id] ?? 0;
            const conflicts = n === 0 ? conflictsOf(def.id) : [];
            const blocked = !!reason || conflicts.length > 0;
            return (
              <div key={def.id} className={`tcard ${reason ? 'locked' : ''} ${n > 0 ? 'picked' : ''}`} style={{ ['--i' as string]: Math.min(idx, 12) }}>
                <h4>{def.name}{def.women && <span className="good"><Icon name="female" label="tylko dla kobiet" /></span>}</h4>
                <div className="tags">
                  <span className="tag"><Icon name="calendar" /> tydz. {weeks[0]! + 1} ({monthOf(weeks[0]!)})</span>
                  <FormatTag f={def.format} />
                  <span className="tag">{def.rounds} rund</span>
                  {def.major && <span className="tag league"><Icon name="trophy" /> ważny</span>}
                  {def.team && <span className="tag team"><Icon name="users" /> drużynowy</span>}
                  {def.norm && <span className="tag norm"><Icon name="shield" /> norma: {CATEGORY_BY_ID[def.norm]!.name.replace(' kategoria', '')}</span>}
                  {def.fideNorm && <span className="tag norm"><Icon name="shield" /> norma {def.fideNorm}</span>}
                </div>
                <div className="blurb">{def.blurb}</div>
                <div className="muted">
                  Średni ranking rywali ~{def.level}
                  {def.minRating > 0 ? ` · od rankingu ${def.minRating}` : ''}
                  {def.maxRating < 9999 ? ` · do ${def.maxRating}` : ''}
                  {def.minAge ? ` · od ${def.minAge} lat` : ''}
                  {def.maxAge ? ` · do ${def.maxAge} lat` : ''}
                </div>
                <div className="foot">
                  <span>wpis {def.fee} zł · nagroda do {def.prize} zł</span>
                  {reason ? (
                    <span className="bad">{reason}</span>
                  ) : (
                    <button
                      className={`small ${n > 0 ? '' : 'ghost'}`}
                      aria-pressed={n > 0}
                      disabled={blocked && n === 0}
                      title={conflicts.length ? `Kolizja terminów z: ${conflicts.map((c) => c.def.name).join(', ')}` : undefined}
                      onClick={() => setTimes((t) => ({ ...t, [def.id]: n > 0 ? 0 : 1 }))}
                    >
                      {n > 0 ? 'Zapisany' : conflicts.length ? 'Kolizja terminu' : 'Zapisz się'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="panel">
        <h3><Icon name="pawn" /> Przygotowanie debiutowe na turnieje</h3>
        <p className="muted">W zwykłych rundach grasz tym planem. W ważnych rundach możesz go zmienić.</p>
        <SetupForm s={s} setup={setup} onChange={setSetup} part="both" />
      </div>

      <div className="panel event">
        <button onClick={start}>{weekOfYear > 0 ? `Kontynuuj rok (tydzień ${weekOfYear + 1}/52)` : `Rozpocznij rok ${year + 1}`}</button>
        <p className="muted">
          Co się stanie: czas poleci do przodu tydzień po tygodniu. Trening idzie według planu, a gra zatrzyma się, gdy zacznie się zaplanowany turniej, pojawi się wydarzenie albo skończy się rok.
        </p>
      </div>
    </>
  );
}
