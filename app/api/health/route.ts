import { NextResponse } from "next/server";
import { getServerEnv } from "@/server/config/env";
import { pingMongo } from "@/server/mongodb/connection";
import { jsonMongoError } from "@/server/mongodb/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    const env = getServerEnv();
    const mongo = env.mongodbConfigured ? await pingMongo() : null;

    return NextResponse.json({
      ok: true,
      service: "sparekart",
      environment: env.NODE_ENV,
      mongoConfigured: env.mongodbConfigured,
      mongoHealth: mongo,
      emailDelivery: env.resendConfigured ? "resend" : "local-preview",
      runtimePersistence: env.mongodbConfigured ? "mongodb" : "file-fallback",
      runtimeRoot: env.runtimeRoot,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return jsonMongoError(error, "Health check failed.");
  }
}
