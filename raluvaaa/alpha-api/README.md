# RALUVAAA shared alpha API

This is the minimum shared persistence layer required to move from the deterministic local A/B sandbox to a real multi-browser private alpha.

It deliberately does **not** add AI, MCP, public profiles or a feed.

## What it provides

- anonymous lightweight browser identity through an opaque session token;
- public shared wishes and lineages;
- CREATE / EVOLVE / SPLIT / +BRANCH / BLOOM / ABANDON / REATTACH / correction;
- one ENCOURAGE per actor per wish;
- HELP, SUGGEST A BRANCH and CONNECT as proposals;
- consent before proposals materialise;
- private inbox/notifications;
- public events that never expose private help text;
- basic Report storage;
- a basic publication-scope guard for URLs/contact details and categories excluded from the alpha.

The alpha session identity is intentionally lighter than the later email + magic-link claim flow. Clearing the browser can lose management access until claim/recovery exists.

## D1

1. Create a D1 database named `raluvaaa-alpha`.
2. Apply `schema.sql`.
3. Copy `wrangler.toml.example` to `wrangler.toml` and set the real `database_id`.
4. Deploy the Worker.
5. Set `ALLOWED_ORIGINS` to the exact production/test origins.
6. Before widening the alpha, configure Turnstile and store the secret as `TURNSTILE_SECRET`.

Typical commands once Cloudflare credentials are available:

```sh
npx wrangler d1 create raluvaaa-alpha
npx wrangler d1 execute raluvaaa-alpha --remote --file=schema.sql
npx wrangler deploy
```

## API surface

- `GET /v1/health`
- `POST /v1/session`
- `GET /v1/world`
- `GET /v1/me`
- `GET /v1/inbox`
- `POST /v1/wishes`
- `POST /v1/wishes/:id/events`
- `POST /v1/wishes/:id/encourage`
- `POST /v1/proposals`
- `POST /v1/proposals/:id/respond`
- `POST /v1/proposals/:id/cancel`
- `POST /v1/notifications/:id/read`
- `POST /v1/reports`

Authenticated calls use `Authorization: Bearer <session token>`.

## Security boundaries

The Worker enforces wisher ownership for structural events. HELP / branch suggestions / CONNECT remain proposals until the required wisher consent rows are accepted. Public world responses expose only `public_payload_json`; private help text remains in proposal storage and the recipient inbox.

The publication guard is only an alpha-level first filter. It does not guarantee safety or replace moderation/report review.

## Current hard stop

The code can live and be checked in GitHub, but creating the real D1 database, setting Worker/Turnstile secrets and deploying it requires access to the project's Cloudflare account. The static Pages repo alone cannot make two independent browsers share wishes or notifications.
\n\n## QA revalidation\n\nThe shared-alpha Worker + D1 two-client QA was explicitly re-triggered on 2026-09-21 before the private Alpha V0 test.\n