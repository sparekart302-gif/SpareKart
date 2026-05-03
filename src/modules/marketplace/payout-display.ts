import type { SellerPayout, SellerPayoutAccount, SellerPayoutMethod } from "./types";

export function formatPayoutLabel(value?: string) {
  if (!value) {
    return "Not set";
  }

  return value.replaceAll("_", " ").replaceAll("-", " ");
}

export function maskSensitiveValue(value?: string, keepStart = 2, keepEnd = 4) {
  if (!value) {
    return "Not provided";
  }

  const normalized = value.trim();

  if (normalized.length <= keepStart + keepEnd) {
    return normalized;
  }

  return `${normalized.slice(0, keepStart)}${"*".repeat(
    Math.max(normalized.length - keepStart - keepEnd, 4),
  )}${normalized.slice(-keepEnd)}`;
}

export function describePayoutAccountDestination(account?: SellerPayoutAccount) {
  if (!account) {
    return "No payout account saved";
  }

  switch (account.method) {
    case "BANK_TRANSFER":
      return `${account.bankName ?? "Bank"} - ${maskSensitiveValue(account.accountNumber, 2, 3)}`;
    case "EASYPAISA":
      return `Easypaisa - ${maskSensitiveValue(account.easyPaisaNumber, 3, 2)}`;
    case "JAZZCASH":
      return `JazzCash - ${maskSensitiveValue(account.jazzCashNumber, 3, 2)}`;
    case "PAYPAL":
      return `PayPal - ${maskSensitiveValue(account.paypalEmail, 2, 9)}`;
    case "WALLET":
      return `Wallet - ${maskSensitiveValue(account.walletId, 2, 3)}`;
    default:
      return "Destination unavailable";
  }
}

export function describePayoutRecordDestination(
  payout: Pick<
    SellerPayout,
    | "payoutMethod"
    | "bankDetails"
    | "easyPaisaNumber"
    | "jazzCashNumber"
    | "paypalEmail"
    | "walletId"
  >,
) {
  switch (payout.payoutMethod) {
    case "BANK_TRANSFER":
      return `${payout.bankDetails?.bankName ?? "Bank"} - ${maskSensitiveValue(
        payout.bankDetails?.accountNumber,
        2,
        3,
      )}`;
    case "EASYPAISA":
      return `Easypaisa - ${maskSensitiveValue(payout.easyPaisaNumber, 3, 2)}`;
    case "JAZZCASH":
      return `JazzCash - ${maskSensitiveValue(payout.jazzCashNumber, 3, 2)}`;
    case "PAYPAL":
      return `PayPal - ${maskSensitiveValue(payout.paypalEmail, 2, 9)}`;
    case "WALLET":
      return `Wallet - ${maskSensitiveValue(payout.walletId, 2, 3)}`;
    default:
      return "No destination linked";
  }
}

export function getPayoutMethodOptions(): SellerPayoutMethod[] {
  return ["BANK_TRANSFER", "EASYPAISA", "JAZZCASH", "PAYPAL", "WALLET"];
}
