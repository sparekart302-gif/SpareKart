import "server-only";

import { Schema, model, models } from "mongoose";

const orderItemSchema = new Schema(
  {
    productId: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true },
    image: { type: String, trim: true },
    sellerSlug: { type: String, required: true, trim: true, index: true },
    brand: { type: String, required: true, trim: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const shippingAddressSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    addressLine: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    province: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const totalsSchema = new Schema(
  {
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, required: true, min: 0, default: 0 },
    shipping: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const customerSchema = new Schema(
  {
    userId: { type: String, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    phone: { type: String, required: true, trim: true, index: true },
    isGuest: { type: Boolean, default: false, index: true },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, trim: true, unique: true, index: true },
    customer: { type: customerSchema, required: true },
    paymentMethod: {
      type: String,
      enum: ["COD", "BANK_TRANSFER", "EASYPAISA", "JAZZCASH"],
      required: true,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: [
        "PENDING",
        "REQUIRES_PROOF",
        "PROOF_SUBMITTED",
        "UNDER_REVIEW",
        "PAID",
        "REJECTED",
        "FAILED",
        "REFUNDED",
      ],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "PENDING",
        "AWAITING_PAYMENT_PROOF",
        "AWAITING_PAYMENT_VERIFICATION",
        "CONFIRMED",
        "PROCESSING",
        "SHIPPED",
        "DELIVERED",
        "CANCELED",
        "RETURNED",
      ],
      required: true,
      index: true,
    },
    items: { type: [orderItemSchema], required: true },
    shippingAddress: { type: shippingAddressSchema, required: true },
    totals: { type: totalsSchema, required: true },
    notes: { type: String, trim: true },
    trackingNumber: { type: String, trim: true, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

orderSchema.index({
  orderNumber: "text",
  "customer.name": "text",
  "customer.email": "text",
  "customer.phone": "text",
  trackingNumber: "text",
});

export const OrderModel = models.OrderRecord || model("OrderRecord", orderSchema, "orders");
