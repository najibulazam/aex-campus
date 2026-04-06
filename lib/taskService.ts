import {
  collection,
  addDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  where,
  runTransaction,
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import { type Task, type Priority } from "@/types/task";

const COLLECTION = "tasks";
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_ONLY_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const VALID_PRIORITIES: Priority[] = ["low", "medium", "high"];

function isValidPriority(value: unknown): value is Priority {
  return (
    typeof value === "string" &&
    VALID_PRIORITIES.includes(value as Priority)
  );
}

function isDateOnly(value: unknown): value is string {
  return typeof value === "string" && DATE_ONLY_REGEX.test(value);
}

function isTimeOnly(value: unknown): value is string {
  return typeof value === "string" && TIME_ONLY_REGEX.test(value);
}

function parseTaskDocument(
  docSnap: QueryDocumentSnapshot<DocumentData>
): Task | null {
  const data = docSnap.data();

  const userId = typeof data.userId === "string" ? data.userId : "";
  const rawTitle = typeof data.title === "string" ? data.title.trim() : "";
  const completed = data.completed;

  if (!userId || !rawTitle || typeof completed !== "boolean") {
    console.warn(
      `[subscribeTasks] Ignoring malformed task document: ${docSnap.id}`
    );
    return null;
  }

  const rawCreatedAt = data.createdAt;
  let createdAt: string | undefined;

  if (rawCreatedAt instanceof Timestamp) {
    createdAt = rawCreatedAt.toDate().toISOString();
  } else if (typeof rawCreatedAt === "string") {
    const parsed = new Date(rawCreatedAt);
    if (!Number.isNaN(parsed.getTime())) {
      createdAt = parsed.toISOString();
    }
  }

  return {
    id: docSnap.id,
    userId,
    title: rawTitle,
    completed,
    priority: isValidPriority(data.priority) ? data.priority : undefined,
    dueDate: isDateOnly(data.dueDate) ? data.dueDate : undefined,
    time: isTimeOnly(data.time) ? data.time : null,
    createdAt,
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FirestoreTask {
  userId: string;
  title: string;
  completed: boolean;
  priority?: Priority;
  dueDate?: string;
  time?: string | null;
  createdAt: ReturnType<typeof serverTimestamp>;
}

// ─── Real-time listener ───────────────────────────────────────────────────────

/**
 * Subscribe to tasks that belong to the given user, ordered by creation time desc.
 * Returns an unsubscribe function – call it on component unmount.
 *
 * NOTE: this query requires a Firestore composite index on (userId ASC, createdAt DESC).
 * Firebase will log a direct link to create it the first time this runs.
 */
export function subscribeTasks(
  userId: string,
  onUpdate: (tasks: Task[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const orderedQuery = query(
    collection(db, COLLECTION),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const fallbackQuery = query(
    collection(db, COLLECTION),
    where("userId", "==", userId)
  );

  const mapTasks = (
    snapshot: QuerySnapshot<DocumentData>,
    clientSort = false
  ): Task[] => {
    const tasks: Task[] = snapshot.docs.flatMap((docSnap) => {
      const parsed = parseTaskDocument(docSnap);
      return parsed ? [parsed] : [];
    });

    if (clientSort) {
      tasks.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
    }

    return tasks;
  };

  let activeUnsubscribe: Unsubscribe = () => {};
  let usingFallback = false;

  const subscribeWithFallback = () => {
    activeUnsubscribe = onSnapshot(
      fallbackQuery,
      (snapshot) => {
        onUpdate(mapTasks(snapshot, true));
      },
      (error) => {
        console.error("[subscribeTasks:fallback] Firestore error:", error);
        onError?.(error);
      }
    );
  };

  activeUnsubscribe = onSnapshot(
    orderedQuery,
    (snapshot) => {
      onUpdate(mapTasks(snapshot));
    },
    (error) => {
      const code = (error as { code?: string }).code;
      const message = (error as { message?: string }).message?.toLowerCase() ?? "";
      const requiresIndex =
        code === "failed-precondition" &&
        (message.includes("requires an index") || message.includes("query requires an index"));

      if (requiresIndex && !usingFallback) {
        usingFallback = true;
        console.warn(
          "[subscribeTasks] Missing composite index. Falling back to client-side sort. Deploy firestore.indexes.json for full performance."
        );
        activeUnsubscribe();
        subscribeWithFallback();
        return;
      }

      console.error("[subscribeTasks] Firestore error:", error);
      onError?.(error);
    }
  );

  return () => activeUnsubscribe();
}

// ─── Add ──────────────────────────────────────────────────────────────────────

export async function addTask(
  userId: string,
  title: string,
  priority?: Priority,
  dueDate?: string,
  time?: string | null
): Promise<void> {
  try {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      throw new Error("Task title cannot be empty");
    }

    if (normalizedTitle.length > 200) {
      throw new Error("Task title must be 200 characters or fewer");
    }

    if (priority && !isValidPriority(priority)) {
      throw new Error("Invalid task priority");
    }

    if (dueDate && !isDateOnly(dueDate)) {
      throw new Error("Invalid due date format");
    }

    if (time && !isTimeOnly(time)) {
      throw new Error("Invalid time format");
    }

    const payload: FirestoreTask = {
      userId,
      title: normalizedTitle,
      completed: false,
      time: time ?? null,
      createdAt: serverTimestamp(),
    };
    if (priority) payload.priority = priority;
    if (dueDate) payload.dueDate = dueDate;

    await addDoc(collection(db, COLLECTION), payload);
  } catch (error) {
    console.error("[addTask] Failed to add task:", error);
    throw error;
  }
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

export async function toggleTask(
  id: string,
  completed: boolean,
  userId: string
): Promise<void> {
  try {
    await runTransaction(db, async (transaction) => {
      const taskRef = doc(db, COLLECTION, id);
      const taskSnap = await transaction.get(taskRef);

      if (!taskSnap.exists()) {
        throw new Error("Task not found");
      }

      const taskUserId = taskSnap.data().userId as string | undefined;
      if (!taskUserId) {
        throw new Error("Task is missing owner metadata");
      }

      // Guardrail in app logic; Firestore rules must still enforce ownership server-side.
      if (taskUserId !== userId) {
        throw new Error("Unauthorized task update attempt");
      }

      transaction.update(taskRef, { completed });
    });
  } catch (error) {
    console.error("[toggleTask] Failed to update task:", error);
    throw error;
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteTask(id: string, userId: string): Promise<void> {
  try {
    await runTransaction(db, async (transaction) => {
      const taskRef = doc(db, COLLECTION, id);
      const taskSnap = await transaction.get(taskRef);

      if (!taskSnap.exists()) {
        throw new Error("Task not found");
      }

      const taskUserId = taskSnap.data().userId as string | undefined;
      if (!taskUserId) {
        throw new Error("Task is missing owner metadata");
      }

      // Guardrail in app logic; Firestore rules must still enforce ownership server-side.
      if (taskUserId !== userId) {
        throw new Error("Unauthorized task deletion attempt");
      }

      transaction.delete(taskRef);
    });
  } catch (error) {
    console.error("[deleteTask] Failed to delete task:", error);
    throw error;
  }
}
