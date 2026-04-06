export const SETTINGS_TABS = ["profile", "preferences", "notifications"] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number];

export function isSettingsTab(value: string | null): value is SettingsTab {
  return typeof value === "string" && SETTINGS_TABS.includes(value as SettingsTab);
}

export function resolveSettingsTab(
  value: string | null,
  fallback: SettingsTab = "profile"
): SettingsTab {
  return isSettingsTab(value) ? value : fallback;
}
