import { NextResponse, type NextRequest } from "next/server";
import { jsonMongoError } from "@/server/mongodb/http";
import { deleteProduct, getProductById, updateProduct } from "@/server/mongodb/services/products";

export const runtime = "nodejs";

type Params = {
  params: Promise<{
    productId: string;
  }>;
};

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { productId } = await params;
    const product = await getProductById(productId);
    return NextResponse.json({ ok: true, item: product });
  } catch (error) {
    return jsonMongoError(error, "Unable to fetch product.");
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const body = await request.json();
    const { productId } = await params;
    const product = await updateProduct(productId, body);
    return NextResponse.json({ ok: true, item: product });
  } catch (error) {
    return jsonMongoError(error, "Unable to update product.");
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { productId } = await params;
    const product = await deleteProduct(productId);
    return NextResponse.json({ ok: true, item: product });
  } catch (error) {
    return jsonMongoError(error, "Unable to delete product.");
  }
}
