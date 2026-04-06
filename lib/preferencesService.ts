import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  isNonEmptyString,
  isOneOf,
  isTime24h,
  normalizeTrimmedString,
} from "@/lib/validators";
import { PRIORITIES } from "@/types/task";
import {
  DASHBOARD_DENSITIES,
  DATE_FORMATS,
  getDefaultUserPreferences,
  WEEK_START_DAYS,
  type UserPreferences,
  type UserPreferencesInput,
} from "@/types/userPreferences";

const COLLECTION = "userPreferences";

function preferencesRef(userId: string) {
  return doc(db, COLLECTION, userId);
}

function parseTimestampish(raw: unknown): string | undefined {
  if (raw instanceof Timestamp) {
    return raw.toDate().toISOString();
  }

  if (typeof raw === "string") {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return undefined;
}

function parseUserPreferencesDoc(data: DocumentData, userId: string): UserPreferences | null {
  if (!isOneOf(data.dashboardDensity, DASHBOARD_DENSITIES)) {
    return null;
  }

  if (!isOneOf(data.defaultTaskPriority, PRIORITIES)) {
    return null;
  }

  if (typeof data.defaultReminderMinutes !== "number" || data.defaultReminderMinutes < 0) {
    return null;
  }

  if (!isOneOf(data.weekStartDay, WEEK_START_DAYS)) {
    return null;
  }

  if (!isOneOf(data.dateFormat, DATE_FORMATS)) {
    return null;
  }

  if (typeof data.quietHoursEnabled !== "boolean") {
    return null;
  }

  if (!isTime24h(data.quietHoursStart) || !isTime24h(data.quietHoursEnd)) {
    return null;
  }

  return {
    userId,
    dashboardDensity: data.dashboardDensity,
    defaultTaskPriority: data.defaultTaskPriority,
    defaultReminderMinutes: data.defaultReminderMinutes,
    weekStartDay: data.weekStartDay,
    dateFormat: data.dateFormat,
    quietHoursEnabled: data.quietHoursEnabled,
    quietHoursStart: data.quietHoursStart,
    quietHoursEnd: data.quietHoursEnd,
    createdAt: parseTimestampish(data.createdAt),
    updatedAt: parseTimestampish(data.updatedAt),
  };
}

function createPreferencesPayload(
  preferences: Omit<UserPreferences, "createdAt" | "updatedAt">
) {
  return {
    userId: preferences.userId,
    dashboardDensity: preferences.dashboardDensity,
    defaultTaskPriority: preferences.defaultTaskPriority,
    defaultReminderMinutes: preferences.defaultReminderMinutes,
    weekStartDay: preferences.weekStartDay,
    dateFormat: preferences.dateFormat,
    quietHoursEnabled: preferences.quietHoursEnabled,
    quietHoursStart: preferences.quietHoursStart,
    quietHoursEnd: preferences.quietHoursEnd,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export async function getOrCreateUserPreferences(
  userId: string
): Promise<UserPreferences> {
  const normalizedUserId = normalizeTrimmedString(userId);
  if (!isNonEmptyString(normalizedUserId)) {
    throw new Error("Invalid userId");
  }

  const ref = preferencesRef(normalizedUserId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const parsed = parseUserPreferencesDoc(snap.data(), normalizedUserId);
    if (parsed) {
      return parsed;
    }

    // Recover from malformed legacy docs that fail current schema/rules.
    await deleteDoc(ref);
  }

  const defaults = getDefaultUserPreferences(normalizedUserId);
  await setDoc(ref, createPreferencesPayload(defaults));
  return defaults;
}

export async function updateUserPreferences(
  userId: string,
  updates: UserPreferencesInput
): Promise<void> {
  const normalizedUserId = normalizeTrimmedString(userId);
  if (!isNonEmptyString(normalizedUserId)) {
    throw new Error("Invalid userId");
  }

  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (updates.dashboardDensity !== undefined) {
    if (!isOneOf(updates.dashboardDensity, DASHBOARD_DENSITIES)) {
      throw new Error("Invalid dashboard density.");
    }
    payload.dashboardDensity = updates.dashboardDensity;
  }

  if (updates.defaultTaskPriority !== undefined) {
    if (!isOneOf(updates.defaultTaskPriority, PRIORITIES)) {
      throw new Error("Invalid default task priority.");
    }
    payload.defaultTaskPriority = updates.defaultTaskPriority;
  }

  if (updates.defaultReminderMinutes !== undefined) {
    if (!Number.isInteger(updates.defaultReminderMinutes) || updates.defaultReminderMinutes < 0) {
      throw new Error("Default reminder must be a non-negative integer.");
    }
    payload.defaultReminderMinutes = updates.defaultReminderMinutes;
  }

  if (updates.weekStartDay !== undefined) {
    if (!isOneOf(updates.weekStartDay, WEEK_START_DAYS)) {
      throw new Error("Invalid week start day.");
    }
    payload.weekStartDay = updates.weekStartDay;
  }

  if (updates.dateFormat !== undefined) {
    if (!isOneOf(updates.dateFormat, DATE_FORMATS)) {
      throw new Error("Invalid date format.");
    }
    payload.dateFormat = updates.dateFormat;
  }

  if (updates.quietHoursEnabled !== undefined) {
    payload.quietHoursEnabled = updates.quietHoursEnabled;
  }

  if (updates.quietHoursStart !== undefined) {
    if (!isTime24h(updates.quietHoursStart)) {
      throw new Error("Quiet hour start must be HH:mm (24h).");
    }
    payload.quietHoursStart = updates.quietHoursStart;
  }

  if (updates.quietHoursEnd !== undefined) {
    if (!isTime24h(updates.quietHoursEnd)) {
      throw new Error("Quiet hour end must be HH:mm (24h).");
    }
    payload.quietHoursEnd = updates.quietHoursEnd;
  }

  await setDoc(preferencesRef(normalizedUserId), payload, { merge: true });
}

export async function resetUserPreferences(userId: string): Promise<void> {
  const normalizedUserId = normalizeTrimmedString(userId);
  if (!isNonEmptyString(normalizedUserId)) {
    throw new Error("Invalid userId");
  }

  const defaults = getDefaultUserPreferences(normalizedUserId);
  const ref = preferencesRef(normalizedUserId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const existingCreatedAt = snap.data().createdAt;
    if (existingCreatedAt instanceof Timestamp) {
      await setDoc(ref, {
        userId: defaults.userId,
        dashboardDensity: defaults.dashboardDensity,
        defaultTaskPriority: defaults.defaultTaskPriority,
        defaultReminderMinutes: defaults.defaultReminderMinutes,
        weekStartDay: defaults.weekStartDay,
        dateFormat: defaults.dateFormat,
        quietHoursEnabled: defaults.quietHoursEnabled,
        quietHoursStart: defaults.quietHoursStart,
        quietHoursEnd: defaults.quietHoursEnd,
        createdAt: existingCreatedAt,
        updatedAt: serverTimestamp(),
      });
      return;
    }

    await deleteDoc(ref);
  }

  await setDoc(ref, createPreferencesPayload(defaults));
}
