import { reigns, tournamentSchedule, worldView, type CareerState } from '@chess/engine';
import { Icon } from './ui';

/** Droga do korony: Puchar Świata -> Turniej Pretendentów -> mecz o mistrzostwo świata. */
function WorldSection({ s, women }: { s: CareerState; women: boolean }) {
  const v = worldView(s, 15, women);
  const w = women ? s.wworld : s.world;
  const sched = tournamentSchedule(s);
  const find = (sp: string) => sched.find((x) => x.def.special === sp && !!x.def.women === women);
  const cup = find('cup');
  const cand = find('candidates');
  const match = find('wcmatch');
  const year = Math.floor(s.week / 52) + 1;
  const weekLabel = (x?: number) => (x === undefined ? 'w przyszłym roku' : `tydz. ${x + 1}`);
  const champWord = women ? 'mistrzyni świata' : 'mistrz świata';

  const steps = [
    {
      key: 'cup',
      title: women ? 'Puchar Świata Kobiet' : 'Puchar Świata FIDE',
      when: 'lata nieparzyste, wrzesień',
      text: women ? 'Pucharowy turniej zawodniczek. Miejsca 1-3 dają awans do Turnieju Pretendentek.' : 'Pucharowy turniej 128 graczy. Miejsca 1-3 dają awans do Turnieju Pretendentów.',
      status: v.qualified ? (women ? 'Zakwalifikowana do Pretendentek' : 'Zakwalifikowany na Pretendentów') : cup ? (cup.reason ? `Teraz niedostępny: ${cup.reason}` : `W tym roku: ${weekLabel(cup.weeks[0])}`) : 'W tym roku się nie odbywa',
      done: v.qualified,
    },
    {
      key: 'cand',
      title: women ? 'Turniej Pretendentek' : 'Turniej Pretendentów',
      when: 'lata parzyste (Rok 2, 4, ...), kwiecień',
      text: `Osiem ${women ? 'zawodniczek' : 'osób'}, dwa koła. Zwycięzca gra mecz o koronę. Wstęp: awans z Pucharu Świata albo miejsce w top 8 rankingu${women ? ' kobiet' : ''}.`,
      status: w.challenger === -1 ? 'Wygrałeś: jesteś challengerem' : cand ? (cand.reason ? cand.reason : `Możesz grać: ${weekLabel(cand.weeks[0])}`) : 'W tym roku się nie odbywa',
      done: w.challenger === -1,
    },
    {
      key: 'match',
      title: `Mecz o mistrzostwo świata${women ? ' kobiet' : ''}`,
      when: 'lata parzyste, listopad',
      text: 'Panujący mistrz kontra zwycięzca turnieju pretendentów: 14 partii klasycznych i dogrywki.',
      status: v.champion.isPlayer ? `Jesteś: ${champWord}` : match ? (match.reason ? match.reason : `Możesz grać: ${weekLabel(match.weeks[0])}`) : 'W tym roku się nie odbywa',
      done: v.champion.isPlayer,
    },
  ];

  return (
    <>
      <div className="panel event">
        <h3><Icon name="trophy" /> {women ? 'Mistrzyni świata (kobiety)' : 'Mistrz świata (open)'}</h3>
        <p>
          <b className="big">{v.champion.name}</b> <span className="num">({v.champion.rating})</span>
          {v.champion.isPlayer && <span className="good"> - to Ty!</span>}
        </p>
        {v.challenger && <p className="muted">Challenger w tym cyklu: <b>{v.challenger.name}</b> ({v.challenger.rating}){v.challenger.isPlayer ? ' - to Ty' : ''}</p>}
        <p className="muted">
          Rok {year}: {v.cycleYear === 'candidates' ? 'rok Turnieju Pretendentów i meczu o tytuł' : 'rok Pucharu Świata (kwalifikacje)'}. Twoje miejsce w rankingu{women ? ' kobiet' : ''}: <b className="num">#{v.playerRank}</b>. Zdobyte tytuły: {v.titles}.
        </p>
      </div>

      <div className="panel">
        <h3><Icon name="flag" /> Droga do korony{women ? ' (kobiety)' : ''}</h3>
        <ol className="path">
          {steps.map((st) => (
            <li key={st.key} className={st.done ? 'done' : ''}>
              <b>{st.title}</b> <span className="muted">({st.when})</span>
              <div className="muted">{st.text}</div>
              <div className={st.done ? 'good' : 'muted'}>{st.done && <Icon name="star" filled />} {st.status}</div>
            </li>
          ))}
        </ol>
      </div>

      <div className="panel">
        <h3><Icon name="users" /> Czołówka rankingu {women ? 'kobiet' : 'światowego'} (klasyczne)</h3>
        <div className="scroll">
          <table>
            <tbody>
              {v.rows.map((r) => (
                <tr key={`${r.id}`} className={r.isPlayer ? 'me' : ''}>
                  <td className="num">{r.rank}</td>
                  <td>{r.name}{r.isPlayer && ' (Ty)'} <span className="muted nat">{r.nat}</span></td>
                  <td className="muted">{r.title}</td>
                  <td className="num"><b>{r.rating}</b></td>
                  <td>{r.champion ? <span className="tag league"><Icon name="trophy" /> {women ? 'mistrzyni' : 'mistrz'}</span> : r.challenger ? <span className="tag norm">challenger</span> : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <h3>Historia tytułu{women ? ' kobiet' : ''}</h3>
        {v.history.length === 0 ? <p className="muted">Pierwszy mecz o tytuł jeszcze się nie odbył.</p> : [...v.history].reverse().map((h, i) => (
          <div key={i}><span className="muted">rok {h.year}</span> {h.note}</div>
        ))}
      </div>
    </>
  );
}

function PolandSection({ s }: { s: CareerState }) {
  const year = Math.floor(s.week / 52);
  const female = s.player.gender === 'f';
  const qualified = s.mp.qualifiedYear === year;
  return (
    <div className="panel">
      <h3><Icon name="flag" /> Mistrzostwa Polski{female ? ' (kobiet)' : ''}</h3>
      <p className="muted">
        {female
          ? 'Finał Mistrzostw Polski kobiet odbywa się raz w roku (czerwiec), od rankingu 1700.'
          : 'Droga: Półfinały MP (kwiecień, miejsca 1-6 dają awans) i Finał MP (czerwiec). Do finału wchodzisz też z rankingiem 2400+.'}
      </p>
      <p>Tytuły mistrza Polski: <b>{s.mp.titles}</b>{!female && qualified ? <span className="good"> · w tym roku masz awans do finału</span> : ''}</p>
    </div>
  );
}

function RecordsSection({ s }: { s: CareerState }) {
  const female = s.player.gender === 'f';
  const rec = (r: CareerState['records']['open'], label: string) =>
    r ? <div>{label}: <b className="num">{r.rating}</b> · {r.name}{r.isPlayer ? ' (Ty)' : ''} <span className="muted">(rok {r.year})</span></div> : null;
  const top = (history: CareerState['world']['history']) => [...reigns(history)].sort((a, b) => b.years - a.years)[0];
  const best = top(s.world.history);
  const bestW = top(s.wworld.history);
  const champs = (history: CareerState['world']['history']) => {
    const m = new Map<string, number>();
    for (const r of reigns(history)) m.set(r.name, (m.get(r.name) ?? 0) + r.matches);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const list = champs(s.world.history);
  return (
    <div className="panel">
      <h3><Icon name="trophy" /> Rekordy i historia świata</h3>
      {rec(s.records.open, 'Najwyższy ranking w historii gry (open)')}
      {female && rec(s.records.women, 'Najwyższy ranking kobiet')}
      {best ? <div>Najdłuższe panowanie (open): <b>{best.name}</b>, {best.matches} {best.matches === 1 ? 'mecz' : 'mecze/meczów'} (ok. {best.years} lat)</div> : <p className="muted">Gdy odbędą się pierwsze mecze o tytuł, pojawi się tu najdłuższe panowanie.</p>}
      {female && bestW && <div>Najdłuższe panowanie (kobiety): <b>{bestW.name}</b>, ok. {bestW.years} lat</div>}
      {list.length > 0 && (
        <details>
          <summary>Mistrzowie świata według liczby wygranych meczów i obron</summary>
          {list.map(([name, n]) => <div key={name}>{name}: <b>{n}</b></div>)}
        </details>
      )}
    </div>
  );
}

export function World({ s }: { s: CareerState }) {
  const female = s.player.gender === 'f';
  return (
    <>
      <PolandSection s={s} />
      <RecordsSection s={s} />
      {female && <WorldSection s={s} women />}
      {female && <h2 style={{ marginBlockStart: 24 }}>Mistrzostwa świata open</h2>}
      <WorldSection s={s} women={false} />
    </>
  );
}
