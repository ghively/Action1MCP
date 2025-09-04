import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { endpoints, interpolatePath } from "../src/endpoints.js";
import { qs } from "./lib/qs.js";
import { getWithRetry, hx, postAction } from "./lib/http.js";
import { paginate } from "./lib/paginate.js";
import { pollJob } from "./lib/poll.js";
import { resolveToIds } from "./lib/resolve.js";
import { log } from "./lib/logger.js";

export function buildServer() {
  const server = new Server(
    { name: "action1-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } }
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

  server.tool(
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
        if (input.orgId == null) {
          return { content: [{ type: "text", text: `orgId is required for resource "${input.resource}".` }] };
        }
        path = interpolatePath(path, { orgId: input.orgId });
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
      return { content: [{ type: "json", json: { items: results } }] };
    }
  );

  server.tool(
    "get_resource",
    { resource: z.string(), id: z.union([z.string(), z.number()]), orgId: z.union([z.string(), z.number()]).optional() },
    async (input) => {
      const res = endpoints.resources[input.resource];
      if (!res?.get) return { content: [{ type: "text", text: `Resource "${input.resource}" is not gettable.` }] };
      let path = res.get.path;
      const params: Record<string, string | number> = { id: input.id };
      if (path.includes("{orgId}")) {
        if (input.orgId == null) return { content: [{ type: "text", text: `orgId is required for resource "${input.resource}".` }] };
        params.orgId = input.orgId;
      }
      if (path.includes("{endpointId}")) params.endpointId = input.id;
      if (path.includes("{groupId}")) params.groupId = input.id;
      path = interpolatePath(path, params);
      const data = await getWithRetry(path);
      return { content: [{ type: "json", json: data }] };
    }
  );

  server.tool(
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
        if (input.orgId == null) return { content: [{ type: "text", text: `orgId is required for resource "${input.resource}".` }] };
        params.orgId = input.orgId;
        path = interpolatePath(path, params);
      }
      if (input.dry_run) return { content: [{ type: "json", json: { path, body: input.body, dry_run: true } }] };
      const data = await hx(path, { method: "POST", body: JSON.stringify(input.body) });
      return { content: [{ type: "json", json: data }] };
    }
  );

  server.tool(
    "update_resource",
    {
      resource: z.string(),
      id: z.union([z.string(), z.number()]),
      body: z.record(z.unknown()),
      orgId: z.union([z.string(), z.number()]).optional(),
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
        if (input.orgId == null) return { content: [{ type: "text", text: `orgId is required for "${input.resource}".` }] };
        params.orgId = input.orgId;
      }
      if (path.includes("{endpointId}")) params.endpointId = input.id;
      if (path.includes("{groupId}")) params.groupId = input.id;
      path = interpolatePath(path, params);
      if (input.dry_run) return { content: [{ type: "json", json: { path, body: input.body, dry_run: true } }] };
      const data = await hx(path, { method: "PATCH", body: JSON.stringify(input.body) });
      return { content: [{ type: "json", json: data }] };
    }
  );

  server.tool(
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
        if (input.orgId == null) return { content: [{ type: "text", text: `orgId is required for "${input.resource}".` }] };
        params.orgId = input.orgId;
      }
      if (path.includes("{endpointId}")) params.endpointId = input.id;
      if (path.includes("{groupId}")) params.groupId = input.id;
      path = interpolatePath(path, params);
      if (input.dry_run) return { content: [{ type: "json", json: { path, dry_run: true } }] };
      const data = await hx(path, { method: "DELETE" });
      return { content: [{ type: "json", json: data ?? { deleted: true } }] };
    }
  );

  server.tool(
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
        if (input.orgId == null) return { content: [{ type: "text", text: `orgId is required for action "${input.action}".` }] };
        params.orgId = input.orgId;
      }
      if (path.includes("{endpointId}")) {
        if (input.endpointId == null) return { content: [{ type: "text", text: `endpointId is required for action "${input.action}".` }] };
        params.endpointId = input.endpointId;
      }
      path = interpolatePath(path, params);
      if (input.dry_run) return { content: [{ type: "json", json: { path, body: input.body ?? null, dry_run: true } }] };
      const data = await postAction(input.action, path, input.body ?? {});
      if (input.wait && endpoints.jobStatus) {
        const timeoutMs = (input.wait_timeout_s ?? 300) * 1000;
        const polled = await pollJob({}, { timeoutMs }); // TODO: pass job identifiers when available
        return { content: [{ type: "json", json: { initial: data, final: polled } }] };
      }
      return { content: [{ type: "json", json: data }] };
    }
  );

  server.tool(
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
          const res = input.dry_run
            ? { dry_run: true, op }
            : await server.invokeTool("delete_resource", { resource: op.resource, id: op.id, orgId: input.orgId, confirm: input.confirm });
          results.push({ target: op.id, result: res });
        }
      }
      return { content: [{ type: "json", json: { executed: results.length, results } }] };
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

