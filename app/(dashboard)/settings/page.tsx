"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { usePreferences } from "@/lib/usePreferences";
import { useProfile } from "@/lib/useProfile";
import { isTime24h } from "@/lib/validators";
import {
  ACADEMIC_ROLES,
  EMAIL_VISIBILITY_LEVELS,
  type UserProfileInput,
} from "@/types/userProfile";
import {
  DASHBOARD_DENSITIES,
  DATE_FORMATS,
  WEEK_START_DAYS,
  type UserPreferencesInput,
} from "@/types/userPreferences";
import { PRIORITIES } from "@/types/task";

type SettingsTab = "profile" | "preferences" | "notifications";

type ActionNotice = {
  type: "success" | "error";
  text: string;
};

type ProfileFieldErrors = Partial<Record<"displayName" | "avatarUrl" | "timezone", string>>;
type PreferencesFieldErrors = Partial<Record<"defaultReminderMinutes", string>>;
type NotificationFieldErrors = Partial<
  Record<"defaultReminderMinutes" | "quietHoursStart" | "quietHoursEnd", string>
>;

const SETTINGS_TABS: SettingsTab[] = ["profile", "preferences", "notifications"];

function isSettingsTab(value: string | null): value is SettingsTab {
  return value === "profile" || value === "preferences" || value === "notifications";
}

function labelForTab(tab: SettingsTab): string {
  if (tab === "profile") return "Profile";
  if (tab === "notifications") return "Notifications";
  return "Preferences";
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validateProfile(values: {
  displayName: string;
  avatarUrl: string;
  timezone: string;
}): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {};
  const displayName = values.displayName.trim();
  const timezone = values.timezone.trim();
  const avatarUrl = values.avatarUrl.trim();

  if (!displayName) {
    errors.displayName = "Display name is required.";
  } else if (displayName.length > 80) {
    errors.displayName = "Display name must be 80 characters or less.";
  }

  if (!timezone) {
    errors.timezone = "Timezone is required.";
  } else if (timezone.length > 64) {
    errors.timezone = "Timezone must be 64 characters or less.";
  }

  if (avatarUrl && !isValidHttpUrl(avatarUrl)) {
    errors.avatarUrl = "Avatar URL must be a valid http/https URL.";
  }

  return errors;
}

function validateReminderMinutes(value: number): string | null {
  if (!Number.isInteger(value) || value < 0) {
    return "Reminder minutes must be a non-negative whole number.";
  }

  return null;
}

function validatePreferences(values: { defaultReminderMinutes: number }): PreferencesFieldErrors {
  const errors: PreferencesFieldErrors = {};
  const reminderError = validateReminderMinutes(values.defaultReminderMinutes);

  if (reminderError) {
    errors.defaultReminderMinutes = reminderError;
  }

  return errors;
}

