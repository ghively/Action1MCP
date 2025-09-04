# Hub Middleware Concept (Cores + Hub)

This document brainstorms a middleware “Hub” that provides a single connection point for MCP clients and orchestrates multiple standalone MCP servers (called “Cores”) as plugins. No implementation is included in this repository.

## Goals
- One client connection (to the Hub) → many APIs via Cores.
- Dynamic discovery and lifecycle management of Cores.
- Unified auth model and per-core secret isolation.
- Consistent tool naming and namespacing.
- Observability (logs, metrics) across Cores.

## Terms
- Core: a standalone MCP server for a single API (this repo is a Core for Action1).
- Hub: a long-running mediator that connects to clients and loads/bridges multiple Cores.

## High-Level Architecture
```
+-----------+        STDIO/WebSocket        +--------------------+
| MCP      | <----------------------------> |        Hub         |
| Client   |                                 +---------+--------+
+-----------+                                           |
                                          (plugin bus)  |
                                                        v
                                          +-------------+--------------+
                                          |   Core A (Action1 MCP)     |
                                          +----------------------------+
                                          |   Core B (Another API)     |
                                          +----------------------------+
```

## Responsibilities
- Hub
  - Transport: accept STDIO or WebSocket from clients.
  - Registry: discover available Cores via a manifest (JSON/YAML) or directory scan.
  - Lifecycle: spawn/monitor Cores, restart on failure, enforce resource limits.
  - Routing: map namespaced tools (e.g., `action1.list_resources`) to the corresponding Core.
  - Auth: per-Core env injection from a secure store; never expose secrets back to clients.
  - Policy: guardrails, rate-limit, concurrency caps per Core or per tenant.
  - Observability: structured logs and metrics per Core; redaction in proxies.
- Cores
  - Provide tool contracts via MCP; keep code single-responsibility and stateless.

## Plugin Model
- Manifest example:
```yaml
cores:
  action1:
    command: node
    args: ["--enable-source-maps", "dist/server.js"]
    env:
      API_BASE: https://app.action1.com/api/3.0
    secrets:
      - BEARER_TOKEN  # stored in the Hub’s secret manager
  another_api:
    command: ./another-core
```
- Namespacing: Hub prepends core name to tool IDs (e.g., `action1.get_resource`).
- Health: periodic pings; Hub exposes a consolidated health endpoint/tool.

## Transport Options
- STDIO (local spawning): simple and robust, best for on-host deployment.
- WebSocket/TCP: Hub can proxy MCP messages to Cores running remotely (define framing & auth).
- SSH: Hub can spawn Cores remotely via SSH and tunnel STDIO.

## Security
- Secrets stored centrally (e.g., file-based vault, KMS). Hub injects env vars per Core at spawn.
- Audit logging: correlate requests across Hub and Cores with request IDs.
- Isolation: run each Core under a dedicated user/container with scoped permissions.

## Orchestration
- Tool catalog: Hub provides a discovery tool returning all namespaced tools.
- Fallback strategies: if multiple Cores implement the same capability, Hub chooses via policy or explicit override.
- Bulk operations: Hub can fan out requests to many Cores and aggregate results.

## Migration Plan
1) Keep Cores (this repo) single-purpose and transport-agnostic (already true).
2) Define a stable manifest format and namespacing convention.
3) Prototype a thin Hub that forwards STDIO to Cores locally.
4) Add WebSocket bridge if remote Cores are required.
5) Add secrets manager integration and per-Core policies.

## Known Challenges
- Error propagation & retries across Hub boundaries.
- Streaming or long-running jobs across multiple Cores.
- Tool name collisions and versioning.

## Non-Goals (for now)
- Re-implementing MCP; Hub should pass messages transparently whenever possible.
- Embedding business logic in the Hub that belongs in Cores.

