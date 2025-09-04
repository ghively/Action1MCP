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
        "BEARER_TOKEN": "<your_token>",
        "ALLOW_DESTRUCTIVE": "false"
      },
      "cwd": "/absolute/path/to/repo"
    }
  }
}
```
Notes:
- Build first (`npm run build`).
- Use environment variables for tokens.
- Set `ALLOW_DESTRUCTIVE=true` only when you intend to create/update/delete and include `confirm:"YES"` in tool inputs.

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

