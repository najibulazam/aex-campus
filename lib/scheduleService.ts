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
  isIsoDateTime,
} from "@/lib/validators";
import {
  SCHEDULE_EVENT_STATUSES,
  SCHEDULE_EVENT_TYPES,
  type ScheduleEvent,
  type ScheduleEventInput,
  type ScheduleEventStatus,
  type ScheduleEventType,
} from "@/types/scheduleEvent";

const COLLECTION = "scheduleEvents";
const MAX_TITLE_LENGTH = 140;
const MAX_LOCATION_LENGTH = 120;
const MAX_NOTES_LENGTH = 1200;

interface FirestoreScheduleEvent {
  userId: string;
  title: string;
  type: ScheduleEventType;
  status: ScheduleEventStatus;
  startAt: string;
  endAt: string;
  location?: string | null;
  courseId?: string | null;
  notes?: string | null;
  reminderMinutes?: number | null;
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

function parseDateTimeish(raw: unknown): string | undefined {
  if (raw instanceof Timestamp) {
    return raw.toDate().toISOString();
  }

  if (typeof raw === "string" && isIsoDateTime(raw)) {
    return new Date(raw).toISOString();
  }

  return undefined;
}

function normalizeOptionalString(value: unknown, maxLength: number): string | undefined {
  const normalized = normalizeTrimmedString(value);
  if (!normalized) return undefined;
  if (!isNonEmptyString(normalized, maxLength)) return undefined;
  return normalized;
}

function parseScheduleEventDocument(
  docSnap: QueryDocumentSnapshot<DocumentData>
): ScheduleEvent | null {
  const data = docSnap.data();

  const userId = normalizeTrimmedString(data.userId);
  const title = normalizeTrimmedString(data.title);

  if (!isNonEmptyString(userId) || !isNonEmptyString(title, MAX_TITLE_LENGTH)) {
    console.warn(`[subscribeScheduleEvents] Ignoring malformed event: ${docSnap.id}`);
    return null;
  }

  if (!isOneOf(data.type, SCHEDULE_EVENT_TYPES) || !isOneOf(data.status, SCHEDULE_EVENT_STATUSES)) {
    console.warn(`[subscribeScheduleEvents] Invalid event enum fields: ${docSnap.id}`);
    return null;
  }

  const startAt = parseDateTimeish(data.startAt);
  const endAt = parseDateTimeish(data.endAt);

  if (!startAt || !endAt) {
    console.warn(`[subscribeScheduleEvents] Invalid event datetime fields: ${docSnap.id}`);
    return null;
  }

  const reminderMinutes =
    typeof data.reminderMinutes === "number" && Number.isFinite(data.reminderMinutes)
      ? data.reminderMinutes
      : undefined;

  return {
    id: docSnap.id,
    userId,
    title,
    type: data.type,
    status: data.status,
    startAt,
    endAt,
    location: normalizeOptionalString(data.location, MAX_LOCATION_LENGTH),
    courseId: normalizeOptionalString(data.courseId, 80),
    notes: normalizeOptionalString(data.notes, MAX_NOTES_LENGTH),
    reminderMinutes,
    createdAt: parseTimestampish(data.createdAt),
    updatedAt: parseTimestampish(data.updatedAt),
  };
}

export function subscribeScheduleEvents(
  userId: string,
  onUpdate: (events: ScheduleEvent[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const orderedQuery = query(
    collection(db, COLLECTION),
    where("userId", "==", userId),
    orderBy("startAt", "asc")
  );

  const fallbackQuery = query(
    collection(db, COLLECTION),
    where("userId", "==", userId)
  );

  const mapEvents = (
    snapshot: QuerySnapshot<DocumentData>,
    clientSort = false
  ): ScheduleEvent[] => {
    const events = snapshot.docs.flatMap((docSnap) => {
      const parsed = parseScheduleEventDocument(docSnap);
      return parsed ? [parsed] : [];
    });

    if (clientSort) {
      events.sort((a, b) => {
        const aTime = new Date(a.startAt).getTime();
        const bTime = new Date(b.startAt).getTime();
        return aTime - bTime;
      });
    }

    return events;
  };

  let activeUnsubscribe: Unsubscribe = () => {};
  let usingFallback = false;

  const subscribeWithFallback = () => {
    activeUnsubscribe = onSnapshot(
      fallbackQuery,
      (snapshot) => {
        onUpdate(mapEvents(snapshot, true));
      },
      (error) => {
        console.error("[subscribeScheduleEvents:fallback] Firestore error:", error);
        onError?.(error as Error);
      }
    );
  };

  activeUnsubscribe = onSnapshot(
    orderedQuery,
    (snapshot) => {
      onUpdate(mapEvents(snapshot));
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
          "[subscribeScheduleEvents] Missing composite index. Falling back to client-side sort."
        );
        activeUnsubscribe();
        subscribeWithFallback();
        return;
      }

      console.error("[subscribeScheduleEvents] Firestore error:", error);
      onError?.(error as Error);
    }
  );

  return () => activeUnsubscribe();
}

export async function addScheduleEvent(input: ScheduleEventInput): Promise<void> {
  const userId = normalizeTrimmedString(input.userId);
  const title = normalizeTrimmedString(input.title);

  if (!isNonEmptyString(userId)) {
    throw new Error("Invalid userId");
  }

  if (!isNonEmptyString(title, MAX_TITLE_LENGTH)) {
    throw new Error("Event title is required and must be <= 140 chars");
  }

  if (!isOneOf(input.type, SCHEDULE_EVENT_TYPES)) {
    throw new Error("Invalid event type");
  }

  const status: ScheduleEventStatus = input.status ?? "planned";
  if (!isOneOf(status, SCHEDULE_EVENT_STATUSES)) {
    throw new Error("Invalid event status");
  }

  if (!isIsoDateTime(input.startAt) || !isIsoDateTime(input.endAt)) {
    throw new Error("Event start/end must be valid datetime strings");
  }

  if (new Date(input.endAt).getTime() < new Date(input.startAt).getTime()) {
    throw new Error("Event end time cannot be before start time");
  }

  const payload: FirestoreScheduleEvent = {
    userId,
    title,
    type: input.type,
    status,
    startAt: new Date(input.startAt).toISOString(),
    endAt: new Date(input.endAt).toISOString(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const location = normalizeOptionalString(input.location, MAX_LOCATION_LENGTH);
  if (input.location !== undefined) payload.location = location ?? null;

  const courseId = normalizeOptionalString(input.courseId, 80);
  if (input.courseId !== undefined) payload.courseId = courseId ?? null;

  const notes = normalizeOptionalString(input.notes, MAX_NOTES_LENGTH);
  if (input.notes !== undefined) payload.notes = notes ?? null;

  if (input.reminderMinutes !== undefined) {
    if (!Number.isInteger(input.reminderMinutes) || input.reminderMinutes < 0) {
      throw new Error("Reminder minutes must be a non-negative integer");
    }
    payload.reminderMinutes = input.reminderMinutes;
  }

  await addDoc(collection(db, COLLECTION), payload);
}

export async function updateScheduleEvent(
  id: string,
  userId: string,
  updates: Partial<Omit<ScheduleEventInput, "userId">>
): Promise<void> {
  if (!id) throw new Error("Schedule event id is required");

  await runTransaction(db, async (transaction) => {
    const eventRef = doc(db, COLLECTION, id);
    const eventSnap = await transaction.get(eventRef);

    if (!eventSnap.exists()) {
      throw new Error("Schedule event not found");
    }

    const existing = eventSnap.data();
    const ownerId = normalizeTrimmedString(existing.userId);

    if (ownerId !== userId) {
      throw new Error("Unauthorized schedule event update attempt");
    }

    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    if (updates.title !== undefined) {
      const title = normalizeTrimmedString(updates.title);
      if (!isNonEmptyString(title, MAX_TITLE_LENGTH)) {
        throw new Error("Event title must be <= 140 chars");
      }
      payload.title = title;
    }

    if (updates.type !== undefined) {
      if (!isOneOf(updates.type, SCHEDULE_EVENT_TYPES)) {
        throw new Error("Invalid event type");
      }
      payload.type = updates.type;
    }

    if (updates.status !== undefined) {
      if (!isOneOf(updates.status, SCHEDULE_EVENT_STATUSES)) {
        throw new Error("Invalid event status");
      }
      payload.status = updates.status;
    }

    const nextStartAt = updates.startAt ?? existing.startAt;
    const nextEndAt = updates.endAt ?? existing.endAt;

    if (!isIsoDateTime(nextStartAt) || !isIsoDateTime(nextEndAt)) {
      throw new Error("Event start/end must be valid datetime strings");
    }

    if (new Date(nextEndAt).getTime() < new Date(nextStartAt).getTime()) {
      throw new Error("Event end time cannot be before start time");
    }

    if (updates.startAt !== undefined) {
      payload.startAt = new Date(updates.startAt).toISOString();
    }

    if (updates.endAt !== undefined) {
      payload.endAt = new Date(updates.endAt).toISOString();
    }

    if (updates.location !== undefined) {
      payload.location = normalizeOptionalString(updates.location, MAX_LOCATION_LENGTH) ?? null;
    }

    if (updates.courseId !== undefined) {
      payload.courseId = normalizeOptionalString(updates.courseId, 80) ?? null;
    }

    if (updates.notes !== undefined) {
      payload.notes = normalizeOptionalString(updates.notes, MAX_NOTES_LENGTH) ?? null;
    }

    if (updates.reminderMinutes !== undefined) {
      if (!Number.isInteger(updates.reminderMinutes) || updates.reminderMinutes < 0) {
        throw new Error("Reminder minutes must be a non-negative integer");
      }
      payload.reminderMinutes = updates.reminderMinutes;
    }

    transaction.update(eventRef, payload);
  });
}

export async function deleteScheduleEvent(id: string, userId: string): Promise<void> {
  if (!id) throw new Error("Schedule event id is required");

  await runTransaction(db, async (transaction) => {
    const eventRef = doc(db, COLLECTION, id);
    const eventSnap = await transaction.get(eventRef);

    if (!eventSnap.exists()) {
      throw new Error("Schedule event not found");
    }

    const ownerId = normalizeTrimmedString(eventSnap.data().userId);
    if (ownerId !== userId) {
      throw new Error("Unauthorized schedule event deletion attempt");
    }

    transaction.delete(eventRef);
  });
}
