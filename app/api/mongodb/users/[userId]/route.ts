import type { NextRequest } from "next/server";
import { jsonMongoError } from "@/server/mongodb/http";
import { jsonSuccess } from "@/server/http/responses";
import { requireAdminSessionUser } from "@/server/auth/service";
import {
  deleteMarketplaceUserAdmin,
  getMarketplaceUserAdmin,
  updateMarketplaceUserAdmin,
} from "@/server/marketplace/admin-api";

export const runtime = "nodejs";

type Params = {
  params: Promise<{
    userId: string;
  }>;
};

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await requireAdminSessionUser();
    const { userId } = await params;
    const user = await getMarketplaceUserAdmin(userId);
    return jsonSuccess(
      { item: user },
      {
        message: "User fetched successfully.",
        extra: {
          item: user,
        },
      },
    );
  } catch (error) {
    return jsonMongoError(error, "Unable to fetch user.");
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireAdminSessionUser();
    const body = await request.json();
    const { userId } = await params;
    const user = await updateMarketplaceUserAdmin(userId, body);
    return jsonSuccess(
      { item: user },
      {
        message: "User updated successfully.",
        extra: {
          item: user,
        },
      },
    );
  } catch (error) {
    return jsonMongoError(error, "Unable to update user.");
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    await requireAdminSessionUser();
    const { userId } = await params;
    const user = await deleteMarketplaceUserAdmin(userId);
    return jsonSuccess(
      { item: user },
      {
        message: "User deleted successfully.",
        extra: {
          item: user,
        },
      },
    );
  } catch (error) {
    return jsonMongoError(error, "Unable to delete user.");
  }
}
