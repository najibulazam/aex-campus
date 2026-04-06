export type Priority = "low" | "medium" | "high";
export const PRIORITIES = ["low", "medium", "high"] as const;

export interface Task {
  id: string;
  userId: string;
  title: string;
  completed: boolean;
  priority?: Priority;
  dueDate?: string;
  time?: string | null;
  /** ISO string – populated after Firestore Timestamp is resolved */
  createdAt?: string;
}

export type FilterType = "all" | "completed" | "pending";
