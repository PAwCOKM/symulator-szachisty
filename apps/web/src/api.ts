import type { Action, CareerConfig } from '@chess/engine';

const TOKEN_KEY = 'szachy-token';

async function req<T>(path: string, init?: RequestInit & { token?: string }): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
      ...(init?.token ? { authorization: `Bearer ${init.token}` } : {}),
    },
  });
  if (!res.ok) {
    let detail = '';
    try {
      const j = (await res.json()) as { error?: string; detail?: string };
      detail = [j.error, j.detail].filter(Boolean).join(': ');
    } catch {
      /* brak treści */
    }
    throw new Error(`${res.status}${detail ? ' ' + detail : ''}`);
  }
  return (await res.json()) as T;
}

async function token(fresh = false): Promise<string> {
  let t = fresh ? null : localStorage.getItem(TOKEN_KEY);
  if (!t) {
    const r = await req<{ token: string }>('/v1/auth/anonymous', { method: 'POST' });
    t = r.token;
    localStorage.setItem(TOKEN_KEY, t);
  }
  return t;
}

/** Próba rozpoczęcia kariery online (seed od serwera). Przy braku API - null (gra offline). */
export async function startOnline(): Promise<{ seed: string; online: { careerId: string; token: string } } | null> {
  try {
    let t = await token();
    let r: { careerId: string; seed: string };
    try {
      r = await req<{ careerId: string; seed: string }>('/v1/careers', { method: 'POST', token: t });
    } catch (e) {
      // zapamiętany token nie jest znany serwerowi (np. inna baza): zakładamy nowe konto anonimowe i próbujemy raz jeszcze
      if (!(e instanceof Error) || !e.message.startsWith('401')) throw e;
      t = await token(true);
      r = await req<{ careerId: string; seed: string }>('/v1/careers', { method: 'POST', token: t });
    }
    return { seed: r.seed, online: { careerId: r.careerId, token: t } };
  } catch {
    return null;
  }
}

/** Kod konta w czytelnej postaci XXXX-XXXX-XXXX-XXXX (długie, stare tokeny pokazujemy bez zmian). */
export function formatCode(t: string): string {
  return t.length === 16 ? t.match(/.{4}/g)!.join('-') : t;
}

/** Sprowadza wpisany kod do postaci, w jakiej go trzyma serwer. */
export function cleanCode(t: string): string {
  return t.replace(/[\s-]/g, '').toUpperCase();
}

/** Kod konta tej przeglądarki (null, jeśli jeszcze nie grałeś online). Stary, długi token jest przy okazji wymieniany na krótki kod. */
export async function myAccountCode(): Promise<string | null> {
  const t = localStorage.getItem(TOKEN_KEY);
  if (!t) return null;
  if (t.length === 16) return t;
  try {
    const r = await req<{ token: string }>('/v1/me/rotate', { method: 'POST', token: t });
    localStorage.setItem(TOKEN_KEY, r.token);
    return r.token;
  } catch {
    return t;
  }
}

/** Sprawdza kod konta na serwerze. Zwraca liczbę wyników (zakończonych karier) albo null, gdy kod jest nieznany. */
export async function checkCode(code: string): Promise<number | null> {
  try {
    const r = await req<{ finished: number }>('/v1/me', { token: cleanCode(code) });
    return r.finished;
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('401')) return null;
    throw e;
  }
}

/** Zapamiętuje podany kod jako konto tej przeglądarki (np. po wyczyszczeniu danych albo na nowym urządzeniu). */
export function useCode(code: string) {
  localStorage.setItem(TOKEN_KEY, cleanCode(code));
}

/** Usuwa z serwera konto o podanym kodzie (domyślnie konto tej przeglądarki). Zwraca liczbę usuniętych karier albo null, gdy konta nie ma. */
export async function deleteByCode(code: string): Promise<number | null> {
  try {
    const r = await req<{ deleted: number }>('/v1/me', { method: 'DELETE', token: cleanCode(code) });
    if (localStorage.getItem(TOKEN_KEY) === cleanCode(code)) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('szachy-pending-results');
    }
    return r.deleted;
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('401')) return null;
    throw e;
  }
}

/** Usuwa z serwera anonimowe konto tej przeglądarki i jego wyniki. Zwraca liczbę usuniętych karier albo null, gdy konta nie ma. */
export async function deleteMyData(): Promise<number | null> {
  const t = localStorage.getItem(TOKEN_KEY);
  if (!t) return null;
  try {
    const r = await req<{ deleted: number }>('/v1/me', { method: 'DELETE', token: t });
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('szachy-pending-results');
    return r.deleted;
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('401')) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    throw e;
  }
}

export interface FinishResult {
  verified: boolean;
  result: { peak: number; score: number; category: string };
}

export async function finishOnline(online: { careerId: string; token: string }, config: CareerConfig, actions: Action[]): Promise<FinishResult> {
  return req<FinishResult>(`/v1/careers/${online.careerId}/finish`, { method: 'POST', token: online.token, body: JSON.stringify({ config, actions }) });
}

export interface BoardRow {
  rank: number;
  name: string;
  peak: number;
  score: number;
  category: string;
}
export type BoardPeriod = 'day' | 'week' | 'all';
export async function board(name: 'score' | 'peak', period: BoardPeriod = 'all'): Promise<BoardRow[]> {
  const r = await req<{ rows: BoardRow[] }>(`/v1/boards/${name}?period=${period}`);
  return r.rows;
}
