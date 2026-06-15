# CTOX Business OS Deploy Skill

GitHub-hosted agent skill for installing, connecting, and verifying CTOX
Business OS remote-control deployments.

This repository is intentionally usable by any coding-agent runtime that can
install skills from GitHub. It is not Codex-specific.

The installable skill folder is:

```text
ctox-business-os-deploy/
```

GitHub skill URL:

```text
https://github.com/metric-space-ai/ctox-business-os-deploy-skill/tree/main/ctox-business-os-deploy
```

## Install With A Coding Agent

Copy this prompt into the coding agent that should install the skill:

```text
Install the CTOX Business OS deploy skill from GitHub:

https://github.com/metric-space-ai/ctox-business-os-deploy-skill/tree/main/ctox-business-os-deploy

Use your runtime's native skill-installation mechanism. If your runtime does
not have one, clone or download the repository and install only the
`ctox-business-os-deploy/` folder as a skill named `ctox-business-os-deploy`.

After installation, verify that the skill's `SKILL.md` is available to you and
that the references under `references/` are included. Restart or reload your
agent runtime if required. Do not configure CTOX, tokens, ctox.dev coupling, or
MCP endpoints yet; only report the installed skill location and any manual step
the user must perform.
```

The prompt intentionally avoids hard-coded local paths or one runtime's
installer script. Each agent should use its own native skill installation
mechanism and report what it actually did.

## What This Skill Does

The skill guides an agent through CTOX Business OS deployment and readiness:

1. Understand the target machine, network, agent client, and application.
2. Recommend a deployment mode and ask the user to choose.
3. Install or locate CTOX.
4. Verify CTOX daemon and Business OS readiness.
5. Configure Business OS MCP policy.
6. Connect local, managed, or self-hosted MCP.
7. Configure the external agent's MCP client and companion MCP usage skill.
8. Verify end-to-end access through typed Business OS MCP tools.

The skill is not for everyday record queries or Business OS actions. After a
deployment is connected, use the companion `ctox-business-os-mcp` skill for
normal Business OS interaction.

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

The skill references these CTOX routines.

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
- The selected MCP endpoint returns tool descriptors.
- `business_os.status` works through the selected endpoint.
- managed mode shows a connected CTOX session.
- audit events record the MCP checks.

The skill includes a local smoke helper:

```bash
node ctox-business-os-deploy/scripts/smoke-business-os-deploy.mjs \
  --instance-id <instance-id> \
  --gateway-base https://mcp.ctox.dev
```

## Development Checks

Inside the installable skill folder:

```bash
npm run check
```
