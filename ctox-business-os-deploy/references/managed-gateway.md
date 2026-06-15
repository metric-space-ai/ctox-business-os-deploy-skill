# Managed Gateway

The managed gateway is `https://mcp.ctox.dev`.

Only couple an instance to ctox.dev after the user chooses managed mode or has
already requested it. Explain that ctox.dev gives hosted agents a stable MCP
endpoint while CTOX connects outbound, but the operator must manage tokens,
policy, audit, and connector supervision.

Agent endpoint:

```text
https://mcp.ctox.dev/mcp/<instance-id>
```

CTOX outbound connector:

```bash
CTOX_BUSINESS_OS_MCP_CONNECT_TOKEN=<instance-connect-token> \
  ctox business-os mcp connect --url wss://mcp.ctox.dev/connect/<instance-id>
```

Gateway status:

```bash
ctox business-os mcp gateway-status --instance-id <instance-id>
```

If client auth is configured:

```bash
CTOX_BUSINESS_OS_MCP_GATEWAY_TOKEN=<client-token> \
  ctox business-os mcp gateway-status --instance-id <instance-id>
```

## Cloudflare Gateway Repo Checks

When working inside the CTOX repository:

```bash
cd integrations/cloudflare/business-os-mcp-gateway
npm run check
```

Managed smoke without a connected instance should return `runtime_unavailable`
for MCP calls:

```bash
GATEWAY_BASE_URL=https://mcp.ctox.dev \
INSTANCE_ID=<instance-id> \
MCP_GATEWAY_TOKEN=<client-token-if-configured> \
npm run smoke
```

Managed smoke with a connector should pass:

```bash
EXPECT_CONNECTED=true npm run smoke
```

## Production Rules

- `MCP_GATEWAY_TOKEN`, `MCP_CLIENT_TOKENS`, `INSTANCE_CONNECT_TOKEN`, and
  `INSTANCE_CONNECT_TOKENS` are secrets, not `wrangler.jsonc` vars.
- Keep connect replay protection enabled.
- Use per-instance connect tokens for production.
- Gateway health/status endpoints may expose operational counters, not MCP
  payloads or Business OS records.
- The gateway is a rendezvous and relay, not a Business OS data store.
