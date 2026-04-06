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
import { normalizeOptionalHttpUrl } from "@/lib/urlValidation";
import {
  STUDY_GROUP_STATUSES,
  type StudyGroup,
  type StudyGroupInput,
  type StudyGroupStatus,
} from "@/types/studyGroup";

const COLLECTION = "studyGroups";
const MAX_NAME_LENGTH = 120;
const MAX_SUBJECT_LENGTH = 120;
const MAX_MEETING_LINK_LENGTH = 300;
const MAX_CADENCE_LENGTH = 80;
const MAX_NOTES_LENGTH = 1200;

interface FirestoreStudyGroup {
  ownerId: string;
  name: string;
  subject: string;
  status: StudyGroupStatus;
  memberIds: string[];
  meetingLink?: string | null;
  cadence?: string | null;
  nextMeetingAt?: string | null;
  notes?: string | null;
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

function normalizeMemberIds(memberIds: unknown, ownerId: string): string[] {
  const incoming = Array.isArray(memberIds) ? memberIds : [];
  const normalized = incoming
    .filter((memberId): memberId is string => typeof memberId === "string")
    .map((memberId) => memberId.trim())
    .filter(Boolean);

  if (!normalized.includes(ownerId)) {
    normalized.push(ownerId);
  }

  return Array.from(new Set(normalized));
}

function parseStudyGroupDocument(
  docSnap: QueryDocumentSnapshot<DocumentData>
): StudyGroup | null {
  const data = docSnap.data();

  const ownerId = normalizeTrimmedString(data.ownerId);
  const name = normalizeTrimmedString(data.name);
  const subject = normalizeTrimmedString(data.subject);

  if (
    !isNonEmptyString(ownerId) ||
    !isNonEmptyString(name, MAX_NAME_LENGTH) ||
    !isNonEmptyString(subject, MAX_SUBJECT_LENGTH)
  ) {
    console.warn(`[subscribeGroups] Ignoring malformed group: ${docSnap.id}`);
    return null;
  }

  if (!isOneOf(data.status, STUDY_GROUP_STATUSES)) {
    console.warn(`[subscribeGroups] Invalid group status: ${docSnap.id}`);
    return null;
  }

  return {
    id: docSnap.id,
    ownerId,
    name,
    subject,
    status: data.status,
    memberIds: normalizeMemberIds(data.memberIds, ownerId),
    meetingLink: normalizeOptionalHttpUrl(data.meetingLink, MAX_MEETING_LINK_LENGTH),
    cadence: normalizeOptionalString(data.cadence, MAX_CADENCE_LENGTH),
    nextMeetingAt:
      typeof data.nextMeetingAt === "string" && isIsoDateTime(data.nextMeetingAt)
        ? new Date(data.nextMeetingAt).toISOString()
        : undefined,
    notes: normalizeOptionalString(data.notes, MAX_NOTES_LENGTH),
    createdAt: parseTimestampish(data.createdAt),
    updatedAt: parseTimestampish(data.updatedAt),
  };
}

export function subscribeGroups(
  userId: string,
  onUpdate: (groups: StudyGroup[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const orderedQuery = query(
    collection(db, COLLECTION),
    where("memberIds", "array-contains", userId),
    orderBy("createdAt", "desc")
  );

  const fallbackQuery = query(
    collection(db, COLLECTION),
    where("memberIds", "array-contains", userId)
  );

  const mapGroups = (
    snapshot: QuerySnapshot<DocumentData>,
    clientSort = false
  ): StudyGroup[] => {
    const groups = snapshot.docs.flatMap((docSnap) => {
      const parsed = parseStudyGroupDocument(docSnap);
      return parsed ? [parsed] : [];
    });

    if (clientSort) {
      groups.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
    }

    return groups;
  };

  let activeUnsubscribe: Unsubscribe = () => {};
  let usingFallback = false;

  const subscribeWithFallback = () => {
    activeUnsubscribe = onSnapshot(
      fallbackQuery,
      (snapshot) => {
        onUpdate(mapGroups(snapshot, true));
      },
      (error) => {
        console.error("[subscribeGroups:fallback] Firestore error:", error);
        onError?.(error as Error);
      }
    );
  };

  activeUnsubscribe = onSnapshot(
    orderedQuery,
    (snapshot) => {
      onUpdate(mapGroups(snapshot));
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
          "[subscribeGroups] Missing composite index. Falling back to client-side sort."
        );
        activeUnsubscribe();
        subscribeWithFallback();
        return;
      }

      console.error("[subscribeGroups] Firestore error:", error);
      onError?.(error as Error);
    }
  );

  return () => activeUnsubscribe();
}

export async function addStudyGroup(input: StudyGroupInput): Promise<void> {
  const ownerId = normalizeTrimmedString(input.ownerId);
  const name = normalizeTrimmedString(input.name);
  const subject = normalizeTrimmedString(input.subject);

  if (!isNonEmptyString(ownerId)) {
    throw new Error("Invalid ownerId");
  }

  if (!isNonEmptyString(name, MAX_NAME_LENGTH)) {
    throw new Error("Group name is required and must be <= 120 chars");
  }

  if (!isNonEmptyString(subject, MAX_SUBJECT_LENGTH)) {
    throw new Error("Group subject is required and must be <= 120 chars");
  }

  const status: StudyGroupStatus = input.status ?? "active";
  if (!isOneOf(status, STUDY_GROUP_STATUSES)) {
    throw new Error("Invalid group status");
  }

  const memberIds = normalizeMemberIds(input.memberIds, ownerId);

  const payload: FirestoreStudyGroup = {
    ownerId,
    name,
    subject,
    status,
    memberIds,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (input.meetingLink !== undefined) {
    const normalizedInput = normalizeTrimmedString(input.meetingLink);
    const meetingLink = normalizeOptionalHttpUrl(input.meetingLink, MAX_MEETING_LINK_LENGTH);

    if (normalizedInput && !meetingLink) {
      throw new Error("Meeting link must be a valid http/https URL");
    }

    payload.meetingLink = meetingLink ?? null;
  }

  const cadence = normalizeOptionalString(input.cadence, MAX_CADENCE_LENGTH);
  if (input.cadence !== undefined) payload.cadence = cadence ?? null;

  if (input.nextMeetingAt !== undefined) {
    if (!input.nextMeetingAt || !isIsoDateTime(input.nextMeetingAt)) {
      payload.nextMeetingAt = null;
    } else {
      payload.nextMeetingAt = new Date(input.nextMeetingAt).toISOString();
    }
  }

  const notes = normalizeOptionalString(input.notes, MAX_NOTES_LENGTH);
  if (input.notes !== undefined) payload.notes = notes ?? null;

  await addDoc(collection(db, COLLECTION), payload);
}

export async function updateStudyGroup(
  id: string,
  userId: string,
  updates: Partial<Omit<StudyGroupInput, "ownerId">>
): Promise<void> {
  if (!id) throw new Error("Group id is required");

  await runTransaction(db, async (transaction) => {
    const groupRef = doc(db, COLLECTION, id);
    const groupSnap = await transaction.get(groupRef);

    if (!groupSnap.exists()) {
      throw new Error("Group not found");
    }

    const existing = groupSnap.data();
    const ownerId = normalizeTrimmedString(existing.ownerId);
    if (ownerId !== userId) {
      throw new Error("Only the group owner can update this group");
    }

    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    if (updates.name !== undefined) {
      const name = normalizeTrimmedString(updates.name);
      if (!isNonEmptyString(name, MAX_NAME_LENGTH)) {
        throw new Error("Group name must be <= 120 chars");
      }
      payload.name = name;
    }

    if (updates.subject !== undefined) {
      const subject = normalizeTrimmedString(updates.subject);
      if (!isNonEmptyString(subject, MAX_SUBJECT_LENGTH)) {
        throw new Error("Group subject must be <= 120 chars");
      }
      payload.subject = subject;
    }

    if (updates.status !== undefined) {
      if (!isOneOf(updates.status, STUDY_GROUP_STATUSES)) {
        throw new Error("Invalid group status");
      }
      payload.status = updates.status;
    }

    if (updates.memberIds !== undefined) {
      payload.memberIds = normalizeMemberIds(updates.memberIds, ownerId);
    }

    if (updates.meetingLink !== undefined) {
      const normalizedInput = normalizeTrimmedString(updates.meetingLink);
      const meetingLink = normalizeOptionalHttpUrl(
        updates.meetingLink,
        MAX_MEETING_LINK_LENGTH
      );

      if (normalizedInput && !meetingLink) {
        throw new Error("Meeting link must be a valid http/https URL");
      }

      payload.meetingLink = meetingLink ?? null;
    }

    if (updates.cadence !== undefined) {
      payload.cadence = normalizeOptionalString(updates.cadence, MAX_CADENCE_LENGTH) ?? null;
    }

    if (updates.nextMeetingAt !== undefined) {
      if (!updates.nextMeetingAt || !isIsoDateTime(updates.nextMeetingAt)) {
        payload.nextMeetingAt = null;
      } else {
        payload.nextMeetingAt = new Date(updates.nextMeetingAt).toISOString();
      }
    }

    if (updates.notes !== undefined) {
      payload.notes = normalizeOptionalString(updates.notes, MAX_NOTES_LENGTH) ?? null;
    }

    transaction.update(groupRef, payload);
  });
}

export async function deleteStudyGroup(id: string, userId: string): Promise<void> {
  if (!id) throw new Error("Group id is required");

  await runTransaction(db, async (transaction) => {
    const groupRef = doc(db, COLLECTION, id);
    const groupSnap = await transaction.get(groupRef);

    if (!groupSnap.exists()) {
      throw new Error("Group not found");
    }

    const ownerId = normalizeTrimmedString(groupSnap.data().ownerId);
    if (ownerId !== userId) {
      throw new Error("Only the group owner can delete this group");
    }

    transaction.delete(groupRef);
  });
}
