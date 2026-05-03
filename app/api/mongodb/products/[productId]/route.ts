import type { NextRequest } from "next/server";
import { jsonMongoError } from "@/server/mongodb/http";
import { jsonSuccess } from "@/server/http/responses";
import { requireAdminSessionUser } from "@/server/auth/service";
import {
  deleteMarketplaceProductAdmin,
  getMarketplaceProductAdmin,
  updateMarketplaceProductAdmin,
} from "@/server/marketplace/admin-api";

export const runtime = "nodejs";

type Params = {
  params: Promise<{
    productId: string;
  }>;
};

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { productId } = await params;
    const product = await getMarketplaceProductAdmin(productId);
    return jsonSuccess(
      { item: product },
      {
        message: "Product fetched successfully.",
        extra: {
          item: product,
        },
      },
    );
  } catch (error) {
    return jsonMongoError(error, "Unable to fetch product.");
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireAdminSessionUser();
    const body = await request.json();
    const { productId } = await params;
    const product = await updateMarketplaceProductAdmin(productId, body);
    return jsonSuccess(
      { item: product },
      {
        message: "Product updated successfully.",
        extra: {
          item: product,
        },
      },
    );
  } catch (error) {
    return jsonMongoError(error, "Unable to update product.");
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    await requireAdminSessionUser();
    const { productId } = await params;
    const product = await deleteMarketplaceProductAdmin(productId);
    return jsonSuccess(
      { item: product },
      {
        message: "Product deleted successfully.",
        extra: {
          item: product,
        },
      },
    );
  } catch (error) {
    return jsonMongoError(error, "Unable to delete product.");
  }
}
