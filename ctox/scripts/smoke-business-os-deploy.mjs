#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const args = parseArgs(process.argv.slice(2));

const ctoxBin = args["ctox-bin"] || "ctox";
const instanceId = args["instance-id"] || "";
const gatewayBase = trimTrailingSlash(args["gateway-base"] || "https://mcp.ctox.dev");
const expectConnected = args["expect-connected"] === true || args["expect-connected"] === "true";
const gatewayToken = args["gateway-token"] || process.env.CTOX_BUSINESS_OS_MCP_GATEWAY_TOKEN || "";

const checks = [];

runCheck("ctox status", [ctoxBin, "status"]);
runCheck("business-os status", [ctoxBin, "business-os", "status"]);
runCheck("business-os peer status", [ctoxBin, "business-os", "peer", "status"]);
runCheck("business-os mcp status", [ctoxBin, "business-os", "mcp", "status"]);
runCheck("business-os mcp tools", [ctoxBin, "business-os", "mcp", "tools"], {
  parseJson: true,
  validate(value) {
    const tools = value?.tools || [];
    if (!Array.isArray(tools) || !tools.some((tool) => tool.name === "business_os.status")) {
      throw new Error("business_os.status tool not found");
    }
  }
});

if (instanceId) {
  const statusArgs = [
    ctoxBin,
    "business-os",
    "mcp",
    "gateway-status",
    "--url",
    `${gatewayBase}/status/${instanceId}`
  ];
  if (gatewayToken) {
    statusArgs.push("--token", gatewayToken);
  }
  runCheck("managed gateway status", statusArgs, {
    parseJson: true,
    validate(value) {
      if (value?.ok !== true) {
        throw new Error("gateway status did not return ok=true");
      }
      if (expectConnected && value?.connected !== true) {
        throw new Error("expected connected gateway session");
      }
    }
  });
}

const failed = checks.filter((check) => !check.ok);
console.log(JSON.stringify({ ok: failed.length === 0, checks }, null, 2));
process.exit(failed.length === 0 ? 0 : 1);

function runCheck(name, command, options = {}) {
  const [bin, ...cmdArgs] = command;
  const result = spawnSync(bin, cmdArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const check = {
    name,
    command: command.join(" "),
    ok: result.status === 0,
    status: result.status,
    stderr: trimOutput(result.stderr)
  };
  try {
    if (result.status !== 0) {
      throw new Error(check.stderr || "command failed");
    }
    if (options.parseJson) {
      const parsed = JSON.parse(result.stdout || "{}");
      options.validate?.(parsed);
    }
  } catch (error) {
    check.ok = false;
    check.error = error.message;
  }
  checks.push(check);
}

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      continue;
    }
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
      continue;
    }
    parsed[key] = next;
    i += 1;
  }
  return parsed;
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function trimOutput(value) {
  const text = (value || "").trim();
  return text.length > 1000 ? `${text.slice(0, 1000)}...` : text;
}
