# Configuration

All backend configuration is environment-driven. Copy `api/.env.example` to
`api/.env` and fill in real values — `.env` is gitignored and must never be
committed.

## API environment variables

### Server

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `4000` | Port the API listens on. |
| `API_URL` | `http://localhost:4000` | Public base URL of the API, used to build absolute links in e-mails. |
| `FRONTEND_URL` | `http://localhost:3000` | Origin of the web app. Always allowed by CORS and used in e-mail links. |

### Database

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection used by the running Prisma client. It may be a pooled/PgBouncer URL in production. **Required.** |
| `DIRECT_URL` | Direct PostgreSQL connection used by Prisma migration commands. It can equal `DATABASE_URL` locally; when `DATABASE_URL` uses a pooler, point this at the direct database port. **Required by the Prisma schema.** |

### Authentication

| Variable | Description |
| --- | --- |
| `JWT_SECRET` | Signing secret for JSON Web Tokens. Use a long, random, per-environment string. Rotating it invalidates every issued token. **Required.** |

### E-mail (Mailtrap)

Transactional mail is sent through the Mailtrap HTTP API (`api/src/lib/mailer.ts`).
If `MAILTRAP_TOKEN` is empty, the API logs e-mails to the console instead of sending
them, so local development works without credentials.

| Variable | Default | Description |
| --- | --- | --- |
| `MAILTRAP_USE_SANDBOX` | `true` | When `true`, nothing reaches real recipients; every message lands in the Mailtrap inbox named by `MAILTRAP_INBOX_ID`. Set to `false` only once the sending domain is verified. |
| `MAILTRAP_TOKEN` | *(empty)* | API token for Mailtrap sending. `MAILTRAP_API_KEY` is accepted as an alias. |
| `MAILTRAP_INBOX_ID` | *(empty)* | Required only when `MAILTRAP_USE_SANDBOX=true`. |
| `MAIL_FROM` | `no-reply@ppiaauckland.org` | Envelope sender. In production the domain must be verified in Mailtrap. |
| `MAIL_FROM_NAME` | `PPIA Auckland` | Display name on outbound e-mail. |

### Rate limiting

| Variable | Default | Description |
| --- | --- | --- |
| `TRUST_PROXY` | *(unset)* | Number of reverse proxies in front of the process (`1` behind a single nginx/load balancer), or a comma-separated list of addresses. Required for correct client IPs behind a proxy. Leave unset when reached directly — trusting `X-Forwarded-For` without a proxy lets callers spoof their address and bypass the limiter. |
| `RATE_LIMIT_DISABLED` | `false` | Set to `true` to switch off rate limiting. Local development only. |

### CORS

| Variable | Description |
| --- | --- |
| `CORS_ORIGINS` | Extra browser origins allowed to call the API, comma-separated (staging host, custom domain). `FRONTEND_URL` is always allowed, and `localhost:3000` / `localhost:3001` are always allowed for local development. |

## Web environment variables

The web app reads public variables at build time. They must be prefixed with
`NEXT_PUBLIC_` to be exposed to the browser.

`web/.env.local`:

| Variable | Default | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | Base URL of the API the browser client calls. |

## Notes on secrets

- `JWT_SECRET` and `DATABASE_URL` are the two values that must always be set and kept
  private.
- Use distinct `JWT_SECRET` values per environment (dev / staging / production).
- Do not commit `.env` or `.env.local`. Only `.env.example` (placeholders) is tracked.
