import { NextResponse, type NextRequest } from "next/server";
import { jsonMongoError, parseBooleanParam, parsePositiveInt } from "@/server/mongodb/http";
import { createOrder, listOrders } from "@/server/mongodb/services/orders";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const result = await listOrders({
      page: parsePositiveInt(searchParams.get("page"), 1),
      limit: parsePositiveInt(searchParams.get("limit"), 20),
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      paymentStatus: searchParams.get("paymentStatus") ?? undefined,
      paymentMethod: searchParams.get("paymentMethod") ?? undefined,
      isGuest: parseBooleanParam(searchParams.get("isGuest")),
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return jsonMongoError(error, "Unable to fetch orders.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const order = await createOrder(body);
    return NextResponse.json({ ok: true, item: order }, { status: 201 });
  } catch (error) {
    return jsonMongoError(error, "Unable to create order.");
  }
}
