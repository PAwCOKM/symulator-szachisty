export interface StartDef {
  id: string;
  name: string;
  desc: string;
  /** mnożnik wyniku kariery: im łatwiejszy start, tym niższy */
  mult: number;
  /** przesunięcie startowych umiejętności */
  skillShift: number;
  money: number;
  /** wiek startu (domyślnie 8) */
  startAge?: number;
  /** modyfikator czasu na szachy */
  timeBonus?: number;
  /** ile dodatkowych debiutów znasz na starcie */
  knownCards: number;
}

export const STARTS: StartDef[] = [
  { id: 'cudowne', name: 'Cudowne dziecko', desc: 'Talent ponad przeciętną, rodzice dokładają do treningów. Wszystko przychodzi szybciej.', mult: 0.6, skillShift: 7, money: 400, knownCards: 3 },
  { id: 'rodzinny', name: 'Rodzina szachistów', desc: 'Tata gra w lidze, w domu stoją książki i zegar. Znasz kilka debiutów, pieniędzy niewiele.', mult: 0.8, skillShift: 3, money: 250, knownCards: 2 },
  { id: 'podworko', name: 'Szachy z podwórka', desc: 'Talent przeciętny, w portfelu prawie pusto. Standardowy start.', mult: 1.0, skillShift: 0, money: 100, knownCards: 0 },
  { id: 'pozny', name: 'Późny start', desc: 'Zaczynasz dopiero w wieku 12 lat, od zera i z szkołą na głowie. Dużo do nadrobienia.', mult: 1.3, skillShift: -2, money: 100, startAge: 12, timeBonus: -0.1, knownCards: 0 },
  { id: 'podgorke', name: 'Pod górkę', desc: 'Słabszy talent, brak pieniędzy, mało czasu po szkole. Każdy punkt wywalczysz sam.', mult: 1.6, skillShift: -4, money: 0, timeBonus: -0.15, knownCards: 0 },
];

export const DEFAULT_START = 'podworko';

export function startDef(id: string | undefined): StartDef {
  return STARTS.find((s) => s.id === id) ?? STARTS.find((s) => s.id === DEFAULT_START)!;
}
