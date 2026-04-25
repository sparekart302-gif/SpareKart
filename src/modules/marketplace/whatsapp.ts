function trimValue(value?: string | null) {
  return value?.trim() ?? "";
}

function normalizePakistaniMobileNumber(digits: string) {
  if (digits.length === 11 && digits.startsWith("0")) {
    return `92${digits.slice(1)}`;
  }

  return digits;
}

function extractDigitsFromUrl(value: string) {
  try {
    const url = new URL(value);
    const phoneParam = url.searchParams.get("phone");

    if (phoneParam) {
      return phoneParam.replace(/\D/g, "");
    }

    return url.pathname.replace(/\D/g, "");
  } catch {
    return value.replace(/\D/g, "");
  }
}

export function getSellerWhatsAppNumber(value?: string | null) {
  const raw = trimValue(value);

  if (!raw) {
    return undefined;
  }

  const digits = raw.startsWith("http")
    ? extractDigitsFromUrl(raw)
    : raw.replace(/\D/g, "");
  const normalized = normalizePakistaniMobileNumber(digits);

  if (normalized.length < 10) {
    return undefined;
  }

  return normalized;
}

export function buildSellerWhatsAppLink(
  value?: string | null,
  options?: {
    text?: string;
  },
) {
  const phoneNumber = getSellerWhatsAppNumber(value);

  if (!phoneNumber) {
    return undefined;
  }

  const baseUrl = `https://wa.me/${phoneNumber}`;
  const message = options?.text?.trim();

  if (!message) {
    return baseUrl;
  }

  return `${baseUrl}?text=${encodeURIComponent(message)}`;
}

export function normalizeSellerWhatsAppInput(value?: string | null) {
  const phoneNumber = getSellerWhatsAppNumber(value);
  return phoneNumber ? `https://wa.me/${phoneNumber}` : undefined;
}

