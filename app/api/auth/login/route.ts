import type { NextRequest } from "next/server";
import { getDeviceMeta, jsonAuthError } from "@/server/auth/http";
import { jsonSuccess } from "@/server/http/responses";
import { loginWithEmailPassword } from "@/server/auth/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await loginWithEmailPassword(body, getDeviceMeta(request));
    return jsonSuccess(result, {
      message: "Login successful.",
      extra: result,
    });
  } catch (error) {
    return jsonAuthError(error, "Login failed.");
  }
}
