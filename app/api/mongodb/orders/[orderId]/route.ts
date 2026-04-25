import { NextResponse, type NextRequest } from "next/server";
import { jsonMongoError } from "@/server/mongodb/http";
import { deleteOrder, getOrderById, updateOrder } from "@/server/mongodb/services/orders";

export const runtime = "nodejs";

type Params = {
  params: Promise<{
    orderId: string;
  }>;
};

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { orderId } = await params;
    const order = await getOrderById(orderId);
    return NextResponse.json({ ok: true, item: order });
  } catch (error) {
    return jsonMongoError(error, "Unable to fetch order.");
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const body = await request.json();
    const { orderId } = await params;
    const order = await updateOrder(orderId, body);
    return NextResponse.json({ ok: true, item: order });
  } catch (error) {
    return jsonMongoError(error, "Unable to update order.");
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { orderId } = await params;
    const order = await deleteOrder(orderId);
    return NextResponse.json({ ok: true, item: order });
  } catch (error) {
    return jsonMongoError(error, "Unable to delete order.");
  }
}
