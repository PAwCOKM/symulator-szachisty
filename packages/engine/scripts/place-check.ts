import { Rng, simulatePlace } from '../src/index';

function dist(label: string, n: number, rounds: number, level: number, spread: number, score: number) {
  const rng = Rng.fromSeed('place-' + label);
  const places: number[] = [];
  for (let i = 0; i < 3000; i++) places.push(simulatePlace(rng, n, rounds, level, spread, score));
  places.sort((a, b) => a - b);
  const q = (p: number) => places[Math.floor(p * (places.length - 1))]!;
  const mean = places.reduce((a, b) => a + b, 0) / places.length;
  const win = places.filter((p) => p === 1).length / places.length;
  console.log(`${label.padEnd(28)} miejsce: średnia ${mean.toFixed(1)}, 10%=${q(0.1)}, mediana=${q(0.5)}, 90%=${q(0.9)} | 1. miejsce: ${(win * 100).toFixed(0)}%`);
}

dist('40 os., 7/7 (komplet)', 40, 7, 1500, 200, 7);
dist('40 os., 6,5/7', 40, 7, 1500, 200, 6.5);
dist('40 os., 6/7', 40, 7, 1500, 200, 6);
dist('40 os., 5,5/7', 40, 7, 1500, 200, 5.5);
dist('40 os., 3,5/7 (50%)', 40, 7, 1500, 200, 3.5);
dist('40 os., 1,5/7', 40, 7, 1500, 200, 1.5);
dist('24 os., 3/6 (50%)', 24, 6, 1050, 200, 3);
dist('24 os., 1/6', 24, 6, 1050, 200, 1);
dist('20 os., 5/5', 20, 5, 1000, 170, 5);
dist('20 os., 4/5', 20, 5, 1000, 170, 4);
dist('10 os. kołowy, 6/9', 10, 9, 2650, 80, 6);
dist('MS rapid 160 os., 12/13', 160, 13, 2600, 200, 12);
dist('MS rapid 160 os., 10/13', 160, 13, 2600, 200, 10);
dist('MS rapid 160 os., 8/13', 160, 13, 2600, 200, 8);
dist('MS blitz 160 os., 13,5/17', 160, 17, 2620, 200, 13.5);
dist('MS blitz 160 os., 12/17', 160, 17, 2620, 200, 12);
dist('MS blitz 160 os., 10/17', 160, 17, 2620, 200, 10);
