# CTOX Install

Install CTOX with the official installer unless an existing managed install is
already present.

```bash
curl -fsSL https://raw.githubusercontent.com/metric-space-ai/ctox/main/install.sh | bash
```

Then verify:

```bash
ctox doctor
ctox version
ctox start
ctox status
```

## Windows Skill Prerequisites

Installing the skill folder alone is not enough when the agent must run the
bundled setup helpers. The helpers are Node ESM scripts and require Node.js 18+
on PATH.

On Windows, if `node` is missing, install Node.js LTS before reporting the
skill as functional:

```powershell
powershell -ExecutionPolicy Bypass -File .\ctox\scripts\install-windows-prereqs.ps1
node .\ctox\scripts\validate-skill.mjs
```

Fallback:

```powershell
winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
```

Restart the shell or agent runtime after installing Node.js so PATH refreshes.
If Node cannot be installed, report that as a blocker, not as a verified
functional install.

Before configuring Business OS MCP, inspect the target:

```bash
uname -a
ctox status
ctox business-os status
ctox business-os peer status
```

Use the target facts to recommend managed ctox.dev, local developer mode, or
self-hosted mode, then ask the user to choose before coupling the instance.

Do not pass installer flags unless the host needs an explicit backend,
installation root, state root, cache root, or first-boot API provider.

Most runtime configuration should be stored through CTOX settings, the TUI, or
`ctox secret`, not through persistent shell exports.

## API-backed First Boot

For remote-model setups:

```bash
ctox secret put --scope credentials --name OPENAI_API_KEY --value "<token>"
ctox
```

Configure provider/model in the TUI unless the operator gives explicit scripted
runtime instructions.

## Business OS Standalone App Repo

`ctox business-os install --target <empty-dir> [--init-git]` installs a
standalone Business OS app repository. This is not the same as installing CTOX
itself and is not required for MCP remote control.
