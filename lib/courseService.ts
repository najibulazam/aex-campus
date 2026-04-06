import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
  type Unsubscribe,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  normalizeTrimmedString,
  isNonEmptyString,
  isOneOf,
} from "@/lib/validators";
import {
  COURSE_STATUSES,
  type Course,
  type CourseInput,
  type CourseStatus,
} from "@/types/course";

const COLLECTION = "courses";
const MAX_NAME_LENGTH = 120;
const MAX_CODE_LENGTH = 40;
const MAX_INSTRUCTOR_LENGTH = 120;
const MAX_SEMESTER_LENGTH = 60;
const MAX_COLOR_LENGTH = 20;

interface FirestoreCourse {
  userId: string;
  name: string;
  status: CourseStatus;
  code?: string | null;
  credits?: number | null;
  instructor?: string | null;
  semester?: string | null;
  color?: string | null;
  createdAt: ReturnType<typeof serverTimestamp>;
  updatedAt: ReturnType<typeof serverTimestamp>;
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

function normalizeOptionalString(value: unknown, maxLength: number): string | undefined {
  const normalized = normalizeTrimmedString(value);
  if (!normalized) return undefined;
  if (!isNonEmptyString(normalized, maxLength)) return undefined;
  return normalized;
}

function parseCourseDocument(
  docSnap: QueryDocumentSnapshot<DocumentData>
): Course | null {
  const data = docSnap.data();

  const userId = normalizeTrimmedString(data.userId);
  const name = normalizeTrimmedString(data.name);

  if (!isNonEmptyString(userId) || !isNonEmptyString(name, MAX_NAME_LENGTH)) {
    console.warn(`[subscribeCourses] Ignoring malformed course: ${docSnap.id}`);
    return null;
  }

  if (!isOneOf(data.status, COURSE_STATUSES)) {
    console.warn(`[subscribeCourses] Invalid course status: ${docSnap.id}`);
    return null;
  }

  const credits =
    typeof data.credits === "number" && Number.isFinite(data.credits)
      ? data.credits
      : undefined;

  return {
    id: docSnap.id,
    userId,
    name,
    status: data.status,
    code: normalizeOptionalString(data.code, MAX_CODE_LENGTH),
    credits,
    instructor: normalizeOptionalString(data.instructor, MAX_INSTRUCTOR_LENGTH),
    semester: normalizeOptionalString(data.semester, MAX_SEMESTER_LENGTH),
    color: normalizeOptionalString(data.color, MAX_COLOR_LENGTH),
    createdAt: parseTimestampish(data.createdAt),
    updatedAt: parseTimestampish(data.updatedAt),
  };
}

export function subscribeCourses(
  userId: string,
  onUpdate: (courses: Course[]) => void,
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

  const mapCourses = (
    snapshot: QuerySnapshot<DocumentData>,
    clientSort = false
  ): Course[] => {
    const courses = snapshot.docs.flatMap((docSnap) => {
      const parsed = parseCourseDocument(docSnap);
      return parsed ? [parsed] : [];
    });

    if (clientSort) {
      courses.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
    }

    return courses;
  };

  let activeUnsubscribe: Unsubscribe = () => {};
  let usingFallback = false;

  const subscribeWithFallback = () => {
    activeUnsubscribe = onSnapshot(
      fallbackQuery,
      (snapshot) => {
        onUpdate(mapCourses(snapshot, true));
      },
      (error) => {
        console.error("[subscribeCourses:fallback] Firestore error:", error);
        onError?.(error as Error);
      }
    );
  };

  activeUnsubscribe = onSnapshot(
    orderedQuery,
    (snapshot) => {
      onUpdate(mapCourses(snapshot));
    },
    (error) => {
      const code = (error as { code?: string }).code;
      const message = (error as { message?: string }).message?.toLowerCase() ?? "";
      const requiresIndex =
        code === "failed-precondition" &&
        (message.includes("requires an index") ||
          message.includes("query requires an index"));

      if (requiresIndex && !usingFallback) {
        usingFallback = true;
        console.warn(
          "[subscribeCourses] Missing composite index. Falling back to client-side sort."
        );
        activeUnsubscribe();
        subscribeWithFallback();
        return;
      }

      console.error("[subscribeCourses] Firestore error:", error);
      onError?.(error as Error);
    }
  );

  return () => activeUnsubscribe();
}

export async function addCourse(input: CourseInput): Promise<void> {
  const userId = normalizeTrimmedString(input.userId);
  const name = normalizeTrimmedString(input.name);

  if (!isNonEmptyString(userId)) {
    throw new Error("Invalid userId");
  }

  if (!isNonEmptyString(name, MAX_NAME_LENGTH)) {
    throw new Error("Course name is required and must be <= 120 chars");
  }

  const status: CourseStatus = input.status ?? "active";
  if (!isOneOf(status, COURSE_STATUSES)) {
    throw new Error("Invalid course status");
  }

  const payload: FirestoreCourse = {
    userId,
    name,
    status,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const code = normalizeOptionalString(input.code, MAX_CODE_LENGTH);
  if (input.code !== undefined) payload.code = code ?? null;

  if (input.credits !== undefined) {
    if (!Number.isFinite(input.credits)) {
      throw new Error("Credits must be a valid number");
    }
    payload.credits = input.credits;
  }

  const instructor = normalizeOptionalString(input.instructor, MAX_INSTRUCTOR_LENGTH);
  if (input.instructor !== undefined) payload.instructor = instructor ?? null;

  const semester = normalizeOptionalString(input.semester, MAX_SEMESTER_LENGTH);
  if (input.semester !== undefined) payload.semester = semester ?? null;

  const color = normalizeOptionalString(input.color, MAX_COLOR_LENGTH);
  if (input.color !== undefined) payload.color = color ?? null;

  await addDoc(collection(db, COLLECTION), payload);
}

export async function updateCourse(
  id: string,
  userId: string,
  updates: Partial<Omit<CourseInput, "userId">>
): Promise<void> {
  if (!id) throw new Error("Course id is required");

  await runTransaction(db, async (transaction) => {
    const courseRef = doc(db, COLLECTION, id);
    const courseSnap = await transaction.get(courseRef);

    if (!courseSnap.exists()) {
      throw new Error("Course not found");
    }

    const ownerId = normalizeTrimmedString(courseSnap.data().userId);
    if (ownerId !== userId) {
      throw new Error("Unauthorized course update attempt");
    }

    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    if (updates.name !== undefined) {
      const name = normalizeTrimmedString(updates.name);
      if (!isNonEmptyString(name, MAX_NAME_LENGTH)) {
        throw new Error("Course name must be <= 120 chars");
      }
      payload.name = name;
    }

    if (updates.status !== undefined) {
      if (!isOneOf(updates.status, COURSE_STATUSES)) {
        throw new Error("Invalid course status");
      }
      payload.status = updates.status;
    }

    if (updates.code !== undefined) {
      payload.code = normalizeOptionalString(updates.code, MAX_CODE_LENGTH) ?? null;
    }

    if (updates.credits !== undefined) {
      if (!Number.isFinite(updates.credits)) {
        throw new Error("Credits must be a valid number");
      }
      payload.credits = updates.credits;
    }

    if (updates.instructor !== undefined) {
      payload.instructor =
        normalizeOptionalString(updates.instructor, MAX_INSTRUCTOR_LENGTH) ?? null;
    }

    if (updates.semester !== undefined) {
      payload.semester =
        normalizeOptionalString(updates.semester, MAX_SEMESTER_LENGTH) ?? null;
    }

    if (updates.color !== undefined) {
      payload.color = normalizeOptionalString(updates.color, MAX_COLOR_LENGTH) ?? null;
    }

    transaction.update(courseRef, payload);
  });
}

export async function archiveCourse(id: string, userId: string): Promise<void> {
  await updateCourse(id, userId, { status: "archived" });
}

export async function deleteCourse(id: string, userId: string): Promise<void> {
  if (!id) throw new Error("Course id is required");

  await runTransaction(db, async (transaction) => {
    const courseRef = doc(db, COLLECTION, id);
    const courseSnap = await transaction.get(courseRef);

    if (!courseSnap.exists()) {
      throw new Error("Course not found");
    }

    const ownerId = normalizeTrimmedString(courseSnap.data().userId);
    if (ownerId !== userId) {
      throw new Error("Unauthorized course deletion attempt");
    }

    transaction.delete(courseRef);
  });
}
