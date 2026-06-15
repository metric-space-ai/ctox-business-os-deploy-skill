# Agent Client Setup

External agents need two things:

1. The companion `ctox-business-os-mcp` skill.
2. An MCP server entry for the target CTOX instance.

## Codex

Install the MCP usage skill:

```bash
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo metric-space-ai/ctox \
  --path skills/ctox-business-os-mcp
```

Add a managed MCP endpoint:

```bash
codex mcp add <server-name> \
  --url https://mcp.ctox.dev/mcp/<instance-id> \
  --bearer-token-env-var CTOX_BUSINESS_OS_MCP_TOKEN
```

The token must be visible to the Codex process. For GUI launches on macOS,
configure it through the launch environment or start Codex from a shell with
the variable set.

Restart Codex after installing skills or changing MCP entries.

## Other MCP Clients

Configure a streamable HTTP MCP server:

```text
url: https://mcp.ctox.dev/mcp/<instance-id>
authorization: Bearer <client-token>
```

If the instance is offline, clients should surface `runtime_unavailable` and
not invent a fallback.
