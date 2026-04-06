import { isNonEmptyString, normalizeTrimmedString } from "@/lib/validators";

export function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeOptionalHttpUrl(
  value: unknown,
  maxLength: number
): string | undefined {
  const normalized = normalizeTrimmedString(value);
  if (!normalized) return undefined;
  if (!isNonEmptyString(normalized, maxLength)) return undefined;

  if (!isValidHttpUrl(normalized)) {
    return undefined;
  }

  return new URL(normalized).toString();
}
