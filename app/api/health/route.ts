import { getServerEnv } from "@/server/config/env";
import { getEmailDomain, validateResendSenderEmail } from "@/server/email/config";
import { jsonSuccess } from "@/server/http/responses";
import { jsonMongoError } from "@/server/mongodb/http";
import { probeRuntimeDirectory } from "@/server/runtime/storage";

export const runtime = "nodejs";

export async function GET() {
  try {
    const env = getServerEnv();
    const runtime = await probeRuntimeDirectory();
    const resendSenderValidation = validateResendSenderEmail({
      fromEmail: env.RESEND_FROM_EMAIL,
      publicSiteUrl: env.publicSiteUrl,
      nodeEnv: env.NODE_ENV,
    });
    const status = runtime.ok ? "ok" : "warning";

    const payload = {
      status,
      service: "sparekart",
      environment: env.NODE_ENV,
      mongoConfigured: env.mongodbConfigured,
      googleConfigured: env.googleConfigured,
      resendConfigured: env.resendConfigured,
      emailDelivery: env.resendConfigured ? "resend" : "local-preview",
      resendSenderDomain: getEmailDomain(env.RESEND_FROM_EMAIL),
      resendSenderStatus: resendSenderValidation.ok
        ? resendSenderValidation.level
        : env.resendConfigured
          ? "error"
          : "not-configured",
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
