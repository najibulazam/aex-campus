export function normalizeTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function isNonEmptyString(value: unknown, maxLength?: number): value is string {
  if (typeof value !== "string") return false;

  const normalized = value.trim();
  if (!normalized) return false;

  if (typeof maxLength === "number" && normalized.length > maxLength) {
    return false;
  }

  return true;
}

export function isOneOf<T extends readonly string[]>(
  value: unknown,
  options: T
): value is T[number] {
  return typeof value === "string" && options.includes(value as T[number]);
}

export function isDateOnly(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function isTime24h(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

export function isIsoDateTime(value: unknown): value is string {
  if (typeof value !== "string") return false;

  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

export function hasOnlyKeys(
  data: Record<string, unknown>,
  allowedKeys: readonly string[]
): boolean {
  return Object.keys(data).every((key) => allowedKeys.includes(key));
}

export function hasRequiredKeys(
  data: Record<string, unknown>,
  requiredKeys: readonly string[]
): boolean {
  return requiredKeys.every((key) => key in data);
}
