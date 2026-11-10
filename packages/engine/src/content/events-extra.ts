import type { CareerState, SkillKey } from '../model';
import type { GameEvent } from './events';

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const skill = (s: CareerState, k: SkillKey, v: number) => {
  s.player.skills[k] = clamp(Math.round((s.player.skills[k] + v) * 100) / 100, 1, 100);
};
const age = (s: CareerState) => s.player.startAge + Math.floor(s.week / 52);
const form = (s: CareerState, v: number) => {
  s.player.form = clamp(s.player.form + v, -10, 10);
};
const fat = (s: CareerState, v: number) => {
  s.player.fatigue = clamp(s.player.fatigue + v, 0, 100);
};

/** Dodatkowe wydarzenia z wyborem: różnorodność, żeby nie powtarzały się w kółko. */
export const EXTRA_EVENTS: GameEvent[] = [
  {
    id: 'symultana',
    title: 'Symultana w domu kultury',
    text: 'Organizatorzy proszą, byś dał symultanę dla lokalnych amatorów.',
    cond: (s) => s.player.rating >= 1700,
    options: [
      { label: 'Zagraj symultanę', hint: '+120 zł; Presja czasu i nerwy +0,6; zmęczenie +8', apply: (s) => { s.player.money += 120; skill(s, 'pressure', 0.6); fat(s, 8); return 'Symultana się udała: honorarium 120 zł i trochę pewności siebie.'; } },
      { label: 'Odmów grzecznie', hint: 'Zmęczenie −4', apply: (s) => { fat(s, -4); return 'Odmawiasz i odpoczywasz.'; } },
    ],
  },
  {
    id: 'sparing',
    title: 'Sparing z silniejszym graczem',
    text: 'Zaprasza Cię na treningową rozgrywkę ktoś wyraźnie silniejszy od Ciebie.',
    cond: (s) => s.player.rating >= 1400,
    options: [
      { label: 'Przyjmij wyzwanie', hint: 'Kalkulacja +0,9; forma −1', apply: (s) => { skill(s, 'calculation', 0.9); form(s, -1); return 'Dostajesz lekcję, ale dużo z niej wynosisz.'; } },
      { label: 'Wolisz grać z równymi', hint: 'Forma +1', apply: (s) => { form(s, 1); return 'Spokojne partie dobrze robią na pewność siebie.'; } },
    ],
  },
  {
    id: 'wywiad',
    title: 'Wywiad dla lokalnej gazety',
    text: 'Redakcja chce napisać o Twoich sukcesach.',
    once: true,
    cond: (s) => s.player.rating >= 1900,
    options: [
      { label: 'Udziel wywiadu', hint: 'Forma +1; +60 zł od sponsora po publikacji', apply: (s) => { form(s, 1); s.player.money += 60; return 'Artykuł wychodzi, rośnie zainteresowanie Tobą.'; } },
      { label: 'Wolisz spokój', hint: 'Nic się nie zmienia', apply: () => 'Odmawiasz rozmowy z prasą.' },
    ],
  },
  {
    id: 'blitz-park',
    title: 'Blitz w parku',
    text: 'Stoliki szachowe w parku, zegary i stawka na piwo. Zaczepia Cię stary wyjadacz.',
    cond: (s) => s.player.rating >= 1000,
    options: [
      { label: 'Zagraj serię blitzy', hint: 'Presja czasu i nerwy +0,8; Taktyka +0,3; zmęczenie +6', apply: (s) => { skill(s, 'pressure', 0.8); skill(s, 'tactics', 0.3); fat(s, 6); return 'Kilka godzin blitza: ręka szybsza, nerwy mocniejsze.'; } },
      { label: 'Przejdź obok', hint: 'Nic się nie zmienia', apply: () => 'Idziesz dalej swoją drogą.' },
    ],
  },
  {
    id: 'analiza-kolega',
    title: 'Wspólna analiza partii',
    text: 'Kolega z klubu proponuje wspólną, wielogodzinną analizę waszych partii.',
    weight: 1.2,
    cond: (s) => s.player.rating >= 1200,
    options: [
      { label: 'Skup się na końcówkach', hint: 'Końcówki +0,9; zmęczenie +5', apply: (s) => { skill(s, 'endgame', 0.9); fat(s, 5); return 'Analizujecie końcówki, kilka rzeczy staje się jasne.'; } },
      { label: 'Skup się na grze środkowej', hint: 'Strategia +0,9; zmęczenie +5', apply: (s) => { skill(s, 'strategy', 0.9); fat(s, 5); return 'Rozkładacie na części pierwsze plany w grze środkowej.'; } },
    ],
  },
  {
    id: 'choroba',
    title: 'Grypa',
    text: 'Gorączka i kaszel tuż przed ważnym wyjazdem.',
    cond: (s) => s.player.fatigue > 35,
    options: [
      { label: 'Zostań w łóżku', hint: 'Zmęczenie −30; forma −1', apply: (s) => { fat(s, -30); form(s, -1); return 'Leżysz, ale wracasz zdrowszy.'; } },
      { label: 'Ignoruj objawy', hint: 'Zmęczenie +15; 50% szans: forma −2', apply: (s, rng) => { fat(s, 15); if (rng.chance(0.5)) form(s, -2); return 'Idziesz dalej, mimo że organizm protestuje.'; } },
    ],
  },
  {
    id: 'festiwal',
    title: 'Zaproszenie na zagraniczny festiwal',
    text: 'Organizatorzy otwartego festiwalu w Hiszpanii zapraszają z zakwaterowaniem w cenie.',
    once: true,
    cond: (s) => s.player.rating >= 2000 && s.player.money >= 250,
    options: [
      { label: 'Jedź (−250 zł)', hint: '−250 zł; Presja czasu i nerwy +1,2; Kalkulacja +0,6; zmęczenie +10', apply: (s) => { s.player.money -= 250; skill(s, 'pressure', 1.2); skill(s, 'calculation', 0.6); fat(s, 10); return 'Zagraniczny festiwal otwiera oczy na inny poziom gry.'; } },
      { label: 'Zostań w domu', hint: 'Nic się nie zmienia', apply: () => 'Rezygnujesz z wyjazdu.' },
    ],
  },
  {
    id: 'komentowanie',
    title: 'Komentowanie turnieju w sieci',
    text: 'Portal szachowy szuka komentatora transmisji dużego turnieju.',
    once: true,
    cond: (s) => s.player.rating >= 2200 && age(s) >= 18,
    options: [
      { label: 'Zgódź się (+350 zł)', hint: '+350 zł; Pamięć +0,6; zmęczenie +8', apply: (s) => { s.player.money += 350; skill(s, 'memory', 0.6); fat(s, 8); return 'Komentujesz transmisję i dostajesz honorarium.'; } },
      { label: 'Odmów', hint: 'Forma +1', apply: (s) => { form(s, 1); return 'Wolisz zająć się własnymi partiami.'; } },
    ],
  },
  {
    id: 'stream',
    title: 'Własny kanał szachowy',
    text: 'Znajomy namawia Cię do prowadzenia kanału ze streamami.',
    once: true,
    cond: (s) => s.player.rating >= 1800 && age(s) >= 15,
    options: [
      { label: 'Zacznij streamować', hint: '+20 zł tygodniowo przez rok; zmęczenie +6', apply: (s) => { s.player.grants = s.player.grants.filter((g) => g.id !== 'stream'); s.player.grants.push({ id: 'stream', name: 'Dochód z kanału', perWeek: 20, expires: s.week + 52 }); fat(s, 6); return 'Pierwsi widzowie wpadają na streamy.'; } },
      { label: 'Nie teraz', hint: 'Nic się nie zmienia', apply: () => 'Odkładasz pomysł na później.' },
    ],
  },
  {
    id: 'psycholog',
    title: 'Psycholog sportowy',
    text: 'Trenerka kadry poleca konsultacje z psychologiem sportowym.',
    once: true,
    cond: (s) => s.player.rating >= 1800 && s.player.money >= 150,
    options: [
      { label: 'Skorzystaj (−150 zł)', hint: '−150 zł; Presja czasu i nerwy +1,5', apply: (s) => { s.player.money -= 150; skill(s, 'pressure', 1.5); return 'Uczysz się trzymać nerwy na wodzy.'; } },
      { label: 'Poradź sobie sam', hint: 'Nic się nie zmienia', apply: () => 'Wolisz poradzić sobie sam.' },
    ],
  },
  {
    id: 'bieganie',
    title: 'Kondycja czy szachy?',
    text: 'Zauważasz, że w długich partiach brakuje Ci tchu. Można wyjść pobiegać albo siedzieć nad szachownicą.',
    cond: (s) => s.player.skills.stamina < 70,
    options: [
      { label: 'Zacznij biegać', hint: 'Kondycja +1,2; forma +1', apply: (s) => { skill(s, 'stamina', 1.2); form(s, 1); return 'Poranne bieganie robi swoje.'; } },
      { label: 'Zostań przy szachach', hint: 'Taktyka +0,5', apply: (s) => { skill(s, 'tactics', 0.5); return 'Kolejne godziny nad szachownicą.'; } },
    ],
  },
  {
    id: 'turniej-szkolny',
    title: 'Szkolny turniej szachowy',
    text: 'Nauczyciel wf-u organizuje międzyklasowy turniej i zachęca Cię do udziału.',
    cond: (s) => age(s) < 18,
    options: [
      { label: 'Zagraj i pomóż kolegom', hint: '+30 zł (nagroda ze szkoły); forma +1', apply: (s) => { s.player.money += 30; form(s, 1); return 'Wygrywasz turniej szkolny i cieszysz się z kolegami.'; } },
      { label: 'Odpuść', hint: 'Zmęczenie −5', apply: (s) => { fat(s, -5); return 'Zostajesz w domu.'; } },
    ],
  },
  {
    id: 'rodzice-szachy',
    title: 'Rozmowa z rodzicami',
    text: 'Rodzice martwią się, że szachy zabierają Ci zbyt dużo czasu.',
    once: true,
    cond: (s) => age(s) < 16 && s.player.rating >= 1100,
    options: [
      { label: 'Obiecaj lepsze oceny', hint: '+40 zł kieszonkowego; forma +1', apply: (s) => { s.player.money += 40; form(s, 1); return 'Rodzice odpuszczają, kieszonkowe rośnie.'; } },
      { label: 'Przekonuj do szachów', hint: 'Strategia +0,5; forma −1', apply: (s) => { skill(s, 'strategy', 0.5); form(s, -1); return 'Przekonujesz rodziców, ale atmosfera jest napięta.'; } },
    ],
  },
  {
    id: 'kadra-narodowa',
    title: 'Konsultacje kadry narodowej',
    text: 'Zaproszenie na tygodniowe konsultacje z trenerami kadry narodowej.',
    once: true,
    cond: (s) => s.player.rating >= 2300,
    options: [
      { label: 'Jedź na konsultacje', hint: 'Strategia +1,0; Końcówki +1,0; zmęczenie +10', apply: (s) => { skill(s, 'strategy', 1); skill(s, 'endgame', 1); fat(s, 10); return 'Konsultacje z kadrą wnoszą świeże pomysły.'; } },
      { label: 'Nie masz czasu', hint: 'Nic się nie zmienia', apply: () => 'Odmawiasz.' },
    ],
  },
  {
    id: 'rywal-zaczepka',
    title: 'Złośliwy rywal',
    text: 'Konkurent z lokalnej sceny komentuje w sieci, że na turniejach grasz „na szczęście”.',
    cond: (s) => s.player.rating >= 1500 && s.stats.tournaments >= 5,
    options: [
      { label: 'Zignoruj', hint: 'Presja czasu i nerwy +0,5', apply: (s) => { skill(s, 'pressure', 0.5); return 'Odpuszczasz, ale zapamiętujesz.'; } },
      { label: 'Odpowiedz wynikami', hint: 'Forma +2; zmęczenie +6', apply: (s) => { form(s, 2); fat(s, 6); return 'Mobilizujesz się, żeby udowodnić swoje.'; } },
    ],
  },
];
