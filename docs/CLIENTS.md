# MCP Client Configuration

This server uses the MCP STDIO transport. Below are examples for popular clients.

## Claude Desktop

Claude Desktop can launch MCP servers and connect via STDIO. Add an entry to your Claude Desktop config file.

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

Example config snippet:
```json
{
  "mcpServers": {
    "action1-mcp": {
      "command": "node",
      "args": ["--enable-source-maps", "dist/server.js"],
      "env": {
        "API_BASE": "https://app.action1.com/api/3.0",
        // Option A: provide a ready access token
        // "BEARER_TOKEN": "<your_access_token>",
        // Option B: let the server fetch a token via client credentials
        "ACTION1_CLIENT_ID": "<client_id>",
        "ACTION1_CLIENT_SECRET": "<client_secret>",
        "ALLOW_DESTRUCTIVE": "false",
        "ORG_ID": "<your_org_id>"
      },
      "cwd": "/absolute/path/to/repo"
    }
  }
}
```
Notes:
- Build first (`npm run build`).
- Use environment variables for tokens.
  - Option A: set one of `BEARER_TOKEN` (preferred), `API_TOKEN`, or `ACTION1_TOKEN` to a valid access token string.
  - Option B: set `ACTION1_CLIENT_ID` and `ACTION1_CLIENT_SECRET` and the server will exchange them at `${API_BASE}/oauth2/token` automatically.
- You can set a default organization with `ORG_ID`. Tools will use this when an `orgId` argument is omitted.
- Set `ALLOW_DESTRUCTIVE=true` only when you intend to create/update/delete and include `confirm:"YES"` in tool inputs.

Troubleshooting auth:
- In Claude, call the tool `diagnose_config` to see what the server sees (base URL, whether a token is present, default org, destructive flag).
- Then call `verify_auth` to attempt a GET `/organizations` and report the HTTP status.
- If you get 401/403, verify:
  - `API_BASE` points to the correct region (NA: `https://app.action1.com/api/3.0`, EU: `https://app.eu.action1.com/api/3.0`, AU: `https://app.au.action1.com/api/3.0`).
  - `BEARER_TOKEN` is a valid access token, not the client secret. Obtain via your OAuth2 process and paste the access_token.
  - No extra whitespace; restart Claude Desktop after editing the config.

## Generic MCP client (CLI-style)

Any MCP client that supports STDIO can execute this server with `node dist/server.js` and wire STDIO. Provide env vars as needed.

Example:
```bash
API_BASE="https://app.action1.com/api/3.0" \
BEARER_TOKEN="<token>" \
ALLOW_DESTRUCTIVE=false \
node --enable-source-maps dist/server.js
```

## Docker usage

Build and run the server inside Docker:
```bash
docker build -t action1-mcp .
# Run with env vars
docker run --rm -e API_BASE -e BEARER_TOKEN -e ALLOW_DESTRUCTIVE action1-mcp
```

## Troubleshooting
- If the client shows connection errors, run the server manually to confirm it starts without issues.
- Ensure the working directory (`cwd`) is set to the repository root so relative paths resolve.
- Check logs (JSON) for errors; secrets are redacted.
