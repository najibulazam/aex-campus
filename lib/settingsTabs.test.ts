import { describe, expect, it } from "vitest";
import {
  isSettingsTab,
  resolveSettingsTab,
  SETTINGS_TABS,
} from "@/lib/settingsTabs";

describe("settings tab helpers", () => {
  it("exposes the expected tab contract", () => {
    expect(SETTINGS_TABS).toEqual(["profile", "preferences", "notifications"]);
  });

  it("identifies valid tabs", () => {
    expect(isSettingsTab("profile")).toBe(true);
    expect(isSettingsTab("preferences")).toBe(true);
    expect(isSettingsTab("notifications")).toBe(true);
  });

  it("rejects invalid tabs", () => {
    expect(isSettingsTab("invalid")).toBe(false);
    expect(isSettingsTab(null)).toBe(false);
  });

  it("resolves to preferences by default when tab is invalid or missing", () => {
    expect(resolveSettingsTab(null)).toBe("preferences");
    expect(resolveSettingsTab("invalid")).toBe("preferences");
  });

  it("returns valid tabs unchanged", () => {
    expect(resolveSettingsTab("profile")).toBe("profile");
    expect(resolveSettingsTab("notifications")).toBe("notifications");
  });
});
