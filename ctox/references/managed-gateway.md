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

The bearer token should map to the intended Business OS actor. In production,
prefer one client token per remote-agent persona so audit events show a stable
actor and least-privilege scope.

CTOX outbound connector:

```bash
CTOX_BUSINESS_OS_MCP_CONNECT_TOKEN=<instance-connect-token> \
  ctox business-os mcp connect --url wss://mcp.ctox.dev/connect/<instance-id>
```

Gateway status:

```bash
ctox business-os mcp gateway-status --instance-id <instance-id>
```

## Browser Token Location

For ctox.dev managed instances the token is in the tenant dashboard:

```text
https://ctox.dev/dashboard?tenant=<tenant-id>#mcp
```

Open the tenant, switch to **MCP**, enable Managed MCP, then press
**Token rotieren**. The raw client token is displayed once under
**Neuer Token** together with the MCP URL and Connector URL. Copy it
immediately into the agent runtime's secret store.

If the user supplied web-login credentials, prefer the scripted bootstrap
before manual copy:

```bash
node ctox/scripts/connect-business-os-mcp.mjs \
  --host <ctox.dev-subdomain-or-business-os-host> \
  --email <email> \
  --password-stdin
```

The script reads the password from stdin, logs in, selects the tenant from
`/api/desktop/session-package`, calls `/api/instances/<tenant-id>/managed-mcp`,
rotates an Agent Token when permitted, and prints the MCP client configuration.
It never uses the web password as an MCP bearer token.

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
- Use per-actor or per-persona client tokens for production remote agents.
- Do not let agents spoof `_context`; gateway-injected actor/workspace/role is
  authoritative.
- Gateway health/status endpoints may expose operational counters, not MCP
  payloads or Business OS records.
- The gateway is a rendezvous and relay, not a Business OS data store.
