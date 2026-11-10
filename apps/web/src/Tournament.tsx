import { useEffect, useState } from 'react';
import {
  CARD_BY_ID,
  DECIDER_PL,
  expected,
  FORMAT_LABELS,
  GROUP_LABELS,
  GROUPS,
  opponentView,
  type CareerState,
  type Group,
  type Setup,
} from '@chess/engine';
import { SetupForm } from './SetupForm';
import { Icon, Piece } from './ui';
import { useGame } from './store';

export function Tournament({ s }: { s: CareerState }) {
  const run = s.run!;
  const dispatch = useGame((x) => x.dispatch);
  const [setup, setSetup] = useState<Setup>(() => structuredClone(run.setup));
  // głębokie przygotowanie dotyczy jednej partii: po każdej rundzie czyścimy wybór
  useEffect(() => setSetup((p) => (p.focus ? { ...p, focus: null } : p)), [run.games.length]);
  const score = run.games.reduce((a, g) => a + g.result, 0);
  const cur = run.current;
  const dayInfo =
    run.format === 'classical' && cur
      ? `dzień ${cur.day + 1}/${run.days.length}${cur.size === 2 ? `, partia ${cur.slot + 1} z 2 tego dnia` : ''}`
      : run.format === 'classical'
        ? ''
        : 'wszystkie rundy jednego dnia';

  const header = (
    <div className="panel">
      <h2>{run.name}</h2>
      <div className="muted">
        {FORMAT_LABELS[run.format]} · runda {Math.min(run.games.length + (run.status === 'prep' ? 1 : 0), run.rounds)}/{run.rounds} · uczestników: {run.fieldSize} · wynik <b>{score}</b>
        {dayInfo && <> · {dayInfo}</>}
        {' '}· zmęczenie: {Math.round(s.player.fatigue)}
      </div>
      <div className="dots">
        {Array.from({ length: run.rounds }, (_, i) => {
          const g = run.games[i];
          const cls = g ? (g.result === 1 ? 'w' : g.result === 0.5 ? 'd' : 'l') : '';
          return <span key={i} className={`dot ${cls} ${!g && i === run.games.length ? 'now' : ''}`} title={g ? `${g.oppName} (${g.oppRating})` : `runda ${i + 1}`} />;
        })}
      </div>
    </div>
  );

  if (run.status === 'done') {
    return (
      <>
        {header}
        <div className="panel">
          <h3>Koniec turnieju</h3>
          <p>
            {run.league ? <b>Mecz ligowy rozegrany</b> : <>Miejsce <b>{run.place}</b> / {run.fieldSize}{run.team ? ' (drużyna)' : ''}</>} · ranking {run.ratingDelta! >= 0 ? '+' : ''}
            {run.ratingDelta} ({FORMAT_LABELS[run.format].toLowerCase()}) · nagroda {run.prizeWon} zł
          </p>
          {(run.notes ?? []).map((n) => (
            <p key={n} className="good"><Icon name="star" filled /> {n}</p>
          ))}
          <button onClick={() => dispatch({ type: 'continue' })}>Kontynuuj rok</button>
        </div>
        <Games s={s} />
      </>
    );
  }

  if (run.status === 'result') {
    const g = run.games[run.games.length - 1]!;
    const last = run.games.length >= run.rounds;
    return (
      <>
        {header}
        <div className="panel">
          <h3 className={g.result === 1 ? 'good' : g.result === 0 ? 'bad' : ''}>
            {g.result === 1 ? 'Wygrana' : g.result === 0.5 ? 'Remis' : g.flagged ? 'Porażka na czas' : 'Porażka'} z {g.oppName} ({g.oppRating})
          </h3>
          {g.text.map((t, i) => (
            <p key={i}>{t}</p>
          ))}
          <p className="muted">
            Różnica sił {g.diff >= 0 ? '+' : ''}{g.diff} · przewaga debiutowa {g.edge >= 0 ? '+' : ''}{g.edge} · szanse W/R/P: {Math.round(g.pWin * 100)}/{Math.round(g.pDraw * 100)}/{Math.round(g.pLoss * 100)}% · ryzyko niedoczasu {Math.round(g.flagRisk * 100)}%
            <br />
            Tempo: {g.myTempo === 'push' ? 'dociskasz zegar' : 'spokojnie'}{g.oppPush ? ' · rywal dociska Cię zegarem' : ''}{g.oppFlagged ? ' · rywal przekroczył czas' : ''}
            <br />
            Zmęczenie: Ty {g.myFatigue}, rywal {g.oppFatigue}{g.rushed ? ' · skrócone przygotowanie (druga partia dnia)' : ''}
          </p>
          <button onClick={() => dispatch({ type: 'next' })}>{last ? 'Zakończ turniej' : 'Następna runda'}</button>{' '}
          {!last && <button className="ghost" onClick={() => confirm('Wycofać się z turnieju?') && dispatch({ type: 'withdraw' })}>Wycofaj się</button>}
        </div>
        <Games s={s} />
      </>
    );
  }

  // prep
  const c = cur!;
  const view = opponentView(s, c.oppId, c.scouted);

  const oppBox = (
    <>
      <h3>
        Przeciwnik: {view.opp.title} {view.opp.name} ({view.opp.rating}) <span className="muted nat">{view.opp.nat}</span>
      </h3>
      <div className="muted">
        {view.opp.age} lat · styl: {view.opp.style} · grasz {c.color === 'w' ? 'białymi' : 'czarnymi'} · wasze partie: {view.games}
        {view.h2h && <> · bilans z nim: <b>{view.h2h.w}-{view.h2h.d}-{view.h2h.l}</b>{view.h2h.nemesis && <span className="bad"> (nemezis - przygotował się na Ciebie)</span>}</>}
      </div>
    </>
  );

  // zwykła runda: gramy planem wybranym przed turniejem
  if (!c.important) {
    return (
      <>
        {header}
        <div className="panel">
          {oppBox}
          <p className="muted">
            Zwykła runda - grasz planem z turnieju: {CARD_BY_ID[run.setup.white]!.name} (białe), obrony wg ustawień.
            {c.rushed ? ' Druga partia dnia: mało czasu na przygotowanie i większe zmęczenie.' : ''}
          </p>
          <button onClick={() => dispatch({ type: 'play' })}>Zagraj partię</button>{' '}
          <button className="ghost" onClick={() => dispatch({ type: 'skip' })}>Zagraj do następnej ważnej rundy</button>
        </div>
        <Games s={s} />
      </>
    );
  }

  const part = c.color === 'w' ? 'w' : 'b';
  const focusOptions = view.exact
    ? c.color === 'w'
      ? view.exact.black.filter((l) => l.group === CARD_BY_ID[setup.white]!.group)
      : view.exact.white
    : [];
  const myRating = run.format === 'classical' ? s.player.rating : s.player[run.format].rating;
  const ratingDiff = myRating - view.fmtRating;
  const expectedPts = expected(ratingDiff);
  return (
    <>
      {header}
      <div className="panel oppcard">
        <div className="banner"><b>Ważna runda:</b> {c.reason}. Możesz zmienić przygotowanie.</div>
        {oppBox}
        {c.rushed && <p className="bad">Druga partia dnia - brak czasu na skauting, przygotowanie zmniejszone, więcej zmęczenia.</p>}
        <div className="kpis">
          <div className="kpi">Różnica rankingu<b>{ratingDiff >= 0 ? '+' : ''}{ratingDiff}</b></div>
          <div className="kpi">Szansa na punkt (z rankingu)<b>ok. {Math.round(expectedPts * 100)}%</b></div>
          <div className="kpi">Dociska zegarem<b>{view.exact ? `${Math.round(view.exact.pushChance * 100)}%` : '?'}</b></div>
          <div className="kpi">Wasze partie<b>{view.games}</b></div>
        </div>
        {view.exact ? (
          <>
            <p className="muted repline-head">
              {c.color === 'w'
                ? `Czarnymi odpowiada na ${GROUP_LABELS[CARD_BY_ID[setup.white]!.group]}. Twoja znajomość ${CARD_BY_ID[setup.white]!.name}: ${Math.round(s.cards[setup.white]?.mastery ?? 0)}.`
                : 'Białymi gra przeciwko Tobie:'}
            </p>
            {focusOptions.map((l) => {
              const mine = c.color === 'b' ? Math.round(s.cards[setup.black[l.group as Group] ?? '']?.mastery ?? 0) : null;
              return (
                <div key={l.id} className="repline">
                  <span className="rl-name">{l.name}</span>
                  <span className="rl-bar"><span style={{ inlineSize: `${l.pct}%` }} /></span>
                  <span className="rl-pct">{l.pct}%</span>
                  {mine !== null && <span className={`rl-mine ${mine < 20 ? 'bad' : ''}`}>Ty: znajomość {mine}</span>}
                </div>
              );
            })}
            <div className="muted">Szansa na zaskoczenie rzadkim debiutem: ok. {Math.round(view.exact.deviation * 100)}% · odporność na presję {Math.round(view.exact.pressure)}</div>
          </>
        ) : (
          <>
            <p className="muted">{view.rumor}</p>
            {view.observed.length > 0 && <p>Widziałeś: {view.observed.map((l) => `${l.name} ×${l.pct}`).join(', ')}</p>}
            <button className="ghost" disabled={run.scouts <= 0 || c.rushed} onClick={() => dispatch({ type: 'scout' })}>
              Przygotowanie do rywala ({run.scouts} pkt)
            </button>
          </>
        )}
      </div>
      <div className="panel">
        <h3>Przygotowanie na tę partię</h3>
        <SetupForm s={s} setup={setup} onChange={setSetup} part={part} focus={view.exact && !c.rushed ? focusOptions : undefined} />
        <button onClick={() => dispatch({ type: 'play', setup })}>Zagraj partię</button>
      </div>
      <Games s={s} />
    </>
  );
}

function Games({ s }: { s: CareerState }) {
  const run = s.run!;
  if (!run.games.length) return null;
  return (
    <div className="panel">
      <h3>Dotychczasowe partie</h3>
      <table>
        <tbody>
          {run.games.map((g) => (
            <tr key={g.round}>
              <td>{g.round}</td>
              <td><Piece color={g.color} /></td>
              <td>{g.oppName} ({g.oppRating})</td>
              <td>{CARD_BY_ID[g.playerCard ?? '']?.name ?? '-'}</td>
              <td className={g.result === 1 ? 'good' : g.result === 0 ? 'bad' : ''}>{g.result === 0.5 ? '½' : g.result}</td>
              <td className="muted">{g.flagged ? 'czas' : DECIDER_PL[g.decider]}{g.surprise !== 'none' ? ` · ${g.surprise === 'opp-deviation' ? 'zaskoczenie' : 'bez przygotowania'}` : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
