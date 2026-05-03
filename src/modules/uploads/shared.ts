export type UploadAssetKind =
  | "product"
  | "store-logo"
  | "store-banner"
  | "review"
  | "payment-proof";

export const MARKETPLACE_UPLOAD_ROUTE_PREFIX = "/api/uploads/";

export function isMarketplaceUploadUrl(value?: string | null) {
  return value?.trim().startsWith(MARKETPLACE_UPLOAD_ROUTE_PREFIX) ?? false;
}

export function isHttpImageUrl(value?: string | null) {
  return /^https?:\/\//i.test(value?.trim() ?? "");
}

export function isDataImageUrl(value?: string | null) {
  return value?.trim().startsWith("data:image/") ?? false;
}

export function isHostedImageReference(value?: string | null) {
  return isMarketplaceUploadUrl(value) || isHttpImageUrl(value);
}

export function isReviewImageReference(value?: string | null) {
  return isHostedImageReference(value) || isDataImageUrl(value);
}
