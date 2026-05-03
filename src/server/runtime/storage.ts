import "server-only";

import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getRuntimeRoot } from "@/server/config/env";

const writeLocks = new Map<string, Promise<void>>();

async function ensureDir(filePath: string) {
  await mkdir(dirname(filePath), { recursive: true });
}

export async function ensureRuntimeDirectory() {
  const runtimeRoot = getRuntimeRoot();
  await mkdir(runtimeRoot, { recursive: true });
  return runtimeRoot;
}

export function getRuntimeFilePath(...parts: string[]) {
  return join(getRuntimeRoot(), ...parts);
}

export async function probeRuntimeDirectory() {
  const runtimeRoot = await ensureRuntimeDirectory();
  const probeFile = join(runtimeRoot, ".write-probe");

  try {
    await writeFile(probeFile, new Date().toISOString(), "utf8");
    await rm(probeFile, { force: true });

    return {
      ok: true,
      path: runtimeRoot,
    };
  } catch (error) {
    return {
      ok: false,
      path: runtimeRoot,
      error: error instanceof Error ? error.message : "Unknown runtime storage error.",
    };
  }
}

export async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJsonFile<T>(filePath: string, payload: T) {
  await ensureDir(filePath);
  const tempFile = join(
    dirname(filePath),
    `.tmp-${Date.now()}-${Math.random().toString(36).slice(2)}.json`,
  );
  await writeFile(tempFile, JSON.stringify(payload, null, 2), "utf8");
  await rename(tempFile, filePath);
}

export async function updateJsonFile<T>(
  filePath: string,
  fallback: T,
  updater: (current: T) => T | Promise<T>,
) {
  const previousLock = writeLocks.get(filePath) ?? Promise.resolve();
  let release!: () => void;
  const nextLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  writeLocks.set(
    filePath,
    previousLock.then(() => nextLock),
  );

  await previousLock;

  try {
    const current = await readJsonFile(filePath, fallback);
    const updated = await updater(current);
    await writeJsonFile(filePath, updated);
    return updated;
  } finally {
    release();

    if (writeLocks.get(filePath) === nextLock) {
      writeLocks.delete(filePath);
    }
  }
}
