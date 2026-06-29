#!/usr/bin/env node
import { readFileSync } from "node:fs";

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }
  headerFor(url) {
    const host = new URL(url).hostname;
    const pairs = [];
    for (const [key, value] of this.cookies.entries()) {
      const [domain, name] = key.split("|");
      if (host === domain || host.endsWith(`.${domain}`)) pairs.push(`${name}=${value}`);
    }
    return pairs.join("; ");
  }
  storeFromResponse(url, response) {
    const host = new URL(url).hostname;
    const values = setCookieValues(response.headers);
    for (const value of values) {
      const first = value.split(";")[0];
      const separator = first.indexOf("=");
      if (separator <= 0) continue;
      const name = first.slice(0, separator).trim();
      const cookieValue = first.slice(separator + 1).trim();
      this.cookies.set(`${host}|${name}`, cookieValue);
    }
  }
}

const args = parseArgs(process.argv.slice(2));
const host = String(args.host || args.url || "").trim();
const email = String(args.email || "").trim();

if (args["self-test"]) {
  const selfTestJar = new CookieJar();
  print({
    ok: true,
    cookieHeader: selfTestJar.headerFor("https://ctox.dev"),
    next: browserNextStep("https://ctox.dev", "", "https://ninja.ctox.dev"),
  });
  process.exit(0);
}

if (!host) fail("usage: connect-business-os-mcp.mjs --host <host-or-url> [--email <email>] [--tenant-id <id>] [--password-stdin]");

const password = readPassword();
const targetBaseUrl = normalizeBaseUrl(host);
const accountBaseUrl = accountBaseForTarget(targetBaseUrl);
const cookies = new CookieJar();
const evidence = [];

try {
  let authenticated = false;
  if (email && password) {
    if (isCtoxDevAccount(accountBaseUrl)) authenticated = await loginWithCtoxDevPassword(accountBaseUrl, email, password, cookies);
    if (!authenticated) authenticated = await loginWithBusinessOsForm(targetBaseUrl, email, password, cookies);
    if (!authenticated) {
      fail("web_login_failed", {
        targetBaseUrl,
        accountBaseUrl,
        evidence,
        next: browserNextStep(accountBaseUrl, args["tenant-id"], targetBaseUrl),
      });
    }
  }

  const local = await tryLocalConnectInfo(targetBaseUrl, cookies);
  if (local) {
    print({
      ok: true,
      mode: "business_os_connect_info",
      authenticated,
      targetBaseUrl,
      connectInfo: local,
      mcpUrl: local.endpoint || local.managed?.endpoint || null,
      authorizationHeader: local.authorization_header || null,
      managed: local.managed || null,
      evidence,
    });
    process.exit(0);
  }

  const managed = await tryManagedCtoxDevToken(accountBaseUrl, targetBaseUrl, cookies);
  if (managed) {
    print({
      ok: true,
      mode: "managed_ctox_dev",
      authenticated,
      targetBaseUrl,
      accountBaseUrl,
      tenantId: managed.tenantId,
      tenantLabel: managed.tenantLabel,
      mcpUrl: managed.mcpUrl,
      connectUrl: managed.connectUrl,
      token: managed.token.token,
      authorizationHeader: `Bearer ${managed.token.token}`,
      tokenId: managed.token.tokenId,
      expiresAt: managed.token.expiresAt,
      dashboardUrl: managed.dashboardUrl,
      codex: {
        name: managed.serverName,
        url: managed.mcpUrl,
        bearerTokenEnvVar: "CTOX_BUSINESS_OS_MCP_TOKEN",
      },
      claude: {
        name: managed.serverName,
        type: "http",
        url: managed.mcpUrl,
        headers: {
          Authorization: `Bearer ${managed.token.token}`,
        },
      },
      evidence,
    });
    process.exit(0);
  }

  fail("mcp_bootstrap_unavailable", {
    targetBaseUrl,
    accountBaseUrl,
    evidence,
    next: browserNextStep(accountBaseUrl, args["tenant-id"], targetBaseUrl),
  });
} catch (error) {
  fail(error.message || String(error), { targetBaseUrl, accountBaseUrl, evidence });
}

