import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";

loadDotenv({ quiet: true });

function readFlag(flagName) {
  const index = process.argv.indexOf(flagName);

  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

const standaloneEntry = resolve(process.cwd(), ".next/standalone/server.js");

if (!existsSync(standaloneEntry)) {
  console.error("Missing .next/standalone/server.js. Run `npm run build` before `npm run start`.");
  process.exit(1);
}

const port = readFlag("--port") ?? process.env.PORT ?? "3000";
const hostname = readFlag("--hostname") ?? process.env.HOSTNAME ?? "0.0.0.0";
const runtimeDir =
  process.env.SPAREKART_RUNTIME_DIR ?? resolve(process.cwd(), ".sparekart-runtime");

const child = spawn(process.execPath, [standaloneEntry], {
  stdio: "inherit",
  env: {
    ...process.env,
    PORT: String(port),
    HOSTNAME: String(hostname),
    SPAREKART_RUNTIME_DIR: runtimeDir,
    SPAREKART_APP_ROOT: process.cwd(),
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
