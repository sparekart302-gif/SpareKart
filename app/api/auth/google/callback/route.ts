import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { AuthApiError } from "@/server/auth/errors";
import { getDeviceMeta } from "@/server/auth/http";
import { getPostLoginPath, loginWithGoogleCode } from "@/server/auth/service";
import { getAppUrl } from "@/server/config/env";

export const runtime = "nodejs";

const GOOGLE_STATE_COOKIE = "sparekart_google_oauth_state";

export async function GET(request: NextRequest) {
  const loginUrl = new URL(getAppUrl("/login"));
  const error = request.nextUrl.searchParams.get("error");
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const cookieStore = await cookies();
  const savedState = cookieStore.get(GOOGLE_STATE_COOKIE)?.value;
  cookieStore.delete(GOOGLE_STATE_COOKIE);

  if (error) {
    loginUrl.searchParams.set("oauth", error);
    return NextResponse.redirect(loginUrl);
  }

  if (!code) {
    loginUrl.searchParams.set("oauth", "missing_code");
    return NextResponse.redirect(loginUrl);
  }

  if (!state || !savedState || state !== savedState) {
    loginUrl.searchParams.set("oauth", "invalid_state");
    return NextResponse.redirect(loginUrl);
  }

  try {
    const result = await loginWithGoogleCode(code, getDeviceMeta(request));
    return NextResponse.redirect(new URL(getAppUrl(getPostLoginPath(result.user.role))));
  } catch (error) {
    if (error instanceof AuthApiError) {
      if (error.code === "GOOGLE_AUTH_NOT_CONFIGURED") {
        loginUrl.searchParams.set("oauth", "unavailable");
        return NextResponse.redirect(loginUrl);
      }

      if (error.code === "GOOGLE_EMAIL_NOT_VERIFIED") {
        loginUrl.searchParams.set("oauth", "not_verified");
        return NextResponse.redirect(loginUrl);
      }
    }

    loginUrl.searchParams.set("oauth", "failed");
    return NextResponse.redirect(loginUrl);
  }
}
