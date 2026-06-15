import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.resolve(testDir, "..");

const result = spawnSync("node", [path.join(skillDir, "scripts/validate-skill.mjs")], {
  encoding: "utf8"
});

assert.equal(result.status, 0, result.stderr || result.stdout);
