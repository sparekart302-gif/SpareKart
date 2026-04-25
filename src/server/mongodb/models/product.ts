import "server-only";

import { Schema, model, models } from "mongoose";

const productSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    brand: { type: String, required: true, trim: true, index: true },
    category: { type: String, required: true, trim: true, index: true },
    sku: { type: String, required: true, trim: true, index: true },
    price: { type: Number, required: true, min: 0 },
    comparePrice: { type: Number, min: 0 },
    images: { type: [String], default: [] },
    sellerSlug: { type: String, required: true, trim: true, index: true },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    badge: { type: String, enum: ["best-seller", "new", "deal", "fast-shipping"], required: false },
    shortDescription: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    tags: { type: [String], default: [] },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

productSchema.index({
  title: "text",
  brand: "text",
  category: "text",
  sku: "text",
  shortDescription: "text",
  description: "text",
});

export const ProductModel =
  models.ProductRecord || model("ProductRecord", productSchema, "products");
