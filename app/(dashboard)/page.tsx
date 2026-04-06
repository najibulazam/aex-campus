"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type TouchEvent } from "react";
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CalendarClock,
  CheckCircle2,
  CheckSquare,
  Clock,
  ListTodo,
  Target,
  Users,
} from "lucide-react";
import TaskManagerPanel from "@/components/TaskManagerPanel";
import { useCourses } from "@/lib/useCourses";
import { useGroups } from "@/lib/useGroups";
import { useProfile } from "@/lib/useProfile";
import { useSchedule } from "@/lib/useSchedule";
import { useTasks } from "@/lib/useTasks";

function formatDate(date: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function Home() {
  const {
    user,
    tasks,
    filteredTasks,
    filter,
    setFilter,
    taskCounts,
    productivityScore,
    tasksLoading,
    firestoreError,
    handleAddTask,
    handleToggleTask,
    handleDeleteTask,
  } = useTasks();
  const { profile } = useProfile();
  const { courseCounts, coursesLoading, coursesError } = useCourses();
  const { events, eventCounts, eventsLoading, eventsError } = useSchedule();
  const { groupCounts, groupsLoading, groupsError } = useGroups();

  const moduleLoading = coursesLoading || eventsLoading || groupsLoading;

  const displayName =
    profile?.displayName?.trim() || user?.displayName?.trim() || user?.email?.split("@")[0] || "Student";

  const [isTaskSheetOpen, setIsTaskSheetOpen] = useState(false);
  const sheetTouchStartYRef = useRef<number | null>(null);
  const sheetTouchCurrentYRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isTaskSheetOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isTaskSheetOpen]);

  const openTaskSheet = () => setIsTaskSheetOpen(true);
  const closeTaskSheet = () => setIsTaskSheetOpen(false);

  const handleSheetTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const startY = event.touches[0]?.clientY;
    if (typeof startY !== "number") {
      return;
    }

    sheetTouchStartYRef.current = startY;
    sheetTouchCurrentYRef.current = startY;
  };

  const handleSheetTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    const currentY = event.touches[0]?.clientY;
    if (typeof currentY !== "number") {
      return;
    }

    sheetTouchCurrentYRef.current = currentY;
  };

  const handleSheetTouchEnd = () => {
    const startY = sheetTouchStartYRef.current;
    const currentY = sheetTouchCurrentYRef.current;

    sheetTouchStartYRef.current = null;
    sheetTouchCurrentYRef.current = null;

    if (typeof startY !== "number" || typeof currentY !== "number") {
      return;
    }

    if (currentY - startY > 90) {
      closeTaskSheet();
    }
  };

  const upcomingDeadlines = tasks
    .filter((task) => !task.completed && task.dueDate)
    .sort((a, b) => new Date(a.dueDate as string).getTime() - new Date(b.dueDate as string).getTime())
    .slice(0, 4);

  const upcomingSchedule = events
    .filter((event) => event.status !== "cancelled")
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .slice(0, 4);

  if (!user) {
    return null;
  }

  if (tasksLoading) {
    return (
      <div className="neo-page-shell pb-16 space-y-6">
        <div className="h-10 neo-skeleton w-72" />
        <div className="dashboard-layout flex flex-col lg:flex-row gap-6 items-start">
          <div className="dashboard-left flex-1 flex flex-col gap-5 min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 neo-skeleton" />
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-28 neo-skeleton" />
              ))}
            </div>
            <div className="space-y-3.5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 neo-skeleton" />
              ))}
            </div>
            <div className="h-48 neo-skeleton" />
          </div>
          <div className="dashboard-right w-full lg:w-[360px] lg:shrink-0 hidden lg:block">
            <div className="h-[520px] neo-skeleton" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="neo-page-shell space-y-7 pb-28 lg:pb-16">
      {firestoreError && (
        <div role="alert" className="neo-alert px-4 py-3.5 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <span className="text-sm font-medium">{firestoreError}</span>
        </div>
      )}

      {coursesError && (
        <div role="alert" className="neo-alert px-4 py-3.5 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <span className="text-sm font-medium">{coursesError}</span>
        </div>
      )}

      {eventsError && (
        <div role="alert" className="neo-alert px-4 py-3.5 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <span className="text-sm font-medium">{eventsError}</span>
        </div>
      )}

      {groupsError && (
        <div role="alert" className="neo-alert px-4 py-3.5 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <span className="text-sm font-medium">{groupsError}</span>
        </div>
      )}

      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Welcome back, <span className="neo-accent">{displayName}</span>
          </h1>
          <p className="neo-text-secondary text-sm md:text-base">
            You have <span className="neo-accent font-semibold">{taskCounts.pending} pending tasks</span> and {taskCounts.completed} tasks completed.
          </p>
        </div>
        <div className="open-workspace-btn hidden lg:block">
          <Link href="/tasks" className="neo-btn neo-btn-primary h-11 px-4">
            Open Task Workspace
          </Link>
        </div>
      </section>

      <section className="dashboard-layout flex flex-col lg:flex-row gap-6 items-start">
        <div className="dashboard-left flex-1 flex flex-col gap-5 min-w-0">
          <section className="space-y-2 lg:space-y-4">
            <div className="grid grid-cols-3 lg:grid-cols-4 gap-2 lg:gap-4">
              <article className="neo-card p-2.5 lg:p-5 h-full">
                <p className="text-[11px] lg:text-xs font-medium neo-text-muted mb-1">Total Tasks</p>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl lg:text-3xl font-semibold">{taskCounts.all}</h2>
                  <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl bg-[rgba(34,229,140,0.1)] border border-[rgba(34,229,140,0.26)] flex items-center justify-center">
                    <ListTodo className="w-4 h-4 lg:w-5 lg:h-5 neo-accent" />
                  </div>
                </div>
              </article>

              <article className="neo-card p-2.5 lg:p-5 h-full">
                <p className="text-[11px] lg:text-xs font-medium neo-text-muted mb-1">Completed</p>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl lg:text-3xl font-semibold">{taskCounts.completed}</h2>
                  <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl bg-[rgba(34,229,140,0.1)] border border-[rgba(34,229,140,0.26)] flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 lg:w-5 lg:h-5 neo-accent" />
                  </div>
                </div>
              </article>

              <article className="neo-card p-2.5 lg:p-5 h-full">
                <p className="text-[11px] lg:text-xs font-medium neo-text-muted mb-1">Pending</p>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl lg:text-3xl font-semibold">{taskCounts.pending}</h2>
                  <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl bg-[rgba(34,229,140,0.1)] border border-[rgba(34,229,140,0.26)] flex items-center justify-center">
                    <Clock className="w-4 h-4 lg:w-5 lg:h-5 neo-accent" />
                  </div>
                </div>
              </article>

              <article className="hidden lg:block neo-card p-5 h-full border-[rgba(34,229,140,0.25)] shadow-[0_0_24px_rgba(34,229,140,0.16),0_8px_30px_rgba(0,0,0,0.6)]">
                <p className="text-sm font-semibold neo-text-muted mb-1">Completion Rate</p>
                <div className="flex items-end gap-2">
                  <h2 className="text-3xl font-semibold neo-accent">{productivityScore}%</h2>
                  <span className="neo-text-muted text-sm pb-1">this cycle</span>
                </div>
                <p className="mt-3 text-xs neo-text-secondary">
                  {taskCounts.pending === 0
                    ? "Great pace. You are currently clear of pending tasks."
                    : "Keep momentum and close pending items before new ones stack up."}
                </p>
              </article>
            </div>

            <article className="lg:hidden neo-card p-3.5 h-full border-[rgba(34,229,140,0.25)] shadow-[0_0_24px_rgba(34,229,140,0.16),0_8px_30px_rgba(0,0,0,0.6)]">
              <p className="text-sm font-semibold neo-text-muted mb-1">Completion Rate</p>
              <div className="flex items-end gap-2">
                <h2 className="text-2xl font-semibold neo-accent leading-none">{productivityScore}%</h2>
                <span className="neo-text-muted text-xs pb-0.5">this cycle</span>
              </div>
              <p className="mt-3 text-xs neo-text-secondary">
                {taskCounts.pending === 0
                  ? "Great pace. You are currently clear of pending tasks."
                  : "Keep momentum and close pending items before new ones stack up."}
              </p>
            </article>
          </section>

          <section className="grid grid-cols-3 gap-2 lg:gap-4">
            {moduleLoading ? (
              <>
                <div className="h-28 neo-skeleton" />
                <div className="h-28 neo-skeleton" />
                <div className="h-28 neo-skeleton" />
              </>
            ) : (
              <>
                <Link href="/courses" className="neo-card p-2.5 lg:p-5 h-full hover:border-[rgba(34,229,140,0.35)] transition-colors duration-200">
                  <p className="text-[11px] lg:text-xs font-medium neo-text-muted mb-1">Active Courses</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xl lg:text-3xl font-semibold">{courseCounts.active}</p>
                    <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl bg-[rgba(34,229,140,0.1)] border border-[rgba(34,229,140,0.26)] flex items-center justify-center">
                      <BookOpen className="w-4 h-4 lg:w-5 lg:h-5 neo-accent" />
                    </div>
                  </div>
                  <p className="neo-text-secondary text-[11px] lg:text-sm mt-2">{courseCounts.completed} completed</p>
                </Link>

                <Link href="/schedule" className="neo-card p-2.5 lg:p-5 h-full hover:border-[rgba(34,229,140,0.35)] transition-colors duration-200">
                  <p className="text-[11px] lg:text-xs font-medium neo-text-muted mb-1">Planned Events</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xl lg:text-3xl font-semibold">{eventCounts.planned}</p>
                    <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl bg-[rgba(34,229,140,0.1)] border border-[rgba(34,229,140,0.26)] flex items-center justify-center">
                      <CalendarDays className="w-4 h-4 lg:w-5 lg:h-5 neo-accent" />
                    </div>
                  </div>
                  <p className="neo-text-secondary text-[11px] lg:text-sm mt-2">{eventCounts.completed} completed</p>
                </Link>

                <Link href="/groups" className="neo-card p-2.5 lg:p-5 h-full hover:border-[rgba(34,229,140,0.35)] transition-colors duration-200">
                  <p className="text-[11px] lg:text-xs font-medium neo-text-muted mb-1">Active Groups</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xl lg:text-3xl font-semibold">{groupCounts.active}</p>
                    <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl bg-[rgba(34,229,140,0.1)] border border-[rgba(34,229,140,0.26)] flex items-center justify-center">
                      <Users className="w-4 h-4 lg:w-5 lg:h-5 neo-accent" />
                    </div>
                  </div>
                  <p className="neo-text-secondary text-[11px] lg:text-sm mt-2">{groupCounts.archived} archived</p>
                </Link>
              </>
            )}
          </section>

          <section className="w-full">
            <article className="neo-card p-4 sm:p-5 space-y-4 w-full">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Upcoming Deadlines</h2>
                <span className="neo-badge inline-flex items-center gap-1.5">
                  <CalendarClock className="w-3.5 h-3.5" />
                  {upcomingDeadlines.length} due soon
                </span>
              </div>

              {upcomingDeadlines.length === 0 ? (
                <div className="neo-card p-5 text-center w-full">
                  <p className="neo-text-secondary font-semibold mb-1">No dated deadlines yet.</p>
                  <p className="text-sm neo-text-muted">Add due dates to pending tasks to populate this timeline.</p>
                </div>
              ) : (
                <div className="space-y-2.5 w-full">
                  {upcomingDeadlines.map((task) => (
                    <article key={task.id} className="neo-card-soft px-3.5 py-2.5 flex items-center gap-3.5 w-full">
                      <div className="w-10 h-10 rounded-xl border border-[rgba(34,229,140,0.3)] bg-[rgba(34,229,140,0.1)] flex items-center justify-center shrink-0">
                        <Target className="w-4.5 h-4.5 neo-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base truncate">{task.title}</h3>
                        <p className="neo-text-secondary text-xs sm:text-sm mt-1">
                          Due {task.dueDate ? formatDate(task.dueDate) : "No due date"}
                        </p>
                      </div>
                      {task.priority && <span className="neo-badge capitalize">{task.priority}</span>}
                    </article>
                  ))}
                </div>
              )}
            </article>
          </section>

          <section className="w-full">
            <article className="neo-card p-4 sm:p-5 space-y-4 w-full">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Upcoming Events</h2>
                <Link href="/schedule" className="neo-badge">Open Schedule</Link>
              </div>

              {moduleLoading ? (
                <div className="space-y-2.5">
                  <div className="h-12 neo-skeleton" />
                  <div className="h-12 neo-skeleton" />
                </div>
              ) : upcomingSchedule.length === 0 ? (
                <div className="neo-card p-5 text-center">
                  <p className="neo-text-secondary font-semibold mb-1">No future events are scheduled yet.</p>
                  <p className="text-sm neo-text-muted">Add upcoming events in schedule to populate this timeline.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {upcomingSchedule.map((event) => (
                    <div key={event.id} className="neo-card-soft px-3.5 py-2.5">
                      <p className="text-sm font-semibold truncate">{event.title}</p>
                      <p className="text-xs neo-text-secondary mt-1">
                        {new Date(event.startAt).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>
        </div>

        <aside className="task-manager-section dashboard-right hidden lg:block lg:w-[360px] lg:shrink-0">
          <div className="lg:sticky lg:top-20">
            <TaskManagerPanel
              title="Task Manager"
              subtitle="Capture, prioritize, and complete tasks in one place."
              filter={filter}
              onFilterChange={setFilter}
              taskCounts={taskCounts}
              tasks={filteredTasks}
              onAddTask={handleAddTask}
              onToggleTask={handleToggleTask}
              onDeleteTask={handleDeleteTask}
            />
          </div>
        </aside>
      </section>

      <button
        type="button"
        aria-label="Open Task Manager"
        className="task-fab lg:hidden"
        onClick={openTaskSheet}
      >
        <CheckSquare className="w-6 h-6 text-[#062b18]" />
        {taskCounts.pending > 0 && (
          <span className="task-fab-badge animate-pulse">
            {taskCounts.pending > 99 ? "99+" : taskCounts.pending}
          </span>
        )}
      </button>

      {isTaskSheetOpen && (
        <button
          type="button"
          className="task-sheet-backdrop lg:hidden"
          aria-label="Close Task Manager"
          onClick={closeTaskSheet}
        />
      )}

      <section className={`task-sheet lg:hidden ${isTaskSheetOpen ? "open" : ""}`}>
        <div
          className="w-full"
          onTouchStart={handleSheetTouchStart}
          onTouchMove={handleSheetTouchMove}
          onTouchEnd={handleSheetTouchEnd}
        >
          <button
            type="button"
            aria-label="Close Task Manager Panel"
            className="task-sheet-handle-btn"
            onClick={closeTaskSheet}
          >
            <span className="task-sheet-handle" />
          </button>
        </div>

        <div className="space-y-4 pb-8">
          <Link
            href="/tasks"
            className="neo-btn neo-btn-primary h-11 w-full"
            onClick={closeTaskSheet}
          >
            Open Task Workspace
          </Link>

          <TaskManagerPanel
            title="Task Manager"
            subtitle="Capture, prioritize, and complete tasks in one place."
            filter={filter}
            onFilterChange={setFilter}
            taskCounts={taskCounts}
            tasks={filteredTasks}
            onAddTask={handleAddTask}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
          />
        </div>
      </section>
    </div>
  );
}
