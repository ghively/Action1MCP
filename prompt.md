# MCP Server Generator Prompt (Generic REST API)

You are an expert TypeScript engineer. Create a production-ready Model Context Protocol (MCP) server that integrates with a REST API using only the provided documentation. Do not invent endpoints. Implement safety, reliability, tests, CI, and thorough docs.

## Inputs and Constraints
- Source of truth: API docs (human-readable), OpenAPI/Swagger, or a known endpoints list.
- Runtime: Node.js 20+, ESM modules.
- HTTP client: built-in `fetch` only (no external HTTP libs).
- Package: `@modelcontextprotocol/sdk` (STDIO transport), `zod` for input schemas, `vitest` for tests.

## Deliverables (files)
- package.json, tsconfig.json, vitest.config.ts
- src/endpoints.ts (typed map + Spec Audit header with doc citations and interpretation date)
- src/lib/{http,qs,logger,paginate,poll,resolve}.ts
- src/server.ts (register tools)
- README.md (setup, usage, safety, tool reference, CI links)
- .env.example, Dockerfile
- scripts/audit-endpoints.mjs (print Spec Audit + counts)
- tests/*.test.ts (qs, retry, paginate, resolve, path interpolation, minimal orchestrator smoke)
- .github/workflows/ci.yml (install, build, tests with coverage, audit, upload artifacts)
- docs: CI_WORKFLOW.md, TOOLS.md, CLIENTS.md
- BUILD_LOG.md (numbered steps, decisions, commands), RESUME_STATE.json, DEVIATIONS.md

## Endpoint Map Requirements (src/endpoints.ts)
- Export `endpoints` with:
  - baseUrl (from docs; allow `API_BASE` to override at runtime)
  - auth: `{ scheme: "apiKey" | "bearer" | "basic" | "oauth2", header?, queryParam?, scopes? }`
  - pagination: `{ style: "page" | "cursor" | "link" | "none", pageParam?, perPageParam?, cursorParam?, nextField? }`
  - resources: `Record<string, ResourceDescriptor>` with optional subresources
  - actions: named POST actions
  - jobStatus?: configured only if docs confirm async job polling
- Document decisions and ambiguities at the top (Spec Audit) with date/time and doc sections used.

## Tools (zod-validated)
- list_resources: `{ resource, filters?, page?, per_page?, cursor?, orgId? }`
- get_resource: `{ resource, id, orgId?, endpointId? }`
- create_resource: `{ resource, body, orgId?, dry_run?, confirm? }`
- update_resource: `{ resource, id, body, orgId?, endpointId?, dry_run?, confirm? }`
- delete_resource: `{ resource, id, orgId?, dry_run?, confirm? }`
- call_action: `{ action, body?, orgId?, endpointId?, wait?, wait_timeout_s?, dry_run?, confirm? }`
- remove_entities: resolve by name/email/group → ids; choose strategy based on endpoints; enforce guardrails
- search_resources (optional): official search endpoint or client-side fallback with warning

## Reliability and Safety
- GET retries on 429/502/503/504 with exponential backoff + jitter.
- POST/PATCH/DELETE: no retries by default.
- Destructive ops require `ALLOW_DESTRUCTIVE=true` and `confirm:"YES"` unless `dry_run`.
- Structured logging with secret redaction (do not log tokens); keep useful context.

## Tests (vitest)
- qs.test.ts: skip undefined/empty; arrays/objects encoding
- retry.test.ts: GET retries on 429; no retry on 400
- paginate.test.ts: cursor flow (and page/link if used)
- resolve.test.ts: client-side filtering to IDs
- interpolatePath.test.ts: path template interpolation
- endpoints-map.test.ts: basic assertions for declared resources/actions

## CI (GitHub Actions)
- Node 20, `npm ci || npm install`
- Build, run tests with coverage, run audit script
- Upload `dist/` and `coverage/` artifacts
- Document in docs/CI_WORKFLOW.md (why, how, badge, secrets, customization)

## Documentation
- README: overview, architecture, environment, setup, tools, safety, rate-limits, CI links, resume guide
- docs/TOOLS.md: Inputs/outputs, guardrails, examples for each tool
- docs/CLIENTS.md: Claude Desktop config (paths, JSON snippet), generic MCP client setup, Docker usage
- BUILD_LOG.md: numbered actions, decisions tied to docs, commands, outcomes
- DEVIATIONS.md: record plan/doc divergences
- RESUME_STATE.json: save phase, last step index, generated files, env requirements, pending actions

## Implementation Guidance
- Keep code strict and minimal; prefer clarity over cleverness.
- Do not hardcode secrets. Use env vars and redact tokens in logs.
- For ambiguous endpoints, add a `TODO` and comment the exact uncertainty and doc section.
- When adding new resources, write a small test (mock `fetch`) and commit after each successful build/test to enable easy rollback.

## Output Format
- One fenced code block per file, prefixed by `# FILE: <path>`.
- Ensure `npm run build` and `npm test` succeed.

## Bonus
- Add `npm run audit:endpoints` to print the Spec Audit header and basic counts.
- Optional: expose a `MCP_AUTOSTART=false` env to disable autostart during tests.

---

Follow these steps:
1) Parse the provided API docs. Draft `src/endpoints.ts` and write the Spec Audit header.
2) Implement libs: `http` (auth, retries), `qs`, `paginate`, `poll`, `resolve`.
3) Register MCP tools in `src/server.ts` using zod schemas.
4) Add tests (mock `fetch`).
5) Add CI workflow and documentation.
6) Write README, tools and clients docs, and logs (BUILD_LOG, DEVIATIONS, RESUME_STATE).
7) Run `npm run build`, `npm test`; iterate until green. Commit after each function you add.
