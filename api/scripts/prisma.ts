/**
 * Run the Prisma CLI against whichever database `DATA_SOURCE` selects.
 *
 * The Prisma CLI reads `env("DATABASE_URL")` straight from the environment and
 * cannot call application code, so `prisma migrate deploy` would otherwise
 * ignore the DATA_SOURCE switch and use whatever raw `DATABASE_URL` happened to
 * be in `.env`. Importing the resolver first fixes that: it writes the resolved
 * pair into `process.env`, which the spawned CLI inherits.
 *
 * Usage (see the db:* scripts in package.json):
 *   tsx scripts/prisma.ts migrate deploy
 */
import { spawnSync } from 'child_process';
import { DATA_SOURCE, describeDatabase } from '../src/lib/data-source';

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: tsx scripts/prisma.ts <prisma args…>, e.g. migrate deploy');
  process.exit(1);
}

console.log(`Prisma → DATA_SOURCE=${DATA_SOURCE} (${describeDatabase()})`);

const result = spawnSync('npx', ['prisma', ...args], {
  stdio: 'inherit',
  env: process.env,
});

if (result.error) {
  console.error(`Could not run the Prisma CLI: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
