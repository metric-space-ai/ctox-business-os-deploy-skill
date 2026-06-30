#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const skillDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillPath = path.join(skillDir, "SKILL.md");

const requiredReferences = [
  "references/modes.md",
  "references/install.md",
  "references/business-os-readiness.md",
  "references/managed-gateway.md",
  "references/agent-client-setup.md",
  "references/windows-prereqs.md",
  "references/capabilities-and-rights.md",
  "references/roles-and-permissions.md",
  "references/security-policy.md",
  "references/troubleshooting.md"
];

const requiredPhrases = [
  "Use this skill as the interface between any coding agent and a CTOX instance",
  "every normal `/ctox ...` request targets a",
  "SSH plus the CTOX CLI",
  "Task delegation",
  "ctox-business-os-mcp",
  "business-os-app-module-development",
  "ctox.dev",
  "ask the user to choose",
  "RxDB/WebRTC",
  "Business OS access is two-layered",
  "apps.view",
  "data.read",
  "data.write",
  "apps.modify",
  "mcp.manage",
  "external.approve",
  "exact grants",
  "capabilities-and-rights.md",
  "CtoxTaskCreate",
  "0.x.y",
  "1.0.0",
  "business_os_policy",
  "business_os.status",
  "business_os.list_runs",
  "active work",
  "current coding-agent session",
  "Node.js 18+",
  "windows-prereqs.md",
  "install-windows-prereqs.ps1",
  "https://metric-space-ai.github.io/ctox/cli.html",
  "ctox status --json",
  "runtime_unavailable",
  "channel_disabled",
  "permission_denied",
  "response_too_large"
];

const requiredScriptFiles = [
  "scripts/connect-business-os-mcp.mjs"
];

const requiredWindowsPrereqFiles = [
  "scripts/install-windows-prereqs.ps1"
];

const requiredCredentialBootstrapPhrases = [
  "Credential Bootstrap",
  "connect-business-os-mcp.mjs",
  "--password-stdin",
  "--profile app-dev",
  "--configure-claude",
  "claude mcp add --transport http",
  "/api/desktop/session-package",
  "/api/instances/<tenant-id>/managed-mcp",
  "/api/business-os/mcp/connect-info",
  "Token rotieren",
  "Neuer Token"
];

const forbiddenToolIdeas = [
  "execute_raw_business_command",
  "push_rxdb_record",
  "remote_control_browser",
  "write_sql"
];

const runtimeName = ["co", "dex"].join("");
const forbiddenRuntimeInstallCoupling = [
  `~/.${runtimeName}`,
  ["install", "skill", "from", "github.py"].join("-"),
  `python3 ~/.${runtimeName}`
];

const forbiddenHardcodedIntentExamples = [
  "was machst du gerade"
];

const errors = [];

if (!fs.existsSync(skillPath)) {
  errors.push("missing SKILL.md");
} else {
  const skill = fs.readFileSync(skillPath, "utf8");
  if (!skill.startsWith("---\n")) {
    errors.push("SKILL.md must start with YAML frontmatter");
  }
  if (path.basename(skillDir) !== "ctox") {
    errors.push("installable skill folder must be named ctox");
  }
  if (!/^name:\s*ctox\s*$/m.test(skill)) {
    errors.push("SKILL.md frontmatter name must be ctox");
  }
  for (const phrase of requiredPhrases) {
    if (!skill.includes(phrase)) {
      errors.push(`SKILL.md missing required phrase: ${phrase}`);
    }
  }
  for (const phrase of requiredCredentialBootstrapPhrases) {
    if (!skill.includes(phrase)) {
      errors.push(`SKILL.md missing credential bootstrap phrase: ${phrase}`);
    }
  }
  for (const forbidden of forbiddenToolIdeas) {
    if (!skill.includes(forbidden)) {
      errors.push(`SKILL.md must explicitly forbid ${forbidden}`);
    }
  }
  for (const forbidden of forbiddenHardcodedIntentExamples) {
    if (skill.toLowerCase().includes(forbidden)) {
      errors.push(`SKILL.md must not hard-code the status intent phrase: ${forbidden}`);
    }
  }
}

for (const rel of requiredReferences) {
  if (!fs.existsSync(path.join(skillDir, rel))) {
    errors.push(`missing reference: ${rel}`);
  }
}

for (const rel of requiredScriptFiles) {
  const scriptPath = path.join(skillDir, rel);
  if (!fs.existsSync(scriptPath)) {
    errors.push(`missing script: ${rel}`);
    continue;
  }
  const syntax = spawnSync(process.execPath, ["--check", scriptPath], { encoding: "utf8" });
  if (syntax.status !== 0) {
    errors.push(`${rel} failed node --check: ${syntax.stderr || syntax.stdout}`);
  }
  const selfTest = spawnSync(process.execPath, [scriptPath, "--self-test"], { encoding: "utf8" });
  if (
    selfTest.status !== 0
    || !selfTest.stdout.includes("https://ctox.dev/dashboard?tenant=ninja.ctox.dev#mcp")
    || !selfTest.stdout.includes("\"profile\": \"app-dev\"")
    || !selfTest.stdout.includes("\"allowWrites\": true")
    || !selfTest.stdout.includes("\"allowExternalEffects\": false")
  ) {
    errors.push(`${rel} failed self-test: ${selfTest.stderr || selfTest.stdout}`);
  }
}

for (const rel of requiredWindowsPrereqFiles) {
  const scriptPath = path.join(skillDir, rel);
  if (!fs.existsSync(scriptPath)) {
    errors.push(`missing Windows prerequisite script: ${rel}`);
    continue;
  }
  const content = fs.readFileSync(scriptPath, "utf8");
  for (const phrase of ["OpenJS.NodeJS.LTS", "Node.js 18+", "winget install"]) {
    if (!content.includes(phrase)) {
      errors.push(`${rel} missing Windows prerequisite phrase: ${phrase}`);
    }
  }
}

for (const rel of ["SKILL.md", "references/agent-client-setup.md"]) {
  const filePath = path.join(skillDir, rel);
  if (!fs.existsSync(filePath)) {
    continue;
  }
  const content = fs.readFileSync(filePath, "utf8");
  for (const phrase of requiredCredentialBootstrapPhrases.filter((value) => value !== "Credential Bootstrap")) {
    if (!content.includes(phrase)) {
      errors.push(`${rel} missing credential bootstrap phrase: ${phrase}`);
    }
  }
  for (const forbidden of forbiddenRuntimeInstallCoupling) {
    if (content.includes(forbidden)) {
      errors.push(`${rel} must not hard-code ${forbidden}`);
    }
  }
}

for (const rel of ["SKILL.md", "references/install.md", "references/windows-prereqs.md"]) {
  const filePath = path.join(skillDir, rel);
  if (!fs.existsSync(filePath)) {
    continue;
  }
  const content = fs.readFileSync(filePath, "utf8");
  for (const phrase of ["Node.js 18+", "install-windows-prereqs.ps1", "OpenJS.NodeJS.LTS"]) {
    if (!content.includes(phrase)) {
      errors.push(`${rel} missing Windows prerequisite phrase: ${phrase}`);
    }
  }
}

if (errors.length) {
  for (const error of errors) {
    console.error(`fail ${error}`);
  }
  process.exit(1);
}

console.log("ok ctox skill structure");
