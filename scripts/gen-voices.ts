/**
 * Voice files (B-04, 10.5, 15.4, R-08). Development time only: nothing here ships to the browser.
 *
 *   npx tsx scripts/gen-voices.ts --dry-run prologue e02-apollo11 finale   # what would be made, and how many characters
 *   npx tsx scripts/gen-voices.ts prologue e02-apollo11 finale             # make them
 *   npx tsx scripts/gen-voices.ts --limit 1 e02-apollo11                   # a one-line test
 *
 * It reads the compiled content, takes every text that has a voice id (src/content/voice.ts), maps the speaker
 * to a stock voice (content/voices.yaml), and writes public/assets/vo/vo_<id>_en.mp3.
 *
 *  - The key comes from .env (ELEVENLABS_API_KEY) and is never printed. A key that can only do text to speech is enough.
 *  - A line is redone only when its text or its voice changed (assets-src/vo-cache.json).
 *  - Speakers that are not in voices.yaml are skipped: real people are never voiced (B-D05).
 *  - Every file gets an ID3 tag that says it is an AI-generated voice. No ffmpeg needed.
 *  - If the quota runs out, it stops and keeps what it has; the game shows captions for the rest (FR-34).
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { voiceLines } from '../src/content/voice.ts';
import { buildContent } from './build-content.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'assets', 'vo');
const CACHE = join(ROOT, 'assets-src', 'vo-cache.json');
const LABEL = 'AI-generated voice (ElevenLabs)';

type Voices = { model: string; format: string; settings: Record<string, number>; voices: Record<string, { name: string; id: string }> };

const args = process.argv.slice(2);
const dry = args.includes('--dry-run');
const limitAt = args.indexOf('--limit');
const limit = limitAt >= 0 ? Number(args[limitAt + 1]) : Infinity;
const only = args.filter((a, i) => !a.startsWith('--') && i !== limitAt + 1);

function key(): string {
  const file = join(ROOT, '.env');
  const found = existsSync(file) ? /^ELEVENLABS_API_KEY\s*=\s*["']?([^"'\s#]+)/m.exec(readFileSync(file, 'utf8'))?.[1] : undefined;
  if (!found) throw new Error('ELEVENLABS_API_KEY is missing. Copy .env.example to .env and ask the team for the key.');
  return found;
}

/** A minimal ID3v2.3 tag: title, artist and a comment that declares the voice as AI-generated (R-08). */
function id3(title: string, voice: string): Buffer {
  const frame = (id: string, body: Buffer) => {
    const head = Buffer.alloc(10);
    head.write(id, 0, 'latin1');
    head.writeUInt32BE(body.length, 4);
    return Buffer.concat([head, body]);
  };
  const text = (s: string) => Buffer.concat([Buffer.from([0]), Buffer.from(s, 'latin1')]);
  const comment = Buffer.concat([Buffer.from([0]), Buffer.from('eng', 'latin1'), Buffer.from([0]), Buffer.from(LABEL, 'latin1')]);
  const frames = Buffer.concat([frame('TIT2', text(title)), frame('TPE1', text(`${LABEL}, stock voice "${voice}"`)), frame('COMM', comment)]);
  const head = Buffer.alloc(10);
  head.write('ID3', 0, 'latin1');
  head[3] = 3;
  // Size as a 28-bit "synchsafe" integer.
  for (let i = 0; i < 4; i++) head[6 + i] = (frames.length >> (7 * (3 - i))) & 0x7f;
  return Buffer.concat([head, frames]);
}

async function main() {
  const cfg = parse(readFileSync(join(ROOT, 'content', 'voices.yaml'), 'utf8')) as Voices;
  const content = buildContent({ quiet: true });
  const cache: Record<string, string> = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};
  mkdirSync(OUT, { recursive: true });

  const all = voiceLines(content, only.length ? only : undefined);
  const skipped = new Set(all.filter((l) => !cfg.voices[l.who]).map((l) => l.who));
  const lines = all.filter((l) => cfg.voices[l.who]);
  const hash = (l: (typeof lines)[number]) => createHash('sha1').update(`${cfg.model}|${cfg.voices[l.who].id}|${JSON.stringify(cfg.settings)}|${l.text}`).digest('hex');
  const todo = lines.filter((l) => cache[l.id] !== hash(l) || !existsSync(join(OUT, `vo_${l.id}_en.mp3`))).slice(0, limit);

  const chars = todo.reduce((n, l) => n + l.text.length, 0);
  console.log(`${lines.length} spoken lines in ${only.join(', ') || 'the whole game'}; ${lines.length - todo.length} already made; ${todo.length} to make, ${chars} characters.`);
  if (skipped.size) console.log(`not voiced (no entry in voices.yaml, on purpose for real people): ${[...skipped].join(', ')}`);
  const byVoice: Record<string, number> = {};
  for (const l of todo) byVoice[l.who] = (byVoice[l.who] ?? 0) + l.text.length;
  for (const [who, n] of Object.entries(byVoice)) console.log(`  ${who.padEnd(9)} ${cfg.voices[who].name.padEnd(8)} ${n} characters`);
  if (dry) {
    for (const l of todo) console.log(`  ${l.id}  [${l.who}]  ${l.text.slice(0, 70)}${l.text.length > 70 ? '…' : ''}`);
    return;
  }
  if (!todo.length) return;

  const apiKey = key();
  let made = 0;
  for (const l of todo) {
    const v = cfg.voices[l.who];
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${v.id}?output_format=${cfg.format}`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'content-type': 'application/json', accept: 'audio/mpeg' },
      body: JSON.stringify({ text: l.text, model_id: cfg.model, voice_settings: cfg.settings }),
    });
    if (!res.ok) {
      const why = (await res.text()).slice(0, 300);
      console.error(`\nstopped at ${l.id}: HTTP ${res.status} ${why}`);
      break;
    }
    const audio = Buffer.from(await res.arrayBuffer());
    writeFileSync(join(OUT, `vo_${l.id}_en.mp3`), Buffer.concat([id3(l.id, v.name), audio]));
    cache[l.id] = hash(l);
    writeFileSync(CACHE, `${JSON.stringify(cache, null, 1)}\n`);
    made++;
    console.log(`  ✓ ${l.id} (${v.name}, ${(audio.length / 1024).toFixed(0)} kB)`);
  }
  console.log(`\n${made} of ${todo.length} files written to public/assets/vo/.`);
  if (made < todo.length) process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
