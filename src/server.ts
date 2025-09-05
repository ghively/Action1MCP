import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
// After build, this file lives in dist/, so import sibling compiled module
import { endpoints, interpolatePath } from "./endpoints.js";
import { qs } from "./lib/qs.js";
import { getWithRetry, hx, postAction } from "./lib/http.js";
import { paginate } from "./lib/paginate.js";
import { pollJob } from "./lib/poll.js";
import { resolveToIds } from "./lib/resolve.js";
import { log } from "./lib/logger.js";

export function buildServer() {
  const server = new McpServer(
    { name: "action1-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  function resolveOrgId(orgId?: string | number) {
    return orgId ?? process.env.ORG_ID;
  }

  function tokenSource(): { hasToken: boolean; source?: string } {
    if (process.env.BEARER_TOKEN) return { hasToken: true, source: "BEARER_TOKEN" };
    if (process.env.API_TOKEN) return { hasToken: true, source: "API_TOKEN" };
    if (process.env.ACTION1_TOKEN) return { hasToken: true, source: "ACTION1_TOKEN" };
    return { hasToken: false };
  }

  // Diagnostics: quick config snapshot (no secrets)
  registerTool(
    "diagnose_config",
    {},
    async () => {
      const base = process.env.API_BASE || endpoints.baseUrl;
      const tok = tokenSource();
      const hasOrg = !!process.env.ORG_ID;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                baseUrl: base,
                authScheme: endpoints.auth.scheme,
                hasToken: tok.hasToken,
                tokenSource: tok.source || null,
                hasDefaultOrg: hasOrg,
                allowDestructive: process.env.ALLOW_DESTRUCTIVE === "true"
              },
              null,
              2
            )
          }
        ]
      };
    }
  );

  // Verify authentication by probing a low-risk GET endpoint
  registerTool(
    "verify_auth",
    {},
    async () => {
      const base = process.env.API_BASE || endpoints.baseUrl;
      const url = `${base.replace(/\/+$/, "")}/organizations`;
      try {
        const data = await getWithRetry(`/organizations`);
        return { content: [{ type: "text", text: JSON.stringify({ ok: true, sample: data }) }] };
      } catch (e: any) {
        const status = e?.status;
        const reason = status === 401 || status === 403 ? "auth_failed" : "http_error";
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ ok: false, reason, status, url })
            }
          ]
        };
      }
    }
  );

  // Live audit: probe commonly used endpoints and report availability and sample shapes
  registerTool(
    "audit_endpoints",
    {
      orgId: z.union([z.string(), z.number()]).optional(),
      limit: z.number().int().positive().optional()
    },
    async (input) => {
      const orgId = resolveOrgId(input.orgId);
      const limit = input.limit ?? 5;
      const results: Record<string, any> = {};

      async function probe(name: string, fn: () => Promise<any>) {
        try {
          const data = await fn();
          const arr = Array.isArray(data) ? data : data?.items || data?.data || [];
          const sample = Array.isArray(arr) ? arr.slice(0, limit) : data;
          results[name] = {
            ok: true,
            count: Array.isArray(arr) ? arr.length : undefined,
            sample: sample
          };
        } catch (e: any) {
          results[name] = { ok: false, status: e?.status, error: e?.message || String(e), snippet: e?.snippet };
        }
      }

      await probe("organizations:list", async () => getWithRetry(`/organizations`));
      if (orgId) {
        await probe("endpoints:managed:list", async () => getWithRetry(`/endpoints/managed/${encodeURIComponent(String(orgId))}`));
        await probe("endpoint_groups:list", async () => getWithRetry(`/endpoints/groups/${encodeURIComponent(String(orgId))}`));
        await probe("endpoints:status:list", async () => getWithRetry(`/endpoints/status/${encodeURIComponent(String(orgId))}`));
        await probe("deployers:list", async () => getWithRetry(`/endpoints/deployers/${encodeURIComponent(String(orgId))}`));
        await probe("agent_deployment:get", async () => getWithRetry(`/endpoints/agent-deployment/${encodeURIComponent(String(orgId))}`));
        await probe("search:list", async () => getWithRetry(`/search/${encodeURIComponent(String(orgId))}`));
        // Installation links often require specific installType; just try windowsEXE and ignore failure
        await probe("deployer_installation:windowsEXE", async () => getWithRetry(`/endpoints/deployer-installation/${encodeURIComponent(String(orgId))}/windowsEXE`));
      } else {
        results["note"] = "No orgId provided; set ORG_ID env or pass orgId.";
      }

      return { content: [{ type: "text", text: JSON.stringify({ auditedAt: new Date().toISOString(), results }, null, 2) }] };
    }
  );

  // Convenience: list endpoints with simple fields and optional filter
  registerTool(
    "list_endpoints_simple",
    {
      orgId: z.union([z.string(), z.number()]).optional(),
      query: z.string().optional(),
      limit: z.number().int().positive().optional()
    },
    async (input) => {
      const orgId = resolveOrgId(input.orgId);
      if (!orgId) return { content: [{ type: "text", text: "orgId is required (set ORG_ID or pass orgId)." }] };
      const data = await getWithRetry(`/endpoints/managed/${encodeURIComponent(String(orgId))}`);
      const items: any[] = Array.isArray(data) ? data : data?.items ?? data?.data ?? [];
      const q = input.query?.toLowerCase();
      const pick = (obj: any, keys: string[]) => {
        for (const k of keys) if (obj[k] != null) return obj[k];
        return undefined;
      };
      const simplified = items.map((it) => ({
        id: pick(it, ["id", "endpointId", "uuid", "device_id"]),
        name: pick(it, ["name", "deviceName", "hostname", "computerName"]),
        hostname: pick(it, ["hostname", "fqdn", "dnsName"]),
        os: pick(it, ["os", "osName", "platform"]),
        groupId: pick(it, ["groupId", "group_id"]),
        lastSeen: pick(it, ["lastSeen", "last_seen", "lastCheckIn", "last_seen_at"]),
      }));
      const filtered = q ? simplified.filter((it) => JSON.stringify(it).toLowerCase().includes(q)) : simplified;
      const limited = input.limit ? filtered.slice(0, input.limit) : filtered;
      return { content: [{ type: "text", text: JSON.stringify({ items: limited }) }] };
    }
  );

  // Convenience: start remote session for an endpoint
  registerTool(
    "start_remote_session",
    {
      orgId: z.union([z.string(), z.number()]).optional(),
      endpointId: z.union([z.string(), z.number()]),
      body: z.record(z.unknown()).optional(),
      dry_run: z.boolean().optional(),
      confirm: z.enum(["YES"]).optional()
    },
    async (input) => {
      const guard = allowDestructive(input.confirm, input.dry_run);
      if (!guard.allowed) return { content: [{ type: "text", text: guard.reason! }] };
      const orgId = resolveOrgId(input.orgId);
      if (!orgId) return { content: [{ type: "text", text: "orgId is required for start_remote_session." }] };
      const action = endpoints.actions?.["initiate_remote_session"];
      if (!action) return { content: [{ type: "text", text: "Action initiate_remote_session is not configured." }] };
      const path = interpolatePath(action.path, { orgId, endpointId: input.endpointId });
      if (input.dry_run) return { content: [{ type: "text", text: JSON.stringify({ path, body: input.body ?? {}, dry_run: true }) }] };
      const res = await postAction("initiate_remote_session", path, input.body ?? {});
      return { content: [{ type: "text", text: JSON.stringify(res) }] };
    }
  );

  // Convenience: get agent installation links for Windows
  registerTool(
    "get_agent_installation_links",
    {
      orgId: z.union([z.string(), z.number()]).optional(),
      installType: z.enum(["windowsEXE"]).default("windowsEXE").optional()
    },
    async (input) => {
      const orgId = resolveOrgId(input.orgId);
      if (!orgId) return { content: [{ type: "text", text: "orgId is required (set ORG_ID or pass orgId)." }] };
      const type = input.installType ?? "windowsEXE";
      const data = await getWithRetry(`/endpoints/agent-installation/${encodeURIComponent(String(orgId))}/${encodeURIComponent(type)}`);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }
  );

  // Convenience: list endpoint status snapshots with optional client-side filter
  registerTool(
    "list_endpoint_status",
    {
      orgId: z.union([z.string(), z.number()]).optional(),
      query: z.string().optional(),
      limit: z.number().int().positive().optional()
    },
    async (input) => {
      const orgId = resolveOrgId(input.orgId);
      if (!orgId) return { content: [{ type: "text", text: "orgId is required (set ORG_ID or pass orgId)." }] };
      const data = await getWithRetry(`/endpoints/status/${encodeURIComponent(String(orgId))}`);
      const items: any[] = Array.isArray(data) ? data : data?.items ?? data?.data ?? [];
      const q = input.query?.toLowerCase();
      const filtered = q ? items.filter((it) => JSON.stringify(it).toLowerCase().includes(q)) : items;
      const limited = input.limit ? filtered.slice(0, input.limit) : filtered;
      return { content: [{ type: "text", text: JSON.stringify({ items: limited }) }] };
    }
  );

  // Convenience: inspect a deployer by id
  registerTool(
    "inspect_deployer",
    {
      orgId: z.union([z.string(), z.number()]).optional(),
      deployerId: z.union([z.string(), z.number()])
    },
    async (input) => {
      const orgId = resolveOrgId(input.orgId);
      if (!orgId) return { content: [{ type: "text", text: "orgId is required (set ORG_ID or pass orgId)." }] };
      const data = await getWithRetry(`/endpoints/deployers/${encodeURIComponent(String(orgId))}/${encodeURIComponent(String(input.deployerId))}`);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }
  );

  // Convenience: delete a deployer by id (guarded)
  registerTool(
    "delete_deployer",
    {
      orgId: z.union([z.string(), z.number()]).optional(),
      deployerId: z.union([z.string(), z.number()]),
      dry_run: z.boolean().optional(),
      confirm: z.enum(["YES"]).optional()
    },
    async (input) => {
      const guard = allowDestructive(input.confirm, input.dry_run);
      if (!guard.allowed) return { content: [{ type: "text", text: guard.reason! }] };
      const orgId = resolveOrgId(input.orgId);
      if (!orgId) return { content: [{ type: "text", text: "orgId is required (set ORG_ID or pass orgId)." }] };
      const path = `/endpoints/deployers/${encodeURIComponent(String(orgId))}/${encodeURIComponent(String(input.deployerId))}`;
      if (input.dry_run) return { content: [{ type: "text", text: JSON.stringify({ path, dry_run: true }) }] };
      const res = await hx(path, { method: "DELETE" });
      return { content: [{ type: "text", text: JSON.stringify(res ?? { deleted: true }) }] };
    }
  );

  // Convenience: modify group contents (add/remove)
  registerTool(
    "modify_group_contents",
    {
      orgId: z.union([z.string(), z.number()]).optional(),
      groupId: z.union([z.string(), z.number()]),
      add: z.array(z.union([z.string(), z.number()])).optional(),
      remove: z.array(z.union([z.string(), z.number()])).optional(),
      dry_run: z.boolean().optional(),
      confirm: z.enum(["YES"]).optional()
    },
    async (input) => {
      const guard = allowDestructive(input.confirm, input.dry_run);
      if (!guard.allowed) return { content: [{ type: "text", text: guard.reason! }] };
      const orgId = resolveOrgId(input.orgId);
      if (!orgId) return { content: [{ type: "text", text: "orgId is required (set ORG_ID or pass orgId)." }] };
      const path = `/endpoints/groups/${encodeURIComponent(String(orgId))}/${encodeURIComponent(String(input.groupId))}/contents`;
      const body: any = {};
      if (input.add?.length) body.add = input.add;
      if (input.remove?.length) body.remove = input.remove;
      if (!body.add && !body.remove) return { content: [{ type: "text", text: "Specify add and/or remove arrays." }] };
      if (input.dry_run) return { content: [{ type: "text", text: JSON.stringify({ path, body, dry_run: true }) }] };
      const res = await hx(path, { method: "POST", body: JSON.stringify(body) });
      return { content: [{ type: "text", text: JSON.stringify(res) }] };
    }
  );

  // Convenience: move endpoint between orgs
  registerTool(
    "move_endpoint_simple",
    {
      orgId: z.union([z.string(), z.number()]).optional(),
      endpointId: z.union([z.string(), z.number()]),
      targetOrgId: z.union([z.string(), z.number()]),
      dry_run: z.boolean().optional(),
      confirm: z.enum(["YES"]).optional()
    },
    async (input) => {
      const guard = allowDestructive(input.confirm, input.dry_run);
      if (!guard.allowed) return { content: [{ type: "text", text: guard.reason! }] };
      const orgId = resolveOrgId(input.orgId);
      if (!orgId) return { content: [{ type: "text", text: "orgId is required (set ORG_ID or pass orgId)." }] };
      const action = endpoints.actions?.["move_endpoint"];
      if (!action) return { content: [{ type: "text", text: "Action move_endpoint is not configured." }] };
      const path = interpolatePath(action.path, { orgId, endpointId: input.endpointId });
      const body = { targetOrgId: input.targetOrgId } as any;
      if (input.dry_run) return { content: [{ type: "text", text: JSON.stringify({ path, body, dry_run: true }) }] };
      const res = await postAction("move_endpoint", path, body);
      return { content: [{ type: "text", text: JSON.stringify(res) }] };
    }
  );

  // Convenience: missing updates for an endpoint
  registerTool(
    "get_missing_updates",
    {
      orgId: z.union([z.string(), z.number()]).optional(),
      endpointId: z.union([z.string(), z.number()])
    },
    async (input) => {
      const orgId = resolveOrgId(input.orgId);
      if (!orgId) return { content: [{ type: "text", text: "orgId is required (set ORG_ID or pass orgId)." }] };
      const path = `/endpoints/managed/${encodeURIComponent(String(orgId))}/${encodeURIComponent(String(input.endpointId))}/missing-updates`;
      const data = await getWithRetry(path);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }
  );

  // Convenience: remote session status
  registerTool(
    "get_remote_session_status",
    {
      orgId: z.union([z.string(), z.number()]).optional(),
      endpointId: z.union([z.string(), z.number()]),
      sessionId: z.union([z.string(), z.number()])
    },
    async (input) => {
      const orgId = resolveOrgId(input.orgId);
      if (!orgId) return { content: [{ type: "text", text: "orgId is required (set ORG_ID or pass orgId)." }] };
      const path = `/endpoints/managed/${encodeURIComponent(String(orgId))}/${encodeURIComponent(String(input.endpointId))}/remote-sessions/${encodeURIComponent(String(input.sessionId))}`;
      const data = await getWithRetry(path);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }
  );

  function registerTool<Shape extends Record<string, z.ZodTypeAny>>(
    name: string,
    schema: Shape,
    handler: (input: z.infer<z.ZodObject<Shape>>) => Promise<any>
  ) {
    return server.tool(name, schema as any, async (input: any) => handler(input as any));
  }

  // Optional: search_resources (fallback to client-side filter if needed)
  registerTool(
    "search_resources",
    {
      query: z.string(),
      resource: z.string().optional(),
      fields: z.array(z.string()).optional(),
      limit: z.number().int().positive().optional(),
      orgId: z.union([z.string(), z.number()]).optional()
    },
    async (input) => {
      const searchRes = endpoints.resources["search"]?.list;
      if (searchRes) {
        const orgId = resolveOrgId(input.orgId);
        if (!orgId) return { content: [{ type: "text", text: "orgId is required for search." }] };
        const path = interpolatePath(searchRes.path, { orgId });
        const data = await getWithRetry(`${path}${qs({ q: input.query, limit: input.limit })}`);
        return { content: [{ type: "text", text: JSON.stringify(data) }] };
      }
      // Fallback: client-side filter over list endpoint if provided
      if (!input.resource) {
        return { content: [{ type: "text", text: "No official search endpoint; provide resource for client-side search." }] };
      }
      const res = endpoints.resources[input.resource];
      if (!res?.list) return { content: [{ type: "text", text: `Resource "${input.resource}" not listable.` }] };
      let path = res.list.path;
      if (path.includes("{orgId}")) {
        const orgId = resolveOrgId(input.orgId);
        if (!orgId) return { content: [{ type: "text", text: "orgId required for resource search." }] };
        path = interpolatePath(path, { orgId });
      }
      const data = await getWithRetry(`${path}${qs({})}`);
      const items: any[] = Array.isArray(data) ? data : data?.items ?? data?.data ?? [];
      const q = input.query.toLowerCase();
      const filtered = items.filter((it) => JSON.stringify(it).toLowerCase().includes(q));
      const limited = input.limit ? filtered.slice(0, input.limit) : filtered;
      return { content: [{ type: "text", text: JSON.stringify({ items: limited, warning: "Client-side search; official search endpoint not used." }) }] };
    }
  );

  function allowDestructive(confirm?: string, dryRun?: boolean): { allowed: boolean; reason?: string } {
    if (dryRun) return { allowed: true };
    if (process.env.ALLOW_DESTRUCTIVE !== "true") {
      return { allowed: false, reason: "Destructive ops disabled. Set ALLOW_DESTRUCTIVE=true to enable." };
    }
    if (confirm !== "YES") {
      return { allowed: false, reason: 'Confirmation required: set confirm:"YES" to proceed.' };
    }
    return { allowed: true };
  }

  registerTool(
    "list_resources",
    {
      resource: z.string(),
      filters: z.record(z.unknown()).optional(),
      page: z.number().int().positive().optional(),
      per_page: z.number().int().positive().optional(),
      cursor: z.string().optional(),
      orgId: z.union([z.string(), z.number()]).optional()
    },
    async (input) => {
      const res = endpoints.resources[input.resource];
      if (!res?.list) {
        return { content: [{ type: "text", text: `Resource "${input.resource}" is not listable.` }] };
      }
      let path = res.list.path;
      if (path.includes("{orgId}")) {
        const orgId = resolveOrgId(input.orgId);
        if (orgId == null) {
          return { content: [{ type: "text", text: `orgId is required for resource "${input.resource}".` }] };
        }
        path = interpolatePath(path, { orgId });
      }
      const params: Record<string, unknown> = { ...(input.filters || {}) };
      if (endpoints.pagination.style === "page") {
        if (input.page != null) params[endpoints.pagination.pageParam || "page"] = input.page;
        if (input.per_page != null) params[endpoints.pagination.perPageParam || "per_page"] = input.per_page;
      }
      if (endpoints.pagination.style === "cursor" && input.cursor) {
        params[endpoints.pagination.cursorParam || "cursor"] = input.cursor;
      }

      const results: any[] = [];
      for await (const chunk of paginate(path, params)) {
        results.push(...chunk);
        if (input.page != null || input.cursor) break;
      }
      return { content: [{ type: "text", text: JSON.stringify({ items: results }) }] };
    }
  );

  registerTool(
    "get_resource",
    {
      resource: z.string(),
      id: z.union([z.string(), z.number()]),
      orgId: z.union([z.string(), z.number()]).optional(),
      endpointId: z.union([z.string(), z.number()]).optional()
    },
    async (input) => {
      const res = endpoints.resources[input.resource];
      if (!res?.get) return { content: [{ type: "text", text: `Resource "${input.resource}" is not gettable.` }] };
      let path = res.get.path;
      const params: Record<string, string | number> = { id: input.id };
      if (path.includes("{orgId}")) {
        const orgId = resolveOrgId(input.orgId);
        if (orgId == null) return { content: [{ type: "text", text: `orgId is required for resource "${input.resource}".` }] };
        params.orgId = orgId;
      }
      if (path.includes("{endpointId}")) params.endpointId = input.endpointId ?? input.id;
      if (path.includes("{groupId}")) params.groupId = input.id;
      if (path.includes("{installType}")) (params as any).installType = input.id;
      path = interpolatePath(path, params);
      const data = await getWithRetry(path);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }
  );

  registerTool(
    "create_resource",
    {
      resource: z.string(),
      body: z.record(z.unknown()),
      orgId: z.union([z.string(), z.number()]).optional(),
      dry_run: z.boolean().optional(),
      confirm: z.enum(["YES"]).optional()
    },
    async (input) => {
      const guard = allowDestructive(input.confirm, input.dry_run);
      if (!guard.allowed) return { content: [{ type: "text", text: guard.reason! }] };
      const res = endpoints.resources[input.resource];
      if (!res?.create) return { content: [{ type: "text", text: `Resource "${input.resource}" is not creatable.` }] };
      let path = res.create.path;
      const params: Record<string, string | number> = {};
      if (path.includes("{orgId}")) {
        const orgId = resolveOrgId(input.orgId);
        if (orgId == null) return { content: [{ type: "text", text: `orgId is required for resource "${input.resource}".` }] };
        params.orgId = orgId;
        path = interpolatePath(path, params);
      }
      if (input.dry_run) return { content: [{ type: "text", text: JSON.stringify({ path, body: input.body, dry_run: true }) }] };
      const data = await hx(path, { method: "POST", body: JSON.stringify(input.body) });
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }
  );

  registerTool(
    "update_resource",
    {
      resource: z.string(),
      id: z.union([z.string(), z.number()]),
      body: z.record(z.unknown()),
      orgId: z.union([z.string(), z.number()]).optional(),
      endpointId: z.union([z.string(), z.number()]).optional(),
      dry_run: z.boolean().optional(),
      confirm: z.enum(["YES"]).optional()
    },
    async (input) => {
      const guard = allowDestructive(input.confirm, input.dry_run);
      if (!guard.allowed) return { content: [{ type: "text", text: guard.reason! }] };
      const res = endpoints.resources[input.resource];
      if (!res?.update) return { content: [{ type: "text", text: `Resource "${input.resource}" is not updatable.` }] };
      let path = res.update.path;
      const params: Record<string, string | number> = {};
      if (path.includes("{orgId}")) {
        const orgId = resolveOrgId(input.orgId);
        if (orgId == null) return { content: [{ type: "text", text: `orgId is required for "${input.resource}".` }] };
        params.orgId = orgId;
      }
      if (path.includes("{endpointId}")) params.endpointId = input.endpointId ?? input.id;
      if (path.includes("{groupId}")) params.groupId = input.id;
      path = interpolatePath(path, params);
      if (input.dry_run) return { content: [{ type: "text", text: JSON.stringify({ path, body: input.body, dry_run: true }) }] };
      const data = await hx(path, { method: "PATCH", body: JSON.stringify(input.body) });
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }
  );

  registerTool(
    "delete_resource",
    {
      resource: z.string(),
      id: z.union([z.string(), z.number()]),
      orgId: z.union([z.string(), z.number()]).optional(),
      dry_run: z.boolean().optional(),
      confirm: z.enum(["YES"]).optional()
    },
    async (input) => {
      const guard = allowDestructive(input.confirm, input.dry_run);
      if (!guard.allowed) return { content: [{ type: "text", text: guard.reason! }] };
      const res = endpoints.resources[input.resource];
      if (!res?.delete) return { content: [{ type: "text", text: `Resource "${input.resource}" is not deletable.` }] };
      let path = res.delete.path;
      const params: Record<string, string | number> = {};
      if (path.includes("{orgId}")) {
        const orgId = resolveOrgId(input.orgId);
        if (orgId == null) return { content: [{ type: "text", text: `orgId is required for "${input.resource}".` }] };
        params.orgId = orgId;
      }
      if (path.includes("{endpointId}")) params.endpointId = input.id;
      if (path.includes("{groupId}")) params.groupId = input.id;
      path = interpolatePath(path, params);
      if (input.dry_run) return { content: [{ type: "text", text: JSON.stringify({ path, dry_run: true }) }] };
      const data = await hx(path, { method: "DELETE" });
      return { content: [{ type: "text", text: JSON.stringify(data ?? { deleted: true }) }] };
    }
  );

  registerTool(
    "call_action",
    {
      action: z.string(),
      body: z.record(z.unknown()).optional(),
      orgId: z.union([z.string(), z.number()]).optional(),
      endpointId: z.union([z.string(), z.number()]).optional(),
      wait: z.boolean().optional(),
      wait_timeout_s: z.number().int().positive().optional(),
      dry_run: z.boolean().optional(),
      confirm: z.enum(["YES"]).optional()
    },
    async (input) => {
      const guard = allowDestructive(input.confirm, input.dry_run);
      if (!guard.allowed) return { content: [{ type: "text", text: guard.reason! }] };
      const action = endpoints.actions?.[input.action];
      if (!action) return { content: [{ type: "text", text: `Unknown action "${input.action}".` }] };
      let path = action.path;
      const params: Record<string, string | number> = {};
      if (path.includes("{orgId}")) {
        const orgId = resolveOrgId(input.orgId);
        if (orgId == null) return { content: [{ type: "text", text: `orgId is required for action "${input.action}".` }] };
        params.orgId = orgId;
      }
      if (path.includes("{endpointId}")) {
        if (input.endpointId == null) return { content: [{ type: "text", text: `endpointId is required for action "${input.action}".` }] };
        params.endpointId = input.endpointId;
      }
      path = interpolatePath(path, params);
      if (input.dry_run) return { content: [{ type: "text", text: JSON.stringify({ path, body: input.body ?? null, dry_run: true }) }] };
      const data = await postAction(input.action, path, input.body ?? {});
      if (input.wait && endpoints.jobStatus) {
        const timeoutMs = (input.wait_timeout_s ?? 300) * 1000;
        const polled = await pollJob({}, { timeoutMs }); // TODO: pass job identifiers when available
        return { content: [{ type: "text", text: JSON.stringify({ initial: data, final: polled }) }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }
  );

  registerTool(
    "remove_entities",
    {
      resource: z.string(),
      ids: z.array(z.union([z.string(), z.number()])).optional(),
      names: z.array(z.string()).optional(),
      emails: z.array(z.string()).optional(),
      groups: z.array(z.union([z.string(), z.number()])).optional(),
      strategy: z.enum(["delete", "archive", "deactivate", "disenroll", "soft_delete"]).optional(),
      force: z.boolean().optional(),
      wait: z.boolean().default(true).optional(),
      wait_timeout_s: z.number().int().positive().default(300).optional(),
      dry_run: z.boolean().default(false).optional(),
      confirm: z.enum(["YES"]).optional(),
      orgId: z.union([z.string(), z.number()]).optional()
    },
    async (input) => {
      const guard = allowDestructive(input.confirm, input.dry_run);
      if (!guard.allowed) return { content: [{ type: "text", text: guard.reason! }] };

      let targets = (input.ids || []).map((id) => ({ id }));
      if (!targets.length && (input.names?.length || input.emails?.length)) {
        const resolved = await resolveToIds({ resource: input.resource, orgId: input.orgId, names: input.names, emails: input.emails });
        targets = resolved;
      }
      if (!targets.length) return { content: [{ type: "text", text: "No targets resolved." }] };

      const ops: any[] = [];
      if (["endpoints", "endpoint", "devices"].includes(input.resource)) {
        for (const t of targets) ops.push({ kind: "delete_resource", resource: "endpoints", id: t.id });
      } else if (input.resource === "endpoint_groups") {
        for (const t of targets) ops.push({ kind: "delete_resource", resource: "endpoint_groups", id: t.id });
      } else {
        return { content: [{ type: "text", text: `No removal strategy for resource "${input.resource}".` }] };
      }

      const results: any[] = [];
      for (const op of ops) {
        if (op.kind === "delete_resource") {
          if (input.dry_run) {
            results.push({ target: op.id, result: { dry_run: true, op } });
          } else {
            // Build path and call DELETE directly to avoid SDK method coupling
            const desc = endpoints.resources[op.resource]?.delete;
            if (!desc) {
              results.push({ target: op.id, error: `No delete descriptor for ${op.resource}` });
              continue;
            }
            const needsOrg = desc.path.includes("{orgId}");
            const resolvedOrg = resolveOrgId(input.orgId);
            if (needsOrg && resolvedOrg == null) {
              results.push({ target: op.id, error: `orgId required for ${op.resource}` });
              continue;
            }
            const params: Record<string, string | number> = {};
            if (needsOrg) params.orgId = resolvedOrg!;
            if (desc.path.includes("{endpointId}")) params.endpointId = op.id;
            if (desc.path.includes("{groupId}")) params.groupId = op.id;
            const delPath = interpolatePath(desc.path, params);
            try {
              const data = await hx(delPath, { method: "DELETE" });
              results.push({ target: op.id, result: data ?? { deleted: true } });
            } catch (e: any) {
              results.push({ target: op.id, error: e?.message || String(e) });
            }
          }
        }
      }
      return { content: [{ type: "text", text: JSON.stringify({ executed: results.length, results }) }] };
    }
  );

  return server;
}

export async function startServerIfNeeded() {
  if (process.env.MCP_AUTOSTART === "false") return;
  const server = buildServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log("info", "MCP server started", { transport: "stdio" });
}

await startServerIfNeeded();
