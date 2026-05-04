import type { NextRequest } from "next/server";
import { z } from "zod";
import { jsonAuthError } from "@/server/auth/http";
import { AuthApiError } from "@/server/auth/errors";
import { getCurrentSessionUser } from "@/server/auth/service";
import { getAppUrl, getServerEnv } from "@/server/config/env";
import { sendTemplatedEmailNow } from "@/server/email/queue";
import { jsonSuccess } from "@/server/http/responses";

export const runtime = "nodejs";

const testEmailSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(1).max(120).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentSessionUser();

    if (!currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "SUPER_ADMIN")) {
      throw new AuthApiError("Only authenticated admins can send test emails.", {
        status: 403,
        code: "TEST_EMAIL_FORBIDDEN",
      });
    }

    const body = await request.json();
    const payload = testEmailSchema.parse(body);
    const env = getServerEnv();
    const job = await sendTemplatedEmailNow(
      {
        email: payload.email,
        name: payload.name,
      },
      {
        template: "TEST_DELIVERY",
        recipientName: payload.name ?? "SpareKart admin",
        requestedBy: currentUser.email,
        environmentLabel: env.NODE_ENV,
        dashboardUrl: getAppUrl("/admin/settings"),
      },
    );

    return jsonSuccess(
      {
        sent: true,
        jobId: job.id,
        provider: job.provider ?? "unknown",
        to: payload.email,
      },
      {
        message: "Test email delivered successfully.",
      },
    );
  } catch (error) {
    return jsonAuthError(error, "Test email failed.");
  }
}