async function loginWithCtoxDevPassword(baseUrl, emailValue, passwordValue, jar) {
  const response = await fetchWithCookies(`${baseUrl}/api/auth/password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: emailValue, password: passwordValue }),
  }, jar);
  const payload = await response.json().catch(() => ({}));
  evidence.push({ step: "ctox_dev_password_login", status: response.status, ok: response.ok && payload.ok === true });
  return response.ok && payload.ok === true;
}

async function loginWithBusinessOsForm(baseUrl, emailValue, passwordValue, jar) {
  const body = new URLSearchParams({ user: emailValue, password: passwordValue });
  const response = await fetchWithCookies(`${baseUrl}/login`, {
    method: "POST",
    headers: {
      "accept": "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
    redirect: "manual",
  }, jar);
  const payload = await response.json().catch(() => ({}));
  evidence.push({ step: "business_os_form_login", status: response.status, ok: response.ok && payload.authenticated === true });
  return response.ok && payload.authenticated === true;
}

async function tryLocalConnectInfo(baseUrl, jar) {
  const response = await fetchWithCookies(`${baseUrl}/api/business-os/mcp/connect-info`, {
    method: "GET",
    headers: { "accept": "application/json" },
  }, jar);
  const payload = await response.json().catch(() => null);
  evidence.push({ step: "business_os_mcp_connect_info", status: response.status, ok: response.ok && payload?.ok === true });
  return response.ok && payload?.ok === true ? payload : null;
}

async function tryManagedCtoxDevToken(accountBaseUrl, targetBaseUrl, jar) {
  const session = await fetchSessionPackage(accountBaseUrl, jar);
  if (!session) return null;
  const tenant = selectTenant(session.account?.tenants || [], targetBaseUrl, args["tenant-id"]);
  if (!tenant) {
    evidence.push({ step: "select_managed_tenant", ok: false, tenantCount: session.account?.tenants?.length || 0 });
    return null;
  }
  evidence.push({ step: "select_managed_tenant", ok: true, tenantId: tenant.id, label: tenant.businessName || tenant.slug || tenant.domain || tenant.id });
  const endpoint = `${accountBaseUrl}/api/instances/${encodeURIComponent(tenant.id)}/managed-mcp`;
  let stateResponse = await fetchWithCookies(endpoint, { method: "GET", headers: { "accept": "application/json" } }, jar);
  let statePayload = await stateResponse.json().catch(() => ({}));
  evidence.push({ step: "managed_mcp_state", status: stateResponse.status, ok: stateResponse.ok && statePayload.ok === true });
  if (!stateResponse.ok || statePayload.migrationPending) return null;

  if (!statePayload.managedMcp?.enabled || statePayload.managedMcp?.emergencyDisabled) {
    const patch = await fetchWithCookies(endpoint, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: true, emergencyDisabled: false }),
    }, jar);
    const patchPayload = await patch.json().catch(() => ({}));
    evidence.push({ step: "managed_mcp_enable", status: patch.status, ok: patch.ok && patchPayload.ok === true });
    if (!patch.ok) return null;
    statePayload = patchPayload;
  }

  const tokenResponse = await fetchWithCookies(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action: "rotate_token",
      label: args.label || "Agent Login Bootstrap",
      expiresInDays: Number(args["expires-in-days"] || 90),
      scopes: {
        allowReads: args["allow-reads"] !== "false",
        allowWrites: args["allow-writes"] === true || args["allow-writes"] === "true",
        allowApprovals: args["allow-approvals"] === true || args["allow-approvals"] === "true",
        allowExternalEffects: false,
      },
    }),
  }, jar);
  const tokenPayload = await tokenResponse.json().catch(() => ({}));
  evidence.push({ step: "managed_mcp_rotate_token", status: tokenResponse.status, ok: tokenResponse.ok && tokenPayload.ok === true && Boolean(tokenPayload.token?.token) });
  if (!tokenResponse.ok || tokenPayload.ok !== true || !tokenPayload.token?.token) return null;
  const state = tokenPayload.managedMcp || statePayload.managedMcp || {};
  return {
    tenantId: tenant.id,
    tenantLabel: state.tenantLabel || tenant.businessName || tenant.slug || tenant.domain || tenant.id,
    mcpUrl: state.mcpUrl,
    connectUrl: state.connectUrl,
    token: tokenPayload.token,
    serverName: `${serverNamePart(tenant.domain || tenant.slug || tenant.id)}-business-os`,
    dashboardUrl: `${accountBaseUrl}/dashboard?tenant=${encodeURIComponent(tenant.id)}#mcp`,
  };
}

