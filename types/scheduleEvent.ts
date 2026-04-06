export const SCHEDULE_EVENT_TYPES = [
  "class",
  "exam",
  "lab",
  "meeting",
  "assignment",
  "personal",
] as const;

export const SCHEDULE_EVENT_STATUSES = ["planned", "completed", "cancelled"] as const;

export type ScheduleEventType = (typeof SCHEDULE_EVENT_TYPES)[number];
export type ScheduleEventStatus = (typeof SCHEDULE_EVENT_STATUSES)[number];

export interface ScheduleEvent {
  id: string;
  userId: string;
  title: string;
  type: ScheduleEventType;
  status: ScheduleEventStatus;
  startAt: string;
  endAt: string;
  location?: string;
  courseId?: string;
  notes?: string;
  reminderMinutes?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ScheduleEventInput {
  userId: string;
  title: string;
  type: ScheduleEventType;
  startAt: string;
  endAt: string;
  status?: ScheduleEventStatus;
  location?: string;
  courseId?: string;
  notes?: string;
  reminderMinutes?: number;
}
