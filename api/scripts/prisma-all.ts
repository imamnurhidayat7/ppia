/**
 * Push the Prisma schema to BOTH configured databases (local + Supabase) in one
 * command, then regenerate the client once.
 *
 * Why this exists: the app can point at either database via `DATA_SOURCE`, but a
 * schema change has to reach both or one falls out of sync — which surfaces as
 * "column does not exist" 500s the next time that database is selected. Running
 * this after any schema edit keeps them aligned.
 *
 * It resolves each target independently of `DATA_SOURCE` (unlike
 * scripts/prisma.ts, which follows the switch):
 *   Supabase ← SUPABASE_DATABASE_URL, or DATABASE_URL when that is a Supabase URL
 *   Local    ← LOCAL_DATABASE_URL,    or DATABASE_URL when that is not Supabase
 * A target is skipped when no connection string is found for it. Duplicate URLs
 * are pushed once.
 *
 * Usage:  npm run db:push:all        (extra flags are forwarded to `db push`)
 */
import { spawnSync } from 'child_process';
import 'dotenv/config';

function read(name: string): string {
  return (process.env[name] || '').split('#')[0].trim();
}

interface Target {
  name: string;
  url: string;
  directUrl: string;
}

function resolveTargets(): Target[] {
  const explicit = read('DATABASE_URL');
  const explicitDirect = read('DIRECT_URL');
  const explicitIsSupabase = explicit.includes('supabase.');

  const targets: Target[] = [];

  const supabaseUrl = read('SUPABASE_DATABASE_URL') || (explicitIsSupabase ? explicit : '');
  if (supabaseUrl) {
    const supabaseDirect =
      read('SUPABASE_DIRECT_URL') || (explicitIsSupabase ? explicitDirect : '') || supabaseUrl;
    targets.push({ name: 'supabase', url: supabaseUrl, directUrl: supabaseDirect });
  }

  const localUrl = read('LOCAL_DATABASE_URL') || (!explicitIsSupabase ? explicit : '');
  if (localUrl) {
    const localDirect = read('LOCAL_DIRECT_URL') || localUrl;
    targets.push({ name: 'local', url: localUrl, directUrl: localDirect });
  }

  // Never push the same database twice.
  const seen = new Set<string>();
  return targets.filter((t) => (seen.has(t.url) ? false : (seen.add(t.url), true)));
}

function hostOf(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port || '5432'}${u.pathname}`;
  } catch {
    return '(unparseable URL)';
  }
}

const extraArgs = process.argv.slice(2);
const targets = resolveTargets();

if (targets.length === 0) {
  console.error(
    'No databases resolved. Set LOCAL_DATABASE_URL and/or SUPABASE_DATABASE_URL (or DATABASE_URL) in .env.'
  );
  process.exit(1);
}

let failures = 0;

for (const target of targets) {
  console.log(`\n▶ Pushing schema to ${target.name} (${hostOf(target.url)})…`);
  const result = spawnSync('npx', ['prisma', 'db', 'push', '--skip-generate', ...extraArgs], {
    stdio: 'inherit',
    // Override just the connection so Prisma's own .env load cannot win.
    env: { ...process.env, DATABASE_URL: target.url, DIRECT_URL: target.directUrl },
  });
  if ((result.status ?? 1) !== 0) {
    failures += 1;
    console.error(`✖ ${target.name} push failed (see output above).`);
  } else {
    console.log(`✓ ${target.name} in sync.`);
  }
}

console.log('\n▶ Generating Prisma Client…');
const generate = spawnSync('npx', ['prisma', 'generate'], { stdio: 'inherit', env: process.env });
if ((generate.status ?? 1) !== 0) failures += 1;

if (failures > 0) {
  console.error(`\nFinished with ${failures} problem(s).`);
  process.exit(1);
}
console.log('\nAll databases are in sync.');
