import {
  APPROACH_LABELS,
  TEMPO_LABELS,
  type Tempo,
  BLACK_CARDS,
  CARD_BY_ID,
  GROUP_LABELS,
  GROUPS,
  WHITE_CARDS,
  masteryLabel,
  type Approach,
  type CareerState,
  type Group,
  type Setup,
} from '@chess/engine';
import { Board } from './Board';

const m = (s: CareerState, id: string | null) => (id ? Math.round(s.cards[id]?.mastery ?? 0) : 0);

export interface FocusOption {
  id: string;
  name: string;
  pct: number;
}

/** Wybór debiutów i podejścia. part: które strony pokazać (przed turniejem - obie, w rundzie - tylko aktualny kolor). */
export function SetupForm({
  s,
  setup,
  onChange,
  part,
  focus,
}: {
  s: CareerState;
  setup: Setup;
  onChange: (x: Setup) => void;
  part: 'w' | 'b' | 'both';
  /** głębokie przygotowanie na linię rywala (tylko w rundzie po skautingu) */
  focus?: FocusOption[];
}) {
  const wcard = CARD_BY_ID[setup.white]!;
  const setBlack = (g: Group, id: string) => onChange({ ...setup, black: { ...setup.black, [g]: id || null } });
  return (
    <div className="setup">
      <div className="sf-top">
      <div className="sf-grid">
        {part !== 'b' && (
          <>
            <label className="sf-l" htmlFor="sf-white">Białymi</label>
            <div className="sf-field">
              <select id="sf-white" value={setup.white} onChange={(e) => onChange({ ...setup, white: e.target.value })}>
                {WHITE_CARDS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} [{GROUP_LABELS[c.group]}] - {masteryLabel(m(s, c.id))} ({m(s, c.id)})
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        {part !== 'w' &&
          GROUPS.map((g) => (
            <div key={g} className="sf-row">
              <label className="sf-l" htmlFor={`sf-b-${g}`}>Czarnymi na {GROUP_LABELS[g]}</label>
              <div className="sf-field">
                <select id={`sf-b-${g}`} value={setup.black[g] ?? ''} onChange={(e) => setBlack(g, e.target.value)}>
                  <option value="">(brak - improwizuję)</option>
                  {BLACK_CARDS.filter((c) => c.group === g).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} - {masteryLabel(m(s, c.id))} ({m(s, c.id)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        {focus && (
          <>
            <label className="sf-l" htmlFor="sf-focus">Głębokie przygotowanie</label>
            <div className="sf-field">
              <select id="sf-focus" value={setup.focus ?? ''} onChange={(e) => onChange({ ...setup, focus: e.target.value || null })}>
                <option value="">brak</option>
                {focus.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.pct}%)</option>)}
              </select>
            </div>
          </>
        )}
      </div>
      {part !== 'b' && <Board moves={wcard.moves} size={18} />}
      </div>
      {part !== 'w' && <p className="muted sf-help">Nie wiesz, co zagra rywal - wybierz obronę na każdy pierwszy ruch. Jeśli zagra coś spoza jego repertuaru, teoria nie pomoże.</p>}
      {focus && <p className="muted sf-help">Głębokie przygotowanie: jeśli rywal wejdzie w wybraną linię, masz wyraźną przewagę; jeśli zagra co innego, tracisz odrobinę.</p>}

      <fieldset className="sf-set">
        <legend>Tempo</legend>
        <div className="seg">
          {(['steady', 'push'] as Tempo[]).map((t) => (
            <label key={t}>
              <input type="radio" name="sf-tempo" checked={(setup.tempo ?? 'steady') === t} onChange={() => onChange({ ...setup, tempo: t })} />
              <span>{TEMPO_LABELS[t]}</span>
            </label>
          ))}
        </div>
        <p className="muted sf-help">Presja czasowa: rywal może się pogubić, ale rywal też może dociskać Ciebie. Liczy się odporność na presję.</p>
      </fieldset>
      <fieldset className="sf-set">
        <legend>Podejście do partii</legend>
        <div className="seg">
          {(['solid', 'normal', 'sharp'] as Approach[]).map((a) => (
            <label key={a}>
              <input type="radio" name="sf-approach" checked={setup.approach === a} onChange={() => onChange({ ...setup, approach: a })} />
              <span>{APPROACH_LABELS[a]}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
