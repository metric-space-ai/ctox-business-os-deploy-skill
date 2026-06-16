# Troubleshooting

## `runtime_unavailable`

The gateway is reachable, but no CTOX instance is connected for the requested
instance id.

Check:

```bash
ctox business-os mcp gateway-status --instance-id <instance-id>
ctox business-os mcp connect --url wss://mcp.ctox.dev/connect/<instance-id>
```

## `channel_disabled`

Enable MCP policy intentionally:

```bash
ctox business-os mcp policy set --enabled true
```

## `permission_denied`

Inspect actor/workspace/module/collection allowlists:

```bash
ctox business-os mcp policy
ctox business-os mcp policy keys
```

Do not retry through shell or SQL.

## `rate_limited`

Wait, reduce calls, or change the local policy:

```bash
ctox business-os mcp policy set --rate-limit-per-minute 120
```

## `response_too_large` or `request_too_large`

Narrow the query, lower `limit`, fetch a specific record, or request a smaller
record context.

## Business OS Page Loads But Has No Data

Verify the native peer and RxDB/WebRTC path:

```bash
ctox business-os peer status
```

Do not add HTTP fallback routes for Business OS records.
