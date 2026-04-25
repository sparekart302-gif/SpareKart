import { NextResponse } from "next/server";
import { logoutCurrentSession } from "@/server/auth/service";

export const runtime = "nodejs";

export async function POST() {
  await logoutCurrentSession();
  return NextResponse.json({ ok: true });
}

