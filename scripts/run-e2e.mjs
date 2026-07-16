import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

const port = process.env.E2E_PORT ?? "3100";
const baseUrl = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;
const serverReadyTimeoutMs = 120_000;
const nextCli = "node_modules/next/dist/bin/next";
const playwrightCli = "node_modules/@playwright/test/cli.js";

function readLocalPublicSupabaseUrl() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return process.env.NEXT_PUBLIC_SUPABASE_URL;
  }

  try {
    const envFile = readFileSync(".env.local", "utf8");
    const match = envFile.match(/^NEXT_PUBLIC_SUPABASE_URL=(.+)$/m);
    return match?.[1]?.trim().replace(/^['"]|['"]$/g, "");
  } catch {
    return undefined;
  }
}

function getProjectRef(rawUrl) {
  if (!rawUrl) return undefined;

  try {
    const hostname = new URL(rawUrl).hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") return "local";
    return hostname.endsWith(".supabase.co")
      ? hostname.slice(0, -".supabase.co".length)
      : undefined;
  } catch {
    return undefined;
  }
}

const activeProjectRef = getProjectRef(readLocalPublicSupabaseUrl());
if (activeProjectRef) {
  process.env.E2E_ACTIVE_SUPABASE_PROJECT_REF = activeProjectRef;
}
process.env.E2E_BASE_URL = baseUrl;

async function isReady() {
  try {
    const response = await fetch(baseUrl, { cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer() {
  const startedAt = Date.now();

  while (Date.now() - startedAt < serverReadyTimeoutMs) {
    if (await isReady()) return;
    await delay(500);
  }

  throw new Error(`Timed out waiting for ${baseUrl}`);
}

function stopServer(server) {
  if (!server || server.exitCode !== null) return;

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], {
      stdio: "ignore",
    });
    return;
  }

  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    server.kill("SIGTERM");
  }
}

function run(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false,
      ...options,
    });

    child.on("exit", (code, signal) => {
      resolve({ code: code ?? 1, signal });
    });
  });
}

let server;

try {
  if (await isReady()) {
    if (process.env.E2E_REUSE_SERVER !== "true") {
      throw new Error(
        `${baseUrl} is already in use. Stop that process or set E2E_REUSE_SERVER=true only after verifying its environment.`,
      );
    }
  } else {
    server = spawn(
      process.execPath,
      [nextCli, "start", "--hostname", "localhost", "--port", port],
      {
        cwd: process.cwd(),
        detached: process.platform !== "win32",
        env: process.env,
        stdio: "inherit",
      },
    );
    await waitForServer();
  }

  const result = await run(process.execPath, [
    playwrightCli,
    "test",
    ...process.argv.slice(2),
  ]);
  process.exitCode = result.code;
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  stopServer(server);
  process.exit(process.exitCode ?? 0);
}
