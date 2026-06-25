# Remote Capabilities And Rights

This is the current mapping between Business OS MCP capabilities and Business
OS rights. Every MCP call has two independent gates and must pass both:

1. Channel policy: `ctox business-os mcp policy`.
2. Business OS policy: the trusted actor's role plus exact scoped grants.

The channel policy opens or narrows the MCP surface. It never grants product
rights by itself. A remote actor can pass `--allow-actor`,
`--allow-module`, and `--allow-collection` and still receive
`permission_denied` with field `business_os_policy`.

## Channel Policy

Typical setup:

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

| Policy setting | Gates |
| --- | --- |
| `enabled` | The whole MCP channel. |
| `allow_reads` | Read-class tools such as status, modules, records, runs, artifacts and audit activity. |
| `allow_writes` | Mutating tools such as app creation/modification and action execution. |
| `allow_approvals` | `reject` / `request_changes`; `approve` also needs external effects. |
| `allow_external_effects` | External-effect tools, currently including `business_os.approve`. Keep false unless explicitly accepted. |
| `allowed_actors` / `allowed_workspaces` | Optional channel allowlists; empty means all actors/workspaces for that channel. |
| `allowed_modules` / `allowed_collections` | Optional channel allowlists; these restrict the channel and do not grant Business OS rights. |
| `deny_tool` | Blocks named tools even when the broader class is enabled. |

Managed gateway context is authoritative. Agents must not spoof `_context` to
become another actor, workspace or role.

## Actor Roles

Unknown or unpersisted MCP actors default to `user`. They do not inherit the
local developer's admin session. Persist production actors or grant exact
permissions to stable service actor ids.

| Stored role | Default authority |
| --- | --- |
| `chef` | Owner. Full workspace authority, including workspace management. |
| `admin` | Broad operational authority, except owner-only workspace management. |
| `founder` | App-responsible actor for assigned modules; can view/modify/release/rollback/source-view assigned modules and can receive module-scoped data authority through assignment or grants. |
| `user` | Default team/service actor. Can create CTOX tasks by default, but cannot read data, see private apps, change data, modify apps, manage MCP or approve external effects without exact grants. |

Aliases such as `owner` and `team` may be accepted at boundaries, but persisted
roles normalize to `chef/admin/founder/user`.

## Exact Grants

Use exact grants for least-privilege remote agents. Grants are scoped by
subject, permission, scope type and scope id. Common examples:

| Grant | Typical scope |
| --- | --- |
| `mcp.manage` | `mcp:business_os_mcp` for status/audit operators. |
| `apps.view` | `module:<module-id>` for private, preview or restricted apps. |
| `data.read` | `record:<collection>:<id>`, `collection:<collection>`, or `module:<module-id>`. |
| `data.write` | `module:<module-id>` for approved module actions. |
| `apps.modify` | `module:<module-id>` for app-building actors. |
| `apps.install` | `module:<module-id>` for app creation. |
| `external.approve` | `approval:<id>` or a tightly scoped approval module. |

Exact record grants do not allow collection listing. `data.read` or
`data.write` does not make a hidden app visible. `apps.view` makes an app
visible or linkable; it does not expose records or action payloads.

## App Visibility

MCP checks app visibility before data access.

| App state | Rule |
| --- | --- |
| Packaged/core app | Visible outside runtime-app lifecycle. |
| `0.x.y`, missing version or invalid SemVer | Private by default. Visible only through app responsibility or `apps.view`. |
| Preview | Visible only to preview/app-visibility actors and app managers. |
| `1.0.0+` team release | Team-visible by default unless restricted. |
| Restricted release | Visible only to the selected audience and app managers. |

Publishing to `1.0.0+` does not create data grants. Data access still needs
the appropriate `data.read` or `data.write` authority.

## Tool Mapping

| MCP tool/use | Channel class | Business OS rights |
| --- | --- | --- |
| `business_os.status`, `business_os.list_mcp_activity` | Read | `mcp.manage` on `business_os_mcp`, or `chef`/`admin`. |
| `business_os.list_modules` | Read | Filters by app visibility. Team-visible apps are listed; hidden apps need `apps.view`. |
| `business_os.open_link` for a module | Read | Hidden modules need `apps.view`; collection links need `data.read`. |
| `business_os.get_module`, `list_entities`, `list_module_actions`, `propose_action` | Read | App visibility first, then `data.read` on the module. |
| `business_os.query_records`, `search_records`, `get_record_context`, `list_record_activity` | Read | `data.read` on the collection, or on a module that owns the collection. |
| `business_os.get_record` | Read | Exact `data.read` on the record, collection or owning module. |
| `business_os.list_runs`, `get_run` | Read | `data.read` on `ctox_queue_tasks`. |
| `business_os.list_artifacts`, `get_artifact` | Read | `data.read` on the requested collection, or workspace-scoped `data.read` when unscoped. |
| `business_os.list_approvals` | Read | `data.read` on `outbound_approvals`. |
| `business_os.get_command_status` | Read | `data.read` on `business_commands`. |
| `business_os.execute_action` | Write | App visibility first, then `data.write` on the module. Risky actions may still require confirmation. |
| `business_os.create_app` | Write | `apps.install` for the target module id. Newly created apps stay private until release. |
| `business_os.modify_app` | Write | `apps.modify` for the module. |
| `business_os.reject`, `business_os.request_changes` | Approval | `external.approve` plus write/approval channel policy. |
| `business_os.approve` | External effect | `external.approve` plus write/approval/external-effect channel policy. |

## Verification

For every production persona, verify both success and denial through the same
endpoint the agent will use:

1. Call a permitted tool and capture request/audit ids.
2. Call a denied app, collection, record or approval scope.
3. Confirm the denial is `permission_denied` with either a channel-policy field
   such as `CTOX_BUSINESS_OS_MCP_ALLOWED_COLLECTIONS` or the product-policy
   field `business_os_policy`.
4. Do not work around a denial through shell, SQL, raw RxDB writes, browser
   automation or HTTP routes.