async function fetchSessionPackage(baseUrl, jar) {
  const response = await fetchWithCookies(`${baseUrl}/api/desktop/session-package`, {
    method: "GET",
    headers: {
      "accept": "application/json",
      "x-ctox-desktop-client": "ctox-agent-skill",
    },
  }, jar);
  const payload = await response.json().catch(() => null);
  evidence.push({ step: "ctox_dev_session_package", status: response.status, ok: response.ok && Array.isArray(payload?.account?.tenants) });
  return response.ok ? payload : null;
}

function selectTenant(tenants, targetBaseUrl, tenantId) {
  if (tenantId) return tenants.find((tenant) => String(tenant.id) === String(tenantId)) || null;
  const target = new URL(targetBaseUrl);
  const host = target.hostname.toLowerCase();
  const slug = host.endsWith(".ctox.dev") ? host.slice(0, -".ctox.dev".length) : "";
  return tenants.find((tenant) => {
    const values = [
      tenant.id,
      tenant.slug,
      tenant.domain,
      tenant.businessOsUrl,
      tenant.businessName,
    ].filter(Boolean).map((value) => String(value).toLowerCase());
    return values.includes(host) || (slug && values.includes(slug)) || values.some((value) => {
      try { return new URL(value).hostname.toLowerCase() === host; } catch { return false; }
    });
  }) || (tenants.length === 1 ? tenants[0] : null);
}

async function fetchWithCookies(url, options, jar) {
  const headers = new Headers(options.headers || {});
  const cookie = jar.headerFor(url);
  if (cookie) headers.set("cookie", cookie);
  const response = await fetch(url, { ...options, headers });
  jar.storeFromResponse(url, response);
  return response;
}

function readPassword() {
  if (args["password-stdin"]) return readFileSync(0, "utf8").replace(/\r?\n$/, "");
  if (process.env.CTOX_WEB_LOGIN_PASSWORD) return process.env.CTOX_WEB_LOGIN_PASSWORD;
  return "";
}

function normalizeBaseUrl(value) {
  const raw = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  const parsed = new URL(raw);
  parsed.pathname = "";
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

function accountBaseForTarget(baseUrl) {
  const parsed = new URL(baseUrl);
  if (parsed.hostname.endsWith(".ctox.dev") && parsed.hostname !== "ctox.dev") {
    return `${parsed.protocol}//ctox.dev`;
  }
  return baseUrl;
}

function isCtoxDevAccount(baseUrl) {
  return new URL(baseUrl).hostname === "ctox.dev";
}

function browserNextStep(baseUrl, tenantId, targetBaseUrl = "") {
  const tenantLocator = tenantId || tenantLocatorFromTarget(baseUrl, targetBaseUrl);
  return {
    url: `${baseUrl}/dashboard${tenantLocator ? `?tenant=${encodeURIComponent(tenantLocator)}` : ""}#mcp`,
    instruction: "Log in, open the tenant dashboard, switch to MCP, enable Managed MCP, rotate an Agent Token, and copy the one-time token.",
  };
}

function tenantLocatorFromTarget(baseUrl, targetBaseUrl) {
  if (!targetBaseUrl) return "";
  const baseHost = new URL(baseUrl).hostname;
  const targetHost = new URL(targetBaseUrl).hostname;
  if (baseHost !== "ctox.dev" || targetHost === baseHost) return "";
  return targetHost;
}

function serverNamePart(value) {
  return String(value || "ctox").replace(/^https?:\/\//, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "ctox";
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

function setCookieValues(headers) {
  if (typeof headers.getSetCookie === "function") return headers.getSetCookie();
  const raw = headers.get("set-cookie");
  if (!raw) return [];
  return raw.split(/,(?=[^;,]+=)/g);
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function fail(message, details = {}) {
  print({ ok: false, error: message, ...details });
  process.exit(1);
}
