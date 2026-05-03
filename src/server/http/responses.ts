import "server-only";

import { NextResponse } from "next/server";

type JsonExtra = Record<string, unknown>;

export function jsonSuccess<TData>(
  data: TData,
  options?: {
    status?: number;
    message?: string;
    extra?: JsonExtra;
  },
) {
  return NextResponse.json(
    {
      success: true,
      ok: true,
      message: options?.message ?? "Request completed successfully.",
      data,
      ...(options?.extra ?? {}),
    },
    { status: options?.status ?? 200 },
  );
}

export function jsonFailure(
  message: string,
  options?: {
    status?: number;
    code?: string;
    error?: string;
    extra?: JsonExtra;
  },
) {
  return NextResponse.json(
    {
      success: false,
      ok: false,
      message,
      error: options?.error ?? message,
      ...(options?.code ? { code: options.code } : {}),
      ...(options?.extra ?? {}),
    },
    { status: options?.status ?? 400 },
  );
}
