import { getDeploymentReadiness } from "@/server/config/readiness";
import { getServerEnv } from "@/server/config/env";
import { jsonSuccess } from "@/server/http/responses";
import { pingMongo } from "@/server/mongodb/connection";

export const runtime = "nodejs";

export async function GET() {
  const readiness = await getDeploymentReadiness();
  const env = getServerEnv();
  const mongoPing = env.mongodbConfigured ? await pingMongo().catch(() => null) : null;
  const status =
    readiness.status === "not_ready" || (env.mongodbConfigured && !mongoPing)
      ? "not_ready"
      : readiness.status;

  const payload = {
    ...readiness,
    ok: status !== "not_ready",
    status,
    mongoPing,
  };

  return jsonSuccess(payload, {
    status: status === "not_ready" ? 503 : 200,
    message:
      status === "ready"
        ? "Deployment readiness checks passed."
        : status === "warning"
          ? "Deployment readiness checks completed with warnings."
          : "Deployment readiness checks found blocking issues.",
    extra: payload,
  });
}
