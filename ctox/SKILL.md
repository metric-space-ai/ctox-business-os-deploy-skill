---
name: ctox
description: Use whenever a coding agent is invoked with /ctox to interact with a CTOX instance: install or locate CTOX, query status and active work, delegate tasks, inspect runs/artifacts/approvals, wire Business OS MCP, connect to mcp.ctox.dev, use SSH plus CTOX CLI for host-level diagnostics, or verify that CTOX Business OS is reachable through its supported typed MCP surface.
---

# CTOX Agent Interface

Use this skill as the interface between any coding agent and a CTOX instance.
When the user invokes `/ctox ...`, the agent should interact with CTOX in some
form: through Business OS MCP for typed Business OS operations, or through an
explicitly reachable host channel such as SSH plus the CTOX CLI for local
installation, service diagnostics, and complex host-level operations.

This is not a chat-session status skill. Do not answer `/ctox ...` from the
current coding-agent session, local git status, or assumptions about this chat
unless the user explicitly asks about the repository, this chat, or this agent.

For deeper day-to-day Business OS reads, actions, approvals, and reports, use
the companion `ctox-business-os-mcp` skill after MCP is connected.

Before changing a target machine, understand the target and give the user a
choice. Ask whether they want to couple the instance to ctox.dev unless they
already made that decision in the request.

## Core Rule

Deploy a supported control channel; never create an alternate data path.

Business OS data stays on CTOX DB over RxDB/WebRTC. MCP is a typed
communication channel for agents. It is not shell access, raw SQL, browser
remote control, or an HTTP proxy for Business OS collections.

Business OS access is two-layered. MCP channel policy decides whether a remote
actor may use the channel at all. Business OS roles, app lifecycle visibility,
and exact scoped grants then decide whether that actor may see an app, read
data, write data, modify apps, approve work, manage MCP, or perform external
effects. Do not confuse `--allow-actor`, `--allow-module`, or
`--allow-collection` with product permissions such as `apps.view`,
`data.read`, `data.write`, `apps.modify`, `mcp.manage`, or
`external.approve`.

Default role authority and scoped grants are different. `chef`/`admin` have
broad authority; `founder` is scoped to assigned modules; `user` can create
CTOX tasks by default (`CtoxTaskCreate`) but needs exact grants for status,
app visibility, data reads/writes, app changes, and approvals. Use exact grants
for service actors instead of reusing human Owner/Admin credentials.

Runtime app visibility is version-aware: `0.x.y`, missing, or invalid SemVer
apps are private unless the actor is responsible for the app or has explicit
`apps.view`; `1.0.0+` apps are team-visible by default unless restricted. App
visibility never implies data access, and data access never makes a hidden app
visible.

Do not introduce or rely on:

```text
run_cli
run_shell
write_sql
push_rxdb_record
remote_control_browser
execute_raw_business_command
HTTP fallback for Business OS records
```

## Intent Routing

Classify the user's request before acting.

- **Instance interaction default:** every normal `/ctox ...` request targets a
  CTOX instance. First determine the intended instance and available access
  path. Use MCP when the request fits typed Business OS tools. Use SSH plus the
  CTOX CLI only when the target host is explicitly reachable and the request is
  host-level, installation-level, diagnostic, or too complex for the advertised
  MCP tools.
- **Operational status:** questions about what CTOX is doing, whether it is
  idle, what jobs/runs/tasks are active, what is blocked, or which instances
  are connected. Use CTOX MCP first and the CTOX CLI only when the target
  machine is local or otherwise explicitly reachable.
- **Task delegation:** if the user gives CTOX work to do, submit or propose
  that work to the CTOX instance through typed MCP tools when available
  (`business_os.propose_action`, `business_os.execute_action`, command/run
  tools, or the advertised equivalent). If the work requires host-level setup,
  codebase access, or service changes, use an explicit SSH/CLI path and report
  the commands/evidence used.
- **Deployment/readiness:** installing CTOX, starting Business OS, connecting
  MCP, coupling to ctox.dev, configuring client agents, or verifying a new
  endpoint. Follow the deployment workflow below.
