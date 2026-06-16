# Security Policy

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
