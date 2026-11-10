import { CATEGORY_BY_ID, ageOf, careerScore, playerStyle, startDef, type CareerState } from '@chess/engine';
import { favoriteOpening, majorWins, yearRows } from './careerStats';

/**
 * Prawdziwy plik PDF generowany w przeglądarce, bez zależności: strony rysujemy na <canvas>
 * (dzięki temu polskie znaki działają bez osadzania fontów), zapisujemy jako JPEG i składamy w dokument PDF.
 */

const PW = 595; // A4 w punktach
const PH = 842;
const SCALE = 2.2;
const MARGIN = 44;

interface Page {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

function newPage(): Page {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(PW * SCALE);
  canvas.height = Math.round(PH * SCALE);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, PW, PH);
  ctx.fillStyle = '#1c241f';
  ctx.textBaseline = 'alphabetic';
  return { canvas, ctx };
}

class Writer {
  pages: Page[] = [];
  page!: Page;
  y = MARGIN;
  constructor() {
    this.add();
  }
  add() {
    this.page = newPage();
    this.pages.push(this.page);
    this.y = MARGIN;
  }
  need(h: number) {
    if (this.y + h > PH - MARGIN) this.add();
  }
  font(size: number, bold = false) {
    this.page.ctx.font = `${bold ? '700 ' : ''}${size}px Georgia, 'Times New Roman', serif`;
  }
  text(t: string, size = 11, bold = false, color = '#1c241f', gap = 4) {
    const ctx = this.page.ctx;
    this.font(size, bold);
    ctx.fillStyle = color;
    const words = t.split(' ');
    let line = '';
    const lines: string[] = [];
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > PW - 2 * MARGIN && line) {
        lines.push(line);
        line = w;
      } else line = test;
    }
    if (line) lines.push(line);
    for (const l of lines) {
      this.need(size * 1.35);
      this.font(size, bold);
      this.page.ctx.fillStyle = color;
      this.page.ctx.fillText(l, MARGIN, this.y + size);
      this.y += size * 1.35;
    }
    this.y += gap;
  }
  heading(t: string) {
    this.need(34);
    this.y += 8;
    this.text(t, 15, true, '#2d5a3d', 2);
    const ctx = this.page.ctx;
    ctx.fillStyle = '#2d5a3d';
    ctx.fillRect(MARGIN, this.y, PW - 2 * MARGIN, 1.2);
    this.y += 8;
  }
  row(cells: string[], widths: number[], opts: { bold?: boolean; fill?: string } = {}) {
    const size = 9.5;
    this.need(size * 1.9);
    const ctx = this.page.ctx;
    if (opts.fill) {
      ctx.fillStyle = opts.fill;
      ctx.fillRect(MARGIN, this.y - 2, PW - 2 * MARGIN, size * 1.8);
    }
    this.font(size, !!opts.bold);
    ctx.fillStyle = '#1c241f';
    let x = MARGIN + 4;
    cells.forEach((c, i) => {
      ctx.textAlign = i === 0 ? 'left' : 'right';
      const w = widths[i]!;
      ctx.fillText(c, i === 0 ? x : x + w - 8, this.y + size);
      x += w;
    });
    ctx.textAlign = 'left';
    ctx.fillStyle = '#dfe6e1';
    ctx.fillRect(MARGIN, this.y + size * 1.55, PW - 2 * MARGIN, 0.6);
    this.y += size * 1.8;
  }
}

