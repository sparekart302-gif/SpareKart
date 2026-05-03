import type { NextRequest } from "next/server";
import { getDeviceMeta, jsonAuthError } from "@/server/auth/http";
import { jsonSuccess } from "@/server/http/responses";
import { confirmPasswordReset } from "@/server/auth/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await confirmPasswordReset(body, getDeviceMeta(request));
    return jsonSuccess(result, {
      message: "Password reset successful.",
      extra: result,
    });
  } catch (error) {
    return jsonAuthError(error, "Password reset failed.");
  }
}
