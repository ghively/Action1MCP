# Action1 MCP Server (via REST Docs)

![CI](https://github.com/ghively/Action1MCP/actions/workflows/ci.yml/badge.svg)

This project provides a Model Context Protocol (MCP) server adapter for the Action1 API using only the included documentation. It exposes generic tools (list/get/create/update/delete) and safe orchestrations over declared endpoints. It is designed to be extended and embedded in larger ecosystems.

## Start here (2-minute tour)

The core code is small. Read these in order:

| What | Where |
|---|---|
| Tool registration and input schemas (zod) | [`src/server.ts`](src/server.ts) (`registerTool`) |
| Declared endpoints (the only API surface exposed) | [`src/endpoints.ts`](src/endpoints.ts) |
| HTTP, auth, GET-only retry with backoff on 429/5xx | [`src/lib/http.ts`](src/lib/http.ts) |
| Destructive-action gate | [`src/lib/guard.ts`](src/lib/guard.ts) |
| Pagination and name-to-ID resolution | [`src/lib/paginate.ts`](src/lib/paginate.ts), [`src/lib/resolve.ts`](src/lib/resolve.ts) |
| Tests (all mocked, no Action1 account needed) | [`tests/`](tests/) |

```bash
npm ci && npm run build && npm test     # 20 tests, no credentials, no network
```

What the tests pin down:

- **Mutations are gated twice.** `ALLOW_DESTRUCTIVE=true` must be set for the process
  *and* each call must pass `confirm:"YES"`. Anything else is denied; `dry_run` is always
  allowed because it never mutates (`tests/guard.test.ts`).
- **Only safe reads retry.** GETs retry on 429/502/503/504 with exponential backoff and
  jitter; 4xx errors fail fast (`tests/retry.test.ts`). POST/DELETE are attempted exactly
  once, even on 429/503, so a retry can never duplicate a change (`tests/guard.test.ts`).
- **Curated operations, not arbitrary HTTP.** Tools only reach endpoints declared in
  `src/endpoints.ts`; see [docs/implementation-decisions.md](docs/implementation-decisions.md).

Live testing against a real Action1 tenant is optional and separate from CI.

## Table of Contents
- Overview
- Environment and Setup
- Tools and Guardrails
- Clients (Claude Desktop and generic)
- Architecture and Deployment
- CI and Testing

## Architecture
```
+---------+      STDIO      +------------------+      HTTPS      +-----------------------+
|  Client | <-------------> | MCP Server (TS)  | <-------------> | Action1 REST API 3.0  |
+---------+                 +------------------+                 +-----------------------+
                tools/handlers       lib/* (http,retry,paginate,resolve)
```

## Environment
- Node.js 20+, ESM modules
- Auth: Bearer token (OAuth2). Do not hardcode secrets.

Env vars:
- `API_BASE` (e.g., https://app.action1.com/api/3.0)
- Auth options:
  - `BEARER_TOKEN` (preferred), or `API_TOKEN`, or `ACTION1_TOKEN` — a ready access token.
  - Or provide `ACTION1_CLIENT_ID` and `ACTION1_CLIENT_SECRET` to let the server exchange them for an access token at `${API_BASE}/oauth2/token` automatically.
- `ALLOW_DESTRUCTIVE` (default false; set to `true` to enable destructive tools)
- `ORG_ID` (optional default organization id; used when a tool call omits `orgId`)

## Setup
```bash
npm ci
npm run build
API_BASE="https://app.action1.com/api/3.0" BEARER_TOKEN="..." npm start
```

## Tools
- `list_resources`: list items with filters and pagination (cursor: `limit`, `next_page`).
- `get_resource`: fetch a single item by id.
- `create_resource`: guarded; requires `ALLOW_DESTRUCTIVE=true` and `confirm:"YES"` unless `dry_run`.
- `update_resource`: guarded like create.
- `delete_resource`: guarded; supports `dry_run`.
- `call_action`: POST to named action; optional polling (TODO if job status added).
- `remove_entities`: resolves inputs and applies an API-specific removal path (endpoints/groups supported).

All tool inputs are validated with zod. Responses return `{ content: [{ type: "json", json }] }`.

## Rate limits and retries
- GETs retry (429/502/503/504) with exponential backoff + jitter.
- POST/PATCH/DELETE are not retried by default.

## Extend endpoints
Edit `src/endpoints.ts`:
- Add resources/actions based on docs; keep the Spec Audit comment updated.
- Pagination configuration lives in the same file.
Run `npm run audit:endpoints` to print the audit header.

## Safety
- Destructive ops disabled by default.
- Require `confirm:"YES"` unless `dry_run` is true.
- Secrets are redacted from logs.

## Testing
```bash
npm test
```
Tests mock `fetch` and validate query-string, retry logic, pagination, resolver, and the orchestrator guardrails.

## CI
- A GitHub Actions workflow runs install, build, tests, and endpoint audit on every push/PR.
- See `docs/CI_WORKFLOW.md` for a full walkthrough and badge setup.

## Tool Reference
See `docs/TOOLS.md` for inputs, guardrails, and examples for each tool.

## MCP Clients
- Claude Desktop and generic client setup are documented in `docs/CLIENTS.md` with config snippets and env examples.

## Architecture & Deployment
- Architecture details: see `docs/ARCHITECTURE.md` (file layout, data flow, logic, extension points).
- Deployment options: see `docs/DEPLOYMENT.md` (local, Docker, Compose, remote patterns, middleware ideas).

## Core vs. Hub (Concept)
- Core: this standalone MCP server focused on one API (Action1) with a well-defined endpoint map and generic tools.
- Hub (future concept): a unifying middleware that discovers and loads multiple cores as plugins, exposing a single connection point to clients. See `The_Hub/` for concept docs, interface contracts, manifest spec, security, observability, operations, roadmap, and a planning prompt.
