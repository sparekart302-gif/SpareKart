import "server-only";

import type { NextResponse } from "next/server";

const DEFAULT_SLOW_OPERATION_MS = 500;

function shouldLogPerformance() {
  return process.env.NODE_ENV !== "test";
}

export async function measureAsync<T>(
  label: string,
  work: () => Promise<T>,
  options?: {
    slowMs?: number;
    details?: Record<string, unknown>;
  },
) {
  const startedAt = performance.now();
  const result = await work();
  const durationMs = performance.now() - startedAt;
  const slowMs = options?.slowMs ?? DEFAULT_SLOW_OPERATION_MS;

  if (shouldLogPerformance() && durationMs >= slowMs) {
    console.warn(
      `[performance] ${label} took ${durationMs.toFixed(1)}ms`,
      options?.details ?? {},
    );
  }

  return {
    durationMs,
    result,
  };
}

export function appendServerTiming(
  response: NextResponse,
  metrics: {
    name: string;
    durationMs: number;
    description?: string;
  }[],
) {
  if (metrics.length === 0) {
    return response;
  }

  response.headers.set(
    "Server-Timing",
    metrics
      .map((metric) => {
        const parts = [`${metric.name};dur=${metric.durationMs.toFixed(1)}`];

        if (metric.description) {
          parts.push(`desc="${metric.description}"`);
        }

        return parts.join(";");
      })
      .join(", "),
  );

  return response;
}
