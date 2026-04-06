"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Pencil, Trash2 } from "lucide-react";
import { useGroups } from "@/lib/useGroups";
import type { StudyGroup, StudyGroupStatus } from "@/types/studyGroup";

type DraftGroup = {
  name: string;
  subject: string;
  status: StudyGroupStatus;
  meetingLink: string;
  cadence: string;
  nextMeetingAt: string;
  notes: string;
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

function validateMeetingLink(meetingLink: string): string | null {
  if (!meetingLink.trim()) return null;

  try {
    // URL constructor provides robust basic URL validation.
    new URL(meetingLink);
    return null;
  } catch {
    return "Meeting link must be a valid URL.";
  }
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

function toDraft(group: StudyGroup): DraftGroup {
  return {
    name: group.name,
    subject: group.subject,
    status: group.status,
    meetingLink: group.meetingLink ?? "",
    cadence: group.cadence ?? "",
    nextMeetingAt: group.nextMeetingAt ? toLocalDateTimeInput(group.nextMeetingAt) : "",
    notes: group.notes ?? "",
  };
}

const GROUP_FILTERS: Array<"all" | StudyGroupStatus> = ["all", "active", "archived"];

export default function GroupsPage() {
  const {
    user,
    filteredGroups,
    groupsLoading,
    groupsError,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    groupCounts,
    handleAddGroup,
    handleUpdateGroup,
    handleDeleteGroup,
  } = useGroups();

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [cadence, setCadence] = useState("");
  const [nextMeetingAt, setNextMeetingAt] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftGroup | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [actionNotice, setActionNotice] = useState<ActionNotice | null>(null);
  const [noticeNow, setNoticeNow] = useState(() => Date.now());
  const [addFormError, setAddFormError] = useState<string | null>(null);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [pendingGroupIds, setPendingGroupIds] = useState<Record<string, true>>({});

  const showNotice = (notice: Omit<ActionNotice, "expiresAt">, ttlMs = NOTICE_DEFAULT_MS) => {
    setActionNotice({
      ...notice,
      expiresAt: Date.now() + ttlMs,
    });
  };

  const setGroupPending = (id: string, isPending: boolean) => {
    setPendingGroupIds((current) => {
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

  const groupsWithMeetings = useMemo(
    () => filteredGroups.filter((group) => Boolean(group.nextMeetingAt)).length,
    [filteredGroups]
  );

  if (!user) {
    return null;
  }

  if (groupsLoading) {
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
        <h1 className="text-3xl font-semibold tracking-tight">Study Groups</h1>
        <p className="neo-text-secondary">
          Coordinate your team sessions with member-scoped, real-time group planning.
        </p>
      </div>

      {groupsError && (
        <div role="alert" className="neo-alert px-4 py-3.5 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <span className="text-sm font-medium">{groupsError}</span>
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
          <p className="text-xs font-medium neo-text-muted">Active Groups</p>
          <p className="text-xl sm:text-3xl font-semibold">{groupCounts.active}</p>
        </article>
        <article className="neo-card p-2.5 sm:p-5 space-y-1.5">
          <p className="text-xs font-medium neo-text-muted">Visible Groups</p>
          <p className="text-xl sm:text-3xl font-semibold">{filteredGroups.length}</p>
        </article>
        <article className="neo-card p-2.5 sm:p-5 space-y-1.5">
          <p className="text-xs font-medium neo-text-muted">With Next Meeting</p>
          <p className="text-xl sm:text-3xl font-semibold">{groupsWithMeetings}</p>
        </article>
      </div>

      <div className="neo-card p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-8">
            <label className="text-xs font-medium neo-text-muted block mb-1">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by group name or subject"
              className="neo-search"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {GROUP_FILTERS.map((filter) => (
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
                {filter === "all" ? groupCounts.all : groupCounts[filter]}
              </span>
            </button>
          ))}
        </div>

        <form
          className="grid grid-cols-1 md:grid-cols-12 gap-3"
          onSubmit={async (event) => {
            event.preventDefault();

            if (!name.trim() || !subject.trim()) {
              setAddFormError("Group name and subject are required.");
              return;
            }

            const linkError = validateMeetingLink(meetingLink);
            if (linkError) {
              setAddFormError(linkError);
              return;
            }

            setSubmitting(true);
            setAddFormError(null);
            const result = await handleAddGroup({
              name,
              subject,
              status: "active",
              memberIds: [],
              meetingLink,
              cadence,
              nextMeetingAt: nextMeetingAt ? new Date(nextMeetingAt).toISOString() : undefined,
              notes,
            });
            setSubmitting(false);

            if (!result.ok) {
              showNotice({ type: "error", text: result.message });
              return;
            }

            setName("");
            setSubject("");
            setMeetingLink("");
            setCadence("");
            setNextMeetingAt("");
            setNotes("");
            showNotice({ type: "success", text: "Study group added." });
          }}
        >
          {addFormError && (
            <p className="md:col-span-12 text-sm text-red-300">{addFormError}</p>
          )}
          <div className="md:col-span-3">
            <label className="text-xs font-medium neo-text-muted block mb-1">Group name *</label>
            <div className="relative">
              <input
                type="text"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Algorithms Circle"
                className="neo-input neo-task-title-input"
              />
              <span className="neo-required-mark" aria-hidden="true">*</span>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium neo-text-muted block mb-1">Subject *</label>
            <div className="relative">
              <input
                type="text"
                required
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Algorithms"
                className="neo-input"
              />
              <span className="neo-required-mark" aria-hidden="true">*</span>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium neo-text-muted block mb-1">Cadence</label>
            <input
              type="text"
              value={cadence}
              onChange={(event) => setCadence(event.target.value)}
              placeholder="Weekly"
              className="neo-input"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium neo-text-muted block mb-1">Next Meeting</label>
            <input
              type="datetime-local"
              value={nextMeetingAt}
              onChange={(event) => setNextMeetingAt(event.target.value)}
              className="neo-input neo-picker-date h-11.5"
            />
          </div>
          <div className="md:col-span-3">
            <label className="text-xs font-medium neo-text-muted block mb-1">Meeting Link</label>
            <input
              type="url"
              value={meetingLink}
              onChange={(event) => setMeetingLink(event.target.value)}
              placeholder="https://meet.example.com/..."
              className="neo-input"
            />
          </div>
          <div className="md:col-span-9">
            <label className="text-xs font-medium neo-text-muted block mb-1">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Split chapter 5 problems between members"
              className="neo-input"
            />
          </div>
          <div className="md:col-span-3 flex md:justify-end">
            <button
              type="submit"
              disabled={submitting || !name.trim() || !subject.trim()}
              className="neo-btn neo-btn-primary h-11 px-5 w-full md:w-auto"
            >
              {submitting ? "Adding..." : "Add Group"}
            </button>
          </div>
        </form>
      </div>

      {editingId && editDraft && (
        <div className="neo-card p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Edit Group</h2>
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
              <label className="text-xs font-medium neo-text-muted block mb-1">Group name *</label>
              <div className="relative">
                <input
                  type="text"
                  value={editDraft.name}
                  onChange={(event) =>
                    setEditDraft((current) =>
                      current ? { ...current, name: event.target.value } : current
                    )
                  }
                  className="neo-input neo-task-title-input"
                />
                <span className="neo-required-mark" aria-hidden="true">*</span>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium neo-text-muted block mb-1">Subject *</label>
              <input
                type="text"
                value={editDraft.subject}
                onChange={(event) =>
                  setEditDraft((current) =>
                    current ? { ...current, subject: event.target.value } : current
                  )
                }
                className="neo-input"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium neo-text-muted block mb-1">Status</label>
              <select
                value={editDraft.status}
                onChange={(event) =>
                  setEditDraft((current) =>
                    current ? { ...current, status: event.target.value as StudyGroupStatus } : current
                  )
                }
                className="neo-select neo-picker-select h-11.5"
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium neo-text-muted block mb-1">Cadence</label>
              <input
                type="text"
                value={editDraft.cadence}
                onChange={(event) =>
                  setEditDraft((current) =>
                    current ? { ...current, cadence: event.target.value } : current
                  )
                }
                className="neo-input"
              />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs font-medium neo-text-muted block mb-1">Meeting Link</label>
              <input
                type="url"
                value={editDraft.meetingLink}
                onChange={(event) =>
                  setEditDraft((current) =>
                    current ? { ...current, meetingLink: event.target.value } : current
                  )
                }
                className="neo-input"
              />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs font-medium neo-text-muted block mb-1">Next Meeting</label>
              <input
                type="datetime-local"
                value={editDraft.nextMeetingAt}
                onChange={(event) =>
                  setEditDraft((current) =>
                    current ? { ...current, nextMeetingAt: event.target.value } : current
                  )
                }
                className="neo-input neo-picker-date h-11.5"
              />
            </div>
            <div className="md:col-span-6">
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
            <div className="md:col-span-3 flex md:justify-end">
              <button
                type="button"
                disabled={savingEdit || !editDraft.name.trim() || !editDraft.subject.trim()}
                className="neo-btn neo-btn-primary h-11 px-5 w-full md:w-auto"
                onClick={async () => {
                  if (!editingId) return;

                  if (!editDraft.name.trim() || !editDraft.subject.trim()) {
                    setEditFormError("Group name and subject are required.");
                    return;
                  }

                  const linkError = validateMeetingLink(editDraft.meetingLink);
                  if (linkError) {
                    setEditFormError(linkError);
                    return;
                  }

                  setSavingEdit(true);
                  setEditFormError(null);
                  const result = await handleUpdateGroup(editingId, {
                    name: editDraft.name,
                    subject: editDraft.subject,
                    status: editDraft.status,
                    meetingLink: editDraft.meetingLink,
                    cadence: editDraft.cadence,
                    nextMeetingAt: editDraft.nextMeetingAt
                      ? new Date(editDraft.nextMeetingAt).toISOString()
                      : undefined,
                    notes: editDraft.notes,
                  });
                  setSavingEdit(false);

                  if (!result.ok) {
                    showNotice({ type: "error", text: result.message });
                    return;
                  }

                  setEditingId(null);
                  setEditDraft(null);
                  showNotice({ type: "success", text: "Study group updated." });
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
        {filteredGroups.length === 0 ? (
          <div className="text-center py-11 px-4 border border-dashed border-[rgba(34,229,140,0.26)] rounded-[14px] bg-[rgba(34,229,140,0.04)]">
            <p className="neo-text-secondary font-semibold mb-1">No study groups found.</p>
            <p className="text-sm neo-text-muted">Try changing filters or add a new group.</p>
          </div>
        ) : (
          filteredGroups.map((group) => (
            <article
              key={group.id}
              className="neo-card p-4 sm:p-5 transition-all duration-200 hover:border-[rgba(34,229,140,0.28)] flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
            >
              <div className="space-y-1 min-w-0">
                <h3 className="font-semibold text-lg truncate">{group.name}</h3>
                <p className="text-sm neo-text-secondary">{group.subject}</p>
                <p className="text-xs neo-text-muted">
                  {group.cadence || "No cadence"}
                  {group.nextMeetingAt ? ` · Next: ${formatDisplayDate(group.nextMeetingAt)}` : ""}
                  {group.memberIds.length ? ` · ${group.memberIds.length} members` : ""}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {pendingGroupIds[group.id] && (
                  <span className="inline-flex items-center gap-1.5 text-xs neo-text-muted">
                    <span className="neo-spinner neo-spinner-sm" />
                    Syncing...
                  </span>
                )}
                <select
                  value={group.status}
                  onChange={async (event) => {
                    setGroupPending(group.id, true);

                    try {
                      const result = await handleUpdateGroup(group.id, {
                        status: event.target.value as StudyGroupStatus,
                      });

                      if (!result.ok) {
                        showNotice({ type: "error", text: result.message });
                      } else {
                        showNotice({ type: "success", text: "Group status updated." });
                      }
                    } finally {
                      setGroupPending(group.id, false);
                    }
                  }}
                  disabled={Boolean(pendingGroupIds[group.id])}
                  className="neo-select neo-picker-select h-11.5 min-w-35"
                >
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
                <button
                  type="button"
                  className="neo-btn neo-btn-ghost h-10 px-3"
                  disabled={Boolean(pendingGroupIds[group.id])}
                  onClick={() => {
                    setEditingId(group.id);
                    setEditDraft(toDraft(group));
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
                      `Delete \"${group.name}\"? This action cannot be undone.`
                    );
                    if (!shouldDelete) return;

                    setGroupPending(group.id, true);

                    try {
                      const result = await handleDeleteGroup(group.id);
                      if (!result.ok) {
                        showNotice({ type: "error", text: result.message });
                      } else {
                        showNotice(
                          {
                            type: "success",
                            text: "Study group deleted.",
                            actionLabel: "Undo",
                            onAction: async () => {
                              const restoreResult = await handleAddGroup({
                                name: group.name,
                                subject: group.subject,
                                status: group.status,
                                memberIds: group.memberIds,
                                meetingLink: group.meetingLink,
                                cadence: group.cadence,
                                nextMeetingAt: group.nextMeetingAt,
                                notes: group.notes,
                              });

                              if (!restoreResult.ok) {
                                showNotice({ type: "error", text: restoreResult.message });
                                return;
                              }

                              showNotice({ type: "success", text: "Study group restored." });
                            },
                          },
                          NOTICE_UNDO_MS
                        );
                      }
                    } finally {
                      setGroupPending(group.id, false);
                    }
                  }}
                  disabled={Boolean(pendingGroupIds[group.id])}
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
