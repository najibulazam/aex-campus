"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Pencil, Trash2 } from "lucide-react";
import { useCourses } from "@/lib/useCourses";
import { useSchedule } from "@/lib/useSchedule";
import type {
  ScheduleEvent,
  ScheduleEventStatus,
  ScheduleEventType,
} from "@/types/scheduleEvent";

type DraftEvent = {
  title: string;
  type: ScheduleEventType;
  status: ScheduleEventStatus;
  startAt: string;
  endAt: string;
  location: string;
  courseId: string;
  notes: string;
  reminderMinutes: string;
};

type ActionNotice = {
  type: "success" | "error";
  text: string;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
  expiresAt?: number;
};

const NOTICE_DEFAULT_MS = 4500;
const NOTICE_UNDO_MS = 9000;

function validateReminder(value: string): string | null {
  if (!value.trim()) return null;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return "Reminder must be a non-negative integer in minutes.";
  }

  return null;
}

function validateDateRange(startAt: string, endAt: string): string | null {
  if (!startAt || !endAt) {
    return "Start and end time are required.";
  }

  if (new Date(endAt).getTime() < new Date(startAt).getTime()) {
    return "End time cannot be before start time.";
  }

  return null;
}

const EVENT_TYPES: ScheduleEventType[] = [
  "class",
  "exam",
  "lab",
  "meeting",
  "assignment",
  "personal",
];

const EVENT_STATUSES: ScheduleEventStatus[] = ["planned", "completed", "cancelled"];
const RANGE_FILTERS: Array<"all" | "today" | "week"> = ["all", "today", "week"];

