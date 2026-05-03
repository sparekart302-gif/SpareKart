import { getServerEnv } from "@/server/config/env";
import { jsonSuccess } from "@/server/http/responses";
import { jsonMongoError } from "@/server/mongodb/http";
import { pingMongo } from "@/server/mongodb/connection";

export const runtime = "nodejs";

export async function GET() {
  try {
    const env = getServerEnv();
    if (!env.mongodbConfigured) {
      const payload = {
        status: "warning",
        provider: "mongodb-atlas",
        configured: false,
        timestamp: new Date().toISOString(),
      };

      return jsonSuccess(payload, {
        status: 503,
        message: "MongoDB is not configured.",
        extra: payload,
      });
    }

    const mongo = await pingMongo();

    const payload = {
      status: "ready",
      provider: "mongodb-atlas",
      configured: true,
      dbName: mongo.dbName,
      host: mongo.host,
      readyState: mongo.readyState,
      timestamp: new Date().toISOString(),
    };

    return jsonSuccess(payload, {
      message: "MongoDB health check passed.",
      extra: payload,
    });
  } catch (error) {
    return jsonMongoError(error, "MongoDB health check failed.");
  }
}
