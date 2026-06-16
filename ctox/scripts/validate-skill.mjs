#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const skillDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillPath = path.join(skillDir, "SKILL.md");

const requiredReferences = [
  "references/modes.md",
  "references/install.md",
  "references/business-os-readiness.md",
  "references/managed-gateway.md",
  "references/agent-client-setup.md",
  "references/security-policy.md",
  "references/troubleshooting.md"
];

const requiredPhrases = [
  "ctox-business-os-mcp",
  "ctox.dev",
  "ask the user to choose",
  "RxDB/WebRTC",
  "business_os.status",
  "runtime_unavailable",
  "channel_disabled",
  "permission_denied",
  "response_too_large"
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
  for (const forbidden of forbiddenToolIdeas) {
    if (!skill.includes(forbidden)) {
      errors.push(`SKILL.md must explicitly forbid ${forbidden}`);
    }
  }
}

for (const rel of requiredReferences) {
  if (!fs.existsSync(path.join(skillDir, rel))) {
    errors.push(`missing reference: ${rel}`);
  }
}

for (const rel of ["SKILL.md", "references/agent-client-setup.md"]) {
  const filePath = path.join(skillDir, rel);
  if (!fs.existsSync(filePath)) {
    continue;
  }
  const content = fs.readFileSync(filePath, "utf8");
  for (const forbidden of forbiddenRuntimeInstallCoupling) {
    if (content.includes(forbidden)) {
      errors.push(`${rel} must not hard-code ${forbidden}`);
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
