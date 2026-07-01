# CTOX Agent Interface Skill

GitHub-hosted agent skill that turns `/ctox ...` into the interface between
any coding agent and a CTOX instance.

This repository is intentionally usable by any coding-agent runtime that can
install skills from GitHub. It is not tied to a single agent runtime.

The installable skill folder is:

```text
ctox/
```

GitHub skill URL:

```text
https://github.com/metric-space-ai/ctox-business-os-deploy-skill/tree/main/ctox
```

The skill name in `SKILL.md` is `ctox`, so agent runtimes that expose skills as
slash commands should install it as `/ctox`.

## Install With A Coding Agent

Copy this prompt into the coding agent that should install the skill:

```text
Install the CTOX agent skill from GitHub and make it runnable on this machine:

https://github.com/metric-space-ai/ctox-business-os-deploy-skill/tree/main/ctox

Use your runtime's native skill-installation mechanism. If your runtime does
not have one, clone or download the repository and install only the
`ctox/` folder as a skill named `ctox`.

After installation, verify that the skill's `SKILL.md` is available to you and
that the references and scripts under `references/` and `scripts/` are included.
Then verify runtime prerequisites. The bundled helper scripts require Node.js
18+ on PATH. On Windows, if `node` is missing, install Node.js LTS with
`winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements`
or run `ctox/scripts/install-windows-prereqs.ps1`, refresh PATH, and rerun
`node ctox/scripts/validate-skill.mjs`. Restart or reload your agent runtime if
required.

This prompt only installs the skill and its local prerequisites. Do not configure
CTOX, tokens, ctox.dev coupling, or MCP endpoints yet unless the user explicitly
asked to connect a CTOX instance.
```

The prompt intentionally avoids hard-coded local paths for one agent runtime.
Each agent should use its own native skill installation mechanism and report
what it actually did. A report that says "Node is not installed" is not a
complete functional install; it is a blocker unless the user asked for a
copy-only installation.

## What This Skill Does

The skill guides an agent through CTOX instance interaction. Every normal
`/ctox ...` invocation should target CTOX through one of the supported access
paths:

- Business OS MCP for typed status, records, runs, artifacts, approvals, and
  task delegation.
- SSH plus the CTOX CLI for explicitly reachable host-level setup,
  installation, service diagnostics, and complex operations that do not fit the
  advertised MCP tools.

It covers:

1. Understand the target machine, network, agent client, and application.
2. Recommend a deployment mode and ask the user to choose.
3. Install or locate CTOX.
4. Verify CTOX daemon and Business OS readiness.
5. Configure Business OS MCP policy.
6. Configure the remote-agent actor, role, app visibility, and data/action
   grants according to Business OS policy.
7. Connect local, managed, or self-hosted MCP.
8. Configure the external agent's MCP client and companion MCP usage skill.
9. Verify end-to-end access through typed Business OS MCP tools, including
   allowed and denied role/grant cases.
10. Answer CTOX instance status questions from MCP/CLI state, including active
   tasks, runs, blockers, approvals, connected instances, and idle state.
11. Submit or propose work to CTOX when the user gives a task to the instance.

The skill must not answer CTOX status questions from the current coding-agent
session or repository checkout unless the user explicitly asks about the
repository or this chat. After a deployment is connected, use the companion
`ctox-business-os-mcp` skill for normal Business OS record interaction and
actions.

For Business OS app creation or modification, the connected agent must use the
MCP app-development contract returned by `business_os.create_app` or
`business_os.modify_app`, including the `business-os-app-module-development`
resources. Normal generated apps default to `module.json`
`layout.shell: "full-workspace"`, no generic `Kontext`/`Themen` shell side
panes, and Business OS theme tokens for light/dark rendering unless the user
explicitly asks for a different shell. The shell already supplies app identity,
version/source controls, account state, and chat; generated apps may add at
most one compact commandbar for local filters and primary actions, not stacked
app headers. Booking, scheduling, parking, shift, and availability apps should
expose calendar/date-strip views with one-click primary actions and enforce
resource conflicts such as one vehicle/person/asset not being booked into two
overlapping slots. Do not add generic "Report to CTOX" / "An CTOX melden"
buttons unless the user requested that automation and the app returns a real
trackable command/task result.

