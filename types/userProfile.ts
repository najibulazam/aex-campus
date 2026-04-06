export const ACADEMIC_ROLES = ["student", "mentor", "instructor", "other"] as const;
export const EMAIL_VISIBILITY_LEVELS = ["private", "contacts", "public"] as const;

export type AcademicRole = (typeof ACADEMIC_ROLES)[number];
export type EmailVisibility = (typeof EMAIL_VISIBILITY_LEVELS)[number];

export interface UserProfile {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  academicRole: AcademicRole;
  timezone: string;
  emailVisibility: EmailVisibility;
  publicStudyCard: boolean;
  profileSharingEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfileInput {
  displayName?: string;
  avatarUrl?: string;
  academicRole?: AcademicRole;
  timezone?: string;
  emailVisibility?: EmailVisibility;
  publicStudyCard?: boolean;
  profileSharingEnabled?: boolean;
}

export function getDefaultUserProfile(
  userId: string,
  fallbackDisplayName = "Student",
  fallbackTimezone = "UTC"
): Omit<UserProfile, "createdAt" | "updatedAt"> {
  return {
    userId,
    displayName: fallbackDisplayName,
    academicRole: "student",
    timezone: fallbackTimezone,
    emailVisibility: "private",
    publicStudyCard: false,
    profileSharingEnabled: true,
  };
}
