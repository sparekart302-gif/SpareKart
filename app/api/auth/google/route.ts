import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { buildGoogleAuthorizationUrl } from "@/server/auth/service";
import { getAppUrl } from "@/server/config/env";
import { createOpaqueToken } from "@/server/auth/session";

export const runtime = "nodejs";

const GOOGLE_STATE_COOKIE = "sparekart_google_oauth_state";

function buildStateCookieOptions() {
  const expires = new Date(Date.now() + 10 * 60 * 1000);

  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  };
}

export async function GET() {
  const redirectUrl = new URL(getAppUrl("/login"));

  try {
    const state = createOpaqueToken();
    const cookieStore = await cookies();
    cookieStore.set(GOOGLE_STATE_COOKIE, state, buildStateCookieOptions());
    return NextResponse.redirect(buildGoogleAuthorizationUrl(state));
  } catch {
    redirectUrl.searchParams.set("oauth", "unavailable");
    return NextResponse.redirect(redirectUrl);
  }
}
