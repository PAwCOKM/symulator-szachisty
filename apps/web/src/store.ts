import { create } from 'zustand';
import { createCareer, step, ENGINE_VERSION, ageOf, type Action, type CareerConfig, type CareerState } from '@chess/engine';

import { finishOnline } from './api';

export const SLOTS = 3;
const PENDING_KEY = 'szachy-pending-results';

interface PendingResult {
  config: CareerConfig;
  actions: Action[];
  online: { careerId: string; token: string };
}

function readPending(): PendingResult[] {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) ?? '[]') as PendingResult[];
  } catch {
    return [];
  }
}
function writePending(list: PendingResult[]) {
  try {
    if (list.length) localStorage.setItem(PENDING_KEY, JSON.stringify(list));
    else localStorage.removeItem(PENDING_KEY);
  } catch {
    /* pełny localStorage - ignorujemy */
  }
}

/** Zaległe wyniki (np. serwer był niedostępny po zakończeniu kariery) dosyłamy przy następnym uruchomieniu. Zwraca liczbę dosłanych. */
export async function flushPending(): Promise<number> {
  const list = readPending();
  if (!list.length) return 0;
  const left: PendingResult[] = [];
  let sent = 0;
  for (const p of list) {
    try {
      await finishOnline(p.online, p.config, p.actions);
      sent++;
    } catch (e) {
      const code = e instanceof Error ? e.message.slice(0, 3) : '';
      // 409 (już wysłane) i 4xx/422 (odrzucone) nie mają sensu ponawiać; brak połączenia zostawiamy na później
      if (!/^[1-5]\d\d$/.test(code)) left.push(p);
    }
  }
  writePending(left);
  return sent;
}
const key = (slot: number) => `szachy-save-v2-slot${slot}`;

interface Online {
  careerId: string;
  token: string;
}
interface Save {
  config: CareerConfig;
  seed: string;
  actions: Action[];
  online: Online | null;
  snapshot?: CareerState;
  /** wynik kariery został już wysłany do rankingu */
  submitted?: boolean;
}

export interface SlotInfo {
  slot: number;
  empty: boolean;
  name?: string;
  age?: number;
  rating?: number;
  category?: string;
  ended?: boolean;
  stale?: boolean;
  /** rok kariery (od 1) */
  year?: number;
  /** kariera podpięta do serwera rankingu */
  online?: boolean;
}

interface GameStore {
  slot: number;
  career: CareerState | null;
  config: CareerConfig | null;
  seed: string | null;
  actions: Action[];
  online: Online | null;
  submitted: boolean;
  error: string | null;
  start: (slot: number, config: CareerConfig, seed: string, online: Online | null) => void;
  dispatch: (a: Action) => void;
  load: (slot: number) => boolean;
  markSubmitted: () => void;
  /** usuwa zapis aktywnego slotu */
  clear: () => void;
}

function write(slot: number, s: Save | null) {
  try {
    if (s) localStorage.setItem(key(slot), JSON.stringify(s));
    else localStorage.removeItem(key(slot));
  } catch {
    /* pełny localStorage - ignorujemy */
  }
}

/** Podgląd wszystkich slotów (do ekranu głównego). */
export function slotInfos(): SlotInfo[] {
  const out: SlotInfo[] = [];
  for (let slot = 0; slot < SLOTS; slot++) {
    try {
      const raw = localStorage.getItem(key(slot));
      if (!raw) {
        out.push({ slot, empty: true });
        continue;
      }
      const sv = JSON.parse(raw) as Save;
      const c = sv.snapshot;
      if (!c || c.version !== ENGINE_VERSION) {
        out.push({ slot, empty: false, stale: true });
        continue;
      }
      out.push({ slot, empty: false, name: c.player.name, age: ageOf(c), rating: c.player.rating, category: c.player.category, ended: c.ended, year: Math.floor(c.week / 52) + 1, online: !!sv.online });
    } catch {
      out.push({ slot, empty: true });
    }
  }
  return out;
}

export function wipeSlot(slot: number) {
  write(slot, null);
}

export const useGame = create<GameStore>((set, get) => ({
  slot: 0,
  career: null,
  config: null,
  seed: null,
  actions: [],
  online: null,
  submitted: false,
  error: null,
  start(slot, config, seed, online) {
    const career = createCareer(config, seed);
    set({ slot, career, config, seed, actions: [], online, submitted: false, error: null });
    write(slot, { config, seed, actions: [], online, snapshot: career });
  },
  dispatch(a) {
    const { career, actions, config, seed, online, slot, submitted } = get();
    if (!career || !config || !seed) return;
    try {
      const next = step(career, a);
      const acts = [...actions, a];
      set({ career: next, actions: acts, error: null });
      write(slot, { config, seed, actions: acts, online, snapshot: next, submitted });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },
  load(slot) {
    try {
      const raw = localStorage.getItem(key(slot));
      if (!raw) return false;
      const sv = JSON.parse(raw) as Save;
      if (!sv.snapshot || sv.snapshot.version !== ENGINE_VERSION) return false; // zapis ze starej wersji gry
      set({ slot, career: sv.snapshot, config: sv.config, seed: sv.seed, actions: sv.actions, online: sv.online, submitted: !!sv.submitted, error: null });
      return true;
    } catch {
      return false;
    }
  },
  markSubmitted() {
    const { career, actions, config, seed, online, slot } = get();
    set({ submitted: true });
    if (career && config && seed) write(slot, { config, seed, actions, online, snapshot: career, submitted: true });
  },
  clear() {
    const { career, config, actions, online, submitted } = get();
    // kariera skończona, ale wynik nie dotarł do serwera: zachowujemy go do późniejszego dosłania
    if (career?.ended && config && online && !submitted) writePending([...readPending(), { config, actions, online }]);
    write(get().slot, null);
    set({ career: null, config: null, seed: null, actions: [], online: null, submitted: false, error: null });
  },
}));
