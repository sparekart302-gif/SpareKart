import { spawn } from "node:child_process";
import { cpSync, existsSync, mkdirSync, symlinkSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { config as loadDotenv } from "dotenv";

loadDotenv({ quiet: true });

function readFlag(flagName) {
  const index = process.argv.indexOf(flagName);

  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

function ensureRuntimeDirectory(sourceDir, targetDir, label) {
  if (!existsSync(sourceDir) || existsSync(targetDir)) {
    return;
  }

  mkdirSync(dirname(targetDir), { recursive: true });

  try {
    const relativeSource = relative(dirname(targetDir), sourceDir);
    symlinkSync(relativeSource, targetDir, "dir");
    console.info(`[start] linked ${label}: ${targetDir} -> ${sourceDir}`);
  } catch (error) {
    cpSync(sourceDir, targetDir, {
      recursive: true,
      force: true,
    });
    console.info(`[start] copied ${label}: ${sourceDir} -> ${targetDir}`);
  }
}

const standaloneEntry = resolve(process.cwd(), ".next/standalone/server.js");
const standaloneRoot = resolve(process.cwd(), ".next/standalone");
const projectStaticRoot = resolve(process.cwd(), ".next/static");
const standaloneStaticRoot = resolve(standaloneRoot, ".next/static");
const projectPublicRoot = resolve(process.cwd(), "public");
const standalonePublicRoot = resolve(standaloneRoot, "public");

if (!existsSync(standaloneEntry)) {
  console.error("Missing .next/standalone/server.js. Run `npm run build` before `npm run start`.");
  process.exit(1);
}

ensureRuntimeDirectory(projectStaticRoot, standaloneStaticRoot, "Next static assets");
ensureRuntimeDirectory(projectPublicRoot, standalonePublicRoot, "public assets");

const port = readFlag("--port") ?? process.env.PORT ?? "3000";
const isHostedRuntime = Boolean(process.env.RENDER || process.env.PORT);
const hostname =
  readFlag("--hostname") ??
  process.env.SPAREKART_HOST ??
  process.env.HOST ??
  (isHostedRuntime ? "0.0.0.0" : process.env.HOSTNAME ?? "0.0.0.0");
const runtimeDir =
  process.env.SPAREKART_RUNTIME_DIR ?? resolve(process.cwd(), ".sparekart-runtime");

console.info("[start] Launching SpareKart production server");
console.info(`[start] NODE_ENV=${process.env.NODE_ENV ?? "development"}`);
console.info(`[start] host=${hostname}`);
console.info(`[start] port=${port}`);

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
