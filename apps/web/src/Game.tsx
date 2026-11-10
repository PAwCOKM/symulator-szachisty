import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ACHIEVEMENTS,
  CARDS,
  CARD_BY_ID,
  CATEGORIES,
  CATEGORY_BY_ID,
  CLUB_NAMES,
  COACHES,
  EVENT_BY_ID,
  FIDE_NORM,
  FORMAT_LABELS,
  GROUP_LABELS,
  SKILL_HINTS,
  SKILL_MAX,
  SKILL_KEYS,
  SKILL_LABELS,
  ageOf,
  careerScore,
  catFor,
  chessTimeFactor,
  clubName,
  masteryLabel,
  ovrOf,
  playerStyle,
  ageStyleNote,
  INJURY_INFO,
  categoryStatus,
  startDef,
  tournamentOptions,
  type CareerState,
  type Card,
  type Setup,
} from '@chess/engine';
import { finishOnline } from './api';
import { Board } from './Board';
import { SetupForm } from './SetupForm';
import { Planner } from './Planner';
import { RatingChart } from './RatingChart';
import { Tournament } from './Tournament';
import { Stats } from './Stats';
import { downloadSummary } from './careerStats';
import { downloadPdf } from './pdfExport';
import { World } from './World';
import { useGame } from './store';
import { FormatIcon, FormatTag, Icon, Meter, Piece, type IconName } from './ui';

type Tab = 'week' | 'rep' | 'me' | 'stats' | 'world' | 'log' | 'ach';

function RatingChip({ f, rating, unrated, label }: { f: 'classical' | 'rapid' | 'blitz'; rating: number; unrated: boolean; label: string }) {
  return (
    <span className={`chip ${f}`} title={unrated ? `${label}: bez rankingu - po 5 partiach dostaniesz pierwszy` : label}>
      <FormatIcon f={f} /> {label} <b>{rating}{unrated ? '?' : ''}</b>
    </span>
  );
}

function Hud({ s }: { s: CareerState }) {
  const P = s.player;
  const initials = P.name.split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase();
  const coach = COACHES.find((c) => c.id === P.coach);
  const online = useGame((x) => x.online);
  return (
    <div className="hud">
      <div className="hud-top">
        <div className="avatar">{initials}</div>
        <div className="who">
          <b>{P.name}</b>
          <span className="muted">
            {ageOf(s)} lat · rok {Math.floor(s.week / 52) + 1}, tydz. {(s.week % 52) + 1} · {CATEGORY_BY_ID[P.category]!.name} · {clubName(P, P.club)}
          </span>
        </div>
        <div className="chips">
          <span className="chip ovr" title="Średnia wszystkich ośmiu statystyk (bez debiutów)">OVR <b>{ovrOf(P.skills)}</b></span>
          <RatingChip f="classical" rating={P.rating} unrated={P.unrated.classical} label="Klasyczne" />
          <RatingChip f="rapid" rating={P.rapid.rating} unrated={P.unrated.rapid} label="Szybkie" />
          <RatingChip f="blitz" rating={P.blitz.rating} unrated={P.unrated.blitz} label="Blitz" />
          <span className="chip money"><b>{P.money}</b> zł</span>
        </div>
      </div>
      <div className="hud-meters">
        <span className="m">Zmęczenie <Meter value={P.fatigue} warnHigh /> {Math.round(P.fatigue)}</span>
        <span className="m">Forma {P.form >= 0 ? '+' : ''}{P.form.toFixed(1)}</span>
        <span className="m" title="Szkoła, studia i praca ograniczają czas na trening">Czas na szachy <Meter value={chessTimeFactor(s) * 100} /> {Math.round(chessTimeFactor(s) * 100)}%</span>
        {coach && <span className="m">Trener: {coach.name}</span>}
        {!online && !s.ended && <span className="m bad" title="Kariera zaczęta bez połączenia z serwerem: jej wynik nie trafi do rankingu">Offline: bez rankingu</span>}
        {P.injury && s.week < P.injury.until && <span className="m bad" title={`${INJURY_INFO[P.injury.kind].desc} Wolniejsza nauka; poważna dolegliwość blokuje turnieje.`}>Dolegliwość: {P.injury.name} (jeszcze {P.injury.until - s.week} tyg.)</span>}
      </div>
    </div>
  );
}

