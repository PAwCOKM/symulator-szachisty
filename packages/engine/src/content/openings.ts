import type { Card, Group } from '../model';

const c = (
  id: string,
  name: string,
  side: 'w' | 'b',
  group: Group,
  sharpness: number,
  theory: number,
  difficulty: number,
  moves: string,
  blurb: string,
): Card => ({ id, name, side, group, sharpness, theory, difficulty, moves, blurb });

export const CARDS: Card[] = [
  // ---- białe: 1.e4
  c('italian', 'Partia włoska', 'w', 'e4', 0.45, 0.55, 1.0, 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3', 'Naturalny rozwój, plan c3-d4. Dobry na start.'),
  c('spanish', 'Partia hiszpańska', 'w', 'e4', 0.4, 0.95, 0.7, 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7', 'Król debiutów. Ogrom teorii, ale to się opłaca.'),
  c('scotch', 'Partia szkocka', 'w', 'e4', 0.65, 0.6, 0.9, 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6', 'Otwarty środek i szybka gra figur.'),
  // ---- białe: 1.d4
  c('london', 'System londyński', 'w', 'd4', 0.25, 0.3, 1.3, 'd4 d5 Bf4 Nf6 e3 e6 Nf3 c5 c3', 'Prosty system bez zapamiętywania wielkiej teorii.'),
  c('qg', 'Gambit hetmański', 'w', 'd4', 0.4, 0.75, 0.9, 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O', 'Klasyka pozycyjna.'),
  c('catalan', 'Debiut katalonski', 'w', 'd4', 0.3, 0.85, 0.7, 'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O', 'Presja gońca na linii długiej, wysoki poziom teorii.'),
  // ---- białe: boczne
  c('english', 'Partia angielska', 'w', 'flank', 0.35, 0.7, 0.85, 'c4 e5 Nc3 Nf6 Nf3 Nc6 g3 d5 cxd5 Nxd5', 'Elastyczna, bogata w transpozycje.'),
  c('reti', 'Debiut Rétiego', 'w', 'flank', 0.25, 0.6, 0.9, 'Nf3 d5 c4 d4 b4 c5 bxc5 e6', 'Hipernowoczesny, kontrola centrum z dystansu.'),
  // ---- czarne: vs 1.e4
  c('sicilian', 'Obrona sycylijska', 'b', 'e4', 0.9, 1.0, 0.6, 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6', 'Najostrzejsza i najbardziej teoretyczna. Gra na wygraną.'),
  c('french', 'Obrona francuska', 'b', 'e4', 0.5, 0.8, 0.85, 'e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7 e5 Nfd7', 'Solidna, ale z kontrgrą.'),
  c('caro', 'Obrona Caro-Kann', 'b', 'e4', 0.3, 0.7, 1.0, 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6', 'Pancerna, zdrowa struktura.'),
  // ---- czarne: vs 1.d4
  c('qgd', 'Obrona hetmańska', 'b', 'd4', 0.3, 0.85, 0.9, 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O', 'Złoty standard solidności.'),
  c('kid', 'Obrona królewsko-indyjska', 'b', 'd4', 0.85, 0.85, 0.75, 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O', 'Atak na króla po wymianie przewagi w centrum.'),
  c('nimzo', 'Obrona Nimzowitscha', 'b', 'd4', 0.5, 0.8, 0.8, 'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5', 'Elastyczna, uczy strategii.'),
  // ---- czarne: boczne
  c('symm', 'Układ symetryczny', 'b', 'flank', 0.3, 0.5, 1.0, 'c4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 Nf3 e6', 'Odpowiedź lustrzana.'),
  c('revsic', 'Odwrócona sycylijska', 'b', 'flank', 0.5, 0.6, 0.9, 'c4 e5 Nc3 Nf6 Nf3 Nc6 g3 d5 cxd5 Nxd5', 'Czarne grają jak na sycylijskiej z tempem mniej.'),
];

export const CARD_BY_ID: Record<string, Card> = Object.fromEntries(CARDS.map((x) => [x.id, x]));

export function card(id: string): Card {
  const x = CARD_BY_ID[id];
  if (!x) throw new Error(`Unknown card ${id}`);
  return x;
}

export const WHITE_CARDS = CARDS.filter((x) => x.side === 'w');
export const BLACK_CARDS = CARDS.filter((x) => x.side === 'b');
export const DEFENCES_BY_GROUP: Record<Group, Card[]> = {
  e4: BLACK_CARDS.filter((x) => x.group === 'e4'),
  d4: BLACK_CARDS.filter((x) => x.group === 'd4'),
  flank: BLACK_CARDS.filter((x) => x.group === 'flank'),
};

export const DEFAULT_BLACK: Record<Group, string> = { e4: 'caro', d4: 'qgd', flank: 'symm' };

export function masteryLabel(m: number): string {
  if (m < 8) return 'Nieznany';
  if (m < 30) return 'Podstawy';
  if (m < 55) return 'Znany';
  if (m < 75) return 'Dobry';
  if (m < 90) return 'Biegły';
  return 'Mistrz';
}