Companion skill URL:

```text
https://github.com/metric-space-ai/ctox/tree/main/skills/ctox-business-os-mcp
```

## What Business OS MCP Is

Business OS MCP is CTOX's typed communication channel for external agents. It
exposes Business OS concepts through MCP tools:

- modules
- entities
- records
- runs
- artifacts
- approvals
- commands
- audit activity

It is not terminal access, raw SQL access, browser remote control, or an HTTP
proxy for CTOX Business OS data.

The data boundary matters:

```text
Business OS browser <-> CTOX DB / RxDB / WebRTC <-> CTOX instance
Agent               <-> Business OS MCP Channel       <-> CTOX instance
```

Business OS records, commands, files, module manifests, and runtime status
must not be moved through ad hoc HTTP fallbacks. The browser data plane remains
RxDB/WebRTC-only.

Remote-agent permissions follow the same Business OS model as humans:
`Owner`/`chef`, `Admin`/`admin`, `App-Verantwortliche:r`/`founder`, and
`Teammitglied`/`user`. MCP allowlists open the channel; default role authority,
app visibility, version/lifecycle, and exact product grants such as
`apps.view`, `data.read`, `data.write`, `apps.modify`, `mcp.manage`, and
`external.approve` still decide each action. Unknown remote actors default to
`user`; they need exact grants for status, private apps, data reads/writes,
app changes, and approvals. Apps with `0.x.y`, missing, or invalid versions
stay private; apps at `1.0.0+` are team-visible by default unless restricted.

## Deployment Choices

The skill must not blindly couple an instance to ctox.dev. It first inspects
the target and explains the tradeoffs, then asks the user to choose.

### Managed ctox.dev

Use when hosted agents need stable access to a private or NAT-bound CTOX
instance.

```text
Agent -> https://mcp.ctox.dev/mcp/<instance-id>
CTOX  -> wss://mcp.ctox.dev/connect/<instance-id>
```

Benefits:

- stable HTTPS MCP endpoint for hosted agents
- no inbound port required on the CTOX machine
- outbound connector can reconnect
- gateway can inject authoritative actor/workspace context

Constraints:

- requires gateway/client/connect tokens
- connector must be supervised for durable access
- production needs explicit actor/workspace/module/collection policy
- external effects remain approval-gated

### Local Developer

Use when the agent and CTOX run on the same machine or when the user is only
evaluating CTOX locally.

```bash
ctox business-os mcp serve --addr 127.0.0.1:8788
```

Hosted clients usually cannot reach this unless the operator supplies an HTTPS
tunnel.

### Self-Hosted

Use when a customer controls the domain, identity, auth, TLS, uptime,
observability, and routing.

Self-hosted mode must preserve the same typed MCP contract and must not become
a Business OS data mirror.

## Install And Deploy Routines

The skill references these CTOX routines. The canonical CLI documentation is:

```text
https://metric-space-ai.github.io/ctox/cli.html
```

Install CTOX:

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

Audit:

```bash
ctox business-os mcp audit --limit 100 --format jsonl --output business-os-mcp-audit.jsonl
```

## Verification

Do not count a deployment as complete because a page or gateway URL loads.

A deployment is ready only when:

- CTOX health checks pass.
- Business OS native peer and RxDB/WebRTC status are healthy.
- MCP policy permits the intended actor/workspace/module/collection scope.
- Business OS roles/grants permit the intended app visibility, data reads,
  writes, app changes, and approvals.
- Denied app/data scopes fail with `permission_denied` instead of leaking data.
- The selected MCP endpoint returns tool descriptors.
- `business_os.status` works for the setup/status actor, or a narrow service
  actor's expected `business_os_policy` denial is documented.
- managed mode shows a connected CTOX session.
- audit events record the MCP checks.

The skill includes a local smoke helper:

```bash
node ctox/scripts/smoke-business-os-deploy.mjs \
  --instance-id <instance-id> \
  --gateway-base https://mcp.ctox.dev
```

## Development Checks

Inside the installable skill folder:

```bash
npm run check
```
