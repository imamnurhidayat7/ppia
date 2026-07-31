# PPIA Auckland

Website and membership platform for **PPIA Auckland** — Perhimpunan Pelajar Indonesia Auckland (the Indonesian Students' Association in Auckland, New Zealand).

A monorepo with two applications:

| App   | Path    | Stack                                                            |
| ----- | ------- | ---------------------------------------------------------------- |
| **Web**   | [`web/`](web)   | Next.js 16 (App Router), React 19, Tailwind CSS v4, TypeScript |
| **API**   | [`api/`](api)   | Express, Prisma, PostgreSQL, TypeScript                        |

It powers three things:

1. **Public site** — homepage, events, articles, research corner, About/Contact pages, and the student election (PEMIRA). Content is editable through a CMS and supports an English/Indonesian language toggle for visitors.
2. **Member dashboard** — a signed-in area where approved members browse content, register for events, manage their profile and member card, and vote in elections.
3. **Admin dashboard** — role-gated tooling to manage content, members, media, comments, newsletters, analytics, elections, and site configuration.

---

## Prerequisites

Before you start, make sure these are installed:

| Tool          | Version      | Notes                                                                  |
| ------------- | ------------ | ---------------------------------------------------------------------- |
| **Node.js**   | **22 or newer** | The repository's `engines` field requires it. `22.12+` is recommended because `jsdom` (via `isomorphic-dompurify`) needs `require()` of ESM to work. |
| **npm**       | 10+          | Comes with Node.                                                       |
| **PostgreSQL** | **14 or newer** | Either a local install or the Docker Compose file in this repo.      |
| **Docker** *(optional)* | any   | Only if you want to run Postgres in a container instead of installing it natively. |
| **Mailtrap** *(optional)* | — | Only needed if you want to send real transactional e-mails. The API runs fine without it and just logs outgoing mail to the console. |

Verify your Node version:

```bash
node --version   # must print v22.x or higher
```

---

## Quick start (5 minutes)

This is the fastest path to a running app on your laptop. The whole setup has four parts, in order:

1. Install **Node.js** (and **npm**, which ships with it)
2. Install **PostgreSQL** (either natively on your OS, or via Docker)
3. Install the project's **dependencies**
4. Configure **environment variables**, create the **database**, and **run** the app

Pick the tab for your OS in step 2 — everything else is identical.

### 1. Install Node.js

You need **Node.js 22 or newer** (the repository's `engines` field enforces this). If you have it, skip ahead. Otherwise:

<details>
<summary><strong>macOS</strong></summary>

```bash
# Recommended: install nvm (Node Version Manager) so you can switch versions per project.
# See https://github.com/nvm-sh/nvm for the full installer. With Homebrew:
brew install nvm

# Then, in any new shell:
nvm install 22
nvm use 22
```

Or, simpler, with Homebrew directly (locks you to one version):

```bash
brew install node@22
brew link --overwrite node@22
```

</details>

<details>
<summary><strong>Windows</strong></summary>

**Option A — nvm-windows** (lets you switch versions per project; recommended if you ever work on multiple Node projects):

1. Download the latest installer from <https://github.com/coreybutler/nvm-windows/releases> (`nvm-setup.exe`).
2. Run the installer (it will ask for the install directory and the symlink directory — the defaults are fine).
3. Open a **new** PowerShell window so `nvm` is on your `PATH`, then:

```powershell
nvm install 22
nvm use 22
```

**Option B — official installer** (single version, no manager):

1. Download the **Windows Installer (.msi)** for Node 22 LTS from <https://nodejs.org/en/download>.
2. Run the installer. Make sure **"Add to PATH"** is checked.
3. Open a new PowerShell window so `node` and `npm` are on your `PATH`.

</details>

<details>
<summary><strong>Linux</strong> (Ubuntu / Debian)</summary>

```bash
# Recommended: install nvm so you can switch versions per project.
# See https://github.com/nvm-sh/nvm for the full installer. With the official script:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# Close and re-open your shell, then:
nvm install 22
nvm use 22
```

Or, simpler, with the system package manager (single version):

```bash
sudo apt update
sudo apt install -y curl ca-certificates
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

On Fedora / RHEL, replace the `apt` block with the equivalent `dnf` command and the `rpm` version of the NodeSource setup script.

</details>

Verify it worked:

```bash
node --version   # must print v22.x or higher
npm --version    # must print 10.x or higher
```

### 2. Install PostgreSQL

Pick **either** a native install for your OS **or** Docker. Both produce the same database; choose what feels lighter.

<details>
<summary><strong>macOS — native Postgres</strong> (recommended)</summary>

```bash
brew install postgresql@16
brew services start postgresql@16

# Create the database. Homebrew creates a role named after your macOS user
# with no password, so this just works without further configuration:
createdb ppia
```

</details>

<details>
<summary><strong>Windows — native Postgres</strong></summary>

1. Download the **Windows installer** for PostgreSQL 16 from <https://www.postgresql.org/download/windows/> (the EDB-provided installer is the standard choice).
2. Run the installer. It will prompt you for:
   - **Port**: keep `5432`
   - **Password**: pick one for the `postgres` superuser and remember it — you'll need it in step 4
3. Open **SQL Shell (psql)** from the Start menu (or use the pgAdmin GUI). At the prompt:

```sql
CREATE DATABASE ppia;
```

Note the password you set — you'll put it into `api/.env` later.

</details>

<details>
<summary><strong>Linux (Ubuntu / Debian) — native Postgres</strong></summary>

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# Start the service (Ubuntu uses systemd; older releases may need `service`)
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create the database. The default Postgres role is `postgres`; switch to it
# and create the database:
sudo -u postgres createdb ppia
```

You'll authenticate as `postgres` in step 4, which on Debian means `peer` auth from the `postgres` system user. If you'd rather use a password, edit `/etc/postgresql/16/main/pg_hba.conf` (change `peer` to `md5` for `local` connections) and set a password with `sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'your-password';"`.

</details>

<details>
<summary><strong>Any OS — Postgres via Docker</strong></summary>

The repository ships a `docker-compose.dev.yml` with a Postgres 16 container. It publishes on host port **5433** so it never collides with a Postgres you may already run on the standard 5432.

```bash
# Make sure Docker Desktop (or the Docker Engine on Linux) is running first.
docker compose -f docker-compose.dev.yml up -d

# Wait a few seconds for the healthcheck to pass, then verify:
docker compose -f docker-compose.dev.yml ps
```

Stop it later with `docker compose -f docker-compose.dev.yml down` (add `-v` to also delete the data volume).

</details>

### 3. Install project dependencies

Run from the **repository root**:

```bash
git clone <your-fork-or-remote-url> ppia-landingpage
cd ppia-landingpage
npm run install:all
```

`install:all` runs `npm install` in three places: the root, `api/`, and `web/`.

### 4. Configure environment, create the schema, and run

```bash
# Create your local env file from the checked-in template
cp api/.env.example api/.env

# web/.env.local is already checked in and points at http://localhost:4000.
# Only create your own if you need to point the web app at a different API.
```

Now edit **`api/.env`** — at minimum, set these two values to match the Postgres from step 2:

```bash
DATA_SOURCE=local
JWT_SECRET=replace-with-a-long-random-string
```

…and set **`LOCAL_DATABASE_URL`** to match your Postgres variant:

| Postgres install | `LOCAL_DATABASE_URL`                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| macOS (Homebrew) | `postgresql://YOUR_USERNAME@localhost:5432/ppia?schema=public` (use `whoami` for the username)     |
| Windows (native) | `postgresql://postgres:YOUR_PASSWORD@localhost:5432/ppia?schema=public`                           |
| Linux (Debian)   | `postgresql://postgres:YOUR_PASSWORD@localhost:5432/ppia?schema=public`                           |
| Docker           | `postgresql://ppia:ppia_local_dev@localhost:5433/ppia?schema=public`                              |

For Linux/Debian without a password, drop `:YOUR_PASSWORD` and switch auth to `trust` in `pg_hba.conf` for local connections — or set a password and keep the URL above.

Apply the database migrations and start the apps:

```bash
# Apply migrations + regenerate the Prisma client
cd api && npm run db:deploy && npm run db:generate && cd ..

# Start API (port 4000) and web (port 3001) together in watch mode
npm run dev
```

When everything is up:

- **Web** → <http://localhost:3001>
- **API** → <http://localhost:4000> (health check at `/health`)

### 5. Create your first admin account

```bash
# Make sure the dev servers are running in one terminal (npm run dev).
# In another terminal, register the first user through the web UI:
#   open http://localhost:3001/register
#
# That account starts as MEMBER with PENDING status. Promote it to
# SUPER_ADMIN so you can reach the admin dashboard:
npx prisma studio --schema=api/prisma/schema.prisma
# Open the User table, edit your row, set role = SUPER_ADMIN and status = APPROVED.
```

---

## Common scripts

Run from the repository root:

| Command               | What it does                                                  |
| --------------------- | ------------------------------------------------------------- |
| `npm run install:all` | Install dependencies for root, `api/`, and `web/`              |
| `npm run dev`         | Start API (port 4000) and web (port 3001) together, watch mode |
| `npm run build`       | Production build of the web app                               |
| `npm run start`       | Run both apps in production mode (after building)             |

Inside `api/`:

| Command               | What it does                                          |
| --------------------- | ----------------------------------------------------- |
| `npm run dev`         | Start the API with hot reload (`tsx watch`)           |
| `npm run build`       | Compile TypeScript to `dist/`                         |
| `npm start`           | Run the compiled API                                  |
| `npm run typecheck`   | Type-check API sources without emitting files         |
| `npm test`            | Run API unit tests once                               |
| `npm run db:deploy`   | Apply committed migrations to the selected database   |
| `npm run db:status`   | Show migration state of the selected database         |
| `npm run db:migrate`  | Create/develop migrations locally (`prisma migrate dev`) |
| `npm run db:studio`   | Open Prisma Studio                                    |

Inside `web/`:

| Command             | What it does                                          |
| ------------------- | ----------------------------------------------------- |
| `npm run dev`       | Next.js dev server on port 3001                       |
| `npm run build`     | Production build                                      |
| `npm run typecheck` | Type-check the Next.js app without emitting files     |
| `npm run lint`      | Run ESLint                                            |
| `npm test`          | Run web unit tests once                               |

---

## Where data lives

A single variable, `DATA_SOURCE` in `api/.env`, selects the database **and** the file storage together so the two can never end up pointing at different environments by accident:

| `DATA_SOURCE` | Database                              | Uploads                                |
| ------------- | ------------------------------------- | -------------------------------------- |
| `local`       | `LOCAL_DATABASE_URL`                  | `api/uploads` (public) and `api/storage/private` (signed links) |
| `supabase`    | `SUPABASE_DATABASE_URL` (+ `SUPABASE_DIRECT_URL` for migrations) | Supabase Storage buckets               |

Set `STORAGE_DRIVER` only to break the pairing deliberately. A host that injects `DATABASE_URL` (Render, Fly, Heroku) keeps working without `DATA_SOURCE` at all — an explicit `DATABASE_URL` always wins.

See [`docs/configuration.md`](docs/configuration.md) for the full list of environment variables.

---

## Troubleshooting

**`Error: connect ECONNREFUSED 127.0.0.1:5432`** — Postgres isn't running, or you're using the Docker variant and your `LOCAL_DATABASE_URL` still points to port 5432. Either start Postgres (`brew services start postgresql@16`) or switch the URL to port 5433 (see Option B above).

**`Port 4000 is already in use`** — Another process is bound to 4000. Either stop it, or change `PORT` in `api/.env`.

**`Port 3001 is already in use`** — Same idea on the web side; either free the port or change it in `web/package.json`'s `dev` script.

**First migration complains about a missing database** — Run `createdb ppia` (native) or `docker compose -f docker-compose.dev.yml up -d` (Docker) before re-running `npm run db:deploy`.

**Mail errors in the console** — Expected. The API logs e-mails instead of sending them unless `MAILTRAP_TOKEN` is set in `api/.env`.

---

## Repository layout

```
LandingPage/
├── api/                 # Express + Prisma backend
│   ├── prisma/          # schema.prisma, migrations, seed scripts
│   └── src/
│       ├── controllers/ # request handlers
│       ├── routes/      # Express routers, mounted under /api
│       ├── middleware/  # auth, rate limiting, security headers
│       └── lib/         # prisma client, mailer, helpers
├── web/                 # Next.js frontend
│   └── src/
│       ├── app/         # App Router pages (public + /dashboard)
│       ├── components/  # UI kit, dashboard shell, sections
│       └── lib/         # API client, contexts, utilities
├── docs/                # Full documentation (start at docs/README.md)
└── package.json         # workspace scripts (dev, build, start)
```

---

## Documentation

Full documentation lives in [`docs/`](docs/README.md):

- [Getting started](docs/getting-started.md) — prerequisites, local setup, first admin account
- [Architecture](docs/architecture.md) — how the pieces fit together
- [Configuration](docs/configuration.md) — every environment variable
- [Data model](docs/data-model.md) — Prisma models, roles, membership lifecycle
- [API reference](docs/api-reference.md) — endpoints grouped by resource
- [Frontend guide](docs/frontend.md) — dashboard, roles, design system, theming, i18n
- [Deployment](docs/deployment.md) — production checklist

---

## License

Private project for PPIA Auckland. Not licensed for public reuse.
