import { FORMAT_LABELS, ovrOf, playerStyle, type CareerState, type Format } from '@chess/engine';
import { downloadSummary, majorWins, openingRows, yearRows } from './careerStats';
import { downloadPdf } from './pdfExport';
import { Icon } from './ui';

const wdl = (t: [number, number, number]) => {
  const n = t[0] + t[1] + t[2];
  return { n, text: `${t[0]}-${t[1]}-${t[2]}`, pct: n ? Math.round(((t[0] + t[1] / 2) / n) * 100) : 0 };
};

export function Stats({ s }: { s: CareerState }) {
  const P = s.player;
  const total: [number, number, number] = [s.stats.wins, s.stats.draws, s.stats.losses];
  const t = wdl(total);
  const years = yearRows(s);
  const openings = openingRows(s);
  const majors = majorWins(s);
  const style = playerStyle(s);
  const rivals = Object.entries(s.rivals)
    .map(([id, r]) => ({ id, ...r, n: r.w + r.d + r.l }))
    .filter((r) => r.n >= 2)
    .sort((a, b) => b.n - a.n)
    .slice(0, 8);
  return (
    <>
      <div className="panel">
        <h3><Icon name="list" /> Statystyki kariery</h3>
        <div className="kpis">
          <div className="kpi">OVR<b>{ovrOf(P.skills)}</b></div>
          <div className="kpi">Partie<b>{t.n}</b></div>
          <div className="kpi">Wygrane-remisy-porażki<b>{t.text}</b></div>
          <div className="kpi">Punkty<b>{t.pct}%</b></div>
          <div className="kpi">Wygrane turnieje<b>{s.stats.tournamentsWon}</b></div>
          <div className="kpi">Najlepszy pokonany<b>{s.stats.bestWin || '-'}</b></div>
          <div className="kpi">Seria zwycięstw<b>{s.stats.bestStreak}</b></div>
          <div className="kpi">Przegrane na czas<b>{s.stats.flagLosses}</b></div>
        </div>
        <p className="muted">
          Białymi {wdl(s.stats.white).text} ({wdl(s.stats.white).pct}%) · czarnymi {wdl(s.stats.black).text} ({wdl(s.stats.black).pct}%) ·{' '}
          {(['classical', 'rapid', 'blitz'] as Format[]).map((f) => `${FORMAT_LABELS[f]} ${wdl(s.stats.byFormat[f]).text}`).join(' · ')}
        </p>
        <p className="muted">Styl wynikający z grywanych debiutów: <b>{style.label}</b>. Tytuły mistrza Polski: {s.mp.titles}.</p>
        <div className="row">
          <button className="ghost" onClick={() => downloadSummary(s)}>Pobierz podsumowanie (HTML)</button>
          <button className="ghost" onClick={() => downloadPdf(s)}>Pobierz PDF</button>
        </div>
      </div>

      {majors.length > 0 && (
        <div className="panel">
          <h3><Icon name="trophy" /> Wygrane w dużych turniejach</h3>
          {majors.map((m) => <div key={m.name}>{m.name}{m.count > 1 ? <b> × {m.count}</b> : ''}</div>)}
        </div>
      )}

      <div className="panel">
        <h3>Rok po roku</h3>
        <div className="scroll">
          <table>
            <thead><tr><th>Rok</th><th>Wiek</th><th>Klasyczny</th><th>Szybki</th><th>Błysk.</th><th>Turnieje</th><th>Wygrane</th><th>Najlepsze m.</th><th>Nagrody</th></tr></thead>
            <tbody>
              {years.map((r) => (
                <tr key={r.year}><td>{r.year}</td><td>{r.age}</td><td className="num">{r.classical}</td><td className="num">{r.rapid}</td><td className="num">{r.blitz}</td><td>{r.tournaments}</td><td>{r.wins || ''}</td><td>{r.bestPlace ?? ''}</td><td>{r.prize ? `${r.prize} zł` : ''}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <h3><Icon name="book" /> Debiuty w praktyce</h3>
        {openings.length === 0 ? <p className="muted">Jeszcze nie zagrałeś partii.</p> : (
          <div className="scroll">
            <table>
              <thead><tr><th>Debiut</th><th>Partie</th><th>W-R-P</th><th>Punkty</th><th>Znajomość</th></tr></thead>
              <tbody>
                {openings.map((o) => (
                  <tr key={o.id}><td>{o.side === 'w' ? '○' : '●'} {o.name}</td><td>{o.games}</td><td>{o.wins}-{o.draws}-{o.losses}</td><td>{o.pct}%</td><td>{o.mastery}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel">
        <h3><Icon name="users" /> Rywale z historią</h3>
        {rivals.length === 0 ? <p className="muted">Gdy kilka razy zagrasz z tym samym rywalem, pojawi się tu bilans. Rywal, który regularnie Cię pokonuje, zaczyna się na Ciebie przygotowywać (nemezis).</p> : (
          <table>
            <tbody>
              {rivals.map((r) => (
                <tr key={r.id}><td>{r.name}</td><td>{r.n} partii</td><td>{r.w}-{r.d}-{r.l}</td><td className={r.l - r.w >= 2 && r.l >= 3 ? 'bad' : ''}>{r.l - r.w >= 2 && r.l >= 3 ? 'nemezis' : ''}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
