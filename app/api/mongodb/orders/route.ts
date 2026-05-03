import type { NextRequest } from "next/server";
import { jsonMongoError, parseBooleanParam, parsePositiveInt } from "@/server/mongodb/http";
import { jsonSuccess } from "@/server/http/responses";
import { requireAdminSessionUser } from "@/server/auth/service";
import {
  assertMarketplaceOrderMutationUnsupported,
  listMarketplaceOrdersAdmin,
} from "@/server/marketplace/admin-api";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await requireAdminSessionUser();
    const { searchParams } = request.nextUrl;
    const result = await listMarketplaceOrdersAdmin({
      page: parsePositiveInt(searchParams.get("page"), 1),
      limit: parsePositiveInt(searchParams.get("limit"), 20),
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      paymentStatus: searchParams.get("paymentStatus") ?? undefined,
      paymentMethod: searchParams.get("paymentMethod") ?? undefined,
      isGuest: parseBooleanParam(searchParams.get("isGuest")),
    });

    return jsonSuccess(result, {
      message: "Orders fetched successfully.",
      extra: result,
    });
  } catch (error) {
    return jsonMongoError(error, "Unable to fetch orders.");
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminSessionUser();
    await request.json();
    assertMarketplaceOrderMutationUnsupported();
  } catch (error) {
    return jsonMongoError(error, "Unable to create order.");
  }
}
