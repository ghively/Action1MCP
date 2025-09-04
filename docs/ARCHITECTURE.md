# MCP Server Architecture & Design

This document explains the structure, data flow, and design decisions for the Action1 MCP server. It is intended to help you extend functionality, swap transports, introduce middleware, or run the server remotely from the MCP client.

## Overview
- Purpose: expose a generic set of tools (list/get/create/update/delete/action/search/orchestrate) over the Action1 REST API.
- Paradigm: model-agnostic tools driven by a centralized endpoint map (`src/endpoints.ts`).
- Transport: MCP STDIO; any MCP-capable client (e.g., Claude Desktop) launches the server and communicates via stdin/stdout.

## File Structure
```
src/
  endpoints.ts           # Typed endpoint map + Spec Audit header
  server.ts              # MCP server bootstrap + tool registrations
  lib/
    http.ts              # fetch wrapper, auth headers, JSON parsing, GET retries
    qs.ts                # query string helper (skip undefined/empty)
    logger.ts            # JSON logs with token redaction
    paginate.ts          # cursor/page/link pagination helpers
    poll.ts              # generic polling (wired if jobStatus is configured)
    resolve.ts           # name/email/label → IDs via list + filter
scripts/
  audit-endpoints.mjs    # prints Spec Audit + simple counts
.tests/
  *.test.ts              # qs/retry/paginate/resolve/path map/auth tests
Dockerfile               # container build and run
```

## Data Flow & Logic
- Client → MCP tool call → `server.ts` validates inputs with zod → resolves a path using `endpoints.ts` → builds query (`qs.ts`) → HTTP (`http.ts`) → retries/pagination as needed → returns JSON content to client.
- Path interpolation: `interpolatePath` fills `{orgId}`, `{endpointId}`, etc., with encoded values; missing params throw.
- Pagination: configured once in `endpoints.ts` and applied uniformly by `paginate.ts`.
- Reliability: GET-only retries on 429/502/503/504 with exponential backoff + jitter.
- Safety: destructive calls require `ALLOW_DESTRUCTIVE=true` and `confirm:"YES"` unless `dry_run`.
- Logging: structured JSON; sensitive keys (authorization/token/secret) are redacted recursively.

## Endpoint Map Pattern
- `resources`: per-resource descriptors for list/get/create/update/delete and nested `subresources`.
- `actions`: named POST actions for non-CRUD operations.
- `jobStatus` (optional): enables polling for async jobs; disabled here pending confirmed docs.
- Spec Audit header: documents sources, interpretation date, assumptions, and TODOs.

## Tools
- Generic tools operate across any resource/action declared in `endpoints.ts`:
  - list_resources, get_resource, create_resource, update_resource, delete_resource
  - call_action (with optional wait when jobStatus available)
  - search_resources (official endpoint or client-side fallback)
  - remove_entities (orchestrates deletions; extend to multi-step flows when docs confirm)

## Extensibility & Middleware
- Add endpoints: update `src/endpoints.ts` with new resources/actions and, if needed, zod body/param shapes. Then add a unit test and commit.
- New tool: register in `server.ts` with a zod schema and re-use `http.ts`/`paginate.ts`.
- Middleware options (conceptual; no code in repo):
  - STDIO proxy: wrap this process with a proxy that forwards STDIO over WebSocket/HTTP2/SSH.
  - Sidecar HTTP gateway: expose a small HTTP server that translates HTTP requests to MCP tool calls locally (preserves auth in env on the server host). Useful when the MCP client cannot spawn processes.
  - Job/work queue: place destructive actions on a queue and process them with rate control, then report status via polling.

## Remote Deployment Patterns
- SSH bridge: run the MCP server on a remote host and connect over SSH with a persistent STDIO session.
- Containerized remote: run in Docker and connect via a proxy that pipes STDIO (or use a sidecar that speaks MCP over TCP to the client; define your own framing if deviating from STDIO).
- System service: run under systemd with env files and supervise restarts.

## Security Considerations
- Secrets via env only; never commit tokens.
- Redaction in logs; avoid printing payloads with sensitive data where not necessary.
- Guardrails off by default for destructive actions.
- Rate-limit friendliness: GET retries respect backoff; do not retry POST by default.

## Testing & CI
- Vitest unit tests with mocked `fetch` target logic boundaries.
- GitHub Actions: installs deps, builds, runs tests with coverage, runs audit, and uploads artifacts.

## How to Add a New Resource
1) Edit `src/endpoints.ts` and add your resource/action; update Spec Audit with the doc citation.
2) If payload shapes are known, define `bodySchema` with zod.
3) Add or extend a unit test (mocked `fetch`).
4) `npm run build && npm test`; commit.

## Roadmap Ideas
- Enable `jobStatus` when official async status endpoints are confirmed.
- Add rate-limit header parsing to adapt backoff dynamically.
- Add a TCP/WebSocket transport proxy for remote MCP connectivity.
- Enrich `remove_entities` with API-specific multi-step sequences (deactivate/archive/unenroll) driven from `endpoints.ts`.
- Introduce a “Hub” middleware to unify multiple “Core” servers (see The_Hub/HUB_CONCEPT.md).
