# Deployment & Remote Operation

This guide covers running the MCP server locally, in Docker, and patterns for remote usage or middleware.

## Local
```bash
npm install
npm run build
API_BASE="https://app.action1.com/api/3.0" BEARER_TOKEN="<token>" npm start
```

## Docker
- Build:
```bash
docker build -t action1-mcp .
```
- Run:
```bash
docker run --rm \
  -e API_BASE="https://app.action1.com/api/3.0" \
  -e BEARER_TOKEN="<token>" \
  -e ALLOW_DESTRUCTIVE=false \
  action1-mcp
```
- Compose (example `docker-compose.yml`):
```yaml
services:
  action1-mcp:
    build: .
    environment:
      API_BASE: https://app.action1.com/api/3.0
      BEARER_TOKEN: ${BEARER_TOKEN}
      ALLOW_DESTRUCTIVE: "false"
    stdin_open: true
    tty: true
```

Notes:
- STDIO is the MCP transport; ensure the client can access the container’s stdin/stdout. Some clients only support spawning binaries locally.
- If your MCP client cannot spawn a process inside Docker, consider a proxy (see below).

## Remote and Middleware Patterns
- SSH STDIO bridge:
  - `ssh user@host "node /path/to/dist/server.js"` and connect client STDIO to the SSH session.
- MCP proxy (HTTP/WebSocket):
  - Build a small proxy that accepts HTTP/WebSocket and forwards messages to this server’s STDIO. The proxy runs alongside the container.
- Sidecar HTTP tool gateway:
  - Expose a small HTTP server that maps endpoints to MCP tool calls (validate and log carefully). Useful for thin clients.

## System Service
- Use systemd with an environment file to run the server as a service; restart on failure.

## Security
- Pass tokens via env; rotate regularly. Never commit secrets.
- Keep `ALLOW_DESTRUCTIVE=false` in shared/CI environments.

