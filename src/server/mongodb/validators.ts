import "server-only";

import { z } from "zod";

const appRoles = ["CUSTOMER", "SELLER", "ADMIN", "SUPER_ADMIN"] as const;
const userStatuses = ["ACTIVE", "SUSPENDED", "INVITED"] as const;
const orderStatuses = [
  "PENDING",
  "AWAITING_PAYMENT_PROOF",
  "AWAITING_PAYMENT_VERIFICATION",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELED",
  "RETURNED",
] as const;
const paymentMethods = ["COD", "BANK_TRANSFER", "EASYPAISA", "JAZZCASH"] as const;
const paymentStatuses = [
  "PENDING",
  "REQUIRES_PROOF",
  "PROOF_SUBMITTED",
  "UNDER_REVIEW",
  "PAID",
  "REJECTED",
  "FAILED",
  "REFUNDED",
] as const;

const shippingAddressSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(32),
  addressLine: z.string().trim().min(5).max(240),
  city: z.string().trim().min(2).max(80),
  province: z.string().trim().min(2).max(80),
  postalCode: z.string().trim().min(3).max(24),
});

const orderItemSchema = z.object({
  productId: z.string().trim().min(1),
  title: z.string().trim().min(2).max(180),
  sku: z.string().trim().min(1).max(80),
  image: z.string().trim().url().optional(),
  sellerSlug: z.string().trim().min(2).max(120),
  brand: z.string().trim().min(1).max(80),
  unitPrice: z.number().finite().nonnegative(),
  quantity: z.number().int().positive(),
});

const totalsSchema = z.object({
  subtotal: z.number().finite().nonnegative(),
  discount: z.number().finite().nonnegative().default(0),
  shipping: z.number().finite().nonnegative().default(0),
  total: z.number().finite().nonnegative(),
});

export const createProductSchema = z.object({
  title: z.string().trim().min(2).max(180),
  slug: z.string().trim().min(2).max(180).optional(),
  brand: z.string().trim().min(1).max(80),
  category: z.string().trim().min(2).max(120),
  sku: z.string().trim().min(1).max(80),
  price: z.number().finite().positive(),
  comparePrice: z.number().finite().positive().optional(),
  images: z.array(z.string().trim().url()).default([]),
  sellerSlug: z.string().trim().min(2).max(120),
  rating: z.number().min(0).max(5).default(0),
  reviewCount: z.number().int().nonnegative().default(0),
  stock: z.number().int().nonnegative().default(0),
  badge: z.enum(["best-seller", "new", "deal", "fast-shipping"]).optional(),
  shortDescription: z.string().trim().min(10).max(320),
  description: z.string().trim().min(20).max(5000),
  tags: z.array(z.string().trim().min(1).max(40)).default([]),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one product field must be provided.");

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  phone: z.string().trim().min(7).max(32),
  password: z.string().min(8).max(128),
  role: z.enum(appRoles),
  status: z.enum(userStatuses).default("ACTIVE"),
  emailVerified: z.boolean().default(false),
  sellerSlug: z.string().trim().min(2).max(120).optional(),
  adminTitle: z.string().trim().max(120).optional(),
});

export const updateUserSchema = createUserSchema
  .omit({ password: true })
  .extend({
    password: z.string().min(8).max(128).optional(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one user field must be provided.");

export const createOrderSchema = z.object({
  orderNumber: z.string().trim().min(4).max(40),
  customer: z.object({
    userId: z.string().trim().optional(),
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email(),
    phone: z.string().trim().min(7).max(32),
    isGuest: z.boolean().default(false),
  }),
  paymentMethod: z.enum(paymentMethods),
  paymentStatus: z.enum(paymentStatuses).default("PENDING"),
  status: z.enum(orderStatuses).default("PENDING"),
  items: z.array(orderItemSchema).min(1),
  shippingAddress: shippingAddressSchema,
  totals: totalsSchema,
  notes: z.string().trim().max(1000).optional(),
  trackingNumber: z.string().trim().max(120).optional(),
});

export const updateOrderSchema = createOrderSchema
  .partial()
  .extend({
    customer: createOrderSchema.shape.customer.partial().optional(),
    items: z.array(orderItemSchema).min(1).optional(),
    shippingAddress: shippingAddressSchema.partial().optional(),
    totals: totalsSchema.partial().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one order field must be provided.");

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
