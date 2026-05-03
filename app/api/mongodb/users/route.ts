import type { NextRequest } from "next/server";
import { jsonMongoError, parsePositiveInt } from "@/server/mongodb/http";
import { jsonSuccess } from "@/server/http/responses";
import { requireAdminSessionUser } from "@/server/auth/service";
import {
  createMarketplaceUserAdmin,
  listMarketplaceUsersAdmin,
} from "@/server/marketplace/admin-api";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await requireAdminSessionUser();
    const { searchParams } = request.nextUrl;
    const result = await listMarketplaceUsersAdmin({
      page: parsePositiveInt(searchParams.get("page"), 1),
      limit: parsePositiveInt(searchParams.get("limit"), 20),
      search: searchParams.get("search") ?? undefined,
      role: searchParams.get("role") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });

    return jsonSuccess(result, {
      message: "Users fetched successfully.",
      extra: result,
    });
  } catch (error) {
    return jsonMongoError(error, "Unable to fetch users.");
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminSessionUser();
    const body = await request.json();
    const user = await createMarketplaceUserAdmin(body);
    return jsonSuccess(
      { item: user },
      {
        status: 201,
        message: "User created successfully.",
        extra: {
          item: user,
        },
      },
    );
  } catch (error) {
    return jsonMongoError(error, "Unable to create user.");
  }
}
