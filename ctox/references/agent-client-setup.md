# Agent Client Setup

External agents need two things:

1. The companion `ctox-business-os-mcp` skill.
2. An MCP server entry for the target CTOX instance.

They also need an intended Business OS actor identity. The MCP client token or
gateway context should resolve to the actor id, workspace, and role/grant scope
the operator selected. Do not reuse a human Owner/Admin token for routine
automation when a narrower service actor can do the job.

## Generic Skill Installation

Ask the agent to install the companion skill from this GitHub URL using its
native skill-installation mechanism:

```text
https://github.com/metric-space-ai/ctox/tree/main/skills/ctox-business-os-mcp
```

If the runtime has no GitHub skill installer, clone or download the CTOX
repository and install only `skills/ctox-business-os-mcp` as a skill named
`ctox-business-os-mcp`.

Restart or reload the agent runtime after installing skills.

## MCP Client Configuration

Configure a streamable HTTP MCP server for managed mode:

```text
url: https://mcp.ctox.dev/mcp/<instance-id>
authorization: Bearer <client-token>
```

Managed gateway context is authoritative. The agent should not add or spoof
`_context` fields to become another actor, workspace, or role.

Local developer mode uses the local server endpoint instead:

```text
url: http://127.0.0.1:8788/mcp
```

Hosted clients normally require HTTPS. If the target is local-only, explain
that hosted agents cannot reach it without a tunnel or gateway.

## When The User Provides Email And Password

Email/password is a valid way to start setup, but it is not itself the MCP
bearer token. Use it to authenticate to the Business OS or ctox.dev control
plane, then mint or fetch the supported MCP configuration.

Run the bundled bootstrap script instead of telling the user to find a token
manually:

```bash
node ctox/scripts/connect-business-os-mcp.mjs \
  --host <business-os-host-or-ctox.dev-subdomain> \
  --email <email> \
  --password-stdin
```

Read the password from stdin or `CTOX_WEB_LOGIN_PASSWORD`; never put it in the
command line. For `*.ctox.dev` hosts the script authenticates against
`https://ctox.dev`, reads `/api/desktop/session-package`, selects the matching
tenant, enables Managed MCP when permitted, rotates a one-time Agent Token via
`/api/instances/<tenant-id>/managed-mcp`, and prints the MCP URL plus
Codex/Claude configuration shape. For direct Business OS hosts it uses
`/login` and `/api/business-os/mcp/connect-info`.

If the script reports `mcp_bootstrap_unavailable`, open the returned
`next.url`. In the dashboard choose the tenant, open **MCP**, enable Managed
MCP, press **Token rotieren**, and copy the one-time token shown under
**Neuer Token**. The same panel shows the MCP URL and Connector URL. Do not
send the user to an unspecified "dashboard token" location.

## Runtime-Specific Notes

Do not give the user a hard-coded local install script for one agent runtime
unless they explicitly ask for that runtime. A coding agent should use its own
native skill installer, its own MCP client schema, and its own secret-handling
model.

For GUI-based agents, make sure bearer tokens are visible to the launched
process. For hosted agents, prefer the platform's secret manager over pasted
tokens in configuration files.

After changing skill or MCP configuration, restart or reload the agent runtime
if that runtime does not hot-reload these settings.

If the instance is offline, clients should surface `runtime_unavailable` and
not invent a fallback.
