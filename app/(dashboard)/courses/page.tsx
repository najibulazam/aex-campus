"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Pencil, Trash2 } from "lucide-react";
import { useCourses } from "@/lib/useCourses";
import type { Course, CourseStatus } from "@/types/course";

type DraftCourse = {
  name: string;
  code: string;
  credits: string;
  instructor: string;
  semester: string;
  color: string;
  status: CourseStatus;
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

function validateCredits(credits: string): string | null {
  if (!credits.trim()) return null;

  const parsed = Number(credits);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return "Credits must be a non-negative number.";
  }

  return null;
}

function toDraft(course: Course): DraftCourse {
  return {
    name: course.name,
    code: course.code ?? "",
    credits: course.credits !== undefined ? String(course.credits) : "",
    instructor: course.instructor ?? "",
    semester: course.semester ?? "",
    color: course.color ?? "",
    status: course.status,
  };
}

const COURSE_FILTERS: Array<"all" | CourseStatus> = [
  "all",
  "active",
  "completed",
  "archived",
];

export default function CoursesPage() {
  const {
    user,
    filteredCourses,
    coursesLoading,
    coursesError,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    courseCounts,
    handleAddCourse,
    handleUpdateCourse,
    handleArchiveCourse,
    handleDeleteCourse,
  } = useCourses();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [credits, setCredits] = useState("");
  const [instructor, setInstructor] = useState("");
  const [semester, setSemester] = useState("");
  const [color, setColor] = useState("#22e58c");
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftCourse | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [actionNotice, setActionNotice] = useState<ActionNotice | null>(null);
  const [noticeNow, setNoticeNow] = useState(() => Date.now());
  const [addFormError, setAddFormError] = useState<string | null>(null);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [pendingCourseIds, setPendingCourseIds] = useState<Record<string, true>>({});

  const showNotice = (notice: Omit<ActionNotice, "expiresAt">, ttlMs = NOTICE_DEFAULT_MS) => {
    setActionNotice({
      ...notice,
      expiresAt: Date.now() + ttlMs,
    });
  };

  const setCoursePending = (id: string, isPending: boolean) => {
    setPendingCourseIds((current) => {
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

  const totalCredits = useMemo(
    () =>
      filteredCourses.reduce((sum, course) => {
        return sum + (typeof course.credits === "number" ? course.credits : 0);
      }, 0),
    [filteredCourses]
  );

  if (!user) {
    return null;
  }

  if (coursesLoading) {
    return (
      <section className="neo-page-shell py-6 space-y-5">
        <div className="h-10 neo-skeleton w-56" />
        <div className="h-52 neo-skeleton" />
        <div className="h-72 neo-skeleton" />
      </section>
    );
  }

  return (
    <section className="neo-page-shell py-6 space-y-5">
      <div className="neo-card p-6 md:p-8 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Courses</h1>
        <p className="neo-text-secondary">
          Manage your semester load with live course records and quick status updates.
        </p>
      </div>

      {coursesError && (
        <div role="alert" className="neo-alert px-4 py-3.5 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <span className="text-sm font-medium">{coursesError}</span>
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
          <p className="text-xs font-medium neo-text-muted">Active Courses</p>
          <p className="text-xl sm:text-3xl font-semibold">{courseCounts.active}</p>
        </article>
        <article className="neo-card p-2.5 sm:p-5 space-y-1.5">
          <p className="text-xs font-medium neo-text-muted">Filtered Total</p>
          <p className="text-xl sm:text-3xl font-semibold">{filteredCourses.length}</p>
        </article>
        <article className="neo-card p-2.5 sm:p-5 space-y-1.5">
          <p className="text-xs font-medium neo-text-muted">Visible Credits</p>
          <p className="text-xl sm:text-3xl font-semibold">{totalCredits}</p>
        </article>
      </div>

      <div className="neo-card p-4 sm:p-5 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="w-full">
            <label className="text-xs font-medium neo-text-muted block mb-1">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by name, code, instructor"
              className="neo-search"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {COURSE_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={`neo-btn h-9 px-3 capitalize text-sm ${
                statusFilter === filter ? "neo-btn-primary" : "neo-btn-ghost"
              }`}
            >
              {filter}
              <span
                className={`inline-flex items-center justify-center min-w-5 h-5 rounded-full text-[11px] font-semibold ${
                  statusFilter === filter
                    ? "bg-[rgba(14,19,22,0.85)] text-(--neo-primary)"
                    : "bg-[rgba(255,255,255,0.08)] neo-text-secondary"
                }`}
              >
                {filter === "all" ? courseCounts.all : courseCounts[filter]}
              </span>
            </button>
          ))}
        </div>

        <form
          className="grid grid-cols-1 md:grid-cols-12 gap-3"
          onSubmit={async (event) => {
            event.preventDefault();

            if (!name.trim()) {
              setAddFormError("Course name is required.");
              return;
            }

            const creditsError = validateCredits(credits);
            if (creditsError) {
              setAddFormError(creditsError);
              return;
            }

            setSubmitting(true);
            setAddFormError(null);
            const result = await handleAddCourse({
              name,
              status: "active",
              code,
              credits: credits.trim() ? Number(credits) : undefined,
              instructor,
              semester,
              color,
            });
            setSubmitting(false);

            if (!result.ok) {
              showNotice({ type: "error", text: result.message });
              return;
            }

            setName("");
            setCode("");
            setCredits("");
            setInstructor("");
            setSemester("");
            setColor("#22e58c");
            showNotice({ type: "success", text: "Course added." });
          }}
        >
          {addFormError && (
            <p className="md:col-span-12 text-sm text-red-300">{addFormError}</p>
          )}
          <div className="md:col-span-3">
            <label className="text-xs font-medium neo-text-muted block mb-1">Course name *</label>
            <div className="relative">
              <input
                type="text"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Operating Systems"
                className="neo-input neo-task-title-input"
              />
              <span className="neo-required-mark" aria-hidden="true">*</span>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium neo-text-muted block mb-1">Code</label>
            <input
              type="text"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="CSE-401"
              className="neo-input"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium neo-text-muted block mb-1">Credits</label>
            <input
              type="number"
              min={0}
              step="0.5"
              value={credits}
              onChange={(event) => setCredits(event.target.value)}
              className="neo-input neo-picker-time h-11.5"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium neo-text-muted block mb-1">Instructor</label>
            <input
              type="text"
              value={instructor}
              onChange={(event) => setInstructor(event.target.value)}
              placeholder="Dr. Rahman"
              className="neo-input"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium neo-text-muted block mb-1">Semester</label>
            <input
              type="text"
              value={semester}
              onChange={(event) => setSemester(event.target.value)}
              placeholder="Spring 2026"
              className="neo-input"
            />
          </div>
          <div className="md:col-span-1">
            <label className="text-xs font-medium neo-text-muted block mb-1">Color</label>
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="neo-input neo-picker-time h-11.5 p-1"
            />
          </div>
          <div className="md:col-span-12 flex justify-end">
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="neo-btn neo-btn-primary h-11 px-5"
            >
              {submitting ? "Adding..." : "Add Course"}
            </button>
          </div>
        </form>
      </div>

      {editingId && editDraft && (
        <div className="neo-card p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Edit Course</h2>
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setEditDraft(null);
                setEditFormError(null);
              }}
              className="neo-btn neo-btn-ghost h-10 px-3"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-3">
              <label className="text-xs font-medium neo-text-muted block mb-1">Course name *</label>
              <div className="relative">
                <input
                  type="text"
                  value={editDraft.name}
                  onChange={(event) =>
                    setEditDraft((current) => (current ? { ...current, name: event.target.value } : current))
                  }
                  className="neo-input neo-task-title-input"
                />
                <span className="neo-required-mark" aria-hidden="true">*</span>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium neo-text-muted block mb-1">Code</label>
              <input
                type="text"
                value={editDraft.code}
                onChange={(event) =>
                  setEditDraft((current) => (current ? { ...current, code: event.target.value } : current))
                }
                className="neo-input"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium neo-text-muted block mb-1">Credits</label>
              <input
                type="number"
                min={0}
                step="0.5"
                value={editDraft.credits}
                onChange={(event) =>
                  setEditDraft((current) => (current ? { ...current, credits: event.target.value } : current))
                }
                className="neo-input neo-picker-time h-11.5"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium neo-text-muted block mb-1">Instructor</label>
              <input
                type="text"
                value={editDraft.instructor}
                onChange={(event) =>
                  setEditDraft((current) =>
                    current ? { ...current, instructor: event.target.value } : current
                  )
                }
                className="neo-input"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium neo-text-muted block mb-1">Semester</label>
              <input
                type="text"
                value={editDraft.semester}
                onChange={(event) =>
                  setEditDraft((current) => (current ? { ...current, semester: event.target.value } : current))
                }
                className="neo-input"
              />
            </div>
            <div className="md:col-span-1">
              <label className="text-xs font-medium neo-text-muted block mb-1">Color</label>
              <input
                type="color"
                value={editDraft.color || "#22e58c"}
                onChange={(event) =>
                  setEditDraft((current) => (current ? { ...current, color: event.target.value } : current))
                }
                className="neo-input neo-picker-time h-11.5 p-1"
              />
            </div>
            <div className="md:col-span-12 flex justify-end">
              <button
                type="button"
                disabled={savingEdit || !editDraft.name.trim()}
                className="neo-btn neo-btn-primary h-11 px-5"
                onClick={async () => {
                  if (!editingId || !editDraft.name.trim()) {
                    setEditFormError("Course name is required.");
                    return;
                  }

                  const creditsError = validateCredits(editDraft.credits);
                  if (creditsError) {
                    setEditFormError(creditsError);
                    return;
                  }

                  setSavingEdit(true);
                  setEditFormError(null);
                  const result = await handleUpdateCourse(editingId, {
                    name: editDraft.name,
                    status: editDraft.status,
                    code: editDraft.code,
                    credits: editDraft.credits.trim() ? Number(editDraft.credits) : undefined,
                    instructor: editDraft.instructor,
                    semester: editDraft.semester,
                    color: editDraft.color,
                  });
                  setSavingEdit(false);

                  if (!result.ok) {
                    showNotice({ type: "error", text: result.message });
                    return;
                  }

                  setEditingId(null);
                  setEditDraft(null);
                  showNotice({ type: "success", text: "Course updated." });
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
        {filteredCourses.length === 0 ? (
          <div className="text-center py-11 px-4 border border-dashed border-[rgba(34,229,140,0.26)] rounded-[14px] bg-[rgba(34,229,140,0.04)]">
            <p className="neo-text-secondary font-semibold mb-1">No courses found.</p>
            <p className="text-sm neo-text-muted">Try changing filters or add a new course.</p>
          </div>
        ) : (
          filteredCourses.map((course) => (
            <article
              key={course.id}
              className="neo-card p-4 sm:p-5 transition-all duration-200 hover:border-[rgba(34,229,140,0.28)] flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
            >
              <div className="space-y-1 min-w-0">
                <h3 className="font-semibold text-lg flex items-center gap-2 min-w-0">
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: course.color }} />
                  <span className="truncate">{course.name}</span>
                </h3>
                <p className="text-sm neo-text-secondary">
                  {course.code ? `${course.code} · ` : ""}
                  {course.instructor || "No instructor"}
                  {course.credits !== undefined ? ` · ${course.credits} credits` : ""}
                </p>
                <p className="text-xs neo-text-muted">{course.semester || "Semester not set"}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {pendingCourseIds[course.id] && (
                  <span className="inline-flex items-center gap-1.5 text-xs neo-text-muted">
                    <span className="neo-spinner neo-spinner-sm" />
                    Syncing...
                  </span>
                )}

                <select
                  value={course.status}
                  onChange={async (event) => {
                    setCoursePending(course.id, true);

                    try {
                      const result = await handleUpdateCourse(course.id, {
                        status: event.target.value as CourseStatus,
                      });

                      if (!result.ok) {
                        showNotice({ type: "error", text: result.message });
                      } else {
                        showNotice({ type: "success", text: "Course status updated." });
                      }
                    } finally {
                      setCoursePending(course.id, false);
                    }
                  }}
                  disabled={Boolean(pendingCourseIds[course.id])}
                  className="neo-select neo-picker-select h-11.5 min-w-32.5"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>

                <button
                  type="button"
                  className="neo-btn neo-btn-ghost h-10 px-3"
                  disabled={Boolean(pendingCourseIds[course.id])}
                  onClick={() => {
                    setEditingId(course.id);
                    setEditDraft(toDraft(course));
                    setEditFormError(null);
                  }}
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>

                {course.status !== "archived" && (
                  <button
                    type="button"
                    className="neo-btn neo-btn-ghost h-10 px-3"
                    disabled={Boolean(pendingCourseIds[course.id])}
                    onClick={async () => {
                      setCoursePending(course.id, true);

                      try {
                        const result = await handleArchiveCourse(course.id);
                        if (!result.ok) {
                          showNotice({ type: "error", text: result.message });
                        } else {
                          showNotice({ type: "success", text: "Course archived." });
                        }
                      } finally {
                        setCoursePending(course.id, false);
                      }
                    }}
                  >
                    Archive
                  </button>
                )}

                <button
                  type="button"
                  className="neo-btn neo-btn-ghost h-10 px-3 text-red-300 border-red-500/45 hover:bg-red-900/20"
                  disabled={Boolean(pendingCourseIds[course.id])}
                  onClick={async () => {
                    const shouldDelete = window.confirm(
                      `Delete \"${course.name}\"? This action cannot be undone.`
                    );
                    if (!shouldDelete) return;

                    setCoursePending(course.id, true);

                    try {
                      const result = await handleDeleteCourse(course.id);
                      if (!result.ok) {
                        showNotice({ type: "error", text: result.message });
                      } else {
                        showNotice(
                          {
                            type: "success",
                            text: "Course deleted.",
                            actionLabel: "Undo",
                            onAction: async () => {
                              const restoreResult = await handleAddCourse({
                                name: course.name,
                                status: course.status,
                                code: course.code,
                                credits: course.credits,
                                instructor: course.instructor,
                                semester: course.semester,
                                color: course.color,
                              });

                              if (!restoreResult.ok) {
                                showNotice({ type: "error", text: restoreResult.message });
                                return;
                              }

                              showNotice({ type: "success", text: "Course restored." });
                            },
                          },
                          NOTICE_UNDO_MS
                        );
                      }
                    } finally {
                      setCoursePending(course.id, false);
                    }
                  }}
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