- **Business operation:** reading records, inspecting artifacts, approving
  work, or proposing actions. Use the companion `ctox-business-os-mcp`
  workflow and stay inside typed MCP tools.
- **Repository/session status:** only inspect git status, local files, or the
  current coding-agent session when the user explicitly asks about the
  repository, checkout, this chat, or this agent.

For operational status requests:

1. Use the configured CTOX Business OS MCP server if available.
2. Call `business_os.status` first.
3. Then inspect active work with available read tools, preferring
   `business_os.list_runs`, `business_os.list_mcp_activity`,
   `business_os.list_approvals`, and narrow record queries for task/work queues
   when those tools are advertised.
4. If multiple CTOX MCP servers or instances are configured, check each one
   when the runtime exposes them. Ask the user to choose only when the runtime
   cannot disambiguate.
5. Summarize each instance as `idle`, `working`, `blocked`, or
   `not_connected`, including active run/command IDs, task titles, approvals,
   blockers, timestamps, and deep links when the MCP response provides them.

If no CTOX MCP server is available and no explicit SSH/CLI path to the CTOX
host is available, say that the agent is not connected to a CTOX instance and
explain the needed access path: `http://127.0.0.1:8788/mcp` for same-host local
mode, `https://mcp.ctox.dev/mcp/<instance-id>` for managed mode, or an
operator-provided SSH target plus CTOX CLI on the host. Do not fall back to
repository checkout status.

## Credential Bootstrap

If the user gives a Business OS or ctox.dev host plus email/password and asks
to connect an agent, do not stop at "need a bearer token". Treat those
credentials as web-login credentials for a setup flow:

1. Do not repeat, log, store, or put the password in command arguments.
2. Ensure the helper runtime is available before invoking scripts. The bundled
   helpers require Node.js 18+ on PATH. On Windows, if `node` is missing, run
   `scripts/install-windows-prereqs.ps1` from the installed skill folder or
   install Node.js LTS with `winget install -e --id OpenJS.NodeJS.LTS
   --accept-package-agreements --accept-source-agreements`, refresh PATH, and
   rerun `node scripts/validate-skill.mjs`. If Node cannot be installed, report
   that as the blocker; do not call the skill "fully installed and functional".
3. Use `scripts/connect-business-os-mcp.mjs` with `--password-stdin` or
   `CTOX_WEB_LOGIN_PASSWORD` to authenticate and bootstrap MCP.
4. For `*.ctox.dev` targets, authenticate against `https://ctox.dev`, read
   `/api/desktop/session-package`, select the matching tenant, enable Managed
   MCP if needed, and rotate a one-time Agent Token through
   `/api/instances/<tenant-id>/managed-mcp`.
5. For direct Business OS targets, authenticate through `/login`, then read
   `/api/business-os/mcp/connect-info`.
6. For Claude Code, pass `--configure-claude` so the script runs
   `claude mcp add --transport http --scope user ... --header
   "Authorization: Bearer <token>"` and health-checks the configured server.
7. Use the default `--profile app-dev` when the user intends to create or
   modify Business OS apps. It mints an Agent Token with reads, writes, and
   approval-class MCP calls enabled, while external effects stay disabled.
   Use `--profile read-only` only for inspection-only agents.
8. After connecting an app-development agent, make it use the
   `business-os-app-module-development` contract returned by
   `business_os.create_app` or `business_os.modify_app`. Normal Business OS apps
   default to a single compact commandbar, not stacked app headers, duplicate
   shell chrome, empty side panes, or generic web-app templates.
9. If the server does not expose the required endpoint or the actor lacks
   Owner/Admin rights, open the browser to the exact dashboard MCP location and
   tell the user to enable Managed MCP, press **Token rotieren**, and copy the
   one-time token shown under **Neuer Token**. Do not ask them to search for an
   unspecified token.

Example, reading the password from stdin:

```bash
printf '%s\n' '<password>' | node ctox/scripts/connect-business-os-mcp.mjs \
  --host ninja.ctox.dev \
  --email <email> \
  --password-stdin \
  --profile app-dev \
  --configure-claude
```

