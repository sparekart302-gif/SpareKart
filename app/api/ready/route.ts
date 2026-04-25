import { NextResponse } from "next/server";
import { getDeploymentReadiness } from "@/server/config/readiness";
import { getServerEnv } from "@/server/config/env";
import { pingMongo } from "@/server/mongodb/connection";

export const runtime = "nodejs";

export async function GET() {
  const readiness = getDeploymentReadiness();
  const env = getServerEnv();
  const mongoPing = env.mongodbConfigured ? await pingMongo().catch(() => null) : null;
  const finalOk = readiness.ok && (!env.mongodbConfigured || Boolean(mongoPing));

  return NextResponse.json(
    {
      ...readiness,
      ok: finalOk,
      mongoPing,
    },
    {
      status: finalOk ? 200 : 503,
    },
  );
}
