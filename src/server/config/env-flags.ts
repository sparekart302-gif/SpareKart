import "server-only";

const PLACEHOLDER_PATTERNS = [
  /^replace[-_]/i,
  /^your[-_]/i,
  /^example[-_]/i,
  /^changeme$/i,
  /^change-this$/i,
  /<[^>]+>/,
  /example\.com/i,
  /cluster\.example/i,
  /username:password/i,
  /replace-with/i,
  /^re_example/i,
];

export function isPlaceholderValue(value?: string | null) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return false;
  }

  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function hasConfiguredValue(value?: string | null) {
  return Boolean(value?.trim()) && !isPlaceholderValue(value);
}

export function hasConfiguredMongoUri(value?: string | null) {
  const trimmed = value?.trim();
  return Boolean(trimmed && /^mongodb(\+srv)?:\/\//i.test(trimmed) && !isPlaceholderValue(trimmed));
}

export function hasConfiguredGoogleClientId(value?: string | null) {
  const trimmed = value?.trim();
  return Boolean(
    trimmed && trimmed.endsWith(".apps.googleusercontent.com") && !isPlaceholderValue(trimmed),
  );
}
