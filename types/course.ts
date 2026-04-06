export const COURSE_STATUSES = ["active", "archived", "completed"] as const;

export type CourseStatus = (typeof COURSE_STATUSES)[number];

export interface Course {
  id: string;
  userId: string;
  name: string;
  status: CourseStatus;
  code?: string;
  credits?: number;
  instructor?: string;
  semester?: string;
  color?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CourseInput {
  userId: string;
  name: string;
  status?: CourseStatus;
  code?: string;
  credits?: number;
  instructor?: string;
  semester?: string;
  color?: string;
}
