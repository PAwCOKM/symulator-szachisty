import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export interface PlayerRec {
  id: string;
  tokenHash: string;
  createdAt: number;
}
export interface CareerRec {
  id: string;
  playerId: string;
  seed: string;
  status: 'ACTIVE' | 'FINISHED' | 'REJECTED';
  startedAt: number;
  result?: {
    name: string;
    archetype: string;
    rating: number;
    peak: number;
    category: string;
    score: number;
    weeks: number;
    finishedAt: number;
  };
}
export interface Db {
  players: Record<string, PlayerRec>;
  careers: Record<string, CareerRec>;
}

const DAY = 24 * 3600 * 1000;
/** Niedokończone kariery starsze niż tyle dni są usuwane (nikt do nich nie wróci). */
const STALE_ACTIVE_DAYS = 60;
/** Ile niedokończonych karier jednego konta trzymamy; starsze są usuwane przy starcie nowej. */
export const MAX_ACTIVE_PER_PLAYER = 50;

/** Bardzo prosty magazyn JSON (wystarczy na start; później można podmienić na Postgres). */
export class Store {
  data: Db = { players: {}, careers: {} };
  private timer: NodeJS.Timeout | null = null;

  constructor(private file: string) {
    this.data = this.load();
  }

  get backupFile() {
    return this.file + '.bak';
  }

  /** Wczytuje bazę; gdy plik jest uszkodzony, wraca do ostatniej kopii zapasowej (z ostatnich ~24 godzin). */
  private load(): Db {
    for (const f of [this.file, this.backupFile]) {
      if (!existsSync(f)) continue;
      try {
        const d = JSON.parse(readFileSync(f, 'utf8')) as Db;
        if (d && typeof d === 'object' && d.players && d.careers) {
          if (f !== this.file) console.warn(`Baza uszkodzona lub brak pliku: wczytano kopię zapasową ${f}`);
          return d;
        }
      } catch {
        /* próbujemy następny plik */
      }
    }
    return { players: {}, careers: {} };
  }

  save() {
    mkdirSync(dirname(this.file), { recursive: true });
    const tmp = this.file + '.tmp';
    writeFileSync(tmp, JSON.stringify(this.data));
    renameSync(tmp, this.file);
  }

  /** Kopia zapasowa podmieniana co 24 godziny (jedna kopia: przy utracie bazy tracimy najwyżej dzień). Zwraca true, jeśli ją wykonano. */
  backupIfDue(now = Date.now(), force = false): boolean {
    if (!existsSync(this.file)) return false;
    if (!force && existsSync(this.backupFile) && now - statSync(this.backupFile).mtimeMs < DAY) return false;
    const tmp = this.backupFile + '.tmp';
    copyFileSync(this.file, tmp);
    renameSync(tmp, this.backupFile);
    return true;
  }

  /** Porządki: stare niedokończone kariery i konta bez karier (dawno nieużywane). Zwraca liczbę usuniętych karier. */
  prune(now = Date.now()): number {
    let removed = 0;
    for (const [id, c] of Object.entries(this.data.careers)) {
      if (c.status === 'ACTIVE' && now - c.startedAt > STALE_ACTIVE_DAYS * DAY) {
        delete this.data.careers[id];
        removed++;
      }
    }
    const withCareers = new Set(Object.values(this.data.careers).map((c) => c.playerId));
    for (const [id, p] of Object.entries(this.data.players)) {
      if (!withCareers.has(id) && now - p.createdAt > STALE_ACTIVE_DAYS * DAY) delete this.data.players[id];
    }
    if (removed) this.save();
    return removed;
  }

  /** Utrzymanie: kopia i porządki przy starcie, potem sprawdzanie co godzinę (kopia wykonuje się najwyżej raz na dobę). */
  startMaintenance() {
    const tick = () => {
      try {
        this.prune();
        this.backupIfDue();
      } catch (e) {
        console.error('Utrzymanie bazy nie powiodło się:', e);
      }
    };
    tick();
    this.timer = setInterval(tick, 3600 * 1000);
    this.timer.unref();
  }

  stopMaintenance() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
