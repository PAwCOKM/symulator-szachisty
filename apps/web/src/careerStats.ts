import { CARD_BY_ID, CATEGORY_BY_ID, ageOf, careerScore, playerStyle, startDef, type CareerState } from '@chess/engine';

export interface YearRow {
  year: number;
  age: number;
  classical: number;
  rapid: number;
  blitz: number;
  tournaments: number;
  wins: number;
  bestPlace: number | null;
  prize: number;
}

/** Podsumowanie każdego roku kariery: ranking na koniec roku, liczba turniejów, wygrane, nagrody. */
export function yearRows(s: CareerState): YearRow[] {
  const years = Math.floor(s.week / 52) + 1;
  const rows: YearRow[] = [];
  let last: [number, number, number, number] = s.ratingLog[0] ?? [0, s.player.rating, s.player.rapid.rating, s.player.blitz.rating];
  for (let y = 0; y < years; y++) {
    for (const e of s.ratingLog) if (e[0] < (y + 1) * 52) last = e;
    const hs = s.history.filter((h) => Math.floor(h.week / 52) === y && h.place > 0);
    const all = s.history.filter((h) => Math.floor(h.week / 52) === y);
    rows.push({
      year: y + 1,
      age: s.player.startAge + y,
      classical: last[1],
      rapid: last[2],
      blitz: last[3],
      tournaments: all.length,
      wins: hs.filter((h) => h.place === 1).length,
      bestPlace: hs.length ? Math.min(...hs.map((h) => h.place)) : null,
      prize: all.reduce((a, h) => a + h.prize, 0),
    });
  }
  return rows;
}

const baseName = (n: string) => n.split(' - ')[0]!.replace(/\s*\([^)]*\)\s*$/, '').trim();

