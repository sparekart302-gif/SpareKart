import "server-only";

import { Schema, model, models } from "mongoose";

const authUserSchema = new Schema(
  {
    id: { type: String, required: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    authProvider: {
      type: String,
      enum: ["LOCAL", "GOOGLE"],
      default: "LOCAL",
    },
    oauthSubject: { type: String, trim: true },
    role: {
      type: String,
      enum: ["CUSTOMER", "SELLER", "ADMIN", "SUPER_ADMIN"],
      required: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "INVITED"],
      required: true,
    },
    emailVerified: { type: Boolean, default: false },
    sellerSlug: { type: String, trim: true },
    adminTitle: { type: String, trim: true },
    adminScopes: { type: [String], default: undefined },
    isSeeded: { type: Boolean, default: false },
    pendingSellerProfile: {
      storeName: { type: String, trim: true },
      city: { type: String, trim: true },
    },
    passwordHash: { type: String, required: true },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
    lastLoginAt: { type: String },
  },
  { _id: false },
);

const authSessionSchema = new Schema(
  {
    id: { type: String, required: true },
    tokenHash: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    createdAt: { type: String, required: true },
    expiresAt: { type: String, required: true, index: true },
    lastSeenAt: { type: String, required: true },
    userAgent: { type: String },
    ipAddress: { type: String },
  },
  { _id: false },
);

const authTokenSchema = new Schema(
  {
    id: { type: String, required: true },
    tokenHash: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["EMAIL_VERIFICATION", "PASSWORD_RESET"],
      required: true,
      index: true,
    },
    createdAt: { type: String, required: true },
    expiresAt: { type: String, required: true, index: true },
    consumedAt: { type: String },
  },
  { _id: false },
);

const authRuntimeSchema = new Schema(
  {
    _id: { type: String, required: true },
    users: { type: [authUserSchema], default: [] },
    sessions: { type: [authSessionSchema], default: [] },
    tokens: { type: [authTokenSchema], default: [] },
  },
  {
    timestamps: true,
  },
);

export const AuthRuntimeModel =
  models.AuthRuntime || model("AuthRuntime", authRuntimeSchema, "auth_runtime");
