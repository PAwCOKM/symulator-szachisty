import { fileURLToPath } from 'node:url';
import { buildApp } from './app';
import { Store } from './store';

const port = Number(process.env.PORT ?? 8787);
const store = new Store(process.env.DB_FILE ?? fileURLToPath(new URL('../data/db.json', import.meta.url)));
// kopia zapasowa bazy co 24 godziny i porządki (patrz store.ts)
store.startMaintenance();
const app = await buildApp(store, {
  // CORS_ORIGIN=https://twoja-domena.pl (kilka adresów po przecinku); puste = dowolne źródło
  corsOrigins: (process.env.CORS_ORIGIN ?? '').split(',').map((x) => x.trim()).filter(Boolean),
  // TRUST_PROXY=1, gdy API stoi za reverse proxy (inaczej limity liczą się dla adresu proxy)
  trustProxy: process.env.TRUST_PROXY === '1',
});
await app.listen({ port, host: '0.0.0.0' });
console.log(`API: http://localhost:${port}`);
