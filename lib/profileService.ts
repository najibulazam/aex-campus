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
  normalizeTrimmedString,
} from "@/lib/validators";
import { normalizeOptionalHttpUrl } from "@/lib/urlValidation";
import {
  ACADEMIC_ROLES,
  EMAIL_VISIBILITY_LEVELS,
  getDefaultUserProfile,
  type UserProfile,
  type UserProfileInput,
} from "@/types/userProfile";

const COLLECTION = "userProfiles";
const MAX_DISPLAY_NAME = 80;
const MAX_TIMEZONE = 64;

function profileRef(userId: string) {
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

function normalizeAvatarUrl(raw: unknown): string | undefined {
  return normalizeOptionalHttpUrl(raw, 500);
}

function parseUserProfileDoc(data: DocumentData, userId: string): UserProfile | null {
  const displayName = normalizeTrimmedString(data.displayName);
  if (!isNonEmptyString(displayName, MAX_DISPLAY_NAME)) {
    return null;
  }

  const timezone = normalizeTrimmedString(data.timezone);
  if (!isNonEmptyString(timezone, MAX_TIMEZONE)) {
    return null;
  }

  if (!isOneOf(data.academicRole, ACADEMIC_ROLES)) {
    return null;
  }

  if (!isOneOf(data.emailVisibility, EMAIL_VISIBILITY_LEVELS)) {
    return null;
  }

  if (typeof data.publicStudyCard !== "boolean") {
    return null;
  }

  if (typeof data.profileSharingEnabled !== "boolean") {
    return null;
  }

  return {
    userId,
    displayName,
    avatarUrl: normalizeAvatarUrl(data.avatarUrl),
    academicRole: data.academicRole,
    timezone,
    emailVisibility: data.emailVisibility,
    publicStudyCard: data.publicStudyCard,
    profileSharingEnabled: data.profileSharingEnabled,
    createdAt: parseTimestampish(data.createdAt),
    updatedAt: parseTimestampish(data.updatedAt),
  };
}

function createProfilePayload(profile: Omit<UserProfile, "createdAt" | "updatedAt">) {
  return {
    userId: profile.userId,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl ?? null,
    academicRole: profile.academicRole,
    timezone: profile.timezone,
    emailVisibility: profile.emailVisibility,
    publicStudyCard: profile.publicStudyCard,
    profileSharingEnabled: profile.profileSharingEnabled,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export async function getOrCreateUserProfile(
  userId: string,
  fallbackDisplayName = "Student",
  fallbackTimezone = "UTC"
): Promise<UserProfile> {
  const normalizedUserId = normalizeTrimmedString(userId);
  if (!isNonEmptyString(normalizedUserId)) {
    throw new Error("Invalid userId");
  }

  const ref = profileRef(normalizedUserId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const parsed = parseUserProfileDoc(snap.data(), normalizedUserId);
    if (parsed) {
      return parsed;
    }

    // Recover from malformed legacy docs that fail current schema/rules.
    await deleteDoc(ref);
  }

  const defaults = getDefaultUserProfile(
    normalizedUserId,
    normalizeTrimmedString(fallbackDisplayName) || "Student",
    normalizeTrimmedString(fallbackTimezone) || "UTC"
  );

  await setDoc(ref, createProfilePayload(defaults));
  return defaults;
}

export async function updateUserProfile(
  userId: string,
  updates: UserProfileInput
): Promise<void> {
  const normalizedUserId = normalizeTrimmedString(userId);
  if (!isNonEmptyString(normalizedUserId)) {
    throw new Error("Invalid userId");
  }

  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (updates.displayName !== undefined) {
    const displayName = normalizeTrimmedString(updates.displayName);
    if (!isNonEmptyString(displayName, MAX_DISPLAY_NAME)) {
      throw new Error("Display name is required and must be <= 80 chars.");
    }
    payload.displayName = displayName;
  }

  if (updates.avatarUrl !== undefined) {
    const normalized = normalizeAvatarUrl(updates.avatarUrl);
    if (updates.avatarUrl && !normalized) {
      throw new Error("Avatar URL must be a valid http/https URL.");
    }
    payload.avatarUrl = normalized ?? null;
  }

  if (updates.academicRole !== undefined) {
    if (!isOneOf(updates.academicRole, ACADEMIC_ROLES)) {
      throw new Error("Invalid academic role.");
    }
    payload.academicRole = updates.academicRole;
  }

  if (updates.timezone !== undefined) {
    const timezone = normalizeTrimmedString(updates.timezone);
    if (!isNonEmptyString(timezone, MAX_TIMEZONE)) {
      throw new Error("Timezone is required and must be <= 64 chars.");
    }
    payload.timezone = timezone;
  }

  if (updates.emailVisibility !== undefined) {
    if (!isOneOf(updates.emailVisibility, EMAIL_VISIBILITY_LEVELS)) {
      throw new Error("Invalid email visibility level.");
    }
    payload.emailVisibility = updates.emailVisibility;
  }

  if (updates.publicStudyCard !== undefined) {
    payload.publicStudyCard = updates.publicStudyCard;
  }

  if (updates.profileSharingEnabled !== undefined) {
    payload.profileSharingEnabled = updates.profileSharingEnabled;
  }

  await setDoc(profileRef(normalizedUserId), payload, { merge: true });
}

export async function resetUserProfile(
  userId: string,
  fallbackDisplayName = "Student",
  fallbackTimezone = "UTC"
): Promise<void> {
  const normalizedUserId = normalizeTrimmedString(userId);
  if (!isNonEmptyString(normalizedUserId)) {
    throw new Error("Invalid userId");
  }

  const defaults = getDefaultUserProfile(
    normalizedUserId,
    normalizeTrimmedString(fallbackDisplayName) || "Student",
    normalizeTrimmedString(fallbackTimezone) || "UTC"
  );

  const ref = profileRef(normalizedUserId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const existingCreatedAt = snap.data().createdAt;
    if (existingCreatedAt instanceof Timestamp) {
      await setDoc(ref, {
        userId: defaults.userId,
        displayName: defaults.displayName,
        avatarUrl: defaults.avatarUrl ?? null,
        academicRole: defaults.academicRole,
        timezone: defaults.timezone,
        emailVisibility: defaults.emailVisibility,
        publicStudyCard: defaults.publicStudyCard,
        profileSharingEnabled: defaults.profileSharingEnabled,
        createdAt: existingCreatedAt,
        updatedAt: serverTimestamp(),
      });
      return;
    }

    await deleteDoc(ref);
  }

  await setDoc(ref, createProfilePayload(defaults));
}
