import { NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/server/auth/service";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentSessionUser();
  return NextResponse.json({ ok: true, user });
}

