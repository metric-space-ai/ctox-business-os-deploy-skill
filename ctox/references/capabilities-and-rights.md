# Remote Capabilities ↔ Rights

This is the authoritative mapping of what an agent can do over the Business OS
MCP channel and the rights each capability requires. Every MCP call is gated by
**two independent layers** and must pass **both**:

1. **Channel policy** — `ctox business-os mcp policy` (instance-wide).
2. **Per-actor permission** — decided from the calling actor's **role**.

A capability is only available when the channel policy allows its class **and**
the actor's role grants its permission. Loosening the channel policy does not
grant rights to a `user`-role actor, and a powerful role cannot act through a
disabled channel.

## 1. Channel policy flags

`ctox business-os mcp policy set --enabled true --allow-reads true \
  --allow-writes true --allow-approvals true --allow-external-effects false \
  --rate-limit-per-minute 120 --audit-retention-days 90`

| Flag | Gates |
|---|---|
| `enabled` | the whole MCP surface |
| `allow_reads` | every read capability (status, records, runs, artifacts, modules) |
| `allow_writes` | every mutating capability (records/actions, apps, CTOX tasks) |
| `allow_approvals` | `approve` / `reject` / `request_changes` |
| `allow_external_effects` | outbound / external side effects (default **false**) |
| `allowed_actors` / `allowed_workspaces` | optional allowlists; empty = all |

## 2. Roles (per-actor)

Role comes from the actor (managed-auth identity → governance actor, or a
`business_users` row). `owner` normalizes to `chef`.

| Role | What it can do |
|---|---|
| **chef** (owner) | **everything** — full data read/write, app changes, approvals, external, workspace/users/roles/runtime/secrets/MCP management |
| **admin** | same as chef **except** `WorkspaceManage` |
| **founder** | app view/modify/release/rollback **only for modules it owns**; **no** data read/write |
| **user** | `CtoxTaskCreate` **only** — **cannot read or write business data, cannot change apps** |

> ⚠️ **Both `DataRead` and `DataWrite` require `chef` or `admin`.** A `user`-role
> actor is read-blocked: it cannot even query records. To let someone "ask
> questions, change data, change apps" they must be **chef (owner)** or
> **admin** — and the instance owner should be seeded as `chef`.

## 3. Capability → permission → minimum role

### Ask questions / read  (needs `allow_reads`)
| MCP capability | Permission | Min role |
|---|---|---|
| `business_os.status` | — (instance status) | user |
| `business_os.list_modules`, `get_module`, `list_entities` | `AppsView` | chef / admin |
| `business_os.query_records`, `search_records`, `get_record`, `get_record_context`, `list_record_activity` | `DataRead` | chef / admin |
| `business_os.list_runs`, `get_run`, `list_artifacts`, `get_artifact` | `DataRead` | chef / admin |
| `business_os.list_approvals` | read | chef / admin |
| `business_os.list_module_actions` | `AppsView` | chef / admin |

### Change data / act  (needs `allow_writes`)
| MCP capability | Permission | Min role |
|---|---|---|
| `business_os.propose_action`, `execute_action` | `DataWrite` (+ the action's own scope) | chef / admin |
| create a CTOX task | `CtoxTaskCreate` | user |
| manage a CTOX task | `CtoxTaskManage` | chef / admin |

### Change apps  (needs `allow_writes`)
| MCP capability | Permission | Min role |
|---|---|---|
| `business_os.create_app` (install) | `AppsInstall` | chef / admin |
| `business_os.modify_app` | `AppsModify` | chef / admin (founder: owned modules) |
| release / rollback / uninstall | `AppsRelease` / `AppsRollback` / `AppsUninstall` | chef / admin |
| view app source | `AppsSourceView` | chef / admin |
| assign app owner | `AppsAssignOwner` | chef / admin |

### Approvals  (needs `allow_approvals`)
| `business_os.approve`, `reject`, `request_changes` | approval (role-gated) | chef / admin |

### External effects  (needs `allow_external_effects`)
| `business_os.open_link` and any outbound/external action | `ExternalApprove` | chef / admin |

### Instance management
| users / roles / runtime / integrations / secrets / MCP policy | `UsersManage` / `RolesManage` / `RuntimeManage` / `IntegrationsManage` / `SecretsManage` / `McpManage` | chef / admin |
| workspace settings | `WorkspaceManage` | **chef only** |

## 4. Practical setup for "owner can ask, change data, change apps"

1. Channel: `enabled`, `allow_reads`, `allow_writes`, `allow_approvals` true
   (leave `allow_external_effects` false unless outbound is required).
2. Owner role: ensure the instance owner resolves to **`chef`** (owner→chef).
   On a managed instance, seed the owner into `business_users` with `role=owner`
   (or ensure the managed-auth projection maps owner→chef) — otherwise the owner
   lands as `user` and is read-blocked.
3. Verify end-to-end (as the owner actor): a `query_records` returns rows
   (read), an `execute_action` mutates a record (data change), and
   `create_app`/`modify_app` succeeds (app change). If `query_records` is denied,
   the actor is not `chef`/`admin` — fix the role, not the channel policy.
