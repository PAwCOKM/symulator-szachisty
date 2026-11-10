import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
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

/** Bardzo prosty magazyn JSON (wystarczy na start; później można podmienić na Postgres). */
export class Store {
  data: Db = { players: {}, careers: {} };
  constructor(private file: string) {
    if (existsSync(file)) this.data = JSON.parse(readFileSync(file, 'utf8')) as Db;
  }
  save() {
    mkdirSync(dirname(this.file), { recursive: true });
    const tmp = this.file + '.tmp';
    writeFileSync(tmp, JSON.stringify(this.data));
    renameSync(tmp, this.file);
  }
}
