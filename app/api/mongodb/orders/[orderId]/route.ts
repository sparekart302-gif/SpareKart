import type { NextRequest } from "next/server";
import { jsonMongoError } from "@/server/mongodb/http";
import { jsonSuccess } from "@/server/http/responses";
import { requireAdminSessionUser } from "@/server/auth/service";
import {
  assertMarketplaceOrderMutationUnsupported,
  getMarketplaceOrderAdmin,
} from "@/server/marketplace/admin-api";

export const runtime = "nodejs";

type Params = {
  params: Promise<{
    orderId: string;
  }>;
};

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await requireAdminSessionUser();
    const { orderId } = await params;
    const order = await getMarketplaceOrderAdmin(orderId);
    return jsonSuccess(
      { item: order },
      {
        message: "Order fetched successfully.",
        extra: {
          item: order,
        },
      },
    );
  } catch (error) {
    return jsonMongoError(error, "Unable to fetch order.");
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireAdminSessionUser();
    await request.json();
    await params;
    assertMarketplaceOrderMutationUnsupported();
  } catch (error) {
    return jsonMongoError(error, "Unable to update order.");
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    await requireAdminSessionUser();
    await params;
    assertMarketplaceOrderMutationUnsupported();
  } catch (error) {
    return jsonMongoError(error, "Unable to delete order.");
  }
}
