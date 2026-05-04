export function normalizeRatingValue(value: number | null | undefined, fallback = 0) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return numeric;
}

export function roundRating(value: number | null | undefined, digits = 1) {
  const numeric = normalizeRatingValue(value);
  const factor = 10 ** digits;
  return Math.round(numeric * factor) / factor;
}

export function formatRating(
  value: number | null | undefined,
  options?: {
    digits?: number;
    trimTrailingZero?: boolean;
    fallback?: string;
  },
) {
  const digits = options?.digits ?? 1;
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return options?.fallback ?? (digits > 0 ? (0).toFixed(digits) : "0");
  }

  const rounded = roundRating(numeric, digits);

  if (options?.trimTrailingZero && digits > 0 && Number.isInteger(rounded)) {
    return String(rounded);
  }

  return rounded.toFixed(digits);
}
