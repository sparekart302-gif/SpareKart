import type { NextRequest } from "next/server";
import { jsonMongoError, parseBooleanParam, parsePositiveInt } from "@/server/mongodb/http";
import { jsonSuccess } from "@/server/http/responses";
import { requireAdminSessionUser } from "@/server/auth/service";
import {
  createMarketplaceProductAdmin,
  listMarketplaceProductsAdmin,
} from "@/server/marketplace/admin-api";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const result = await listMarketplaceProductsAdmin({
      page: parsePositiveInt(searchParams.get("page"), 1),
      limit: parsePositiveInt(searchParams.get("limit"), 20),
      search: searchParams.get("search") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      sellerSlug: searchParams.get("sellerSlug") ?? undefined,
      isActive: parseBooleanParam(searchParams.get("isActive")),
    });

    return jsonSuccess(result, {
      message: "Products fetched successfully.",
      extra: result,
    });
  } catch (error) {
    return jsonMongoError(error, "Unable to fetch products.");
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminSessionUser();
    const body = await request.json();
    const product = await createMarketplaceProductAdmin(body);
    return jsonSuccess(
      { item: product },
      {
        status: 201,
        message: "Product created successfully.",
        extra: {
          item: product,
        },
      },
    );
  } catch (error) {
    return jsonMongoError(error, "Unable to create product.");
  }
}
