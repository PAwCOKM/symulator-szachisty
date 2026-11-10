import { useState } from 'react';
import type { CareerState } from '@chess/engine';

const SERIES = [
  { key: 1, name: 'Klasyczne', color: 'var(--fmt-classical)', dash: '' },
  { key: 2, name: 'Szybkie', color: 'var(--brass)', dash: '7 4' },
  { key: 3, name: 'Błyskawiczne', color: 'var(--danger)', dash: '2 4' },
] as const;

const W = 640;
const H = 240;
const PAD = { l: 44, r: 14, t: 14, b: 26 };

/** Wykres rankingów trzech temp z podpowiedzią (najazd myszką lub strzałki na klawiaturze). */
export function RatingChart({ s }: { s: CareerState }) {
  const pts = s.ratingLog;
  const [hover, setHover] = useState<number | null>(null);
  const maxW = Math.max(...pts.map((p) => p[0]), 52);
  const all = pts.flatMap((p) => [p[1], p[2], p[3]]);
  const lo = Math.floor((Math.min(...all) - 20) / 100) * 100;
  const hi = Math.ceil((Math.max(...all) + 20) / 100) * 100;
  const x = (w: number) => PAD.l + (w / maxW) * (W - PAD.l - PAD.r);
  const y = (r: number) => PAD.t + (1 - (r - lo) / (hi - lo || 1)) * (H - PAD.t - PAD.b);
  const yTicks: number[] = [];
  const step = (hi - lo) / 4;
  for (let i = 0; i <= 4; i++) yTicks.push(Math.round(lo + i * step));
  const years = Math.floor(maxW / 52);
  const xTicks = Array.from({ length: years + 1 }, (_, i) => i).filter((i) => years <= 12 || i % Math.ceil(years / 12) === 0);

  const nearest = (clientX: number, el: SVGSVGElement) => {
    const rect = el.getBoundingClientRect();
    const wx = ((clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bd = Infinity;
    pts.forEach((p, i) => {
      const d = Math.abs(x(p[0]) - wx);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') setHover((h) => Math.min(pts.length - 1, (h ?? -1) + 1));
    else if (e.key === 'ArrowLeft') setHover((h) => Math.max(0, (h ?? pts.length) - 1));
    else if (e.key === 'Escape') setHover(null);
    else return;
    e.preventDefault();
  };

  const cur = hover !== null ? pts[hover] : undefined;
  const label = (p: number[]) => `rok ${Math.floor(p[0]! / 52) + 1}, tydz. ${(p[0]! % 52) + 1}`;

  return (
    <div className="chart">
      <div className="legend">
        {SERIES.map((sr) => (
          <span key={sr.key} className="lg">
            <svg width="26" height="8" aria-hidden="true"><line x1="0" y1="4" x2="26" y2="4" stroke={sr.color} strokeWidth="3" strokeDasharray={sr.dash} strokeLinecap="round" /></svg>
            {sr.name}: <b className="num">{pts[pts.length - 1]![sr.key]}</b>
          </span>
        ))}
      </div>
      <div className="chart-wrap">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          tabIndex={0}
          aria-label="Wykres rankingów: klasyczny, szybki, błyskawiczny. Strzałki w lewo i prawo przesuwają punkt."
          onPointerMove={(e) => setHover(nearest(e.clientX, e.currentTarget))}
          onPointerLeave={() => setHover(null)}
          onKeyDown={onKey}
          onBlur={() => setHover(null)}
        >
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth="1" />
              <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--ink-muted)">{t}</text>
            </g>
          ))}
          {xTicks.map((i) => (
            <text key={i} x={x(i * 52)} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--ink-muted)">r{i + 1}</text>
          ))}
          {SERIES.map((sr) => (
            <polyline
              key={sr.key}
              fill="none"
              stroke={sr.color}
              strokeWidth="2.4"
              strokeDasharray={sr.dash}
              strokeLinejoin="round"
              strokeLinecap="round"
              points={pts.map((p) => `${x(p[0])},${y(p[sr.key] as number)}`).join(' ')}
            />
          ))}
          {cur && (
            <g>
              <line x1={x(cur[0])} x2={x(cur[0])} y1={PAD.t} y2={H - PAD.b} stroke="var(--ink-muted)" strokeDasharray="3 3" />
              {SERIES.map((sr) => (
                <circle key={sr.key} cx={x(cur[0])} cy={y(cur[sr.key] as number)} r="5" fill={sr.color} stroke="var(--surface)" strokeWidth="2" />
              ))}
            </g>
          )}
        </svg>
        {cur && (
          <div className="tip" role="status" style={{ insetInlineStart: `${Math.min(82, Math.max(18, (x(cur[0]) / W) * 100))}%` }}>
            <b>{label(cur)}</b>
            {SERIES.map((sr) => (
              <div key={sr.key} className="tl">
                <svg width="18" height="8" aria-hidden="true"><line x1="0" y1="4" x2="18" y2="4" stroke={sr.color} strokeWidth="3" strokeDasharray={sr.dash} strokeLinecap="round" /></svg>
                {sr.name} <b className="num">{cur[sr.key]}</b>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="muted">Najedź na wykres (lub użyj strzałek), żeby zobaczyć dokładne wartości. Punkty zapisują się po każdym turnieju i na koniec roku.</p>
    </div>
  );
}
