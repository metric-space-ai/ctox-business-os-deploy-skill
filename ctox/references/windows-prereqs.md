# Windows Prerequisites

Use this when installing the CTOX skill on Windows or when the report says
`node` is not on PATH.

The skill folder can be copied without Node.js, but the bundled setup helpers
cannot run. A functional install requires:

- Node.js 18+ on PATH
- npm on PATH
- Claude Code CLI on PATH when `--configure-claude` is requested

Preferred fix from PowerShell inside the installed skill repository:

```powershell
powershell -ExecutionPolicy Bypass -File .\ctox\scripts\install-windows-prereqs.ps1
node .\ctox\scripts\validate-skill.mjs
```

If the skill is already installed under a Claude user skill directory, run the
same script from that installed skill folder.

Manual Node.js LTS install:

```powershell
winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
```

After installing Node.js, refresh PATH by restarting the shell or agent
runtime. A Windows install report is not complete if it only says Node is
missing; that is a blocker unless the user explicitly asked for a copy-only
installation.

Do not install or configure CTOX tokens, ctox.dev coupling, or MCP endpoints
during a skill-only install unless the user explicitly asked to connect an
instance.
