/**
 * Post-build gate (NFR-01): no API key or secret may reach the client bundle.
 * Scans dist/ for the literal value of every variable in .env (when the file exists)
 * and for well-known secret patterns. Never prints a secret.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

if (!existsSync(DIST)) {
  console.error('check-dist: dist/ not found. Run the build first.');
  process.exit(1);
}

const needles: { name: string; test: (text: string) => boolean }[] = [
  { name: 'ELEVENLABS_API_KEY reference', test: (s) => s.includes('ELEVENLABS_API_KEY') },
  { name: 'xi-api-key header', test: (s) => s.toLowerCase().includes('xi-api-key') },
  { name: 'ElevenLabs API host', test: (s) => s.includes('api.elevenlabs.io') },
  { name: 'secret-looking token', test: (s) => /\bsk_[A-Za-z0-9]{24,}\b/.test(s) },
];

const envFile = join(ROOT, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*["']?([^"'\s#]+)/.exec(line);
    if (m && m[2].length >= 12) needles.push({ name: `value of ${m[1]} from .env`, test: (s) => s.includes(m[2]) });
  }
}

const files: string[] = [];
const walk = (dir: string) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(js|mjs|css|html|json|map|txt|svg)$/.test(f)) files.push(p);
  }
};
walk(DIST);

const hits: string[] = [];
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const n of needles) if (n.test(text)) hits.push(`${file.slice(ROOT.length + 1)}: contains ${n.name}`);
}

if (hits.length) {
  console.error(`check-dist: SECRET LEAK RISK\n  - ${hits.join('\n  - ')}`);
  process.exit(1);
}
console.log(`check-dist ok: ${files.length} files scanned, no secrets in the bundle`);
