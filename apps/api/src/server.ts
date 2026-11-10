import { fileURLToPath } from 'node:url';
import { buildApp } from './app';
import { Store } from './store';

const port = Number(process.env.PORT ?? 8787);
const app = buildApp(new Store(process.env.DB_FILE ?? fileURLToPath(new URL('../data/db.json', import.meta.url))));
app.listen({ port, host: '0.0.0.0' }).then(() => console.log(`API: http://localhost:${port}`));
