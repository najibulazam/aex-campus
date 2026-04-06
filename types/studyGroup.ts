export const STUDY_GROUP_STATUSES = ["active", "archived"] as const;

export type StudyGroupStatus = (typeof STUDY_GROUP_STATUSES)[number];

export interface StudyGroup {
  id: string;
  ownerId: string;
  name: string;
  subject: string;
  status: StudyGroupStatus;
  memberIds: string[];
  meetingLink?: string;
  cadence?: string;
  nextMeetingAt?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StudyGroupInput {
  ownerId: string;
  name: string;
  subject: string;
  status?: StudyGroupStatus;
  memberIds?: string[];
  meetingLink?: string;
  cadence?: string;
  nextMeetingAt?: string;
  notes?: string;
}
