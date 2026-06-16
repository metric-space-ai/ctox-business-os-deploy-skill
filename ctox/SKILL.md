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
5. Configure Business OS MCP policy.
6. Connect the selected local, managed, or self-hosted MCP endpoint.
7. Install/configure the external agent skill and MCP server entry.
8. Run end-to-end readiness checks.
9. Report the endpoint, instance id, policy scope, verification evidence, and
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
`references/managed-gateway.md`, and `references/security-policy.md` for
details.

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
- `business_os.status` works through the same endpoint.
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

## Failure Handling

Treat these as authoritative blockers:

```text
runtime_unavailable
channel_disabled
permission_denied
rate_limited
response_too_large
request_too_large
```

Do not bypass blockers through shell, SQL, raw RxDB writes, browser automation,
or private HTTP routes. Narrow the request, fix policy, connect the instance,
or ask the operator for the missing approval/token.

Read `references/troubleshooting.md` for common failures.
