import { NextResponse, type NextRequest } from "next/server";
import { jsonAuthError } from "@/server/auth/http";
import { requestPasswordReset } from "@/server/auth/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await requestPasswordReset(body);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return jsonAuthError(error, "Password reset request failed.");
  }
}
