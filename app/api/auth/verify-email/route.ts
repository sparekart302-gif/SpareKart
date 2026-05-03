import { NextResponse, type NextRequest } from "next/server";
import { jsonAuthError } from "@/server/auth/http";
import { jsonSuccess } from "@/server/http/responses";
import { verifyEmailAddress } from "@/server/auth/service";
import { getAppUrl } from "@/server/config/env";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const email = request.nextUrl.searchParams.get("email");
  const redirectUrl = new URL(getAppUrl("/login"));

  if (!code || !email) {
    redirectUrl.searchParams.set("verified", "missing");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    await verifyEmailAddress({ email, code });
    redirectUrl.searchParams.set("verified", "success");
    return NextResponse.redirect(redirectUrl);
  } catch {
    redirectUrl.searchParams.set("verified", "failed");
    return NextResponse.redirect(redirectUrl);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await verifyEmailAddress(body);
    return jsonSuccess(result, {
      message: "Email verified successfully.",
      extra: result,
    });
  } catch (error) {
    return jsonAuthError(error, "Email verification failed.");
  }
}