function validateNotifications(values: {
  defaultReminderMinutes: number;
  quietHoursStart: string;
  quietHoursEnd: string;
}): NotificationFieldErrors {
  const errors: NotificationFieldErrors = {};
  const reminderError = validateReminderMinutes(values.defaultReminderMinutes);

  if (reminderError) {
    errors.defaultReminderMinutes = reminderError;
  }

  if (!isTime24h(values.quietHoursStart)) {
    errors.quietHoursStart = "Quiet hour start must be HH:mm (24h).";
  }

  if (!isTime24h(values.quietHoursEnd)) {
    errors.quietHoursEnd = "Quiet hour end must be HH:mm (24h).";
  }

  return errors;
}

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const {
    profile,
    profileLoading,
    profileError,
    saveProfile,
    resetProfileToDefaults,
  } = useProfile();

  const {
    preferences,
    preferencesLoading,
    preferencesError,
    savePreferences,
    resetPreferencesToDefaults,
  } = usePreferences();

  const [actionNotice, setActionNotice] = useState<ActionNotice | null>(null);
  const [saving, setSaving] = useState(false);

  const [profileDraft, setProfileDraft] = useState<UserProfileInput>({});
  const [preferencesDraft, setPreferencesDraft] = useState<UserPreferencesInput>({});
  const [notificationDraft, setNotificationDraft] = useState<UserPreferencesInput>({});

  const requestedTab = searchParams.get("tab");
  const activeTab: SettingsTab = isSettingsTab(requestedTab) ? requestedTab : "preferences";

  useEffect(() => {
    if (isSettingsTab(requestedTab)) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "preferences");
    router.replace(`${pathname}?${params.toString()}`);
  }, [pathname, requestedTab, router, searchParams]);

  const profileValues = {
    displayName: profileDraft.displayName ?? profile?.displayName ?? "",
    avatarUrl: profileDraft.avatarUrl ?? profile?.avatarUrl ?? "",
    academicRole: profileDraft.academicRole ?? profile?.academicRole ?? "student",
    timezone: profileDraft.timezone ?? profile?.timezone ?? "UTC",
    emailVisibility: profileDraft.emailVisibility ?? profile?.emailVisibility ?? "private",
    publicStudyCard: profileDraft.publicStudyCard ?? profile?.publicStudyCard ?? false,
    profileSharingEnabled:
      profileDraft.profileSharingEnabled ?? profile?.profileSharingEnabled ?? true,
  } satisfies Required<UserProfileInput>;

  const preferencesValues = {
    dashboardDensity:
      preferencesDraft.dashboardDensity ?? preferences?.dashboardDensity ?? "comfortable",
    defaultTaskPriority:
      preferencesDraft.defaultTaskPriority ?? preferences?.defaultTaskPriority ?? "medium",
    defaultReminderMinutes:
      preferencesDraft.defaultReminderMinutes ?? preferences?.defaultReminderMinutes ?? 30,
    weekStartDay: preferencesDraft.weekStartDay ?? preferences?.weekStartDay ?? "monday",
    dateFormat: preferencesDraft.dateFormat ?? preferences?.dateFormat ?? "yyyy-mm-dd",
  } satisfies Required<
    Pick<
      UserPreferencesInput,
      "dashboardDensity" | "defaultTaskPriority" | "defaultReminderMinutes" | "weekStartDay" | "dateFormat"
    >
  >;

  const notificationValues = {
    defaultReminderMinutes:
      notificationDraft.defaultReminderMinutes ??
      preferences?.defaultReminderMinutes ??
      preferencesValues.defaultReminderMinutes,
    quietHoursEnabled:
      notificationDraft.quietHoursEnabled ?? preferences?.quietHoursEnabled ?? false,
    quietHoursStart: notificationDraft.quietHoursStart ?? preferences?.quietHoursStart ?? "22:00",
    quietHoursEnd: notificationDraft.quietHoursEnd ?? preferences?.quietHoursEnd ?? "07:00",
  } satisfies Required<
    Pick<
      UserPreferencesInput,
      "defaultReminderMinutes" | "quietHoursEnabled" | "quietHoursStart" | "quietHoursEnd"
    >
  >;

  const profileErrors = validateProfile({
    displayName: profileValues.displayName,
    avatarUrl: profileValues.avatarUrl,
    timezone: profileValues.timezone,
  });
  const preferencesErrors = validatePreferences({
    defaultReminderMinutes: preferencesValues.defaultReminderMinutes,
  });
  const notificationErrors = validateNotifications({
    defaultReminderMinutes: notificationValues.defaultReminderMinutes,
    quietHoursStart: notificationValues.quietHoursStart,
    quietHoursEnd: notificationValues.quietHoursEnd,
  });

  const profileDirty = Boolean(
    profile &&
      (profileValues.displayName !== profile.displayName ||
        profileValues.avatarUrl !== (profile.avatarUrl ?? "") ||
        profileValues.academicRole !== profile.academicRole ||
        profileValues.timezone !== profile.timezone ||
        profileValues.emailVisibility !== profile.emailVisibility ||
        profileValues.publicStudyCard !== profile.publicStudyCard ||
        profileValues.profileSharingEnabled !== profile.profileSharingEnabled)
  );

  const preferencesDirty = Boolean(
    preferences &&
      (preferencesValues.dashboardDensity !== preferences.dashboardDensity ||
        preferencesValues.defaultTaskPriority !== preferences.defaultTaskPriority ||
        preferencesValues.defaultReminderMinutes !== preferences.defaultReminderMinutes ||
        preferencesValues.weekStartDay !== preferences.weekStartDay ||
        preferencesValues.dateFormat !== preferences.dateFormat)
  );

  const notificationsDirty = Boolean(
    preferences &&
      (notificationValues.defaultReminderMinutes !== preferences.defaultReminderMinutes ||
        notificationValues.quietHoursEnabled !== preferences.quietHoursEnabled ||
        notificationValues.quietHoursStart !== preferences.quietHoursStart ||
        notificationValues.quietHoursEnd !== preferences.quietHoursEnd)
  );

  const hasProfileErrors = Object.keys(profileErrors).length > 0;
  const hasPreferencesErrors = Object.keys(preferencesErrors).length > 0;
  const hasNotificationErrors = Object.keys(notificationErrors).length > 0;
  const hasAnyUnsavedChanges = profileDirty || preferencesDirty || notificationsDirty;

  const getDirtyStateForTab = (tab: SettingsTab): boolean => {
    if (tab === "profile") return profileDirty;
    if (tab === "notifications") return notificationsDirty;
    return preferencesDirty;
  };

  useEffect(() => {
    if (!actionNotice || actionNotice.type !== "success") {
      return;
    }

    const timeout = window.setTimeout(() => {
      setActionNotice(null);
    }, 4000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [actionNotice]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasAnyUnsavedChanges) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasAnyUnsavedChanges]);

  const changeTab = (tab: SettingsTab) => {
    if (tab !== activeTab && getDirtyStateForTab(activeTab)) {
      const confirmed = window.confirm(
        "You have unsaved changes on this tab. Leave without saving?"
      );
      if (!confirmed) {
        return;
      }
    }

    setActionNotice(null);

    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const saveProfileChanges = async () => {
    if (hasProfileErrors || !profileDirty) {
      return;
    }

    setSaving(true);
    const result = await saveProfile(profileDraft);
    setSaving(false);

    if (!result.ok) {
      setActionNotice({ type: "error", text: result.message });
      return;
    }

    setProfileDraft({});
    setActionNotice({ type: "success", text: "Profile settings saved." });
  };

  const savePreferenceChanges = async () => {
    if (hasPreferencesErrors || !preferencesDirty) {
      return;
    }

    setSaving(true);
    const result = await savePreferences(preferencesDraft);
    setSaving(false);

    if (!result.ok) {
      setActionNotice({ type: "error", text: result.message });
      return;
    }

    setPreferencesDraft({});
    setActionNotice({ type: "success", text: "Workspace preferences saved." });
  };

  const saveNotificationChanges = async () => {
    if (hasNotificationErrors || !notificationsDirty) {
      return;
    }

    setSaving(true);
    const result = await savePreferences(notificationDraft);
    setSaving(false);

    if (!result.ok) {
      setActionNotice({ type: "error", text: result.message });
      return;
    }

    setNotificationDraft({});
    setActionNotice({ type: "success", text: "Notification preferences saved." });
  };

  const resetProfile = async () => {
    setSaving(true);
    const result = await resetProfileToDefaults();
    setSaving(false);

    if (!result.ok) {
      setActionNotice({ type: "error", text: result.message });
      return;
    }

    setProfileDraft({});
    setActionNotice({ type: "success", text: "Profile reset to defaults." });
  };

  const resetPreferences = async () => {
    setSaving(true);
    const result = await resetPreferencesToDefaults();
    setSaving(false);

    if (!result.ok) {
      setActionNotice({ type: "error", text: result.message });
      return;
    }

    setPreferencesDraft({});
    setNotificationDraft({});
    setActionNotice({ type: "success", text: "Preferences reset to defaults." });
  };

  if (profileLoading || preferencesLoading) {
    return (
      <section className="neo-page-shell py-6 space-y-5">
        <div className="h-10 neo-skeleton w-56" />
        <div className="h-52 neo-skeleton" />
        <div className="h-72 neo-skeleton" />
      </section>
    );
  }

  return (
    <section className="neo-page-shell py-6 space-y-5">
      <div className="neo-card p-6 md:p-8 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="neo-text-secondary">
          Manage profile identity, workspace behavior, and notification rules.
        </p>
        {hasAnyUnsavedChanges && (
          <p className="text-xs text-amber-300">You have unsaved changes.</p>
        )}
      </div>

      {(profileError || preferencesError) && (
        <div role="alert" className="neo-alert px-4 py-3.5 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <span className="text-sm font-medium">{profileError || preferencesError}</span>
        </div>
      )}

      {actionNotice && (
        <div
          role="status"
          className={`neo-alert px-4 py-3.5 flex items-start justify-between gap-3 ${
            actionNotice.type === "error"
              ? "border-red-500/45 bg-red-900/20 text-red-200"
              : ""
          }`}
        >
          <span className="text-sm font-medium">{actionNotice.text}</span>
          <button
            type="button"
            className="neo-btn neo-btn-ghost h-8 px-2 text-xs"
            onClick={() => setActionNotice(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="neo-card p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap gap-2">
          {SETTINGS_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => changeTab(tab)}
              className={`neo-btn h-9 px-3 capitalize text-sm ${
                activeTab === tab ? "neo-btn-primary" : "neo-btn-ghost"
              }`}
            >
              {labelForTab(tab)}
              {getDirtyStateForTab(tab) && <span className="ml-1 text-amber-300">*</span>}
            </button>
          ))}
        </div>

        {activeTab === "profile" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <article className="neo-card p-5 space-y-3">
              <h2 className="text-xl font-semibold">Identity</h2>
              <div className="space-y-2">
                <input
                  className="neo-input"
                  placeholder="Display name"
                  value={profileValues.displayName}
                  onChange={(event) =>
                    setProfileDraft((current) => ({ ...current, displayName: event.target.value }))
                  }
                />
                {profileErrors.displayName && (
                  <p className="text-xs text-red-300 px-1">{profileErrors.displayName}</p>
                )}
                <input
                  className="neo-input"
                  placeholder="Avatar URL"
                  value={profileValues.avatarUrl}
                  onChange={(event) =>
                    setProfileDraft((current) => ({ ...current, avatarUrl: event.target.value }))
                  }
                />
                {profileErrors.avatarUrl && (
                  <p className="text-xs text-red-300 px-1">{profileErrors.avatarUrl}</p>
                )}
                <select
                  className="neo-select"
                  value={profileValues.academicRole}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      academicRole: event.target.value as UserProfileInput["academicRole"],
                    }))
                  }
                >
                  {ACADEMIC_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <input
                  className="neo-input"
                  placeholder="Timezone"
                  value={profileValues.timezone}
                  onChange={(event) =>
                    setProfileDraft((current) => ({ ...current, timezone: event.target.value }))
                  }
                />
                {profileErrors.timezone && (
                  <p className="text-xs text-red-300 px-1">{profileErrors.timezone}</p>
                )}
              </div>
            </article>

            <article className="neo-card p-5 space-y-3">
              <h2 className="text-xl font-semibold">Visibility</h2>
              <div className="space-y-2">
                <select
                  className="neo-select"
                  value={profileValues.emailVisibility}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      emailVisibility: event.target.value as UserProfileInput["emailVisibility"],
                    }))
                  }
                >
                  {EMAIL_VISIBILITY_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>

                <label className="neo-card-soft px-3 py-2 flex items-center justify-between gap-3 text-sm">
                  <span>Public study card</span>
                  <input
                    type="checkbox"
                    className="neo-checkbox"
                    checked={profileValues.publicStudyCard}
                    onChange={(event) =>
                      setProfileDraft((current) => ({
                        ...current,
                        publicStudyCard: event.target.checked,
                      }))
                    }
                  />
                </label>

                <label className="neo-card-soft px-3 py-2 flex items-center justify-between gap-3 text-sm">
                  <span>Profile sharing enabled</span>
                  <input
                    type="checkbox"
                    className="neo-checkbox"
                    checked={profileValues.profileSharingEnabled}
                    onChange={(event) =>
                      setProfileDraft((current) => ({
                        ...current,
                        profileSharingEnabled: event.target.checked,
                      }))
                    }
                  />
                </label>
              </div>
            </article>

            <div className="lg:col-span-2 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="neo-btn neo-btn-ghost h-10 px-4"
                onClick={() => setProfileDraft({})}
                disabled={saving || !profileDirty}
              >
                Discard
              </button>
              <button type="button" className="neo-btn neo-btn-ghost h-10 px-4" onClick={resetProfile} disabled={saving}>
                Reset
              </button>
              <button
                type="button"
                className="neo-btn neo-btn-primary h-10 px-4"
                onClick={saveProfileChanges}
                disabled={saving || hasProfileErrors || !profileDirty}
              >
                Save Profile
              </button>
            </div>
          </div>
        )}

        {activeTab === "preferences" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <article className="neo-card p-5 space-y-3">
              <h2 className="text-xl font-semibold">Workspace Preferences</h2>
              <div className="space-y-2">
                <select
                  className="neo-select"
                  value={preferencesValues.dashboardDensity}
                  onChange={(event) =>
                    setPreferencesDraft((current) => ({
                      ...current,
                      dashboardDensity: event.target.value as UserPreferencesInput["dashboardDensity"],
                    }))
                  }
                >
                  {DASHBOARD_DENSITIES.map((density) => (
                    <option key={density} value={density}>
                      {density}
                    </option>
                  ))}
                </select>

                <select
                  className="neo-select"
                  value={preferencesValues.weekStartDay}
                  onChange={(event) =>
                    setPreferencesDraft((current) => ({
                      ...current,
                      weekStartDay: event.target.value as UserPreferencesInput["weekStartDay"],
                    }))
                  }
                >
                  {WEEK_START_DAYS.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>

                <select
                  className="neo-select"
                  value={preferencesValues.dateFormat}
                  onChange={(event) =>
                    setPreferencesDraft((current) => ({
                      ...current,
                      dateFormat: event.target.value as UserPreferencesInput["dateFormat"],
                    }))
                  }
                >
                  {DATE_FORMATS.map((format) => (
                    <option key={format} value={format}>
                      {format}
                    </option>
                  ))}
                </select>
              </div>
            </article>

            <article className="neo-card p-5 space-y-3">
              <h2 className="text-xl font-semibold">Task Defaults</h2>
              <div className="space-y-2">
                <select
                  className="neo-select"
                  value={preferencesValues.defaultTaskPriority}
                  onChange={(event) =>
                    setPreferencesDraft((current) => ({
                      ...current,
                      defaultTaskPriority: event.target.value as UserPreferencesInput["defaultTaskPriority"],
                    }))
                  }
                >
                  {PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min={0}
                  className="neo-input"
                  value={preferencesValues.defaultReminderMinutes}
                  onChange={(event) =>
                    setPreferencesDraft((current) => ({
                      ...current,
                      defaultReminderMinutes: event.target.valueAsNumber,
                    }))
                  }
                />
                {preferencesErrors.defaultReminderMinutes && (
                  <p className="text-xs text-red-300 px-1">{preferencesErrors.defaultReminderMinutes}</p>
                )}
              </div>
            </article>

            <div className="lg:col-span-2 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="neo-btn neo-btn-ghost h-10 px-4"
                onClick={() => setPreferencesDraft({})}
                disabled={saving || !preferencesDirty}
              >
                Discard
              </button>
              <button type="button" className="neo-btn neo-btn-ghost h-10 px-4" onClick={resetPreferences} disabled={saving}>
                Reset
              </button>
              <button
                type="button"
                className="neo-btn neo-btn-primary h-10 px-4"
                onClick={savePreferenceChanges}
                disabled={saving || hasPreferencesErrors || !preferencesDirty}
              >
                Save Preferences
              </button>
            </div>
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <article className="neo-card p-5 space-y-3">
              <h2 className="text-xl font-semibold">Reminder Rules</h2>
              <div className="space-y-2">
                <input
                  type="number"
                  min={0}
                  className="neo-input"
                  value={notificationValues.defaultReminderMinutes}
                  onChange={(event) =>
                    setNotificationDraft((current) => ({
                      ...current,
                      defaultReminderMinutes: event.target.valueAsNumber,
                    }))
                  }
                />
                {notificationErrors.defaultReminderMinutes && (
                  <p className="text-xs text-red-300 px-1">{notificationErrors.defaultReminderMinutes}</p>
                )}
                <p className="text-xs neo-text-muted px-1">Default reminder lead time (minutes)</p>
              </div>
            </article>

            <article className="neo-card p-5 space-y-3">
              <h2 className="text-xl font-semibold">Quiet Hours</h2>
              <div className="space-y-2">
                <label className="neo-card-soft px-3 py-2 flex items-center justify-between gap-3 text-sm">
                  <span>Enable quiet hours</span>
                  <input
                    type="checkbox"
                    className="neo-checkbox"
                    checked={notificationValues.quietHoursEnabled}
                    onChange={(event) =>
                      setNotificationDraft((current) => ({
                        ...current,
                        quietHoursEnabled: event.target.checked,
                      }))
                    }
                  />
                </label>

                <input
                  type="time"
                  className="neo-input"
                  value={notificationValues.quietHoursStart}
                  onChange={(event) =>
                    setNotificationDraft((current) => ({
                      ...current,
                      quietHoursStart: event.target.value,
                    }))
                  }
                />
                {notificationErrors.quietHoursStart && (
                  <p className="text-xs text-red-300 px-1">{notificationErrors.quietHoursStart}</p>
                )}
                <input
                  type="time"
                  className="neo-input"
                  value={notificationValues.quietHoursEnd}
                  onChange={(event) =>
                    setNotificationDraft((current) => ({
                      ...current,
                      quietHoursEnd: event.target.value,
                    }))
                  }
                />
                {notificationErrors.quietHoursEnd && (
                  <p className="text-xs text-red-300 px-1">{notificationErrors.quietHoursEnd}</p>
                )}
              </div>
            </article>

            <div className="lg:col-span-2 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="neo-btn neo-btn-ghost h-10 px-4"
                onClick={() => setNotificationDraft({})}
                disabled={saving || !notificationsDirty}
              >
                Discard
              </button>
              <button
                type="button"
                className="neo-btn neo-btn-primary h-10 px-4"
                onClick={saveNotificationChanges}
                disabled={saving || hasNotificationErrors || !notificationsDirty}
              >
                Save Notifications
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
