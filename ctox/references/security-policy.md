# Security Policy

Business OS MCP has two security layers:

1. Channel policy controls which remote actor, workspace, module, collection,
   tool class, and rate limit can use MCP.
2. Business OS product policy controls roles and grants such as `apps.view`,
   `data.read`, `data.write`, `apps.modify`, `apps.install`, `mcp.manage`, and
   `external.approve`.

The first layer does not grant the second. A remote actor can pass the MCP
allowlist and still receive `permission_denied` with field
`business_os_policy` when its Business OS role/grants do not cover the action.

Inspect current policy:

```bash
ctox business-os mcp policy
ctox business-os mcp policy keys
```

Recommended internal default:

```bash
ctox business-os mcp policy set \
  --enabled true \
  --allow-reads true \
  --allow-writes true \
  --allow-approvals true \
  --allow-external-effects false \
  --rate-limit-per-minute 120 \
  --audit-retention-days 90
```

Restrict shared environments:

```bash
ctox business-os mcp policy set \
  --allow-actor <actor-id> \
  --allow-workspace <workspace-id> \
  --allow-module <module-id> \
  --allow-collection <collection-name>
```

Use `--deny-tool business_os.<tool>` for tools a persona should never call,
even when broader channel settings are enabled.

After channel policy, configure Business OS role/grant scope separately. A
`user` actor is not a broad reader/writer by default; use exact grants for
least-privilege service actors.

- `mcp.manage` for `business_os.status` and MCP audit/status operations.
- `apps.view` to see private, preview, or restricted apps.
- `data.read` to read records or app details.
- `data.write` to execute module actions.
- `apps.install` and `apps.modify` only for app-building actors.
- `external.approve` only for explicit approval actors.

Emergency disable:

```bash
ctox business-os mcp policy set --enabled false
```

Audit export:

```bash
ctox business-os mcp audit --limit 100 --format jsonl --output business-os-mcp-audit.jsonl
ctox business-os mcp audit --prune
```

External effects should stay disabled until an admin has chosen a narrower
approval and action policy.
