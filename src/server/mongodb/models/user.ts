import "server-only";

import { Schema, model, models } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    phone: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["CUSTOMER", "SELLER", "ADMIN", "SUPER_ADMIN"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "INVITED"],
      default: "ACTIVE",
      index: true,
    },
    emailVerified: { type: Boolean, default: false, index: true },
    sellerSlug: { type: String, trim: true, index: true },
    adminTitle: { type: String, trim: true },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

userSchema.index({
  name: "text",
  email: "text",
  phone: "text",
  sellerSlug: "text",
});

export const UserModel = models.UserRecord || model("UserRecord", userSchema, "users");