The script prints structured JSON with the MCP URL, authorization header,
Codex/Claude server shape, dashboard URL, token scope, Claude configuration
result, and non-secret evidence. If it returns `mcp_bootstrap_unavailable`, use
the included `next.url` as the browser location for manual token rotation.

## Deployment Modes

Choose one mode:

- **Managed gateway:** public MCP endpoint at
  `https://mcp.ctox.dev/mcp/<instance-id>` plus outbound CTOX connector to
  `wss://mcp.ctox.dev/connect/<instance-id>`. This is the default for hosted
  agents and private CTOX instances.
- **Local developer:** `ctox business-os mcp serve --addr 127.0.0.1:8788`,
  optionally exposed through a temporary HTTPS tunnel for hosted MCP clients.
- **Self-hosted gateway:** customer-owned HTTPS MCP endpoint with the same
  typed tool contract and policy boundaries.

Read `references/modes.md` when mode selection is unclear.

## Target Discovery And User Choice

Before installing, connecting, or deploying anything, gather enough context to
recommend a mode:

- target machine: OS, local/remote, workstation/server, expected uptime, who
  administers it
- network shape: public domain, NAT/private host, SSH-only, allowed outbound
  WebSocket, need for inbound ports
- agent clients: ChatGPT, hosted coding agents, MCP-capable clients,
  local-only agents
- application scope: Business OS only, CTOX daemon work, customer-facing app,
  internal automation, approvals/outbound messaging
- security requirements: tenant/workspace, allowed actors, module/collection
  scope, audit retention, token handling
- intended remote-agent persona: business actor id, role/grants, app lifecycle
  scope, data scope, write scope, and approval/external-effect scope

Then make a concrete recommendation and ask the user to choose:

```text
Recommended mode: <managed ctox.dev | local developer | self-hosted>
Reason: <1-3 concrete reasons based on the target>

Choices:
1. Couple this CTOX instance to ctox.dev managed MCP.
2. Keep it local/private for now.
3. Use a self-hosted MCP gateway.
```

Explain the tradeoff if the user chooses not to couple to ctox.dev:

- hosted agents such as ChatGPT usually cannot reach the instance unless the
  operator provides a reachable HTTPS MCP endpoint or tunnel
- private/NAT hosts may remain local-only unless a tunnel, VPN, or self-hosted
  gateway is maintained
- the user keeps more direct control over the endpoint, but also owns uptime,
  TLS, auth, routing, reconnects, monitoring, and client setup
- Business OS browser sync still needs RxDB/WebRTC readiness; avoiding ctox.dev
  MCP does not create an HTTP data path

For most private machines that must be controlled by hosted agents, recommend
managed ctox.dev because it provides a stable HTTPS MCP endpoint while CTOX
connects outbound. For strictly local agents or sensitive single-user testing,
recommend local developer mode first. For enterprise environments with their
own domain, identity, and operations team, recommend self-hosted mode.

## Workflow

1. Install or locate CTOX.
2. Run CTOX health checks.
3. Verify Business OS and the native RxDB peer.
4. Discover the target machine/application and ask the user to choose a
   coupling mode.
5. Define the remote-agent identity and least-privilege Business OS role/grants.
6. Configure Business OS MCP channel policy for actor, workspace, module,
   collection, denied tools, rate limit, audit retention, and external effects.
7. Connect the selected local, managed, or self-hosted MCP endpoint.
8. Install/configure the external agent skill and MCP server entry.
9. Run end-to-end readiness checks, including allowed and denied role/grant
   cases through the intended endpoint.
10. Report the endpoint, instance id, actor id, effective role/grant scope,
   policy scope, verification evidence, audit event IDs, and
   remaining blockers.

## Commands

CTOX install:

```bash
curl -fsSL https://raw.githubusercontent.com/metric-space-ai/ctox/main/install.sh | bash
ctox doctor
ctox start
ctox status
```

Business OS readiness:

```bash
ctox business-os status
ctox business-os peer status
ctox business-os mcp status
ctox business-os mcp tools
```

