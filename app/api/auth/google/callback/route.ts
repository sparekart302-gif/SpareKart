import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { AuthApiError } from "@/server/auth/errors";
import { getDeviceMeta } from "@/server/auth/http";
import { getPostLoginPath, loginWithGoogleCode } from "@/server/auth/service";
import {
  getRequestAppUrl,
  getServerEnv,
  resolveRequestPublicSiteUrl,
} from "@/server/config/env";

export const runtime = "nodejs";

const GOOGLE_STATE_COOKIE = "sparekart_google_oauth_state";

export async function GET(request: NextRequest) {
  const authSiteUrl = resolveRequestPublicSiteUrl(request);
  const callbackUrl = getRequestAppUrl("/api/auth/google/callback", request);
  const loginUrl = new URL(getRequestAppUrl("/login", request));
  const error = request.nextUrl.searchParams.get("error");
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const cookieStore = await cookies();
  const savedState = cookieStore.get(GOOGLE_STATE_COOKIE)?.value;
  const env = getServerEnv();
  cookieStore.set(GOOGLE_STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
    ...(env.cookieDomain ? { domain: env.cookieDomain } : {}),
  });
  console.info(
    `[auth] Google callback received on ${authSiteUrl}. hasCode=${Boolean(code)} hasState=${Boolean(state)} error=${error ?? "none"}`,
  );

  if (error) {
    loginUrl.searchParams.set("oauth", error);
    loginUrl.searchParams.set("error", "google_oauth_failed");
    return NextResponse.redirect(loginUrl);
  }

  if (!code) {
    loginUrl.searchParams.set("oauth", "missing_code");
    loginUrl.searchParams.set("error", "google_oauth_failed");
    return NextResponse.redirect(loginUrl);
  }

  if (!state || !savedState || state !== savedState) {
    console.warn(
      `[auth] Google callback state mismatch on ${authSiteUrl}. savedStatePresent=${Boolean(savedState)}`,
    );
    loginUrl.searchParams.set("oauth", "invalid_state");
    loginUrl.searchParams.set("error", "google_oauth_failed");
    return NextResponse.redirect(loginUrl);
  }

  try {
    const result = await loginWithGoogleCode(code, getDeviceMeta(request), {
      redirectUri: callbackUrl,
      authSiteUrl,
    });
    const destination = getRequestAppUrl(getPostLoginPath(result.user.role), request);
    console.info(
      `[auth] Google callback succeeded for ${result.user.email}. redirecting to ${destination}`,
    );
    return NextResponse.redirect(new URL(destination));
  } catch (error) {
    console.error(
      `[auth] Google callback failed on ${authSiteUrl}: ${error instanceof Error ? error.message : "unknown error"}`,
    );
    if (error instanceof AuthApiError) {
      if (error.code === "GOOGLE_AUTH_NOT_CONFIGURED") {
        loginUrl.searchParams.set("oauth", "unavailable");
        loginUrl.searchParams.set("error", "google_oauth_failed");
        return NextResponse.redirect(loginUrl);
      }

      if (error.code === "GOOGLE_EMAIL_NOT_VERIFIED") {
        loginUrl.searchParams.set("oauth", "not_verified");
        loginUrl.searchParams.set("error", "google_oauth_failed");
        return NextResponse.redirect(loginUrl);
      }
    }

    loginUrl.searchParams.set("oauth", "failed");
    loginUrl.searchParams.set("error", "google_oauth_failed");
    return NextResponse.redirect(loginUrl);
  }
}