export function Game({ s, onExit, onFinished }: { s: CareerState; onExit: () => void; onFinished: () => void }) {
  const [tab, setTab] = useState<Tab>('week');
  const err = useGame((x) => x.error);

  if (s.ended) return <Ended s={s} onFinished={onFinished} />;

  return (
    <div>
      <Hud s={s} />
      {err && <div className="panel bad">{err}</div>}
      {s.run ? (
        <Tournament s={s} />
      ) : (
        <>
          <div className="tabs">
            {([['week', 'Plan roku', 'calendar'], ['rep', 'Repertuar', 'book'], ['me', 'Zawodnik', 'user'], ['stats', 'Statystyki', 'list'], ['world', 'Świat', 'flag'], ['log', 'Kronika', 'list'], ['ach', 'Osiągnięcia', 'trophy']] as [Tab, string, IconName][]).map(([k, l, ic]) => (
              <button key={k} aria-current={tab === k ? 'page' : undefined} onClick={() => setTab(k)}><Icon name={ic} /> {l}</button>
            ))}
            <span className="spacer" />
            <button className="ghost" onClick={onExit}>Menu</button>
          </div>
          <div hidden={tab !== 'week'}>{s.event ? <EventPanel s={s} /> : <Planner key={`${s.week}-${s.plan.year}`} s={s} />}</div>
          {tab === 'rep' && <Repertoire s={s} />}
          {tab === 'me' && <Me s={s} />}
          {tab === 'stats' && <Stats s={s} />}
          {tab === 'world' && <World s={s} />}
          {tab === 'log' && (
            <div className="panel">
              {[...s.log].reverse().slice(0, 100).map((l, i) => (
                <div key={i}><span className="muted">rok {Math.floor(l.week / 52) + 1}, t.{(l.week % 52) + 1}</span> {l.text}</div>
              ))}
            </div>
          )}
          {tab === 'ach' && (
            <div className="panel">
              {ACHIEVEMENTS.map((a) => (
                <div key={a.id} className={s.achievements.includes(a.id) ? 'good' : 'muted'}>
                  <Icon name="star" filled={s.achievements.includes(a.id)} /> <b>{a.name}</b> - {a.desc}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EventPanel({ s }: { s: CareerState }) {
  const dispatch = useGame((x) => x.dispatch);
  const ev = EVENT_BY_ID[s.event!.id]!;
  return (
    <div className="panel event">
      <h3>{ev.title}</h3>
      <p>{ev.text}</p>
      <div className="opts">
        {ev.options.map((o, i) => (
          <button key={i} className={`opt ${i === 0 ? '' : 'ghost'}`} onClick={() => dispatch({ type: 'choose', index: i })}>
            <b>{o.label}</b>
            <span className="hint">{o.hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CardView({ c, s, sel, onPick }: { c: Card; s: CareerState; sel: boolean; onPick: () => void }) {
  const p = s.cards[c.id];
  const mastery = p?.mastery ?? 0;
  return (
    <div className="card" role="button" tabIndex={0} aria-pressed={sel} onClick={onPick} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(); } }}>
      <div className="top"><b>{c.name}</b> <span className="muted">{GROUP_LABELS[c.group]}</span></div>
      <Meter value={mastery} wide />
      <div className="muted">{masteryLabel(mastery)} ({Math.round(mastery)}) · partie {p?.games ?? 0} ({p ? `${p.wins}/${p.draws}/${p.losses}` : '-'})</div>
    </div>
  );
}

function Repertoire({ s }: { s: CareerState }) {
  const [sel, setSel] = useState<string>(s.setup.white);
  const c = CARD_BY_ID[sel]!;
  return (
    <div className="panel">
      <div className="cols">
        <div>
          <h3><Piece color="w" /> Białe</h3>
          {CARDS.filter((x) => x.side === 'w').map((x) => <CardView key={x.id} c={x} s={s} sel={sel === x.id} onPick={() => setSel(x.id)} />)}
          <h3 style={{ marginBlockStart: 14 }}><Piece color="b" /> Czarne</h3>
          {CARDS.filter((x) => x.side === 'b').map((x) => <CardView key={x.id} c={x} s={s} sel={sel === x.id} onPick={() => setSel(x.id)} />)}
        </div>
        <div className="sticky">
          <h3>{c.name}</h3>
          <Board moves={c.moves} size={36} />
          <p>{c.blurb}</p>
          <p className="muted">1. {c.moves.split(' ').join(' ')}<br />Ostrość: {Math.round(c.sharpness * 100)}% · wymagana teoria: {Math.round(c.theory * 100)}% · trudność nauki: {c.difficulty < 0.85 ? 'wysoka' : c.difficulty > 1.05 ? 'niska' : 'średnia'}</p>
        </div>
      </div>
    </div>
  );
}

function Me({ s }: { s: CareerState }) {
  const P = s.player;
  return (
    <>
      <div className="panel">
        <h3>Dochody i nagrody</h3>
        {P.grants.length === 0 ? (
          <p className="muted">Brak stałych dochodów (stypendia i kontrakty przychodzą za wyniki, kategorie i tytuły).</p>
        ) : (
          P.grants.map((g) => (
            <div key={g.id}>{g.name}: <b>+{g.perWeek} zł/tydz.</b>{g.expires < 90000 ? ` (do roku ${Math.floor(g.expires / 52) + 1})` : ''}</div>
          ))
        )}
        <div className="muted">Miasto: {P.city} · klub: {clubName(P, P.club)} · czas na szachy {Math.round(chessTimeFactor(s) * 100)}% (nauka/praca)</div>
      </div>
      <div className="panel">
        <h3>Umiejętności <span className="chip ovr">OVR <b>{ovrOf(P.skills)}</b></span></h3>
        {SKILL_KEYS.map((k) => (
          <div key={k} title={SKILL_HINTS[k]}>
            <span className="lbl">{SKILL_LABELS[k]}</span>
            <Meter value={P.skills[k]} max={SKILL_MAX} /> {P.skills[k].toFixed(1)}
            {s.weak[k] ? <span className="bad"> (słabość ×{s.weak[k]})</span> : null}
          </div>
        ))}
        <p className="muted">Wiek {ageOf(s)}: {ageStyleNote(ageOf(s))}</p>
        <p>Styl gry: <b>{playerStyle(s).label}</b> <span className="muted">(wynika z grywanych debiutów: ostre podbijają taktykę, spokojne strategię)</span></p>
        <p className="muted">Zarządzanie czasem: im słabsze, tym większe ryzyko przegranej na czas (najbardziej w blitzu i rapidzie). Odporność na presję czasu liczy się, gdy rywal dociska zegarem albo Ty dociskasz jego.</p>
      </div>
      <div className="panel">
        <h3>Kategorie i tytuły</h3>
        <p>Najwyższy obecnie: <b>{CATEGORY_BY_ID[P.category]!.name}</b></p>
        {(() => {
          const rows = categoryStatus(s);
          const show = (list: typeof rows) =>
            list.map((r) => (
              <div key={r.name} className={`titlerow ${r.achieved ? 'done' : ''}`}>
                <span className="tr-mark" aria-hidden="true">{r.achieved ? '✓' : '○'}</span>
                <span>
                  <b>{r.name}</b>
                  <span className="muted">{r.achieved ? ' - zdobyte' : ` - ${r.detail}`}</span>
                </span>
              </div>
            ));
          return (
            <>
              <h4>Polskie kategorie szachowe</h4>
              {show(rows.filter((r) => r.kind === 'polish'))}
              <h4>Tytuły FIDE</h4>
              {show(rows.filter((r) => r.kind === 'fide'))}
            </>
          );
        })()}
        {P.gender === 'f' && <div className="muted">Kobiety mogą grać w turniejach otwartych, ale tam rywale grają pełną siłą, a bramki wejścia liczą kategorie kobiece wg punktacji rankingowej.</div>}
        <p className="muted">Progi i liczba partii wg Regulaminu Klasyfikacyjnego PZSzach. Kategorie II-V to jedna norma, centralne (I, K, M) - wielokrotna. Polskie kategorie i tytuły FIDE to dwie osobne ścieżki: tytuł nie blokuje zbierania norm na kandydata i mistrza krajowego. CM/FM wynikają z rankingu 2200/2300; IM/GM = ranking + 3 normy FIDE.</p>
      </div>
      <div className="panel">
        <h3>Rankingi</h3>
        <p>
          Klasyczny <b>{P.rating}</b>{P.unrated.classical ? ' (bez rankingu - potrzeba 5 partii)' : ''} (max {P.peak}) · szybki <b>{P.rapid.rating}</b> (max {P.rapid.peak}, {P.rapid.games} partii) · błyskawiczny <b>{P.blitz.rating}</b> (max {P.blitz.peak}, {P.blitz.games} partii).
        </p>
        <RatingChart s={s} />
      </div>
      <div className="panel">
        <h3>Historia turniejów</h3>
        <table>
          <tbody>
            {[...s.history].reverse().slice(0, 30).map((h, i) => (
              <tr key={i}>
                <td className="muted">r{Math.floor(h.week / 52) + 1}</td>
                <td>{h.name} <span className="muted">({FORMAT_LABELS[h.format]})</span></td>
                <td>{h.score}/{h.rounds}</td>
                <td>{h.place ? `m. ${h.place}/${h.field}` : 'mecz'}</td>
                <td className={h.ratingDelta >= 0 ? 'good' : 'bad'}>{h.ratingDelta >= 0 ? '+' : ''}{h.ratingDelta}</td>
                <td>{h.prize ? `${h.prize} zł` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Ended({ s, onFinished }: { s: CareerState; onFinished: () => void }) {
  const { online, config, actions, submitted, markSubmitted } = useGame();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const sent = useRef(false);
  const send = useCallback(() => {
    if (submitted) {
      setMsg({ ok: true, text: 'Wynik został już wcześniej wysłany do rankingu.' });
      return;
    }
    if (!online || !config) {
      setMsg({ ok: false, text: 'Gra offline: ta kariera została zaczęta bez połączenia z serwerem, więc jej wynik nie trafi do rankingu.' });
      return;
    }
    setMsg(null);
    finishOnline(online, config, actions)
      .then((r) => {
        markSubmitted();
        setMsg({ ok: true, text: `Wynik wysłany do rankingu i zweryfikowany przez serwer: ${r.result.score} pkt.` });
      })
      .catch((e: Error) => {
        // 409: serwer już ma ten wynik (np. odpowiedź zgubiła się wcześniej)
        if (e.message.startsWith('409')) {
          markSubmitted();
          setMsg({ ok: true, text: 'Ten wynik jest już w rankingu.' });
        } else if (/^\d{3}/.test(e.message)) setMsg({ ok: false, text: `Serwer rankingu odrzucił wynik (kod ${e.message}). Jeśli to się powtarza, kariera mogła zostać zaczęta na innej wersji gry.` });
        else setMsg({ ok: false, text: `Nie udało się połączyć z serwerem rankingu (${e.message}). Spróbuj ponownie.` });
      });
  }, [online, config, actions, submitted, markSubmitted]);
  // wynik wysyłany jest automatycznie, bez pytania
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    send();
  }, [send]);
  return (
    <div className="panel">
      <h2>Koniec kariery</h2>
      <p>{s.endReason}</p>
      <p>
        Max ranking <b>{s.player.peak}</b> · {CATEGORY_BY_ID[s.player.category]!.name} · wygrane turnieje {s.stats.tournamentsWon} · wynik <b>{careerScore(s)}</b> <span className="muted">(start: {startDef(s.config.start).name}, mnożnik ×{startDef(s.config.start).mult.toFixed(1).replace('.', ',')})</span>
      </p>
      <p role="status" className={msg ? (msg.ok ? 'good' : 'bad') : 'muted'}>{msg ? msg.text : 'Wysyłanie wyniku do rankingu…'}</p>
      {msg && !msg.ok && online && !submitted && <p><button className="ghost" onClick={send}>Wyślij ponownie</button></p>}
      <div className="row">
        <button className="ghost" onClick={() => downloadSummary(s)}>Pobierz podsumowanie kariery (HTML)</button>
        <button className="ghost" onClick={() => downloadPdf(s)}>Pobierz PDF</button>
        <button onClick={onFinished}>Menu (usuwa ten zapis)</button>
      </div>
    </div>
  );
}
