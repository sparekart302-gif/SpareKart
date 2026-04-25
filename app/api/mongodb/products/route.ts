import { NextResponse, type NextRequest } from "next/server";
import { jsonMongoError, parseBooleanParam, parsePositiveInt } from "@/server/mongodb/http";
import { createProduct, listProducts } from "@/server/mongodb/services/products";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const result = await listProducts({
      page: parsePositiveInt(searchParams.get("page"), 1),
      limit: parsePositiveInt(searchParams.get("limit"), 20),
      search: searchParams.get("search") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      sellerSlug: searchParams.get("sellerSlug") ?? undefined,
      isActive: parseBooleanParam(searchParams.get("isActive")),
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return jsonMongoError(error, "Unable to fetch products.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const product = await createProduct(body);
    return NextResponse.json({ ok: true, item: product }, { status: 201 });
  } catch (error) {
    return jsonMongoError(error, "Unable to create product.");
  }
}
