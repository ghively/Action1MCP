# MCP Tools Reference

Each tool returns `{ content: [{ type: "json", json }] }` on success or a short text message when guardrails block execution.

## list_resources
- Inputs: `{ resource: string, filters?: object, page?: number, per_page?: number, cursor?: string, orgId?: string|number }`
- Behavior: Calls the resource `list` endpoint; applies pagination strategy from `endpoints.pagination`.
- Example: `{ "resource": "endpoints", "orgId": "123", "filters": { "limit": 50 } }`

## get_resource
- Inputs: `{ resource: string, id: string|number, orgId?: string|number }`
- Behavior: Calls the resource `get` endpoint; interpolates `{id}` into path-specific keys (e.g., `{endpointId}`).

## create_resource
- Inputs: `{ resource: string, body: object, orgId?: string|number, dry_run?: boolean, confirm?: "YES" }`
- Guardrails: Requires `ALLOW_DESTRUCTIVE=true` and `confirm:"YES"` unless `dry_run`.

## update_resource
- Inputs: `{ resource: string, id: string|number, body: object, orgId?: string|number, dry_run?: boolean, confirm?: "YES" }`
- Guardrails: Same as create.

## delete_resource
- Inputs: `{ resource: string, id: string|number, orgId?: string|number, dry_run?: boolean, confirm?: "YES" }`
- Guardrails: Same as create.

## call_action
- Inputs: `{ action: string, body?: object, orgId?: string|number, endpointId?: string|number, wait?: boolean, wait_timeout_s?: number, dry_run?: boolean, confirm?: "YES" }`
- Behavior: POST to `endpoints.actions[action]`. If `wait` and `jobStatus` configured, polls.

## remove_entities
- Inputs: targeting `{ resource, ids?, names?, emails?, groups? }` and options `{ strategy?, force?, wait?, wait_timeout_s?, dry_run?, confirm? }` with optional `orgId`.
- Behavior: Resolves to IDs and performs deletion for known resources (endpoints, endpoint_groups). Returns per-entity results. Extend with API-specific sequences as docs expand.

## search_resources (optional)
- Inputs: `{ resource?: string, query: string, orgId?: string|number, limit?: number }`
- Behavior: Uses official search endpoint if available; otherwise paginates and filters client-side with a warning.

