# Deployment Modes

Choose the smallest mode that satisfies the target agent's network needs.

Before acting, ask the user whether this CTOX instance should be coupled to
ctox.dev unless the request already decides the mode. Give a recommendation
first, then let the user choose.

Use this decision table:

| Target situation | Recommended mode | Why |
| --- | --- | --- |
| Hosted agents must reach a private/NAT CTOX instance | Managed gateway | CTOX connects outbound; agent gets stable HTTPS MCP. |
| Agent and CTOX run on the same machine | Local developer | Minimal exposure; fastest setup. |
| Enterprise owns domain, auth, observability, and uptime | Self-hosted | Customer controls perimeter and operations. |
| User is only evaluating CTOX locally | Local developer | Avoids gateway setup until value is proven. |
| Multiple external agents need durable access | Managed gateway or self-hosted | Local tunnels are too fragile for persistent access. |

## ctox.dev Coupling

Benefits:

- stable public MCP URL for hosted agents
- no inbound port required on private CTOX machines
- outbound connector can reconnect with bounded backoff
- gateway can inject authoritative actor/workspace context
- central health/status route for operational checks

Constraints:

- requires gateway/client/connect tokens and careful secret handling
- CTOX must keep the outbound connector supervised for durable access
- gateway can observe operational metadata such as request sizes and status
- production use needs explicit actor/workspace/module/collection policy
- production use also needs explicit Business OS roles/grants for app
  visibility, data access, writes, app changes, and approvals
- external effects must stay approval-gated

If the user declines ctox.dev:

- explain that hosted agents may not be able to reach CTOX
- use local MCP only for local clients, or require a self-hosted HTTPS MCP
  gateway/tunnel
- document that the operator owns TLS, auth, routing, monitoring, uptime, and
  reconnect behavior
- do not compensate by adding HTTP Business OS data routes

## Managed Gateway

Use this by default for hosted agents, ChatGPT, browser-hosted coding agents,
or private CTOX instances without inbound ports.

Shape:

```text
Agent -> https://mcp.ctox.dev/mcp/<instance-id>
CTOX  -> wss://mcp.ctox.dev/connect/<instance-id>
```

Required evidence:

- gateway `/health` reachable
- `/status/<instance-id>` reachable
- connected session present when deployment is meant to be live
- `tools/list` and `business_os.status` round-trip through the gateway

## Local Developer

Use this for local integration, MCP Inspector, or an agent running on the same
machine:

```bash
ctox business-os mcp serve --addr 127.0.0.1:8788
```

Hosted clients need an HTTPS tunnel to this local server. The tunnel is only
for MCP JSON-RPC, not for Business OS collection replication.

## Self-Hosted

Use this when a customer controls the gateway domain and operational policy.
It must preserve the same constraints:

- no central Business OS record mirror
- typed MCP tools only
- bounded responses and audit
- same Business OS roles/grants as managed and local MCP
- approval-gated external effects
- no HTTP Business OS data bridge
