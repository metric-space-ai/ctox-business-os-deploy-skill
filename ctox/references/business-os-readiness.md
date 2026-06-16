# Business OS Readiness

A loaded page is not readiness. Business OS is ready when the CTOX daemon,
native RxDB peer, and typed MCP channel are healthy.

Run:

```bash
ctox status
ctox business-os status
ctox business-os peer status
ctox business-os mcp status
ctox business-os mcp tools
```

For public or managed web surfaces, also verify:

- `/api/business-os/status` reports the native RxDB peer and required SQLite
  collections as healthy.
- `/.well-known/ctox-business-os.json` keeps:
  - `httpDataProxy:false`
  - `businessDataPath:"rxdb-webrtc"`

For private or NAT installs, verify the launch config or ctox.dev-generated
ICE list has credentialed TURN. STUN-only or naked `turn:` URLs are diagnostic
states, not production closure.

## Data Boundary

These records must never be bridged through HTTP:

- Business OS collections and module runtime data
- `business_commands`
- `ctox_queue_tasks`
- `desktop_files`
- `desktop_file_chunks`
- module manifests
- native runtime status

They replicate over RxDB/WebRTC and remain in CTOX-controlled local state.
