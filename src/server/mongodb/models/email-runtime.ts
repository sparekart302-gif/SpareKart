import "server-only";

import { Schema, model, models } from "mongoose";

const emailAddressSchema = new Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    name: { type: String, trim: true },
  },
  { _id: false },
);

const emailJobSchema = new Schema(
  {
    _id: { type: String, required: true },
    template: { type: String, required: true, index: true },
    to: { type: emailAddressSchema, required: true },
    subject: { type: String, required: true },
    html: { type: String, required: true },
    text: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ["QUEUED", "PROCESSING", "SENT", "FAILED"],
      required: true,
      index: true,
    },
    attempts: { type: Number, default: 0 },
    lastError: { type: String },
    provider: { type: String },
    createdAt: { type: String, required: true, index: true },
    updatedAt: { type: String, required: true },
    sentAt: { type: String },
  },
  {
    versionKey: false,
  },
);

emailJobSchema.index({ status: 1, createdAt: 1 });

const emailAuditSchema = new Schema(
  {
    _id: { type: String, required: true },
    kind: { type: String, enum: ["EMAIL_SENT", "EMAIL_FAILED"], required: true, index: true },
    template: { type: String, required: true, index: true },
    to: { type: String, required: true, index: true },
    subject: { type: String, required: true },
    provider: { type: String, required: true },
    createdAt: { type: String, required: true, index: true },
    note: { type: String },
  },
  {
    versionKey: false,
  },
);

export const EmailJobModel =
  models.EmailJobRuntime || model("EmailJobRuntime", emailJobSchema, "email_jobs");

export const EmailAuditModel =
  models.EmailAuditRuntime || model("EmailAuditRuntime", emailAuditSchema, "email_audits");
