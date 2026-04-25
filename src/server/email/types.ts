import type { AppRole, OrderStatus, PaymentMethod } from "@/modules/marketplace/types";

export type EmailTemplateKey =
  | "WELCOME_CUSTOMER"
  | "WELCOME_SELLER"
  | "VERIFY_EMAIL"
  | "PASSWORD_RESET"
  | "ORDER_CONFIRMATION_CUSTOMER"
  | "ORDER_CONFIRMATION_SELLER"
  | "ORDER_STATUS_UPDATE"
  | "PAYMENT_PROOF_RECEIVED";

export type EmailAddress = {
  email: string;
  name?: string;
};

export type EmailTemplatePayload =
  | {
      template: "WELCOME_CUSTOMER" | "WELCOME_SELLER";
      recipientName: string;
      portalUrl: string;
    }
  | {
      template: "VERIFY_EMAIL";
      recipientName: string;
      verificationCode: string;
      verificationUrl: string;
      expiresLabel: string;
    }
  | {
      template: "PASSWORD_RESET";
      recipientName: string;
      otpCode: string;
      recoveryUrl: string;
      expiresLabel: string;
    }
  | {
      template: "ORDER_CONFIRMATION_CUSTOMER";
      recipientName: string;
      orderNumber: string;
      paymentMethod: PaymentMethod;
      totalAmountLabel: string;
      shippingAddress: string[];
      items: {
        title: string;
        quantity: number;
        unitPriceLabel: string;
        sellerName: string;
      }[];
      trackingUrl: string;
    }
  | {
      template: "ORDER_CONFIRMATION_SELLER";
      recipientName: string;
      orderNumber: string;
      customerName: string;
      customerPhone: string;
      shippingAddress: string[];
      items: {
        title: string;
        quantity: number;
        unitPriceLabel: string;
      }[];
      workspaceUrl: string;
    }
  | {
      template: "ORDER_STATUS_UPDATE";
      recipientName: string;
      audience: "CUSTOMER" | "SELLER";
      orderNumber: string;
      status: OrderStatus;
      summary: string;
      actionUrl: string;
      actionLabel: string;
    }
  | {
      template: "PAYMENT_PROOF_RECEIVED";
      recipientName: string;
      orderNumber: string;
      paymentMethod: Exclude<PaymentMethod, "COD"> | "COD";
      proofReference: string;
      trackingUrl: string;
    };

export type EmailJobRecord = {
  id: string;
  template: EmailTemplateKey;
  to: EmailAddress;
  subject: string;
  html: string;
  text: string;
  payload: EmailTemplatePayload;
  status: "QUEUED" | "PROCESSING" | "SENT" | "FAILED";
  attempts: number;
  lastError?: string;
  provider?: string;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
};

export type EmailOutboxState = {
  jobs: EmailJobRecord[];
};

export type EmailAuditEntry = {
  id: string;
  kind: "EMAIL_SENT" | "EMAIL_FAILED";
  template: EmailTemplateKey;
  to: string;
  subject: string;
  provider: string;
  createdAt: string;
  note?: string;
};

export type EmailAuditState = {
  entries: EmailAuditEntry[];
};

export type MarketplaceEmailRequest =
  | {
      type: "ORDER_CREATED";
      order: {
        orderNumber: string;
        paymentMethod: PaymentMethod;
        totalAmountLabel: string;
        customer: EmailAddress & { phone: string };
        shippingAddress: string[];
        items: {
          title: string;
          quantity: number;
          unitPriceLabel: string;
          sellerName: string;
          sellerEmail?: string;
          sellerContactName?: string;
          sellerSlug?: string;
        }[];
        trackingUrl: string;
        sellerWorkspaceBaseUrl: string;
      };
    }
  | {
      type: "ORDER_STATUS_CHANGED";
      order: {
        orderNumber: string;
        status: OrderStatus;
        customer: EmailAddress;
        summary: string;
        trackingUrl: string;
        sellers?: {
          email: string;
          name?: string;
          summary: string;
          workspaceUrl: string;
        }[];
      };
    }
  | {
      type: "PAYMENT_PROOF_RECEIVED";
      order: {
        orderNumber: string;
        paymentMethod: PaymentMethod;
        proofReference: string;
        customer: EmailAddress;
        trackingUrl: string;
      };
    }
  | {
      type: "AUTH_TEMPLATE";
      template: EmailTemplatePayload;
      to: EmailAddress;
    };
