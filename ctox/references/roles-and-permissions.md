# Roles And Permissions For Remote Agents

Remote-agent access has two independent gates:

1. MCP channel policy lets an actor reach the typed Business OS MCP channel.
2. Business OS policy decides what that actor can see or do inside the
   workspace.

Never treat a bearer token, gateway connection, `--allow-actor`,
`--allow-module`, or `--allow-collection` as a product permission grant. Those
settings only constrain the transport channel.

## Roles

Use the business labels with operators, and the stored role names when checking
policy or audit output:

| Business label | Stored role | Remote-agent meaning |
| --- | --- | --- |
| Owner | `chef` | Workspace owner. Do not use for routine remote agents. |
| Admin | `admin` | Operations/admin actor. Use only for setup or trusted operations. |
| App-Verantwortliche:r | `founder` | Builder for assigned apps. Good default for app-building agents scoped to specific apps. |
| Teammitglied | `user` | Default team/service actor. Can create CTOX tasks by default; needs exact grants for reads, writes, status, private app visibility, app changes, or approvals. |

Compatibility aliases such as `owner` and `team` may be accepted by CTOX, but
persisted roles normalize to `chef/admin/founder/user`.

Unknown or unpersisted MCP actors also resolve to `user`. Persist production
actors or grant exact permissions to stable service actor ids; do not expect a
remote MCP actor to inherit the local developer's admin session.

## App Lifecycle Visibility

App visibility is evaluated before data access:

| App state | Version/audience rule | Default remote-agent visibility |
| --- | --- | --- |
| Privat | `0.x.y`, missing version, or invalid SemVer | Creator/responsible users and explicit `apps.view` grants only. |
| Vorschau | preview audience | Explicit preview/app visibility users and app managers only. |
| Team | `1.0.0+` without restriction | Team-visible by default. |
| Eingeschraenkt | released but restricted audience | Selected audience and app managers only. |

Important consequences:

- A new or modified runtime app normally starts as `0.x.y` and remains private.
- Releasing to `1.0.0+` makes the app team-visible unless it is restricted.
- `data.read` or `data.write` must not make a private app visible.
- `apps.view` lets an actor see or link the app; it does not expose records.
- Preview/restricted audience does not grant source, edit, release, rollback,
  or data access by itself.

## Permission Mapping For MCP Tools

Use this mapping when creating a remote-agent persona:

| MCP tool/use | Business OS permission needed |
| --- | --- |
| `business_os.status`, `business_os.list_mcp_activity` | `mcp.manage` on `business_os_mcp`, or admin/owner role. |
| `business_os.list_modules` | Filters modules by app visibility. Public/team apps are visible; private/preview/restricted apps need `apps.view`. |
| `business_os.open_link` for a module | `apps.view` for private/preview/restricted modules. |
| `business_os.get_module`, `business_os.list_entities`, `business_os.list_module_actions`, `business_os.propose_action` | App visibility first, then `data.read` on the module. |
| `business_os.query_records`, `business_os.search_records`, `business_os.get_record_context`, `business_os.list_record_activity` | `data.read` on the collection or on a module that owns that collection. |
| `business_os.get_record` | Exact `data.read` on the record, collection, or owning module. Exact record grants do not allow collection listing. |
| `business_os.execute_action` | App visibility first, then `data.write` on the module. Risky actions may still require confirmation. |
| `business_os.create_app` | `apps.install` for the target module id. Newly created apps stay private until release. |
| `business_os.modify_app` | `apps.modify` for the module. |
| `business_os.get_command_status` | `data.read` on `business_commands`. |
| `business_os.approve`, `business_os.reject`, `business_os.request_changes` | Exact or scoped `external.approve`; `approve` is an external-effect class and also needs external effects enabled by policy. |

The server returns `permission_denied` with field `business_os_policy` when
the channel is open but the actor lacks the Business OS role or grant.

## Recommended Agent Personas

Prefer service actors with narrow grants over shared human admin tokens:

| Persona | Stored role | Grants/scope |
| --- | --- | --- |
| Read/report agent | `user` | `mcp.manage` only if it must call status; `apps.view` for private apps; `data.read` on exact modules, collections, or records. |
| App builder agent | `founder` | Assign to the app module, or grant `apps.modify`; add `apps.install` only if it may create apps. |
| Workflow/task agent | `user` | `data.read` and `data.write` only on the modules it automates. |
| Approval assistant | `user` or `admin` | Prefer exact `external.approve` on approvals; leave external effects disabled unless the operator has explicitly accepted that risk. |
| Setup operator | `admin` | Temporary deployment/setup use only; remove broad access after verification. |

Avoid routine `chef`/Owner credentials for remote agents. Owner should remain a
human accountability role.

## Deployment Checklist

Before giving a remote agent access:

1. Choose the actor id, for example `chatgpt:support-reader` or
   `service:crm-agent`.
2. Decide whether the actor is a persisted Business OS user or an unpersisted
   service actor with explicit grants.
3. Configure MCP channel policy with actor, workspace, modules, collections,
   denied tools, rate limit, audit retention, and external effects.
4. Configure Business OS roles or explicit grants in the Business OS governance
   surface or existing native grant-management path.
5. Test at least one allowed read/action through the same remote endpoint.
6. Test at least one denied module or collection and confirm
   `permission_denied` with `business_os_policy` or the relevant MCP policy
   field.
7. Inspect MCP audit activity and report request IDs/event IDs.

Do not work around a denial through shell, SQL, raw RxDB writes, browser
automation, or HTTP routes.