function formatScheduleOptionLabel(value: string): string {
  if (value === "cancelled") {
    return "Canceled";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function toLocalDateTimeInput(isoString: string): string {
  const date = new Date(isoString);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function formatDisplayDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function toDraft(event: ScheduleEvent): DraftEvent {
  return {
    title: event.title,
    type: event.type,
    status: event.status,
    startAt: toLocalDateTimeInput(event.startAt),
    endAt: toLocalDateTimeInput(event.endAt),
    location: event.location ?? "",
    courseId: event.courseId ?? "",
    notes: event.notes ?? "",
    reminderMinutes: event.reminderMinutes !== undefined ? String(event.reminderMinutes) : "",
  };
}

export default function SchedulePage() {
  const { courses } = useCourses();
  const {
    user,
    filteredEvents,
    eventsLoading,
    eventsError,
    statusFilter,
    setStatusFilter,
    rangeFilter,
    setRangeFilter,
    searchQuery,
    setSearchQuery,
    eventCounts,
    handleAddEvent,
    handleUpdateEvent,
    handleDeleteEvent,
  } = useSchedule();

  const [title, setTitle] = useState("");
  const [type, setType] = useState<ScheduleEventType>("class");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [location, setLocation] = useState("");
  const [courseId, setCourseId] = useState("");
  const [notes, setNotes] = useState("");
  const [reminderMinutes, setReminderMinutes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftEvent | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [actionNotice, setActionNotice] = useState<ActionNotice | null>(null);
  const [noticeNow, setNoticeNow] = useState(() => Date.now());
  const [addFormError, setAddFormError] = useState<string | null>(null);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [pendingEventIds, setPendingEventIds] = useState<Record<string, true>>({});

  const showNotice = (notice: Omit<ActionNotice, "expiresAt">, ttlMs = NOTICE_DEFAULT_MS) => {
    setActionNotice({
      ...notice,
      expiresAt: Date.now() + ttlMs,
    });
  };

  const setEventPending = (id: string, isPending: boolean) => {
    setPendingEventIds((current) => {
      if (isPending) {
        return { ...current, [id]: true };
      }

      if (!current[id]) {
        return current;
      }

      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  useEffect(() => {
    if (!actionNotice?.expiresAt) {
      return;
    }

    const remaining = actionNotice.expiresAt - Date.now();
    if (remaining <= 0) {
      setActionNotice(null);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setActionNotice(null);
    }, remaining);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [actionNotice]);

  useEffect(() => {
    if (!actionNotice?.actionLabel || !actionNotice.expiresAt) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNoticeNow(Date.now());
    }, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [actionNotice?.actionLabel, actionNotice?.expiresAt]);

  const noticeSecondsRemaining = actionNotice?.expiresAt
    ? Math.max(0, Math.ceil((actionNotice.expiresAt - noticeNow) / 1000))
    : 0;

  const canRunNoticeAction = Boolean(
    actionNotice?.actionLabel && actionNotice?.onAction && noticeSecondsRemaining > 0
  );

  const courseLabelById = useMemo(() => {
    return new Map(
      courses.map((course) => [course.id, course.code ? `${course.code} - ${course.name}` : course.name])
    );
  }, [courses]);

  const todayEventsCount = useMemo(() => {
    const today = new Date();
    return filteredEvents.filter((event) => {
      const start = new Date(event.startAt);
      return (
        start.getFullYear() === today.getFullYear()
        && start.getMonth() === today.getMonth()
        && start.getDate() === today.getDate()
      );
    }).length;
  }, [filteredEvents]);

  if (!user) {
    return null;
  }

  if (eventsLoading) {
    return (
      <section className="neo-page-shell py-6 space-y-5">
        <div className="h-10 neo-skeleton w-56" />
        <div className="h-56 neo-skeleton" />
        <div className="h-72 neo-skeleton" />
      </section>
    );
  }

  return (
    <section className="neo-page-shell py-6 space-y-5">
      <div className="neo-card p-6 md:p-8 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Schedule</h1>
        <p className="neo-text-secondary">
          Plan your classes, labs, and deadlines with live timeline updates.
        </p>
      </div>

      {eventsError && (
        <div role="alert" className="neo-alert px-4 py-3.5 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <span className="text-sm font-medium">{eventsError}</span>
        </div>
      )}

      {actionNotice && (
        <div
          role="status"
          className={`neo-alert px-4 py-3.5 flex items-start justify-between gap-3 ${
            actionNotice.type === "error"
              ? "border-red-500/45 bg-red-900/20 text-red-200"
              : ""
          }`}
        >
          <span className="text-sm font-medium flex-1">{actionNotice.text}</span>
          <div className="flex items-center gap-2">
            {actionNotice.actionLabel && actionNotice.onAction && canRunNoticeAction && (
              <button
                type="button"
                className="neo-btn neo-btn-primary h-8 px-3 text-xs"
                onClick={() => {
                  void actionNotice.onAction?.();
                }}
              >
                {`${actionNotice.actionLabel} (${noticeSecondsRemaining}s)`}
              </button>
            )}
            <button
              type="button"
              className="neo-btn neo-btn-ghost h-8 px-2 text-xs"
              onClick={() => setActionNotice(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <article className="neo-card p-2.5 sm:p-5 space-y-1.5">
          <p className="text-xs font-medium neo-text-muted">Visible Events</p>
          <p className="text-xl sm:text-3xl font-semibold">{filteredEvents.length}</p>
        </article>
        <article className="neo-card p-2.5 sm:p-5 space-y-1.5">
          <p className="text-xs font-medium neo-text-muted">Today</p>
          <p className="text-xl sm:text-3xl font-semibold">{todayEventsCount}</p>
        </article>
        <article className="neo-card p-2.5 sm:p-5 space-y-1.5">
          <p className="text-xs font-medium neo-text-muted">Planned</p>
          <p className="text-xl sm:text-3xl font-semibold">{eventCounts.planned}</p>
        </article>
      </div>

      <div className="neo-card p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6">
            <label className="text-xs font-medium neo-text-muted block mb-1">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search title or location"
              className="neo-search"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {["all", ...EVENT_STATUSES].map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter as typeof statusFilter)}
                className={`neo-btn h-9 px-3 capitalize text-sm ${
                  statusFilter === filter ? "neo-btn-primary" : "neo-btn-ghost"
                }`}
              >
                {formatScheduleOptionLabel(filter)}
                <span
                  className={`inline-flex items-center justify-center min-w-5 h-5 rounded-full text-[11px] font-semibold ${
                    statusFilter === filter
                      ? "bg-[rgba(14,19,22,0.85)] text-(--neo-primary)"
                      : "bg-[rgba(255,255,255,0.08)] neo-text-secondary"
                  }`}
                >
                  {filter === "all" ? eventCounts.all : eventCounts[filter as ScheduleEventStatus]}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {RANGE_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setRangeFilter(filter)}
                className={`neo-btn h-9 px-3 capitalize text-sm ${
                  rangeFilter === filter ? "neo-btn-primary" : "neo-btn-ghost"
                }`}
              >
                {formatScheduleOptionLabel(filter)}
              </button>
            ))}
          </div>
        </div>

        <form
          className="grid grid-cols-1 md:grid-cols-12 gap-3"
          onSubmit={async (event) => {
            event.preventDefault();

            if (!title.trim()) {
              setAddFormError("Event title is required.");
              return;
            }

            const dateRangeError = validateDateRange(startAt, endAt);
            if (dateRangeError) {
              setAddFormError(dateRangeError);
              return;
            }

            const reminderError = validateReminder(reminderMinutes);
            if (reminderError) {
              setAddFormError(reminderError);
              return;
            }

            setSubmitting(true);
            setAddFormError(null);
            const result = await handleAddEvent({
              title,
              type,
              status: "planned",
              startAt: new Date(startAt).toISOString(),
              endAt: new Date(endAt).toISOString(),
              location,
              courseId,
              notes,
              reminderMinutes: reminderMinutes.trim() ? Number(reminderMinutes) : undefined,
            });
            setSubmitting(false);

            if (!result.ok) {
              showNotice({ type: "error", text: result.message });
              return;
            }

            setTitle("");
            setType("class");
            setStartAt("");
            setEndAt("");
            setLocation("");
            setCourseId("");
            setNotes("");
            setReminderMinutes("");
            showNotice({ type: "success", text: "Event added." });
          }}
        >
          {addFormError && (
            <p className="md:col-span-12 text-sm text-red-300">{addFormError}</p>
          )}
          <div className="md:col-span-3">
            <label className="text-xs font-medium neo-text-muted block mb-1">Title *</label>
            <div className="relative">
              <input
                type="text"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Data Structures Lecture"
                className="neo-input neo-task-title-input"
              />
              <span className="neo-required-mark" aria-hidden="true">*</span>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium neo-text-muted block mb-1">Type *</label>
            <select
              value={type}
              onChange={(event) => setType(event.target.value as ScheduleEventType)}
              className="neo-select neo-picker-select h-11.5"
            >
              {EVENT_TYPES.map((eventType) => (
                <option key={eventType} value={eventType}>
                  {formatScheduleOptionLabel(eventType)}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium neo-text-muted block mb-1">Start *</label>
            <input
              type="datetime-local"
              required
              value={startAt}
              onChange={(event) => setStartAt(event.target.value)}
              className="neo-input neo-picker-date h-11.5"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium neo-text-muted block mb-1">End *</label>
            <input
              type="datetime-local"
              required
              value={endAt}
              onChange={(event) => setEndAt(event.target.value)}
              className="neo-input neo-picker-date h-11.5"
            />
          </div>
          <div className="md:col-span-3">
            <label className="text-xs font-medium neo-text-muted block mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Room 305"
              className="neo-input"
            />
          </div>
          <div className="md:col-span-3">
            <label className="text-xs font-medium neo-text-muted block mb-1">Linked Course</label>
            <select
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
              className="neo-select neo-picker-select h-11.5"
            >
              <option value="">No linked course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code ? `${course.code} - ${course.name}` : course.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium neo-text-muted block mb-1">Reminder (min)</label>
            <input
              type="number"
              min={0}
              value={reminderMinutes}
              onChange={(event) => setReminderMinutes(event.target.value)}
              className="neo-input neo-picker-time h-11.5"
            />
          </div>
          <div className="md:col-span-5">
            <label className="text-xs font-medium neo-text-muted block mb-1">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Bring previous lab report"
              className="neo-input"
            />
          </div>
          <div className="md:col-span-2 flex md:justify-end">
            <button
              type="submit"
              disabled={submitting || !title.trim() || !startAt || !endAt}
              className="neo-btn neo-btn-primary h-11 px-5 w-full md:w-auto"
            >
              {submitting ? "Adding..." : "Add Event"}
            </button>
          </div>
        </form>
      </div>

      {editingId && editDraft && (
        <div className="neo-card p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Edit Event</h2>
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setEditDraft(null);
              }}
              className="neo-btn neo-btn-ghost h-10 px-3"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-3">
              <label className="text-xs font-medium neo-text-muted block mb-1">Title *</label>
              <div className="relative">
                <input
                  type="text"
                  value={editDraft.title}
                  onChange={(event) =>
                    setEditDraft((current) =>
                      current ? { ...current, title: event.target.value } : current
                    )
                  }
                  className="neo-input neo-task-title-input"
                />
                <span className="neo-required-mark" aria-hidden="true">*</span>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium neo-text-muted block mb-1">Type</label>
              <select
                value={editDraft.type}
                onChange={(event) =>
                  setEditDraft((current) =>
                    current ? { ...current, type: event.target.value as ScheduleEventType } : current
                  )
                }
                className="neo-select neo-picker-select h-11.5"
              >
                {EVENT_TYPES.map((eventType) => (
                  <option key={eventType} value={eventType}>
                    {formatScheduleOptionLabel(eventType)}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium neo-text-muted block mb-1">Status</label>
              <select
                value={editDraft.status}
                onChange={(event) =>
                  setEditDraft((current) =>
                    current ? { ...current, status: event.target.value as ScheduleEventStatus } : current
                  )
                }
                className="neo-select neo-picker-select h-11.5"
              >
                {EVENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {formatScheduleOptionLabel(status)}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium neo-text-muted block mb-1">Start *</label>
              <input
                type="datetime-local"
                value={editDraft.startAt}
                onChange={(event) =>
                  setEditDraft((current) =>
                    current ? { ...current, startAt: event.target.value } : current
                  )
                }
                className="neo-input neo-picker-date h-11.5"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium neo-text-muted block mb-1">End *</label>
              <input
                type="datetime-local"
                value={editDraft.endAt}
                onChange={(event) =>
                  setEditDraft((current) =>
                    current ? { ...current, endAt: event.target.value } : current
                  )
                }
                className="neo-input neo-picker-date h-11.5"
              />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs font-medium neo-text-muted block mb-1">Location</label>
              <input
                type="text"
                value={editDraft.location}
                onChange={(event) =>
                  setEditDraft((current) =>
                    current ? { ...current, location: event.target.value } : current
                  )
                }
                className="neo-input"
              />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs font-medium neo-text-muted block mb-1">Linked Course</label>
              <select
                value={editDraft.courseId}
                onChange={(event) =>
                  setEditDraft((current) =>
                    current ? { ...current, courseId: event.target.value } : current
                  )
                }
                className="neo-select neo-picker-select h-11.5"
              >
                <option value="">No linked course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code ? `${course.code} - ${course.name}` : course.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium neo-text-muted block mb-1">Reminder (min)</label>
              <input
                type="number"
                min={0}
                value={editDraft.reminderMinutes}
                onChange={(event) =>
                  setEditDraft((current) =>
                    current ? { ...current, reminderMinutes: event.target.value } : current
                  )
                }
                className="neo-input neo-picker-time h-11.5"
              />
            </div>
            <div className="md:col-span-4">
              <label className="text-xs font-medium neo-text-muted block mb-1">Notes</label>
              <input
                type="text"
                value={editDraft.notes}
                onChange={(event) =>
                  setEditDraft((current) =>
                    current ? { ...current, notes: event.target.value } : current
                  )
                }
                className="neo-input"
              />
            </div>
            <div className="md:col-span-12 flex justify-end">
              <button
                type="button"
                disabled={
                  savingEdit
                  || !editDraft.title.trim()
                  || !editDraft.startAt
                  || !editDraft.endAt
                  || new Date(editDraft.endAt).getTime() < new Date(editDraft.startAt).getTime()
                }
                className="neo-btn neo-btn-primary h-11 px-5"
                onClick={async () => {
                  if (!editingId) return;

                  if (!editDraft.title.trim()) {
                    setEditFormError("Event title is required.");
                    return;
                  }

                  const dateRangeError = validateDateRange(editDraft.startAt, editDraft.endAt);
                  if (dateRangeError) {
                    setEditFormError(dateRangeError);
                    return;
                  }

                  const reminderError = validateReminder(editDraft.reminderMinutes);
                  if (reminderError) {
                    setEditFormError(reminderError);
                    return;
                  }

                  setSavingEdit(true);
                  setEditFormError(null);
                  const result = await handleUpdateEvent(editingId, {
                    title: editDraft.title,
                    type: editDraft.type,
                    status: editDraft.status,
                    startAt: new Date(editDraft.startAt).toISOString(),
                    endAt: new Date(editDraft.endAt).toISOString(),
                    location: editDraft.location,
                    courseId: editDraft.courseId,
                    notes: editDraft.notes,
                    reminderMinutes: editDraft.reminderMinutes.trim()
                      ? Number(editDraft.reminderMinutes)
                      : undefined,
                  });
                  setSavingEdit(false);

                  if (!result.ok) {
                    showNotice({ type: "error", text: result.message });
                    return;
                  }

                  setEditingId(null);
                  setEditDraft(null);
                  showNotice({ type: "success", text: "Event updated." });
                }}
              >
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
            {editFormError && (
              <p className="md:col-span-12 text-sm text-red-300">{editFormError}</p>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-11 px-4 border border-dashed border-[rgba(34,229,140,0.26)] rounded-[14px] bg-[rgba(34,229,140,0.04)]">
            <p className="neo-text-secondary font-semibold mb-1">No schedule events found.</p>
            <p className="text-sm neo-text-muted">Try changing filters or add a new event.</p>
          </div>
        ) : (
          filteredEvents.map((event) => (
            <article
              key={event.id}
              className="neo-card p-4 sm:p-5 transition-all duration-200 hover:border-[rgba(34,229,140,0.28)] flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
            >
              <div className="space-y-1 min-w-0">
                <h3 className="font-semibold text-lg truncate">{event.title}</h3>
                <p className="text-sm neo-text-secondary">
                  {formatDisplayDate(event.startAt)} - {formatDisplayDate(event.endAt)}
                </p>
                <p className="text-xs neo-text-muted">
                  {formatScheduleOptionLabel(event.type)}
                  {event.location ? ` · ${event.location}` : ""}
                  {event.courseId ? ` · ${courseLabelById.get(event.courseId) ?? event.courseId}` : ""}
                  {event.reminderMinutes !== undefined ? ` · ${event.reminderMinutes}m reminder` : ""}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {pendingEventIds[event.id] && (
                  <span className="inline-flex items-center gap-1.5 text-xs neo-text-muted">
                    <span className="neo-spinner neo-spinner-sm" />
                    Syncing...
                  </span>
                )}
                <select
                  value={event.status}
                  onChange={async (evt) => {
                    setEventPending(event.id, true);

                    try {
                      const result = await handleUpdateEvent(event.id, {
                        status: evt.target.value as ScheduleEventStatus,
                      });

                      if (!result.ok) {
                        showNotice({ type: "error", text: result.message });
                      } else {
                        showNotice({ type: "success", text: "Event status updated." });
                      }
                    } finally {
                      setEventPending(event.id, false);
                    }
                  }}
                  disabled={Boolean(pendingEventIds[event.id])}
                  className="neo-select neo-picker-select h-11.5 min-w-35"
                >
                  {EVENT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {formatScheduleOptionLabel(status)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="neo-btn neo-btn-ghost h-10 px-3"
                  disabled={Boolean(pendingEventIds[event.id])}
                  onClick={() => {
                    setEditingId(event.id);
                    setEditDraft(toDraft(event));
                  }}
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
                <button
                  type="button"
                  className="neo-btn neo-btn-ghost h-10 px-3 text-red-300 border-red-500/45 hover:bg-red-900/20"
                  onClick={async () => {
                    const shouldDelete = window.confirm(
                      `Delete \"${event.title}\"? This action cannot be undone.`
                    );
                    if (!shouldDelete) return;

                    setEventPending(event.id, true);

                    try {
                      const result = await handleDeleteEvent(event.id);
                      if (!result.ok) {
                        showNotice({ type: "error", text: result.message });
                      } else {
                        showNotice(
                          {
                            type: "success",
                            text: "Event deleted.",
                            actionLabel: "Undo",
                            onAction: async () => {
                              const restoreResult = await handleAddEvent({
                                title: event.title,
                                type: event.type,
                                status: event.status,
                                startAt: event.startAt,
                                endAt: event.endAt,
                                location: event.location,
                                courseId: event.courseId,
                                notes: event.notes,
                                reminderMinutes: event.reminderMinutes,
                              });

                              if (!restoreResult.ok) {
                                showNotice({ type: "error", text: restoreResult.message });
                                return;
                              }

                              showNotice({ type: "success", text: "Event restored." });
                            },
                          },
                          NOTICE_UNDO_MS
                        );
                      }
                    } finally {
                      setEventPending(event.id, false);
                    }
                  }}
                  disabled={Boolean(pendingEventIds[event.id])}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