/** Wygrane w dużych turniejach (ważne imprezy) wg nazwy, ile razy. */
export function majorWins(s: CareerState): { name: string; count: number }[] {
  const m = new Map<string, number>();
  for (const h of s.history) {
    if (!h.major || h.place !== 1 || h.id.startsWith('polfinaly')) continue;
    const k = baseName(h.name);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pl'));
}

export interface OpeningRow {
  id: string;
  name: string;
  side: 'w' | 'b';
  games: number;
  wins: number;
  draws: number;
  losses: number;
  pct: number;
  mastery: number;
}

export function openingRows(s: CareerState): OpeningRow[] {
  return Object.entries(s.cards)
    .filter(([, p]) => p.games > 0)
    .map(([id, p]) => ({
      id,
      name: CARD_BY_ID[id]!.name,
      side: CARD_BY_ID[id]!.side,
      games: p.games,
      wins: p.wins,
      draws: p.draws,
      losses: p.losses,
      pct: Math.round(((p.wins + p.draws / 2) / p.games) * 100),
      mastery: Math.round(p.mastery),
    }))
    .sort((a, b) => b.games - a.games);
}

export function favoriteOpening(s: CareerState): OpeningRow | null {
  return openingRows(s)[0] ?? null;
}

const esc = (t: string | number) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Samodzielny dokument HTML z podsumowaniem kariery (do pobrania lub wydruku do PDF). */
export function buildSummaryHtml(s: CareerState): string {
  const P = s.player;
  const rows = yearRows(s);
  const majors = majorWins(s);
  const fav = favoriteOpening(s);
  const style = playerStyle(s);
  const total = s.stats.wins + s.stats.draws + s.stats.losses;
  const pct = total ? Math.round(((s.stats.wins + s.stats.draws / 2) / total) * 100) : 0;
  const st = startDef(s.config.start);
  const peakRapid = P.rapid.peak;
  const peakBlitz = P.blitz.peak;
  const yearTable = rows
    .map((r) => `<tr><td>${r.year}</td><td>${r.age}</td><td>${r.classical}</td><td>${r.rapid}</td><td>${r.blitz}</td><td>${r.tournaments}</td><td>${r.wins || ''}</td><td>${r.bestPlace ?? ''}</td></tr>`)
    .join('');
  const majorList = majors.length
    ? `<ul>${majors.map((m) => `<li>${esc(m.name)}${m.count > 1 ? ` &times; ${m.count}` : ''}</li>`).join('')}</ul>`
    : '<p>Brak wygranych w dużych turniejach.</p>';
  const mpTitles = s.mp.titles ? `<p>Tytuły mistrza Polski: <b>${s.mp.titles}</b></p>` : '';
  const worldTitles = s.world.titles + s.wworld.titles;
  return `<!doctype html>
<html lang="pl"><head><meta charset="utf-8"><title>Kariera: ${esc(P.name)}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; color: #1c241f; max-width: 780px; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
  h1 { margin-bottom: 0.1rem; } h2 { border-bottom: 2px solid #2d5a3d; padding-bottom: 0.2rem; margin-top: 2rem; }
  .sub { color: #555; margin-top: 0; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.6rem; }
  .kpi { border: 1px solid #c7d2ca; border-radius: 8px; padding: 0.5rem 0.7rem; } .kpi b { display: block; font-size: 1.4rem; }
  table { border-collapse: collapse; width: 100%; font-size: 0.92rem; } th, td { border-bottom: 1px solid #dfe6e1; padding: 0.3rem 0.4rem; text-align: right; }
  th:first-child, td:first-child { text-align: left; } th { background: #eef3ef; }
  @media print { body { margin: 0; } h2 { break-after: avoid; } tr { break-inside: avoid; } }
</style></head><body>
<h1>${esc(P.name)}</h1>
<p class="sub">${esc(s.endReason ?? 'Kariera w toku')} &middot; start: ${esc(st.name)} (mnożnik &times;${st.mult.toFixed(1).replace('.', ',')}) &middot; ${ageOf(s)} lat</p>
<div class="grid">
  <div class="kpi">Najwyższy ranking klasyczny<b>${P.peak}</b></div>
  <div class="kpi">Szybkie / błyskawiczne (max)<b>${peakRapid} / ${peakBlitz}</b></div>
  <div class="kpi">Kategoria / tytuł<b>${esc(CATEGORY_BY_ID[P.category]!.name)}</b></div>
  <div class="kpi">Wynik kariery<b>${careerScore(s)}</b></div>
</div>
<h2>Podsumowanie</h2>
<p>Partie: <b>${total}</b> (wygrane ${s.stats.wins}, remisy ${s.stats.draws}, porażki ${s.stats.losses}; ${pct}% punktów). Wygrane turnieje: <b>${s.stats.tournamentsWon}</b> z ${s.stats.tournaments} rozegranych. Najsilniejszy pokonany rywal: <b>${s.stats.bestWin || '-'}</b>. Najdłuższa seria zwycięstw: <b>${s.stats.bestStreak}</b>.</p>
${worldTitles ? `<p>Tytuły mistrza świata (mecz): <b>${worldTitles}</b></p>` : ''}${mpTitles}
<p>Styl gry (z grywanych debiutów): <b>${esc(style.label)}</b>${fav ? ` &middot; ulubiony debiut: <b>${esc(fav.name)}</b> (${fav.games} partii, ${fav.pct}% punktów)` : ''}</p>
<h2>Największe turnieje wygrane</h2>
${majorList}
<h2>Rok po roku</h2>
<table><thead><tr><th>Rok</th><th>Wiek</th><th>Klasyczny</th><th>Szybki</th><th>Błysk.</th><th>Turnieje</th><th>Wygrane</th><th>Najlepsze miejsce</th></tr></thead><tbody>${yearTable}</tbody></table>
<p class="sub">Wygenerowano w grze „Kariera Szachisty”.</p>
</body></html>`;
}

export function downloadSummary(s: CareerState) {
  const blob = new Blob([buildSummaryHtml(s)], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kariera-${s.player.name.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Otwiera podsumowanie w nowym oknie z oknem drukowania (zapisz jako PDF). */
export function printSummary(s: CareerState): boolean {
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.open();
  w.document.write(buildSummaryHtml(s));
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
  return true;
}

