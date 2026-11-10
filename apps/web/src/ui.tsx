import type { ReactNode } from 'react';
import type { Format } from '@chess/engine';

/** Pasek wartości (0..max). Z warnHigh wysoka wartość jest zła (np. zmęczenie). */
export function Meter({ value, max = 100, warnHigh = false, wide = false, label }: { value: number; max?: number; warnHigh?: boolean; wide?: boolean; label?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const tone = warnHigh ? (pct >= 75 ? 'danger' : pct >= 50 ? 'warn' : '') : '';
  return (
    <span className={`meter ${tone} ${wide ? 'wide' : ''}`} role="meter" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
      <span style={{ inlineSize: `${pct}%` }} />
    </span>
  );
}

// Ikony SVG w jednym stylu (kontur 2, zaokrąglone zakończenia, siatka 24x24).
const PATHS: Record<string, ReactNode> = {
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  book: <><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></>,
  user: <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  trophy: <><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0z" /></>,
  clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
  timer: <><path d="M10 2h4M12 14l3-3" /><circle cx="12" cy="14" r="8" /></>,
  zap: <path d="M13 2 3 14h9l-1 8 10-12h-9z" />,
  star: <path d="m12 2 3 7 7 .6-5.3 4.7 1.6 7.2L12 17.8 6.7 21.5l1.6-7.2L2 9.6 9 9z" />,
  female: <><circle cx="12" cy="9" r="5" /><path d="M12 14v8M9 18h6" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  flag: <><path d="M4 22V4M4 4h13l-2 4 2 4H4" /></>,
  pawn: <><circle cx="12" cy="6.5" r="3" /><path d="M10 10.5h4M9.5 10.5c-.4 3-2 4.6-3 7h11c-1-2.4-2.6-4-3-7M5 21h14" /></>,
};

export type IconName = keyof typeof PATHS;

/** Ikona dekoracyjna (aria-hidden) albo z etykietą, gdy samodzielnie niesie znaczenie. */
export function Icon({ name, label, filled = false }: { name: IconName; label?: string; filled?: boolean }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden={label ? undefined : true} role={label ? 'img' : undefined} aria-label={label} focusable="false">
      {PATHS[name]}
    </svg>
  );
}

/** Znacznik koloru bierek (biały/czarny) jako kółko. */
export function Piece({ color }: { color: 'w' | 'b' }) {
  return <span className={`piece ${color}`} role="img" aria-label={color === 'w' ? 'białe' : 'czarne'} />;
}

export function FormatTag({ f }: { f: Format }) {
  const label = { classical: 'Klasyczne', rapid: 'Szybkie', blitz: 'Błyskawiczne' }[f];
  const icon: IconName = f === 'classical' ? 'clock' : f === 'rapid' ? 'timer' : 'zap';
  return (
    <span className={`tag ${f}`}>
      <Icon name={icon} /> {label}
    </span>
  );
}

export function FormatIcon({ f }: { f: Format }) {
  return <Icon name={f === 'classical' ? 'clock' : f === 'rapid' ? 'timer' : 'zap'} />;
}

/** Tabela przewijana w poziomie: kontener jest fokusowalny, więc przewija się też klawiaturą. */
export function XScroll({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="xscroll" tabIndex={0} role="region" aria-label={label}>
      {children}
    </div>
  );
}