Recommended internal MCP policy:

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

### Capabilities And Rights

Every MCP capability needs both a channel-policy pass and a Business OS policy
pass. Channel flags such as `allow_reads` and `allow_writes` open a class of
tools; they do not grant `data.read`, `data.write`, `apps.view`,
`apps.modify`, `mcp.manage`, or `external.approve`.

Key rules to communicate to the operator:

- **Status and audit** (`business_os.status`, `list_mcp_activity`) need
  `mcp.manage` or `chef`/`admin`.
- **App visibility** is checked before data access. Private `0.x.y`, missing,
  invalid, preview, or restricted apps need app responsibility or `apps.view`;
  `1.0.0+` team apps are visible unless restricted.
- **Read data** (`query_records`, `get_record`, `list_runs`, artifacts, module
  details, actions) needs exact `data.read` on the record, collection, module,
  or workspace scope used by that tool.
- **Change data** (`execute_action`) needs app visibility plus `data.write` on
  the module. Risky actions may also need confirmation.
- **Change apps** (`create_app`, `modify_app`, release/rollback paths) needs
  app permissions such as `apps.install`, `apps.modify`, `apps.release`, or
  `apps.rollback`.
- **Approvals/external effects** need `external.approve`; `approve` also needs
  external effects enabled in channel policy.

The full capability-to-rights matrix is in
`references/capabilities-and-rights.md`. Persona and app-lifecycle guidance is
in `references/roles-and-permissions.md`.

Constrain production remote actors explicitly:

```bash
ctox business-os mcp policy set \
  --allow-actor <agent-actor-id> \
  --allow-workspace <workspace-id> \
  --allow-module <module-id> \
  --allow-collection <collection-name>
```

This channel policy does not grant Business OS product permissions. The actor
still needs the corresponding role, module assignment, or explicit Business OS
grant before tools can return app details, data, writes, app modifications, or
approvals.

Managed gateway:

```bash
ctox business-os mcp gateway-status --instance-id <instance-id>
CTOX_BUSINESS_OS_MCP_CONNECT_TOKEN=<instance-connect-token> \
  ctox business-os mcp connect --url wss://mcp.ctox.dev/connect/<instance-id>
```

Local developer server:

```bash
ctox business-os mcp serve --addr 127.0.0.1:8788
```

Use `references/install.md`, `references/business-os-readiness.md`,
`references/managed-gateway.md`, `references/security-policy.md`,
`references/windows-prereqs.md`,
`references/capabilities-and-rights.md`, and
`references/roles-and-permissions.md` for details.

Credentialed bootstrap:

```bash
node ctox/scripts/connect-business-os-mcp.mjs \
  --host <business-os-host-or-ctox.dev-subdomain> \
  --email <email> \
  --password-stdin \
  --profile app-dev \
  --configure-claude
```

Never pass passwords as command arguments. Pipe them through stdin or use the
runtime secret store to provide `CTOX_WEB_LOGIN_PASSWORD`.

## CTOX CLI Reference

When the target machine is local or reachable through an explicit operator
shell/SSH context, use the CTOX CLI as a diagnostic companion to MCP.

Canonical CLI documentation:

```text
https://metric-space-ai.github.io/ctox/cli.html
```

Prefer MCP for remote agent control and Business OS state. Use CLI commands
for host-local service diagnostics, installation, startup, policy setup, and
readiness checks, especially:

```bash
ctox status --json
ctox business-os status
ctox business-os peer status
ctox business-os mcp status
ctox business-os mcp tools
```

## Verification

Do not report success merely because an HTTP URL loads.

A deployment is ready only when:

- `ctox doctor`, `ctox status`, and `ctox business-os mcp status` are healthy.
- Business OS readiness checks show the native peer and RxDB/WebRTC path.
- Managed gateway status is reachable.
- The target instance is connected when managed mode is expected.
- `tools/list` returns Business OS MCP tools through the intended endpoint.
- The intended actor can call only the tools and scopes their Business OS role
  and grants permit.
- Private or preview apps require `apps.view`; `data.read` alone must not make
  them visible.
