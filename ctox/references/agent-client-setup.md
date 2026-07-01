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
  --password-stdin \
  --profile app-dev \
  --configure-claude
```

Read the password from stdin or `CTOX_WEB_LOGIN_PASSWORD`; never put it in the
command line. For `*.ctox.dev` hosts the script authenticates against
`https://ctox.dev`, reads `/api/desktop/session-package`, selects the matching
tenant, enables Managed MCP when permitted, rotates a one-time Agent Token via
`/api/instances/<tenant-id>/managed-mcp`, and prints the MCP URL plus
Codex/Claude configuration shape. The default token profile is `app-dev`
because this skill is often used to build and modify Business OS apps; it
enables reads, writes, and approval-class MCP calls while leaving external
effects disabled. Use `--profile read-only` for inspection-only agents. For
direct Business OS hosts it uses `/login` and
`/api/business-os/mcp/connect-info`.

For Claude Code, `--configure-claude` runs:

```bash
claude mcp add --transport http --scope user <name> <url> \
  --header "Authorization: Bearer <token>"
```

It replaces an existing server with the same name unless
`--no-replace-claude` is passed, then runs `claude mcp get <name>` as a
health check. If a runtime should keep MCP config project-local, pass
`--claude-scope local` or `--claude-scope project`.

If the script reports `mcp_bootstrap_unavailable`, open the returned
`next.url`. In the dashboard choose the tenant, open **MCP**, enable Managed
MCP, press **Token rotieren**, and copy the one-time token shown under
**Neuer Token**. The same panel shows the MCP URL and Connector URL. Do not
send the user to an unspecified "dashboard token" location.

## Business OS App Development

After Claude Code is connected, use the companion `ctox-business-os-mcp` skill
for app work. `business_os.create_app` and `business_os.modify_app` return the
canonical `development_contract`:

- `required_skill`: normally `business-os-app-module-development`
- `skill_resources`: module contract, do/don't list, green checklist, and
  architecture translation references
- `validation_command`, `smoke_command`, and `e2e_command`
- `app_directory` under `runtime/business-os/installed-modules/<module_id>`

Claude should use that contract exactly, validate with the returned command,
and rely on Business OS MCP completion status. Do not use browser automation,
raw HTTP, SQL, or shell access as a Business OS data path.

For ordinary generated Business OS apps, the default shell is the standard app
workspace, not a developer shell. Unless the user explicitly asks for a
different shell, generated apps must set `module.json` `layout.shell` to
`full-workspace`, render their own focused workspace inside `ctx.host`, avoid
generic `Kontext`/`Themen` side panes and empty duplicate app columns, and use
Business OS theme tokens for light/dark surfaces, text, borders, and controls.
Do not force `color-scheme` or hard-code a dark-only/light-only root palette.
Browser ESM dependencies must be committed as relative `.mjs` files under the
app source root and imported relatively.

If a create/modify response does not include `development_contract` or the
listed `business-os-app-module-development` resources are unavailable, stop and
report the missing app contract. Do not improvise a raw web app.

## Runtime-Specific Notes

Do not give the user a hard-coded local install script for one agent runtime
unless they explicitly ask for that runtime. A coding agent should use its own
native skill installer, its own MCP client schema, and its own secret-handling
model.

For Windows Claude Code installs, verify Node.js 18+ before running the bundled
helpers. If `node` is missing, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\ctox\scripts\install-windows-prereqs.ps1
node .\ctox\scripts\validate-skill.mjs
```

If the script cannot install Node.js, provide the exact blocker and do not call
the install fully functional. Copying `SKILL.md` and references is a copy-only
install; it is not enough for credential bootstrap or Claude MCP setup.

For GUI-based agents, make sure bearer tokens are visible to the launched
process. For hosted agents, prefer the platform's secret manager over pasted
tokens in configuration files.

After changing skill or MCP configuration, restart or reload the agent runtime
if that runtime does not hot-reload these settings.

If the instance is offline, clients should surface `runtime_unavailable` and
not invent a fallback.
