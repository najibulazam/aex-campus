"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getOrCreateUserPreferences,
  resetUserPreferences,
  updateUserPreferences,
} from "@/lib/preferencesService";
import { getFirebaseErrorMessage } from "@/lib/firebaseErrorMessage";
import { trackSettingsFailure } from "@/lib/settingsTelemetry";
import type {
  UserPreferences,
  UserPreferencesInput,
} from "@/types/userPreferences";

type MutationResult = { ok: true } | { ok: false; message: string };

function getMutationErrorMessage(error: unknown, fallback: string): string {
  return getFirebaseErrorMessage(error, fallback);
}

export function usePreferences() {
  const { user } = useAuth();

  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [preferencesError, setPreferencesError] = useState<string | null>(null);

  const loadPreferences = useCallback(async () => {
    if (!user) {
      setPreferencesLoading(false);
      setPreferences(null);
      return;
    }

    try {
      setPreferencesLoading(true);
      const nextPreferences = await getOrCreateUserPreferences(user.uid);
      setPreferences(nextPreferences);
      setPreferencesError(null);
    } catch (error) {
      trackSettingsFailure("preferences", "load", error);
      console.error("[usePreferences] Failed to load preferences:", error);
      setPreferencesError(getMutationErrorMessage(error, "Could not load workspace preferences."));
    } finally {
      setPreferencesLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadPreferences();
  }, [loadPreferences]);

  const savePreferences = useCallback(
    async (updates: UserPreferencesInput): Promise<MutationResult> => {
      if (!user) {
        return { ok: false, message: "You must be signed in." };
      }

      try {
        await updateUserPreferences(user.uid, updates);
        await loadPreferences();
        return { ok: true };
      } catch (error) {
        trackSettingsFailure("preferences", "save", error);
        console.error("[usePreferences] Failed to update preferences:", error);
        return {
          ok: false,
          message: getMutationErrorMessage(error, "Failed to update workspace preferences."),
        };
      }
    },
    [loadPreferences, user]
  );

  const resetPreferencesToDefaults = useCallback(async (): Promise<MutationResult> => {
    if (!user) {
      return { ok: false, message: "You must be signed in." };
    }

    try {
      await resetUserPreferences(user.uid);
      await loadPreferences();
      return { ok: true };
    } catch (error) {
      trackSettingsFailure("preferences", "reset", error);
      console.error("[usePreferences] Failed to reset preferences:", error);
      return {
        ok: false,
        message: getMutationErrorMessage(error, "Failed to reset workspace preferences."),
      };
    }
  }, [loadPreferences, user]);

  return {
    user,
    preferences,
    preferencesLoading,
    preferencesError,
    savePreferences,
    resetPreferencesToDefaults,
    reloadPreferences: loadPreferences,
  };
}