- App details, entities, actions, and record reads require data grants such as
  `data.read`; app visibility alone must not expose data.
- App writes require app visibility plus `data.write`; app changes require
  `apps.modify`; approvals require `external.approve`.
- `business_os.status` works through the same endpoint only for an actor with
  `mcp.manage` or an equivalent `chef`/`admin` role.
- MCP audit records show the checked calls.

Use the bundled smoke script when possible:

```bash
node ctox/scripts/smoke-business-os-deploy.mjs \
  --instance-id <instance-id> \
  --gateway-base https://mcp.ctox.dev
```

## External Agent Setup

Install the companion MCP usage skill from CTOX using the target agent
runtime's native skill-installation mechanism:

```text
https://github.com/metric-space-ai/ctox/tree/main/skills/ctox-business-os-mcp
```

If the runtime has no skill installer, clone or download the CTOX repository
and install only `skills/ctox-business-os-mcp` as a skill named
`ctox-business-os-mcp`.

Then add the selected MCP endpoint to the agent client. Managed mode uses:

```text
url: https://mcp.ctox.dev/mcp/<instance-id>
authorization: Bearer <client-token>
```

Local developer mode uses:

```text
url: http://127.0.0.1:8788/mcp
```

Restart the agent runtime after installing skills or changing MCP config.

Read `references/agent-client-setup.md` before configuring client-specific
MCP entries.

For Business OS app development, the connected agent must also follow the
companion `ctox-business-os-mcp` App Development workflow. In particular,
`business_os.create_app` and `business_os.modify_app` return a
`development_contract` with `required_skill:
business-os-app-module-development`, `skill_resources`, validation, smoke, and
E2E commands. Use that contract exactly; do not hand-roll raw file writes or a
browser/API fallback.

If the user asks the connected coding agent to build or edit a Business OS app,
the default is a normal Business OS app, not a shell/developer control surface.
Unless the user explicitly requests a different shell, the app contract is:

- `module.json` sets `layout.shell` to `full-workspace`.
- The app owns the visible workspace inside `ctx.host`; it must not leave the
  user framed by generic shell side panes such as `Kontext` and `Themen`, and
  must not duplicate empty left/right columns inside the app.
- The shell already supplies app identity, version/source controls, account
  state, and chat. Generated business apps may add at most one compact
  commandbar for local filters and primary actions. Do not stack category/title
  heroes, duplicate app names, version bars, metrics strips, date strips, and
  filter rows before the work surface.
- High-frequency business workflows must be direct. For booking, scheduling,
  assignment, shift, parking, availability, or calendar-like domains, provide a
  date strip/calendar view and one-click primary actions such as "Eintragen" or
  "Austragen"; do not force the user through a modal/form unless extra data is
  genuinely required.
- Resource workflows must enforce domain conflicts in the one-click path. For
  example, one vehicle/person/asset cannot be booked into two overlapping slots.
- Do not add generic "Report to CTOX", "An CTOX melden", queue, AI, or
  command-bus buttons by default. Add a visible automation action only when the
  user asked for it or the domain workflow clearly needs it, and only when it
  dispatches a real command and exposes a trackable result.
- CSS uses Business OS theme tokens for surfaces, text, borders, and controls
  so light and dark theme both render correctly. Do not force `color-scheme` or
  hard-code a dark-only/light-only root palette.
- Browser ESM dependencies must be checked in as relative `.mjs` files under
  the app source root and imported relatively; do not add npm/package-manager
  bridges.

If `business_os.create_app` or `business_os.modify_app` does not return the
`development_contract`, or the required `business-os-app-module-development`
resources are unavailable, stop and report the missing contract instead of
improvising an app.

## Failure Handling

Treat these as authoritative blockers:

```text
runtime_unavailable
channel_disabled
permission_denied
business_os_policy
rate_limited
response_too_large
request_too_large
```

Do not bypass blockers through shell, SQL, raw RxDB writes, browser automation,
or private HTTP routes. Narrow the request, fix policy, connect the instance,
or ask the operator for the missing approval/token.

Read `references/troubleshooting.md` for common failures.
