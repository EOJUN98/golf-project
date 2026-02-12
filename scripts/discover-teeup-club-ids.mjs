#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const crawlerRoot = path.resolve(__dirname, '..', 'crawler');

const result = spawnSync(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['run', 'teeup:discover', '--', ...process.argv.slice(2)],
  {
    cwd: crawlerRoot,
    stdio: 'inherit',
  }
);

process.exit(result.status ?? 1);
