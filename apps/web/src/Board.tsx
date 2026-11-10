import { Chess } from 'chess.js';

const GLYPH: Record<string, string> = {
  wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙',
  bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟',
};

/** Podgląd pozycji po ruchach debiutu (SAN rozdzielone spacją). */
export function Board({ moves, size = 28 }: { moves: string; size?: number }) {
  const g = new Chess();
  for (const m of moves.split(' ')) {
    try {
      g.move(m);
    } catch {
      break;
    }
  }
  const rows = g.board();
  return (
    <div className="board" style={{ ['--sq' as string]: `${size}px` }}>
      {rows.map((row, r) =>
        row.map((p, f) => (
          <div key={`${r}${f}`} className={`sq ${(r + f) % 2 ? 'dark' : 'light'}`}>
            {p ? GLYPH[p.color + p.type] : ''}
          </div>
        )),
      )}
    </div>
  );
}
