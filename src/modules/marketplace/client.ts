"use client";

import type { CartLine, MarketplaceState } from "./types";

type JsonResponse<T> = {
  ok: boolean;
  success?: boolean;
  message?: string;
  error?: string;
  code?: string;
  data: T;
};

export class MarketplaceApiError extends Error {
  status: number;
  code?: string;
  payload?: Record<string, unknown>;

  constructor(
    message: string,
    options?: {
      status?: number;
      code?: string;
      payload?: Record<string, unknown>;
    },
  ) {
    super(message);
    this.name = "MarketplaceApiError";
    this.status = options?.status ?? 400;
    this.code = options?.code;
    this.payload = options?.payload;
  }
}

async function requestJson<T>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, init);
  const payload = (await response.json()) as JsonResponse<T>;

  if (!response.ok || !payload.ok || payload.success === false) {
    throw new MarketplaceApiError(payload.error ?? payload.message ?? "Request failed.", {
      status: response.status,
      code: payload.code,
      payload: payload as Record<string, unknown>,
    });
  }

  return payload.data;
}

export async function fetchMarketplaceState() {
  return requestJson<{
    state: MarketplaceState;
    authenticated: boolean;
  }>("/api/marketplace/state", {
    method: "GET",
    cache: "no-store",
    credentials: "include",
  });
}

export async function runMarketplaceCommand(input: {
  command: string;
  payload?: unknown;
  guestCart?: CartLine[];
  guestCouponCode?: string;
}) {
  return requestJson<{
    state: MarketplaceState;
    result: Record<string, unknown>;
  }>("/api/marketplace/command", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
}
