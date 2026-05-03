import type {
  CODRemittanceReviewApiInput,
  SellerPayoutAccountReviewApiInput,
  SellerPayoutAccountUpdateApiInput,
  SellerPayoutRequestApiInput,
  SellerPayoutUpdateApiInput,
  SellerSettlementBatchApiInput,
} from "../order-api";

export type AdminFinanceOverview = {
  totalCommissionEarned: number;
  totalPendingSellerPayables: number;
  totalPaidOut: number;
  totalCODRemittancesPending: number;
  failedPayouts: number;
  payoutQueueCount: number;
};

export interface SellerPaymentAccountService {
  saveSellerPayoutAccount(
    actorUserId: string,
    input: SellerPayoutAccountUpdateApiInput,
  ): Promise<void>;
  reviewSellerPayoutAccount(
    actorUserId: string,
    input: SellerPayoutAccountReviewApiInput,
  ): Promise<void>;
}

export interface CODRemittanceService {
  reviewCODRemittance(actorUserId: string, input: CODRemittanceReviewApiInput): Promise<void>;
}

export interface SellerSettlementService {
  createPayoutBatchFromSettlements(
    actorUserId: string,
    input: SellerSettlementBatchApiInput,
  ): Promise<void>;
}

export interface SellerPayoutService {
  requestSellerPayout(actorUserId: string, input: SellerPayoutRequestApiInput): Promise<void>;
  updateSellerPayout(actorUserId: string, input: SellerPayoutUpdateApiInput): Promise<void>;
}

export interface AdminFinancialDashboardService {
  getOverview(actorUserId: string): Promise<AdminFinanceOverview>;
}
