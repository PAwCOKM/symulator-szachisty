import { useEffect, useState } from 'react';
import { CATEGORY_BY_ID, CITIES, DEFAULT_START, STARTS, ageOf, startDef } from '@chess/engine';
import { Icon } from './ui';
import { WHITE_CARDS, retireIfNeeded } from './helpers';
import { board, startOnline, type BoardPeriod, type BoardRow } from './api';
import { Game } from './Game';
import { flushPending, slotInfos, useGame, wipeSlot, type SlotInfo } from './store';

type Screen = 'home' | 'new' | 'game' | 'boards';

export function App() {
  const { career, load, clear, dispatch } = useGame();
  const [screen, setScreen] = useState<Screen>('home');
  const [newSlot, setNewSlot] = useState(0);
  const [infos, setInfos] = useState<SlotInfo[]>(() => slotInfos());
  const refresh = () => setInfos(slotInfos());
  const [flushed, setFlushed] = useState(0);
  useEffect(() => {
    void flushPending().then((n) => n && setFlushed(n));
  }, []);
  const home = () => {
    refresh();
    setScreen('home');
  };

  if (screen === 'game' && career)
    return (
      <Shell>
        <Game s={career} onExit={home} onFinished={() => { clear(); home(); }} />
        {!career.ended && ageOf(career) >= 20 && <p className="muted"><button className="ghost" onClick={() => confirm('Zakończyć karierę?') && dispatch({ type: 'retire' })}>Zakończ karierę</button></p>}
      </Shell>
    );
  if (screen === 'new') return <Shell><NewCareer slot={newSlot} onDone={() => setScreen('game')} onBack={home} /></Shell>;
  if (screen === 'boards') return <Shell><Boards onBack={home} /></Shell>;
  return (
    <Shell>
      <div className="panel hero">
        <h1><Icon name="pawn" /> Kariera Szachisty</h1>
        {flushed > 0 && <p role="status" className="good">Dosłano do rankingu zaległe wyniki: {flushed}.</p>}
        <p>Od klubowego turnieju do tytułu arcymistrza. Ucz się debiutów, przygotowuj się na rywali, zdobywaj normy i kategorie.</p>
        <div className="slots">
          {infos.map((i) => {
            if (i.empty) {
              return (
                <button key={i.slot} type="button" className="slotcard empty" onClick={() => { setNewSlot(i.slot); setScreen('new'); }}>
                  <span className="sc-label">Zapis {i.slot + 1}</span>
                  <span className="sc-plus" aria-hidden="true">+</span>
                  <b>Nowa kariera</b>
                  <span className="muted">Puste miejsce</span>
                </button>
              );
            }
            if (i.stale) {
              return (
                <div key={i.slot} className="slotcard stale">
                  <span className="sc-label">Zapis {i.slot + 1}</span>
                  <b>Zapis ze starej wersji</b>
                  <span className="muted">Tej kariery nie da się już wczytać, bo gra została zmieniona.</span>
                  <div className="sc-actions">
                    <button className="ghost" onClick={() => { wipeSlot(i.slot); refresh(); }}>Usuń zapis</button>
                  </div>
                </div>
              );
            }
            const initials = (i.name ?? '?').split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase();
            return (
              <div key={i.slot} className={`slotcard ${i.ended ? 'ended' : ''}`}>
                <div className="sc-top">
                  <span className="sc-label">Zapis {i.slot + 1}</span>
                  <span className={`sc-status ${i.ended ? 'done' : ''}`}>{i.ended ? 'Zakończona' : 'W toku'}</span>
                </div>
                <div className="sc-who">
                  <div className="avatar sc-avatar" aria-hidden="true">{initials}</div>
                  <div>
                    <b className="sc-name">{i.name}</b>
                    <div className="muted">{CATEGORY_BY_ID[i.category ?? 'none']?.name ?? ''}</div>
                  </div>
                </div>
                <dl className="sc-stats">
                  <div><dt>Wiek</dt><dd>{i.age}</dd></div>
                  <div><dt>Ranking</dt><dd>{i.rating}</dd></div>
                  <div><dt>Rok</dt><dd>{i.year}</dd></div>
                </dl>
                {!i.online && !i.ended && <div className="muted sc-note">Offline: bez rankingu</div>}
                <div className="sc-actions">
                  <button onClick={() => { if (load(i.slot)) setScreen('game'); }}>{i.ended ? 'Podsumowanie' : 'Kontynuuj'}</button>
                  <button className="ghost" onClick={() => { if (confirm('Usunąć ten zapis na stałe?')) { wipeSlot(i.slot); refresh(); } }}>Usuń</button>
                </div>
              </div>
            );
          })}
        </div>
        <p><button className="ghost" onClick={() => setScreen('boards')}>Pełne rankingi</button></p>
      </div>
      <div className="boards-home">
        <BoardPanel title="Ranking dnia" period="day" limit={10} />
        <BoardPanel title="Ranking tygodnia" period="week" limit={10} />
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="app">{children}</div>;
}

function NewCareer({ slot, onDone, onBack }: { slot: number; onDone: () => void; onBack: () => void }) {
  const start = useGame((x) => x.start);
  const [name, setName] = useState('Nowy Szachista');
  const [arch, setArch] = useState<'tactician' | 'positional' | 'allround'>('allround');
  const [gender, setGender] = useState<'m' | 'f'>('m');
  const [city, setCity] = useState('');
  const [startPick, setStartPick] = useState(DEFAULT_START);
  const [white, setWhite] = useState('italian');
  const [busy, setBusy] = useState(false);
  const startId = startPick;
  const sd = startDef(startPick);
  const go = async () => {
    setBusy(true);
    const on = await startOnline();
    const seed = on?.seed ?? Math.random().toString(36).slice(2) + Date.now().toString(36);
    start(slot, { name: name.trim() || 'Szachista', gender, start: startId, ...(city ? { city } : {}), archetype: arch, startWhite: white }, seed, on?.online ?? null);
    onDone();
  };
  return (
    <div className="panel form">
      <h2>Nowa kariera</h2>
      <div className="row"><label>Imię i nazwisko <input value={name} maxLength={24} onChange={(e) => setName(e.target.value)} /></label></div>
      <div className="row">
        <label>Płeć{' '}
          <select value={gender} onChange={(e) => setGender(e.target.value as 'm' | 'f')}>
            <option value="m">Mężczyzna</option>
            <option value="f">Kobieta (turnieje kobiece, własne progi kategorii i tytuły W)</option>
          </select>
        </label>
      </div>
      <div className="row">
        <label>Miasto{' '}
          <select value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">(losowe)</option>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>
      <div className="row">
        <label>Styl{' '}
          <select value={arch} onChange={(e) => setArch(e.target.value as typeof arch)}>
            <option value="allround">Uniwersalny</option>
            <option value="tactician">Taktyk (mocna taktyka i kalkulacja)</option>
            <option value="positional">Pozycyjniak (strategia, końcówki, zegar)</option>
          </select>
        </label>
      </div>
      <div className="row">
        <label>Pierwszy debiut białymi{' '}
          <select value={white} onChange={(e) => setWhite(e.target.value)}>
            {WHITE_CARDS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      </div>
      <fieldset className="starts">
        <legend>Punkt startowy</legend>
        {STARTS.map((st) => (
          <label key={st.id} className={`start ${startPick === st.id ? 'on' : ''}`}>
            <input type="radio" name="start" checked={startPick === st.id} onChange={() => setStartPick(st.id)} />
            <span className="start-text">
              <b>{st.name}</b>
              <span className="muted">{st.desc}</span>
            </span>
            <span className="mult" title="Mnożnik końcowego wyniku kariery">
              <small>wynik</small>
              <b>×{st.mult.toFixed(1).replace('.', ',')}</b>
            </span>
          </label>
        ))}
      </fieldset>
      <p className="muted">Zaczynasz w wieku {sd.startAge ?? 8} lat jako początkujący (pierwszy ranking po 5 partiach). Jeśli API działa, seed i ranking są online; inaczej gra offline.</p>
      <button disabled={busy} onClick={go}>Zaczynamy</button> <button className="ghost" onClick={onBack}>Wstecz</button>
    </div>
  );
}

function BoardPanel({ title, period, limit }: { title: string; period: BoardPeriod; limit?: number }) {
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    board('score', period).then(setRows).catch(() => setErr(true));
  }, [period]);
  return (
    <div className="panel">
      <h3>{title}</h3>
      {err && <p className="bad">Brak połączenia z API (uruchom: npm run dev:api).</p>}
      {rows && rows.length === 0 && <p className="muted">Nikt jeszcze nie skończył kariery w tym okresie.</p>}
      {rows && rows.length > 0 && (
        <table><tbody>
          {rows.slice(0, limit ?? 50).map((r) => <tr key={r.rank}><td>{r.rank}</td><td>{r.name}</td><td className="muted">max {r.peak}</td><td><b>{r.score}</b> pkt</td></tr>)}
        </tbody></table>
      )}
    </div>
  );
}

function Boards({ onBack }: { onBack: () => void }) {
  return (
    <div>
      <BoardPanel title="Ranking dnia (ostatnie 24 godziny)" period="day" />
      <BoardPanel title="Ranking tygodnia (ostatnie 7 dni)" period="week" />
      <BoardPanel title="Ranking wszech czasów" period="all" />
      <button className="ghost" onClick={onBack}>Wstecz</button>
    </div>
  );
}

void retireIfNeeded;
