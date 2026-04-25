import { NextResponse, type NextRequest } from "next/server";
import { jsonMongoError, parsePositiveInt } from "@/server/mongodb/http";
import { createUser, listUsers } from "@/server/mongodb/services/users";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const result = await listUsers({
      page: parsePositiveInt(searchParams.get("page"), 1),
      limit: parsePositiveInt(searchParams.get("limit"), 20),
      search: searchParams.get("search") ?? undefined,
      role: searchParams.get("role") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return jsonMongoError(error, "Unable to fetch users.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const user = await createUser(body);
    return NextResponse.json({ ok: true, item: user }, { status: 201 });
  } catch (error) {
    return jsonMongoError(error, "Unable to create user.");
  }
}
