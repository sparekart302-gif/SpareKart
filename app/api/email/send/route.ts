import type { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError } from "@/server/auth/http";
import { queueMarketplaceEmail } from "@/server/email/service";
import { jsonFailure, jsonSuccess } from "@/server/http/responses";

export const runtime = "nodejs";

const emailRequestSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("AUTH_TEMPLATE"),
    to: z.object({
      email: z.string().email(),
      name: z.string().optional(),
    }),
    template: z.discriminatedUnion("template", [
      z.object({
        template: z.enum(["WELCOME_CUSTOMER", "WELCOME_SELLER"]),
        recipientName: z.string(),
        portalUrl: z.string().url(),
      }),
      z.object({
        template: z.literal("VERIFY_EMAIL"),
        recipientName: z.string(),
        verificationCode: z.string(),
        verificationUrl: z.string().url(),
        expiresLabel: z.string(),
      }),
      z.object({
        template: z.literal("PASSWORD_RESET"),
        recipientName: z.string(),
        otpCode: z.string(),
        recoveryUrl: z.string().url(),
        expiresLabel: z.string(),
      }),
    ]),
  }),
  z.object({
    type: z.literal("ORDER_CREATED"),
    order: z.object({
      orderNumber: z.string(),
      paymentMethod: z.enum(["COD", "BANK_TRANSFER", "EASYPAISA", "JAZZCASH"]),
      totalAmountLabel: z.string(),
      customer: z.object({
        email: z.string().email(),
        name: z.string().optional(),
        phone: z.string(),
      }),
      shippingAddress: z.array(z.string()),
      trackingUrl: z.string().url(),
      sellerWorkspaceBaseUrl: z.string().url(),
      items: z.array(
        z.object({
          title: z.string(),
          quantity: z.number(),
          unitPriceLabel: z.string(),
          sellerName: z.string(),
          sellerEmail: z.string().email().optional(),
          sellerContactName: z.string().optional(),
          sellerSlug: z.string().optional(),
        }),
      ),
    }),
  }),
  z.object({
    type: z.literal("ORDER_STATUS_CHANGED"),
    order: z.object({
      orderNumber: z.string(),
      status: z.enum([
        "PENDING",
        "AWAITING_PAYMENT_PROOF",
        "AWAITING_PAYMENT_VERIFICATION",
        "CONFIRMED",
        "PROCESSING",
        "SHIPPED",
        "DELIVERED",
        "CANCELED",
        "RETURNED",
      ]),
      customer: z.object({
        email: z.string().email(),
        name: z.string().optional(),
      }),
      summary: z.string(),
      trackingUrl: z.string().url(),
      sellers: z
        .array(
          z.object({
            email: z.string().email(),
            name: z.string().optional(),
            summary: z.string(),
            workspaceUrl: z.string().url(),
          }),
        )
        .optional(),
    }),
  }),
  z.object({
    type: z.literal("PAYMENT_PROOF_RECEIVED"),
    order: z.object({
      orderNumber: z.string(),
      paymentMethod: z.enum(["COD", "BANK_TRANSFER", "EASYPAISA", "JAZZCASH"]),
      proofReference: z.string(),
      customer: z.object({
        email: z.string().email(),
        name: z.string().optional(),
      }),
      trackingUrl: z.string().url(),
    }),
  }),
]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = emailRequestSchema.parse(body);

    if (payload.type === "AUTH_TEMPLATE") {
      return jsonFailure(
        "AUTH_TEMPLATE emails must be queued from trusted server-side auth flows.",
        {
          status: 403,
          code: "AUTH_TEMPLATE_FORBIDDEN",
        },
      );
    }

    await queueMarketplaceEmail(payload);
    return jsonSuccess(
      { queued: true },
      {
        message: "Email queued successfully.",
        extra: {
          queued: true,
        },
      },
    );
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Email request failed.");
  }
}
