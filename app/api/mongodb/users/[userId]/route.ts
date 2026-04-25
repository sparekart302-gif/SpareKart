import { NextResponse, type NextRequest } from "next/server";
import { jsonMongoError } from "@/server/mongodb/http";
import { deleteUser, getUserById, updateUser } from "@/server/mongodb/services/users";

export const runtime = "nodejs";

type Params = {
  params: Promise<{
    userId: string;
  }>;
};

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { userId } = await params;
    const user = await getUserById(userId);
    return NextResponse.json({ ok: true, item: user });
  } catch (error) {
    return jsonMongoError(error, "Unable to fetch user.");
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const body = await request.json();
    const { userId } = await params;
    const user = await updateUser(userId, body);
    return NextResponse.json({ ok: true, item: user });
  } catch (error) {
    return jsonMongoError(error, "Unable to update user.");
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { userId } = await params;
    const user = await deleteUser(userId);
    return NextResponse.json({ ok: true, item: user });
  } catch (error) {
    return jsonMongoError(error, "Unable to delete user.");
  }
}
