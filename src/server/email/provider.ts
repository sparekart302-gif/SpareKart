import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Resend } from "resend";
import { getServerEnv } from "@/server/config/env";
import { getRuntimeFilePath } from "@/server/runtime/storage";
import type { EmailJobRecord } from "./types";

type DeliveryResult = {
  provider: string;
};

function hasResendConfig() {
  return getServerEnv().resendConfigured;
}

function hasPartialResendConfig() {
  return getServerEnv().resendPartiallyConfigured;
}

async function deliverViaResend(job: EmailJobRecord): Promise<DeliveryResult> {
  const env = getServerEnv();
  const resend = new Resend(env.RESEND_API_KEY!);

  const response = await resend.emails.send({
    to: job.to.email,
    from: env.RESEND_FROM_NAME
      ? `${env.RESEND_FROM_NAME} <${env.RESEND_FROM_EMAIL!}>`
      : env.RESEND_FROM_EMAIL!,
    subject: job.subject,
    html: job.html,
    text: job.text,
  });

  if (response.error) {
    throw new Error(response.error.message);
  }

  console.info(`[email] Delivered ${job.template} via Resend to ${job.to.email}.`);
  return { provider: "resend" };
}

async function deliverViaLocalPreview(job: EmailJobRecord): Promise<DeliveryResult> {
  const previewDir = getRuntimeFilePath("email-previews");
  await mkdir(previewDir, { recursive: true });

  const htmlPath = join(previewDir, `${job.id}.html`);
  const textPath = join(previewDir, `${job.id}.txt`);

  await writeFile(htmlPath, job.html, "utf8");
  await writeFile(textPath, job.text, "utf8");

  console.info(`[email] Wrote ${job.template} preview for ${job.to.email} to ${previewDir}.`);
  return { provider: "local-preview" };
}

export async function deliverEmail(job: EmailJobRecord) {
  if (hasPartialResendConfig()) {
    throw new Error(
      "Resend configuration is incomplete. Set both RESEND_API_KEY and RESEND_FROM_EMAIL.",
    );
  }

  if (hasResendConfig()) {
    return deliverViaResend(job);
  }

  console.warn(
    `[email] Resend is not fully configured. Falling back to local preview delivery for ${job.template}.`,
  );
  return deliverViaLocalPreview(job);
}
