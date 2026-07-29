/**
 * One switch for where data lives: `DATA_SOURCE=local | supabase`.
 *
 * Both the database and file storage used to be configured by hand, which meant
 * moving between a local machine and the hosted project involved editing
 * connection strings and remembering to flip the storage driver with them. A
 * half-flipped `.env` is the dangerous state: the API reads a local database
 * while writing uploads into the production bucket.
 *
 * So the choice is made once:
 *
 *   DATA_SOURCE=local     → LOCAL_DATABASE_URL     + storage on disk
 *   DATA_SOURCE=supabase  → SUPABASE_DATABASE_URL  + Supabase Storage
 *
 * Existing setups keep working: `STORAGE_DRIVER` always wins over the inferred
 * driver, and `DATABASE_URL` is used whenever the variable for the selected
 * source is absent. With `DATA_SOURCE` unset, `DATABASE_URL` also picks the
 * source, so a host that injects it (Render, Fly) needs no other change. What it
 * does not do is override an explicit `DATA_SOURCE` — that would defeat the
 * point of the switch.
 *
 * This module has one side effect on purpose: it writes the resolved values back
 * into `process.env` so Prisma — which reads `env("DATABASE_URL")` from the
 * schema and cannot call our code — sees them. It must therefore be imported
 * before the Prisma client is constructed; `lib/prisma.ts` does that.
 */
import 'dotenv/config';

export type DataSource = 'local' | 'supabase';

/** Read an env var, tolerating dotenv keeping inline `# comments`. */
function read(name: string): string {
  return (process.env[name] || '').split('#')[0].trim();
}

/** Default local connection: a native Postgres on the standard port. */
const DEFAULT_LOCAL_URL = 'postgresql://postgres:postgres@localhost:5432/ppia?schema=public';

function resolveDataSource(): DataSource {
  const configured = read('DATA_SOURCE').toLowerCase();
  if (configured === 'local' || configured === 'supabase') return configured;

  // Not set: infer from what is actually present, preferring an explicit
  // DATABASE_URL so nothing changes for existing setups and hosted deployments.
  if (read('DATABASE_URL')) {
    return read('DATABASE_URL').includes('supabase.') ? 'supabase' : 'local';
  }
  if (read('SUPABASE_DATABASE_URL')) return 'supabase';
  return 'local';
}

export const DATA_SOURCE: DataSource = resolveDataSource();

/**
 * Resolve the pair of connection strings for the selected source.
 *
 * `directUrl` matters for Prisma migrations: DDL cannot run through a
 * transaction pooler, so when the runtime URL is pooled the direct one must be
 * supplied separately. For a local database both are the same connection.
 */
function resolveDatabaseUrls(): { url: string; directUrl: string } {
  const explicit = read('DATABASE_URL');
  const explicitDirect = read('DIRECT_URL');

  if (DATA_SOURCE === 'supabase') {
    const url = read('SUPABASE_DATABASE_URL') || explicit;
    const directUrl = read('SUPABASE_DIRECT_URL') || explicitDirect || url;
    if (!url) {
      throw new Error(
        'DATA_SOURCE=supabase but no connection string found. Set SUPABASE_DATABASE_URL (and SUPABASE_DIRECT_URL for migrations).'
      );
    }
    return { url, directUrl };
  }

  const url = read('LOCAL_DATABASE_URL') || explicit || DEFAULT_LOCAL_URL;
  // A local Postgres is never pooled, so the migration connection is the same.
  const directUrl = read('LOCAL_DIRECT_URL') || url;
  return { url, directUrl };
}

const { url, directUrl } = resolveDatabaseUrls();

export const DATABASE_URL = url;
export const DATABASE_DIRECT_URL = directUrl;

// Hand the resolved values to Prisma, which reads them from the environment.
process.env.DATABASE_URL = url;
process.env.DIRECT_URL = directUrl;

/**
 * Storage follows the same switch unless told otherwise, so the two can never
 * end up pointing at different environments by accident.
 */
if (!read('STORAGE_DRIVER')) {
  process.env.STORAGE_DRIVER = DATA_SOURCE === 'supabase' ? 'supabase' : 'local';
}

/** Host and database name only — never the credentials. */
export function describeDatabase(): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}:${parsed.port || '5432'}${parsed.pathname}`;
  } catch {
    return '(unparseable connection string)';
  }
}
