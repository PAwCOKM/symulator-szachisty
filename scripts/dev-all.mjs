// Uruchamia API (port 8787) i front (port 5173) jednym poleceniem: npm run dev:all
import { spawn } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const run = (script) => spawn(npm, ['run', script], { stdio: 'inherit', shell: process.platform === 'win32' });
const procs = [run('dev:api'), run('dev')];
const stop = () => procs.forEach((p) => p.kill());
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
procs.forEach((p) => p.on('exit', (code) => { if (code) { stop(); process.exit(code); } }));
