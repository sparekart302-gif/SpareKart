export type AdminDashboardQuery = {
  from?: string;
  to?: string;
};

export type SellerReviewPayload = {
  sellerId: string;
  status: "ACTIVE" | "PENDING_APPROVAL" | "FLAGGED" | "SUSPENDED" | "REJECTED";
  approvalNote?: string;
  commissionRate?: number;
  payoutHold?: boolean;
};

export type ProductModerationPayload = {
  productId: string;
  moderationStatus: "ACTIVE" | "DRAFT" | "FLAGGED" | "INACTIVE";
  category?: string;
  tags?: string[];
  reviewRequired?: boolean;
};

export type PaymentProofReviewPayload = {
  proofId: string;
  status: "APPROVED" | "REJECTED";
  adminNote?: string;
};

export type CommissionReportQuery = {
  sellerId?: string;
  status?: "PENDING" | "READY" | "PAID" | "CANCELED";
  from?: string;
  to?: string;
};

export type PlatformSettingsPayload = {
  shipping: {
    standardRate: number;
    expressRate: number;
    freeShippingThreshold: number;
  };
  taxRate: number;
  payments: Record<
    string,
    {
      enabled: boolean;
      requiresManualReview: boolean;
    }
  >;
  sellerPlatform: {
    allowSelfRegistration: boolean;
    autoApproveSellers: boolean;
    defaultCommissionRate: number;
  };
};

type MedusaAdminClientConfig = {
  baseUrl: string;
  apiKey?: string;
};

function withQuery(path: string, query?: Record<string, string | number | undefined>) {
  if (!query) {
    return path;
  }

  const searchParams = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const serialized = searchParams.toString();
  return serialized ? `${path}?${serialized}` : path;
}

async function medusaRequest<TResponse>(
  config: MedusaAdminClientConfig,
  path: string,
  init?: RequestInit,
): Promise<TResponse> {
  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(config.apiKey ? { "x-medusa-access-token": config.apiKey } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Medusa admin request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as TResponse;
}

export function createMedusaAdminService(config: MedusaAdminClientConfig) {
  return {
    getDashboardOverview(query?: AdminDashboardQuery) {
      return medusaRequest(config, withQuery("/admin/sparekart/dashboard", query));
    },

    listSellers(query?: { status?: string; q?: string }) {
      return medusaRequest(config, withQuery("/admin/sparekart/sellers", query));
    },

    reviewSellerStore(payload: SellerReviewPayload) {
      return medusaRequest(config, "/admin/sparekart/sellers/review", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    listOrders(query?: {
      status?: string;
      payment_status?: string;
      seller_id?: string;
      q?: string;
    }) {
      return medusaRequest(config, withQuery("/admin/sparekart/orders", query));
    },

    listPaymentProofs(query?: { status?: string; method?: string; q?: string }) {
      return medusaRequest(config, withQuery("/admin/sparekart/payments/proofs", query));
    },

    reviewPaymentProof(payload: PaymentProofReviewPayload) {
      return medusaRequest(config, "/admin/sparekart/payments/proofs/review", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    moderateProduct(payload: ProductModerationPayload) {
      return medusaRequest(config, "/admin/sparekart/products/moderate", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    listReviewQueue(query?: { kind?: "product" | "store"; status?: string; q?: string }) {
      return medusaRequest(config, withQuery("/admin/sparekart/reviews", query));
    },

    moderateReview(payload: {
      reviewId: string;
      kind: "product" | "store";
      status: "APPROVED" | "PENDING" | "FLAGGED" | "REJECTED";
      moderatorNote?: string;
    }) {
      return medusaRequest(config, "/admin/sparekart/reviews/moderate", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    getCommissionReport(query?: CommissionReportQuery) {
      return medusaRequest(config, withQuery("/admin/sparekart/commissions", query));
    },

    getInventoryAlerts(query?: { seller_id?: string; threshold?: number }) {
      return medusaRequest(config, withQuery("/admin/sparekart/inventory/alerts", query));
    },

    updatePlatformSettings(payload: PlatformSettingsPayload) {
      return medusaRequest(config, "/admin/sparekart/settings", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
  };
}

export type MedusaAdminService = ReturnType<typeof createMedusaAdminService>;
