import type { NextRequest } from "next/server";
import { jsonAuthError } from "@/server/auth/http";
import { jsonSuccess } from "@/server/http/responses";
import { signupWithEmailPassword } from "@/server/auth/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await signupWithEmailPassword(body);
    return jsonSuccess(result, {
      status: 201,
      message: "Account created. Verify the email address to continue.",
      extra: result,
    });
  } catch (error) {
    return jsonAuthError(error, "Signup failed.");
  }
}
