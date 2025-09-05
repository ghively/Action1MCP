import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["--enable-source-maps", "dist/server.js"],
    cwd: process.cwd(),
    env: {
      API_BASE: process.env.API_BASE || "https://app.action1.com/api/3.0",
      BEARER_TOKEN: process.env.BEARER_TOKEN || "<token-not-used-in-dry-run>",
      ALLOW_DESTRUCTIVE: "true",
      MCP_AUTOSTART: "true",
    },
    stderr: "pipe",
  });

  const client = new Client({ name: "probe-client", version: "0.1.0" }, {
    capabilities: { tools: {} }
  });

  try {
    await client.connect(transport);
    const tools = await client.listTools({});
    console.log("Tools:", tools.tools.map(t => t.name));

    // Probe a tool that can run without network via dry_run
    const result = await client.callTool({
      name: "delete_resource",
      arguments: {
        resource: "endpoints",
        id: "123",
        orgId: "456",
        dry_run: true,
        confirm: "YES"
      }
    });
    console.log("delete_resource(dry_run) result:", JSON.stringify(result, null, 2));
  } finally {
    await client.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

