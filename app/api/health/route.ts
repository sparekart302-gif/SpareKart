import { getServerEnv } from "@/server/config/env";
import { jsonSuccess } from "@/server/http/responses";
import { jsonMongoError } from "@/server/mongodb/http";
import { probeRuntimeDirectory } from "@/server/runtime/storage";

export const runtime = "nodejs";

export async function GET() {
  try {
    const env = getServerEnv();
    const runtime = await probeRuntimeDirectory();
    const status = runtime.ok ? "ok" : "warning";

    const payload = {
      status,
      service: "sparekart",
      environment: env.NODE_ENV,
      mongoConfigured: env.mongodbConfigured,
      googleConfigured: env.googleConfigured,
      resendConfigured: env.resendConfigured,
      emailDelivery: env.resendConfigured ? "resend" : "local-preview",
      runtimePersistence: env.mongodbConfigured ? "mongodb-enabled" : "file-fallback",
      runtimeRoot: env.runtimeRoot,
      runtimeWritable: runtime.ok,
      timestamp: new Date().toISOString(),
    };

    return jsonSuccess(payload, {
      status: 200,
      message: "Health check completed.",
      extra: payload,
    });
  } catch (error) {
    return jsonMongoError(error, "Health check failed.");
  }
}
