import type { TournamentDef } from './tournaments';

const t = (d: TournamentDef): TournamentDef => d;

// Szachy szybkie i błyskawiczne wyższej rangi: mistrzostwa krajowe, Europy i świata (open i kobiet), cykle elitarne.
export const FAST_TOURNAMENTS: TournamentDef[] = [
  // ---- poziom regionalny / otwarte
  t({ id: 'rapid-open', name: 'Rapid Open (grupa mistrzowska)', blurb: 'Mocny otwarty rapid z nagrodami finansowymi.', format: 'rapid', rounds: 9, fieldSize: 90, level: 2150, spread: 230, fee: 80, prize: 2500, minRating: 1900, maxRating: 9999, period: 13, window: 1, offset: 7 }),
  t({ id: 'blitz-open', name: 'Blitz Open (grupa mistrzowska)', blurb: 'Błyskawiczny turniej dla mocnych graczy.', format: 'blitz', rounds: 11, fieldSize: 100, level: 2150, spread: 240, fee: 60, prize: 2000, minRating: 1900, maxRating: 9999, period: 13, window: 1, offset: 9 }),
  t({ id: 'titled-blitz', name: 'Turniej Tytułowanych (blitz online)', blurb: 'Cotygodniowa klasyka internetowa dla graczy z kategorią.', format: 'blitz', rounds: 11, fieldSize: 200, level: 2400, spread: 220, fee: 0, prize: 3000, minRating: 2200, maxRating: 9999, period: 13, window: 1, offset: 4 }),
  // ---- mistrzostwa krajowe
  t({ id: 'mp-szybkie', major: true, name: 'Mistrzostwa Polski w szachach szybkich (maj)', blurb: 'Krajowy finał rapid.', format: 'rapid', rounds: 9, fieldSize: 60, level: 2150, spread: 240, fee: 0, prize: 5000, minRating: 1700, maxRating: 9999, period: 52, window: 2, offset: 18 }),
  t({ id: 'mp-blitz', major: true, name: 'Mistrzostwa Polski w szachach błyskawicznych (maj)', blurb: 'Krajowy finał blitza.', format: 'blitz', rounds: 11, fieldSize: 60, level: 2150, spread: 250, fee: 0, prize: 5000, minRating: 1700, maxRating: 9999, period: 52, window: 2, offset: 20 }),
  // ---- Europa
  t({ id: 'me-szybkie', major: true, name: 'Mistrzostwa Europy w szachach szybkich (marzec)', blurb: 'Rapid z całego kontynentu.', format: 'rapid', rounds: 11, fieldSize: 150, level: 2350, spread: 240, fee: 120, prize: 20000, minRating: 2100, maxRating: 9999, period: 52, window: 2, offset: 10 }),
  t({ id: 'me-blitz', major: true, name: 'Mistrzostwa Europy w szachach błyskawicznych (marzec)', blurb: 'Blitz z całego kontynentu.', format: 'blitz', rounds: 15, fieldSize: 150, level: 2380, spread: 240, fee: 120, prize: 20000, minRating: 2100, maxRating: 9999, period: 52, window: 2, offset: 12 }),
  // ---- świat (open)
  t({ id: 'ms-szybkie', major: true, name: 'Mistrzostwa Świata w szachach szybkich (grudzień)', blurb: 'Tytuł mistrza świata w rapid.', format: 'rapid', rounds: 13, fieldSize: 160, level: 2600, spread: 200, fee: 150, prize: 120000, minRating: 2350, maxRating: 9999, period: 52, window: 1, offset: 49 }),
  t({ id: 'ms-blitz', major: true, name: 'Mistrzostwa Świata w szachach błyskawicznych (grudzień)', blurb: 'Tytuł mistrza świata w blitzu.', format: 'blitz', rounds: 17, fieldSize: 160, level: 2620, spread: 200, fee: 150, prize: 120000, minRating: 2350, maxRating: 9999, period: 52, window: 1, offset: 50 }),
  t({ id: 'showdown', major: true, name: 'Rapid i Blitz: Pojedynek Mistrzów (St. Louis, listopad)', blurb: 'Dziesięciu najlepszych w szybkich szachach.', format: 'blitz', rounds: 9, fieldSize: 10, level: 2740, spread: 60, fee: 0, prize: 80000, minRating: 2650, maxRating: 9999, period: 52, window: 1, offset: 43, minCat: 'gm', invite: true }),
  // ---- kobiety
  t({ id: 'mp-kobiet-szybkie', major: true, women: true, name: 'Mistrzostwa Polski kobiet w szachach szybkich', blurb: 'Krajowy finał rapid kobiet.', format: 'rapid', rounds: 9, fieldSize: 30, level: 1950, spread: 220, fee: 0, prize: 2500, minRating: 1500, maxRating: 9999, period: 52, window: 2, offset: 19 }),
  t({ id: 'mp-kobiet-blitz', major: true, women: true, name: 'Mistrzostwa Polski kobiet w szachach błyskawicznych', blurb: 'Krajowy finał blitza kobiet.', format: 'blitz', rounds: 11, fieldSize: 30, level: 1950, spread: 230, fee: 0, prize: 2500, minRating: 1500, maxRating: 9999, period: 52, window: 2, offset: 21 }),
  t({ id: 'me-kobiet-szybkie', major: true, women: true, name: 'Mistrzostwa Europy kobiet w szachach szybkich', blurb: 'Rapid dla zawodniczek z całej Europy.', format: 'rapid', rounds: 11, fieldSize: 80, level: 2150, spread: 220, fee: 100, prize: 8000, minRating: 1900, maxRating: 9999, period: 52, window: 2, offset: 11 }),
  t({ id: 'ms-kobiet-szybkie', major: true, women: true, name: 'Mistrzostwa Świata kobiet w szachach szybkich (grudzień)', blurb: 'Tytuł mistrzyni świata w rapid.', format: 'rapid', rounds: 11, fieldSize: 100, level: 2350, spread: 200, fee: 100, prize: 50000, minRating: 2050, maxRating: 9999, period: 52, window: 1, offset: 49 }),
  t({ id: 'ms-kobiet-blitz', major: true, women: true, name: 'Mistrzostwa Świata kobiet w szachach błyskawicznych (grudzień)', blurb: 'Tytuł mistrzyni świata w blitzu.', format: 'blitz', rounds: 15, fieldSize: 100, level: 2370, spread: 200, fee: 100, prize: 50000, minRating: 2050, maxRating: 9999, period: 52, window: 1, offset: 50 }),
];
