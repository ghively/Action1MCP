# Action1 MCP Server (via REST Docs)

This project provides a Model Context Protocol (MCP) server adapter for the Action1 API using only the included documentation. It exposes generic tools (list/get/create/update/delete) and safe orchestrations over declared endpoints. It is designed to be extended and embedded in larger ecosystems.

## Table of Contents
- Overview
- Environment and Setup
- Tools and Guardrails
- Clients (Claude Desktop and generic)
- Architecture and Deployment
- CI and Testing
- Resume Guide

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
- `BEARER_TOKEN` (or `API_TOKEN`, `ACTION1_TOKEN`)
- `ALLOW_DESTRUCTIVE` (default false; set to `true` to enable destructive tools)

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

## Resume Guide
If interrupted, check `RESUME_STATE.json`:
- Identify `phase` and `step_index` (from `BUILD_LOG.md`).
- Continue by editing/adding the next files listed in `pending_actions`.
- Re-run `npm run build` and `npm test` to validate progress.

## Core vs. Hub (Concept)
- Core: this standalone MCP server focused on one API (Action1) with a well-defined endpoint map and generic tools.
- Hub (future concept): a unifying middleware that discovers and loads multiple cores as plugins, exposing a single connection point to clients. See `docs/HUB_CONCEPT.md` for a detailed brainstorming guide (no code included here).