function buildPages(s: CareerState): Page[] {
  const w = new Writer();
  const P = s.player;
  const st = startDef(s.config.start);
  const total = s.stats.wins + s.stats.draws + s.stats.losses;
  const pct = total ? Math.round(((s.stats.wins + s.stats.draws / 2) / total) * 100) : 0;
  const fav = favoriteOpening(s);
  const style = playerStyle(s);

  w.text(P.name, 26, true, '#1c241f', 0);
  w.text(`${s.endReason ?? 'Kariera w toku'} · start: ${st.name} · ${ageOf(s)} lat`, 11, false, '#555555', 8);

  w.heading('Najważniejsze liczby');
  w.text(`Najwyższy ranking klasyczny: ${P.peak}`, 12, true, '#1c241f', 1);
  w.text(`Szybkie / błyskawiczne (max): ${P.rapid.peak} / ${P.blitz.peak}`, 12, false, '#1c241f', 1);
  w.text(`Kategoria / tytuł: ${CATEGORY_BY_ID[P.category]!.name}`, 12, false, '#1c241f', 1);
  w.text(`Wynik kariery: ${careerScore(s)}`, 12, false, '#1c241f', 4);

  w.heading('Podsumowanie');
  w.text(`Partie: ${total} (wygrane ${s.stats.wins}, remisy ${s.stats.draws}, porażki ${s.stats.losses}; ${pct}% punktów).`);
  w.text(`Wygrane turnieje: ${s.stats.tournamentsWon} z ${s.stats.tournaments}. Najsilniejszy pokonany rywal: ${s.stats.bestWin || '-'}. Najdłuższa seria zwycięstw: ${s.stats.bestStreak}.`);
  const worldTitles = s.world.titles + s.wworld.titles;
  if (worldTitles) w.text(`Tytuły mistrza świata (mecz): ${worldTitles}`);
  if (s.mp.titles) w.text(`Tytuły mistrza Polski: ${s.mp.titles}`);
  w.text(`Styl gry (z grywanych debiutów): ${style.label}${fav ? ` · ulubiony debiut: ${fav.name} (${fav.games} partii, ${fav.pct}% punktów)` : ''}`);

  w.heading('Największe turnieje wygrane');
  const majors = majorWins(s);
  if (!majors.length) w.text('Brak wygranych w dużych turniejach.', 11, false, '#555555');
  for (const m of majors) w.text(`• ${m.name}${m.count > 1 ? ` × ${m.count}` : ''}`, 11, false, '#1c241f', 1);

  w.heading('Rok po roku');
  const widths = [38, 38, 74, 62, 62, 66, 60, 105];
  w.row(['Rok', 'Wiek', 'Klasyczny', 'Szybki', 'Błysk.', 'Turnieje', 'Wygrane', 'Najlepsze m.'], widths, { bold: true, fill: '#eef3ef' });
  for (const r of yearRows(s)) {
    w.row([String(r.year), String(r.age), String(r.classical), String(r.rapid), String(r.blitz), String(r.tournaments), r.wins ? String(r.wins) : '', r.bestPlace ? String(r.bestPlace) : ''], widths);
  }
  w.y += 10;
  w.text('Wygenerowano w grze „Kariera Szachisty”.', 9, false, '#777777');
  return w.pages;
}

function dataUrlToBytes(url: string): Uint8Array {
  const b64 = url.slice(url.indexOf(',') + 1);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Składa dokument PDF ze stron-obrazów JPEG. */
export function buildPdf(jpegs: { bytes: Uint8Array; w: number; h: number }[]): Uint8Array {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let pos = 0;
  const push = (b: Uint8Array | string) => {
    const u = typeof b === 'string' ? enc.encode(b) : b;
    chunks.push(u);
    pos += u.length;
  };
  const obj = (n: number, body: Uint8Array | string, dict?: string) => {
    offsets[n] = pos;
    if (dict !== undefined) {
      push(`${n} 0 obj\n<< ${dict} /Length ${(body as Uint8Array).length} >>\nstream\n`);
      push(body);
      push('\nendstream\nendobj\n');
    } else {
      push(`${n} 0 obj\n${body}\nendobj\n`);
    }
  };
  push('%PDF-1.4\n');
  const n = jpegs.length;
  // numeracja: 1 katalog, 2 drzewo stron, potem dla strony i: strona (3+3i), obraz (4+3i), treść (5+3i)
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  const kids = jpegs.map((_, i) => `${3 + 3 * i} 0 R`).join(' ');
  obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${n} >>`);
  jpegs.forEach((j, i) => {
    const pg = 3 + 3 * i;
    obj(pg, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im0 ${pg + 1} 0 R >> >> /Contents ${pg + 2} 0 R >>`);
    obj(pg + 1, j.bytes, `/Type /XObject /Subtype /Image /Width ${j.w} /Height ${j.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`);
    const content = enc.encode(`q ${PW} 0 0 ${PH} 0 0 cm /Im0 Do Q`);
    obj(pg + 2, content, '');
  });
  const xref = pos;
  const total = 3 + 3 * n;
  let x = `xref\n0 ${total}\n0000000000 65535 f \n`;
  for (let i = 1; i < total; i++) x += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  push(x);
  push(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  const out = new Uint8Array(pos);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

export function downloadPdf(s: CareerState) {
  const pages = buildPages(s);
  const jpegs = pages.map((p) => ({ bytes: dataUrlToBytes(p.canvas.toDataURL('image/jpeg', 0.92)), w: p.canvas.width, h: p.canvas.height }));
  const pdf = buildPdf(jpegs);
  const blob = new Blob([pdf as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kariera-${s.player.name.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
