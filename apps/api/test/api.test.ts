import { mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { MAX_ACTIVE_PER_PLAYER, Store } from '../src/store';

const dirs: string[] = [];
const tmpStore = () => {
  const dir = mkdtempSync(join(tmpdir(), 'szachy-api-'));
  dirs.push(dir);
  const file = join(dir, 'db.json');
  return { dir, file, store: new Store(file) };
};
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe('rate limiting', () => {
  it('blocks account creation after the per-minute limit', async () => {
    const { store } = tmpStore();
    const app = await buildApp(store);
    let last = 0;
    for (let i = 0; i < 12; i++) last = (await app.inject({ method: 'POST', url: '/v1/auth/anonymous' })).statusCode;
    expect(last).toBe(429);
    await app.close();
  });
  it('allows normal use under the limit and counts the global limit', async () => {
    const { store } = tmpStore();
    const app = await buildApp(store, { limits: { global: 5, account: 100, career: 100, finish: 100, erase: 100 } });
    const codes: number[] = [];
    for (let i = 0; i < 7; i++) codes.push((await app.inject({ method: 'GET', url: '/health' })).statusCode);
    expect(codes.slice(0, 5).every((c) => c === 200)).toBe(true);
    expect(codes[6]).toBe(429);
    await app.close();
  });
});

describe('account data', () => {
  it('deletes the anonymous account and its careers', async () => {
    const { store } = tmpStore();
    const app = await buildApp(store);
    const { token } = (await app.inject({ method: 'POST', url: '/v1/auth/anonymous' })).json();
    await app.inject({ method: 'POST', url: '/v1/careers', headers: { authorization: `Bearer ${token}` } });
    const del = await app.inject({ method: 'DELETE', url: '/v1/me', headers: { authorization: `Bearer ${token}` } });
    expect(del.json()).toEqual({ deleted: 1 });
    const after = await app.inject({ method: 'POST', url: '/v1/careers', headers: { authorization: `Bearer ${token}` } });
    expect(after.statusCode).toBe(401);
    await app.close();
  });
  it('rejects names with e-mail addresses or links', async () => {
    const { store } = tmpStore();
    const app = await buildApp(store);
    const { token } = (await app.inject({ method: 'POST', url: '/v1/auth/anonymous' })).json();
    const c = (await app.inject({ method: 'POST', url: '/v1/careers', headers: { authorization: `Bearer ${token}` } })).json();
    const res = await app.inject({
      method: 'POST',
      url: `/v1/careers/${c.careerId}/finish`,
      headers: { authorization: `Bearer ${token}` },
      payload: { config: { name: 'jan@x.pl', archetype: 'allround', startWhite: 'italian' }, actions: [] },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });
  it('keeps at most MAX_ACTIVE_PER_PLAYER unfinished careers per account', async () => {
    const { store } = tmpStore();
    const app = await buildApp(store, { limits: { global: 1000, account: 100, career: 1000, finish: 100, erase: 100 } });
    const { token } = (await app.inject({ method: 'POST', url: '/v1/auth/anonymous' })).json();
    for (let i = 0; i < MAX_ACTIVE_PER_PLAYER + 5; i++) await app.inject({ method: 'POST', url: '/v1/careers', headers: { authorization: `Bearer ${token}` } });
    expect(Object.keys(store.data.careers).length).toBe(MAX_ACTIVE_PER_PLAYER);
    await app.close();
  });
});

describe('backup and recovery', () => {
  it('creates a backup at most once a day and replaces it afterwards', () => {
    const { file, store } = tmpStore();
    store.data.players.a = { id: 'a', tokenHash: 'x', createdAt: Date.now() };
    store.save();
    expect(store.backupIfDue()).toBe(true);
    expect(store.backupIfDue()).toBe(false);
    const old = (Date.now() - 25 * 3600 * 1000) / 1000;
    utimesSync(store.backupFile, old, old);
    store.data.players.b = { id: 'b', tokenHash: 'y', createdAt: Date.now() };
    store.save();
    expect(store.backupIfDue()).toBe(true);
    expect(Object.keys(JSON.parse(readFileSync(store.backupFile, 'utf8')).players)).toEqual(['a', 'b']);
    expect(readFileSync(file, 'utf8').length).toBeGreaterThan(10);
  });
  it('falls back to the backup when the database file is corrupted', () => {
    const { file, store } = tmpStore();
    store.data.players.a = { id: 'a', tokenHash: 'x', createdAt: Date.now() };
    store.save();
    store.backupIfDue(Date.now(), true);
    writeFileSync(file, '{ uszkodzony json');
    const recovered = new Store(file);
    expect(Object.keys(recovered.data.players)).toEqual(['a']);
  });
  it('prunes stale unfinished careers and unused accounts', () => {
    const { store } = tmpStore();
    const old = Date.now() - 90 * 24 * 3600 * 1000;
    store.data.players.p = { id: 'p', tokenHash: 'h', createdAt: old };
    store.data.careers.c = { id: 'c', playerId: 'p', seed: 's', status: 'ACTIVE', startedAt: old };
    expect(store.prune()).toBe(1);
    expect(store.data.careers.c).toBeUndefined();
    expect(store.data.players.p).toBeUndefined();
  });
});
