import { describe, expect, it } from "vitest";
import { isValidHttpUrl, normalizeOptionalHttpUrl } from "@/lib/urlValidation";

describe("isValidHttpUrl", () => {
  it("accepts http and https URLs", () => {
    expect(isValidHttpUrl("http://example.com")).toBe(true);
    expect(isValidHttpUrl("https://example.com/path?x=1")).toBe(true);
  });

  it("rejects non-http protocols", () => {
    expect(isValidHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isValidHttpUrl("data:text/plain,hello")).toBe(false);
    expect(isValidHttpUrl("mailto:user@example.com")).toBe(false);
    expect(isValidHttpUrl("httpx://example.com")).toBe(false);
  });

  it("rejects malformed URLs", () => {
    expect(isValidHttpUrl("not a url")).toBe(false);
  });
});

describe("normalizeOptionalHttpUrl", () => {
  it("returns undefined for empty input", () => {
    expect(normalizeOptionalHttpUrl("", 300)).toBeUndefined();
    expect(normalizeOptionalHttpUrl("   ", 300)).toBeUndefined();
    expect(normalizeOptionalHttpUrl(undefined, 300)).toBeUndefined();
  });

  it("normalizes valid http/https URLs", () => {
    expect(normalizeOptionalHttpUrl(" https://example.com/path ", 300)).toBe(
      "https://example.com/path"
    );
  });

  it("returns undefined for invalid protocols or over-length values", () => {
    expect(normalizeOptionalHttpUrl("javascript:alert(1)", 300)).toBeUndefined();
    expect(normalizeOptionalHttpUrl("https://example.com", 5)).toBeUndefined();
  });
});
