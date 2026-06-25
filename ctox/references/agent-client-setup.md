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
