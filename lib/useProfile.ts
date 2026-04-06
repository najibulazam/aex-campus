"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getOrCreateUserProfile,
  resetUserProfile,
  updateUserProfile,
} from "@/lib/profileService";
import { getFirebaseErrorMessage } from "@/lib/firebaseErrorMessage";
import { trackSettingsFailure } from "@/lib/settingsTelemetry";
import type { UserProfile, UserProfileInput } from "@/types/userProfile";

type MutationResult = { ok: true } | { ok: false; message: string };

function getMutationErrorMessage(error: unknown, fallback: string): string {
  return getFirebaseErrorMessage(error, fallback);
}

function shouldRetryProfileLoad(error: unknown): boolean {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";

  return code === "permission-denied" || code === "unauthenticated";
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function useProfile() {
  const { user } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!user) {
      setProfileLoading(false);
      setProfile(null);
      return;
    }

    try {
      setProfileLoading(true);
      const fallbackName = user.displayName?.trim() || user.email?.split("@")[0] || "Student";
      const fallbackTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      try {
        const nextProfile = await getOrCreateUserProfile(user.uid, fallbackName, fallbackTimezone);
        setProfile(nextProfile);
        setProfileError(null);
      } catch (firstError) {
        if (!shouldRetryProfileLoad(firstError)) {
          throw firstError;
        }

        // Newly-created sessions can briefly fail Firestore checks until auth state/token settles.
        await user.getIdToken(true);
        await wait(250);

        const nextProfile = await getOrCreateUserProfile(user.uid, fallbackName, fallbackTimezone);
        setProfile(nextProfile);
        setProfileError(null);
      }
    } catch (error) {
      trackSettingsFailure("profile", "load", error);
      console.error("[useProfile] Failed to load profile:", error);
      setProfileError(getMutationErrorMessage(error, "Could not load profile settings."));
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const saveProfile = useCallback(
    async (updates: UserProfileInput): Promise<MutationResult> => {
      if (!user) {
        return { ok: false, message: "You must be signed in." };
      }

      try {
        await updateUserProfile(user.uid, updates);
        await loadProfile();
        return { ok: true };
      } catch (error) {
        trackSettingsFailure("profile", "save", error);
        console.error("[useProfile] Failed to update profile:", error);
        return {
          ok: false,
          message: getMutationErrorMessage(error, "Failed to update profile settings."),
        };
      }
    },
    [loadProfile, user]
  );

  const resetProfileToDefaults = useCallback(async (): Promise<MutationResult> => {
    if (!user) {
      return { ok: false, message: "You must be signed in." };
    }

    try {
      const fallbackName = user.displayName?.trim() || user.email?.split("@")[0] || "Student";
      const fallbackTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      await resetUserProfile(user.uid, fallbackName, fallbackTimezone);
      await loadProfile();
      return { ok: true };
    } catch (error) {
      trackSettingsFailure("profile", "reset", error);
      console.error("[useProfile] Failed to reset profile:", error);
      return {
        ok: false,
        message: getMutationErrorMessage(error, "Failed to reset profile settings."),
      };
    }
  }, [loadProfile, user]);

  return {
    user,
    profile,
    profileLoading,
    profileError,
    saveProfile,
    resetProfileToDefaults,
    reloadProfile: loadProfile,
  };
}
