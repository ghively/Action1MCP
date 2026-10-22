# Implementation decisions

## Curated, typed operations instead of a generic HTTP tool

An agent given a raw "call any URL" tool against an endpoint-management API can reach every
device-affecting operation the token allows. This server instead exposes:

- generic list/get/create/update/delete tools that only accept resources declared in
  `src/endpoints.ts`, with zod-validated inputs, and
- a small set of named orchestrations (`move_endpoint_simple`, `get_missing_updates`,
  `start_remote_session`, ...) for the workflows an operator actually asks for.

The declared endpoint map is the whole reachable surface. `npm run audit:endpoints` prints it
so a reviewer can see exactly what the agent can touch.

## Two-key destructive gate

Delete, remove, move and other mutating tools require both an operator decision
(`ALLOW_DESTRUCTIVE=true` for the process) and a per-call confirmation (`confirm:"YES"`).
The first stops a read-only deployment from ever mutating; the second stops a model from
mutating without an explicit, logged intent. `dry_run` bypasses both because it does not
call the mutating endpoint.

## Retry only what is safe to repeat

GET requests retry on 429 and 502/503/504 with exponential backoff and jitter. Mutating
requests never retry: a 429 or 503 on a POST may still have been applied, and repeating it
could deploy, move or delete twice. The caller sees the error and decides.

## Mock-first tests

Every test replaces `fetch` with a stub. CI needs no Action1 account and no network, so it
is fast and reproducible. Behaviour against a live tenant is a separate, optional check.
