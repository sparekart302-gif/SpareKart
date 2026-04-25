import { NextResponse } from "next/server";
import { getServerEnv } from "@/server/config/env";
import { jsonMongoError } from "@/server/mongodb/http";
import { pingMongo } from "@/server/mongodb/connection";

export const runtime = "nodejs";

export async function GET() {
  try {
    const env = getServerEnv();
    const mongo = await pingMongo();

    return NextResponse.json({
      ok: true,
      provider: "mongodb-atlas",
      configured: Boolean(env.MONGODB_URI),
      dbName: mongo.dbName,
      host: mongo.host,
      readyState: mongo.readyState,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return jsonMongoError(error, "MongoDB health check failed.");
  }
}
