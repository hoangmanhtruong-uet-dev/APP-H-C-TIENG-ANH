import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const baseUrl = "http://localhost:3000";
const serverReadyTimeoutMs = 120_000;
const nextCli = "node_modules/next/dist/bin/next";
const playwrightCli = "node_modules/@playwright/test/cli.js";

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
  if (!(await isReady())) {
    server = spawn(
      process.execPath,
      [nextCli, "dev", "--hostname", "localhost", "--port", "3000"],
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
