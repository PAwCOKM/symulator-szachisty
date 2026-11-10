import { createHash, randomBytes, randomUUID } from 'node:crypto';
import cors from '@fastify/cors';
import Fastify from 'fastify';
import { z } from 'zod';
import { careerScore, ENGINE_VERSION, EngineError, replay, type Action } from '@chess/engine';
import { Store } from './store';

const configSchema = z.object({
  name: z.string().min(1).max(24),
  archetype: z.enum(['tactician', 'positional', 'allround']),
  gender: z.enum(['m', 'f']).optional(),
  start: z.string().max(24).optional(),
  city: z.string().max(24).optional(),
  startWhite: z.string().max(32),
});
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

export function buildApp(store: Store) {
  const app = Fastify({ logger: false, bodyLimit: 2 * 1024 * 1024 });
  void app.register(cors, { origin: true });

  const auth = (req: { headers: Record<string, unknown> }) => {
    const h = String(req.headers.authorization ?? '');
    const token = h.startsWith('Bearer ') ? h.slice(7) : '';
    if (!token) return null;
    const hash = sha(token);
    return Object.values(store.data.players).find((p) => p.tokenHash === hash) ?? null;
  };

  app.get('/health', async () => ({ ok: true, engineVersion: ENGINE_VERSION }));

  // konto anonimowe: tylko losowy token, w bazie trzymamy jego hash
  app.post('/v1/auth/anonymous', async () => {
    const token = randomBytes(32).toString('hex');
    const id = randomUUID();
    store.data.players[id] = { id, tokenHash: sha(token), createdAt: Date.now() };
    store.save();
    return { playerId: id, token };
  });

  // start kariery: serwer wydaje seed
  app.post('/v1/careers', async (req, reply) => {
    const p = auth(req);
    if (!p) return reply.code(401).send({ error: 'unauthorized' });
    const id = randomUUID();
    const seed = randomBytes(12).toString('hex');
    store.data.careers[id] = { id, playerId: p.id, seed, status: 'ACTIVE', startedAt: Date.now() };
    store.save();
    return { careerId: id, seed, engineVersion: ENGINE_VERSION };
  });

  // zakończenie: serwer odtwarza karierę z seeda i logu akcji (replay), nie ufa wynikowi klienta
  app.post('/v1/careers/:id/finish', async (req, reply) => {
    const p = auth(req);
    if (!p) return reply.code(401).send({ error: 'unauthorized' });
    const { id } = req.params as { id: string };
    const c = store.data.careers[id];
    if (!c || c.playerId !== p.id) return reply.code(404).send({ error: 'not_found' });
    if (c.status !== 'ACTIVE') return reply.code(409).send({ error: 'already_finished' });
    const body = z
      .object({ config: configSchema, actions: z.array(z.record(z.unknown())).max(25000) })
      .safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'bad_request' });
    try {
      const s = replay(body.data.config, c.seed, body.data.actions as unknown as Action[]);
      c.status = 'FINISHED';
      c.result = {
        name: s.player.name,
        archetype: s.config.archetype,
        rating: s.player.rating,
        peak: s.player.peak,
        category: s.player.category,
        score: careerScore(s),
        weeks: s.week,
        finishedAt: Date.now(),
      };
      store.save();
      return { verified: true, result: c.result };
    } catch (e) {
      c.status = 'REJECTED';
      store.save();
      const msg = e instanceof EngineError ? e.message : 'replay_failed';
      return reply.code(422).send({ error: 'verification_failed', detail: msg });
    }
  });

  // rankingi
  app.get('/v1/boards/:board', async (req, reply) => {
    const { board } = req.params as { board: string };
    if (board !== 'score' && board !== 'peak') return reply.code(404).send({ error: 'no_board' });
    const { period } = req.query as { period?: string };
    if (period !== undefined && period !== 'day' && period !== 'week' && period !== 'all') return reply.code(400).send({ error: 'bad_period' });
    const since = period === 'day' ? Date.now() - 24 * 3600 * 1000 : period === 'week' ? Date.now() - 7 * 24 * 3600 * 1000 : 0;
    const best = new Map<string, NonNullable<(typeof store.data.careers)[string]['result']> & { playerId: string }>();
    for (const c of Object.values(store.data.careers)) {
      if (c.status !== 'FINISHED' || !c.result) continue;
      if (c.result.finishedAt < since) continue;
      const prev = best.get(c.playerId);
      const key = board === 'score' ? 'score' : 'peak';
      if (!prev || c.result[key] > prev[key]) best.set(c.playerId, { ...c.result, playerId: c.playerId });
    }
    const key = board === 'score' ? 'score' : 'peak';
    const rows = [...best.values()].sort((a, b) => b[key] - a[key]).slice(0, 50).map((r, i) => ({ rank: i + 1, name: r.name, peak: r.peak, score: r.score, category: r.category }));
    return { board, period: period ?? 'all', rows };
  });

  return app;
}
