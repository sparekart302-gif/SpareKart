import "server-only";

import { randomUUID } from "node:crypto";
import { getServerEnv } from "@/server/config/env";
import { connectToMongo } from "@/server/mongodb/connection";
import { EmailAuditModel, EmailJobModel } from "@/server/mongodb/models/email-runtime";
import { getRuntimeFilePath, readJsonFile, updateJsonFile } from "@/server/runtime/storage";
import { renderEmailTemplate } from "./templates";
import { deliverEmail } from "./provider";
import type {
  EmailAddress,
  EmailAuditState,
  EmailJobRecord,
  EmailOutboxState,
  EmailTemplatePayload,
} from "./types";

const OUTBOX_PATH = getRuntimeFilePath("email-outbox.json");
const AUDIT_PATH = getRuntimeFilePath("email-audit.json");

const emptyOutbox: EmailOutboxState = { jobs: [] };
const emptyAudit: EmailAuditState = { entries: [] };

let processing = false;

function nowIso() {
  return new Date().toISOString();
}

function shouldUseMongoEmailQueue() {
  return getServerEnv().mongodbConfigured;
}

function normalizeEmailJob(
  document: Partial<EmailJobRecord> & {
    _id?: string;
  },
): EmailJobRecord {
  return {
    id: document.id ?? document._id ?? "",
    template: document.template!,
    to: document.to!,
    subject: document.subject!,
    html: document.html!,
    text: document.text!,
    payload: document.payload!,
    status: document.status!,
    attempts: document.attempts ?? 0,
    lastError: document.lastError,
    provider: document.provider,
    createdAt: document.createdAt!,
    updatedAt: document.updatedAt!,
    sentAt: document.sentAt,
  };
}

async function enqueueMongoTemplatedEmail(to: EmailAddress, payload: EmailTemplatePayload) {
  await connectToMongo();

  const rendered = renderEmailTemplate(payload);
  const createdAt = nowIso();

  const job: EmailJobRecord = {
    id: `email_${randomUUID().replaceAll("-", "")}`,
    template: payload.template,
    to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    payload,
    status: "QUEUED",
    attempts: 0,
    createdAt,
    updatedAt: createdAt,
  };

  await EmailJobModel.create({
    _id: job.id,
    ...job,
  });

  void processEmailQueue();
  return job;
}

async function enqueueFileTemplatedEmail(to: EmailAddress, payload: EmailTemplatePayload) {
  const rendered = renderEmailTemplate(payload);
  const createdAt = nowIso();

  const job: EmailJobRecord = {
    id: `email_${randomUUID().replaceAll("-", "")}`,
    template: payload.template,
    to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    payload,
    status: "QUEUED",
    attempts: 0,
    createdAt,
    updatedAt: createdAt,
  };

  await updateJsonFile(OUTBOX_PATH, emptyOutbox, (current) => ({
    jobs: [...current.jobs, job],
  }));

  void processEmailQueue();
  return job;
}

export async function enqueueTemplatedEmail(to: EmailAddress, payload: EmailTemplatePayload) {
  if (shouldUseMongoEmailQueue()) {
    return enqueueMongoTemplatedEmail(to, payload);
  }

  return enqueueFileTemplatedEmail(to, payload);
}

async function recordAudit(input: {
  kind: "EMAIL_SENT" | "EMAIL_FAILED";
  template: EmailJobRecord["template"];
  to: string;
  subject: string;
  provider: string;
  note?: string;
}) {
  if (shouldUseMongoEmailQueue()) {
    await connectToMongo();
    await EmailAuditModel.create({
      _id: `email_audit_${randomUUID().replaceAll("-", "")}`,
      createdAt: nowIso(),
      ...input,
    });
    return;
  }

  await updateJsonFile(AUDIT_PATH, emptyAudit, (current) => ({
    entries: [
      {
        id: `email_audit_${randomUUID().replaceAll("-", "")}`,
        createdAt: nowIso(),
        ...input,
      },
      ...current.entries,
    ].slice(0, 1000),
  }));
}

async function processMongoEmailQueue() {
  await connectToMongo();

  while (true) {
    const pendingJobDocument = await EmailJobModel.findOneAndUpdate(
      {
        status: "QUEUED",
      },
      {
        $set: {
          status: "PROCESSING",
          updatedAt: nowIso(),
        },
      },
      {
        new: true,
        sort: { createdAt: 1 },
      },
    ).lean();

    if (!pendingJobDocument) {
      break;
    }

    const pendingJob = normalizeEmailJob(pendingJobDocument);

    try {
      const delivery = await deliverEmail(pendingJob);
      const sentAt = nowIso();

      await EmailJobModel.updateOne(
        { _id: pendingJob.id },
        {
          $set: {
            status: "SENT",
            attempts: pendingJob.attempts + 1,
            provider: delivery.provider,
            updatedAt: sentAt,
            sentAt,
          },
        },
      );

      await recordAudit({
        kind: "EMAIL_SENT",
        template: pendingJob.template,
        to: pendingJob.to.email,
        subject: pendingJob.subject,
        provider: delivery.provider,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown email delivery failure.";

      await EmailJobModel.updateOne(
        { _id: pendingJob.id },
        {
          $set: {
            status: "FAILED",
            attempts: pendingJob.attempts + 1,
            lastError: message,
            updatedAt: nowIso(),
          },
        },
      );

      await recordAudit({
        kind: "EMAIL_FAILED",
        template: pendingJob.template,
        to: pendingJob.to.email,
        subject: pendingJob.subject,
        provider: "unknown",
        note: message,
      });
    }
  }
}

async function processFileEmailQueue() {
  const outbox = await readJsonFile(OUTBOX_PATH, emptyOutbox);
  const pendingJobs = outbox.jobs.filter((job) => job.status === "QUEUED");

  for (const pendingJob of pendingJobs) {
    try {
      const delivery = await deliverEmail(pendingJob);
      const sentAt = nowIso();

      await updateJsonFile(OUTBOX_PATH, emptyOutbox, (current) => ({
        jobs: current.jobs.map((job) =>
          job.id === pendingJob.id
            ? {
                ...job,
                status: "SENT" as const,
                attempts: job.attempts + 1,
                provider: delivery.provider,
                updatedAt: sentAt,
                sentAt,
              }
            : job,
        ),
      }));

      await recordAudit({
        kind: "EMAIL_SENT",
        template: pendingJob.template,
        to: pendingJob.to.email,
        subject: pendingJob.subject,
        provider: delivery.provider,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown email delivery failure.";

      await updateJsonFile(OUTBOX_PATH, emptyOutbox, (current) => ({
        jobs: current.jobs.map((job) =>
          job.id === pendingJob.id
            ? {
                ...job,
                status: "FAILED" as const,
                attempts: job.attempts + 1,
                lastError: message,
                updatedAt: nowIso(),
              }
            : job,
        ),
      }));

      await recordAudit({
        kind: "EMAIL_FAILED",
        template: pendingJob.template,
        to: pendingJob.to.email,
        subject: pendingJob.subject,
        provider: "unknown",
        note: message,
      });
    }
  }
}

export async function processEmailQueue() {
  if (processing) {
    return;
  }

  processing = true;

  try {
    if (shouldUseMongoEmailQueue()) {
      await processMongoEmailQueue();
    } else {
      await processFileEmailQueue();
    }
  } finally {
    processing = false;
  }
}
