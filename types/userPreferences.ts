import type { Priority } from "@/types/task";

export const DASHBOARD_DENSITIES = ["comfortable", "compact"] as const;
export const WEEK_START_DAYS = ["monday", "sunday"] as const;
export const DATE_FORMATS = ["yyyy-mm-dd", "dd-mm-yyyy", "mm-dd-yyyy"] as const;

export type DashboardDensity = (typeof DASHBOARD_DENSITIES)[number];
export type WeekStartDay = (typeof WEEK_START_DAYS)[number];
export type DateFormat = (typeof DATE_FORMATS)[number];

export interface UserPreferences {
  userId: string;
  dashboardDensity: DashboardDensity;
  defaultTaskPriority: Priority;
  defaultReminderMinutes: number;
  weekStartDay: WeekStartDay;
  dateFormat: DateFormat;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserPreferencesInput {
  dashboardDensity?: DashboardDensity;
  defaultTaskPriority?: Priority;
  defaultReminderMinutes?: number;
  weekStartDay?: WeekStartDay;
  dateFormat?: DateFormat;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export function getDefaultUserPreferences(
  userId: string
): Omit<UserPreferences, "createdAt" | "updatedAt"> {
  return {
    userId,
    dashboardDensity: "comfortable",
    defaultTaskPriority: "medium",
    defaultReminderMinutes: 30,
    weekStartDay: "monday",
    dateFormat: "yyyy-mm-dd",
    quietHoursEnabled: false,
    quietHoursStart: "22:00",
    quietHoursEnd: "07:00",
  };
}
