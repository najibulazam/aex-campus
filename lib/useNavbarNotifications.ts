"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDashboardData } from "@/context/DashboardDataContext";
import type { ScheduleEvent } from "@/types/scheduleEvent";
import type { StudyGroup } from "@/types/studyGroup";
import type { Task } from "@/types/task";

export interface NavbarNotificationItem {
  id: string;
  title: string;
  message: string;
  createdAt: string;
}

type NotificationCandidate = NavbarNotificationItem & {
  sortTime: number;
};

function parseTaskDueDate(task: Task): Date | null {
  if (!task.dueDate) {
    return null;
  }

  const raw = task.time
    ? `${task.dueDate}T${task.time}:00`
    : `${task.dueDate}T23:59:00`;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function getOverdueTaskNotifications(tasks: Task[], nowMs: number): NotificationCandidate[] {
  return tasks
    .filter((task) => !task.completed)
    .map((task) => {
      const due = parseTaskDueDate(task);
      if (!due) return null;

      const dueMs = due.getTime();
      if (dueMs >= nowMs) return null;

      return {
        id: `task-overdue-${task.id}`,
        title: "Task overdue",
        message: `"${task.title}" is past due.`,
        createdAt: due.toISOString(),
        sortTime: dueMs,
      } satisfies NotificationCandidate;
    })
    .filter((item): item is NotificationCandidate => item !== null)
    .sort((a, b) => b.sortTime - a.sortTime)
    .slice(0, 3);
}

function getDueSoonTaskNotifications(tasks: Task[], nowMs: number): NotificationCandidate[] {
  const nextDayMs = nowMs + 24 * 60 * 60 * 1000;

  return tasks
    .filter((task) => !task.completed)
    .map((task) => {
      const due = parseTaskDueDate(task);
      if (!due) return null;

      const dueMs = due.getTime();
      if (dueMs < nowMs || dueMs > nextDayMs) return null;

      return {
        id: `task-due-soon-${task.id}`,
        title: "Task due soon",
        message: `"${task.title}" is due within 24 hours.`,
        createdAt: due.toISOString(),
        sortTime: dueMs,
      } satisfies NotificationCandidate;
    })
    .filter((item): item is NotificationCandidate => item !== null)
    .sort((a, b) => a.sortTime - b.sortTime)
    .slice(0, 3);
}

function getUpcomingEventNotifications(
  events: ScheduleEvent[],
  nowMs: number
): NotificationCandidate[] {
  const nextDayMs = nowMs + 24 * 60 * 60 * 1000;

  return events
    .filter((event) => event.status === "planned")
    .map((event) => {
      const start = new Date(event.startAt);
      if (Number.isNaN(start.getTime())) return null;

      const startMs = start.getTime();
      if (startMs < nowMs || startMs > nextDayMs) return null;

      return {
        id: `event-upcoming-${event.id}`,
        title: "Upcoming event",
        message: `"${event.title}" starts soon.`,
        createdAt: start.toISOString(),
        sortTime: startMs,
      } satisfies NotificationCandidate;
    })
    .filter((item): item is NotificationCandidate => item !== null)
    .sort((a, b) => a.sortTime - b.sortTime)
    .slice(0, 3);
}

function getUpcomingGroupMeetingNotifications(
  groups: StudyGroup[],
  nowMs: number
): NotificationCandidate[] {
  const nextWindowMs = nowMs + 72 * 60 * 60 * 1000;

  return groups
    .filter((group) => group.status === "active")
    .map((group) => {
      if (!group.nextMeetingAt) return null;

      const meeting = new Date(group.nextMeetingAt);
      if (Number.isNaN(meeting.getTime())) return null;

      const meetingMs = meeting.getTime();
      if (meetingMs < nowMs || meetingMs > nextWindowMs) return null;

      return {
        id: `group-meeting-${group.id}`,
        title: "Study group meeting",
        message: `"${group.name}" has a meeting coming up.`,
        createdAt: meeting.toISOString(),
        sortTime: meetingMs,
      } satisfies NotificationCandidate;
    })
    .filter((item): item is NotificationCandidate => item !== null)
    .sort((a, b) => a.sortTime - b.sortTime)
    .slice(0, 2);
}

export function useNavbarNotifications() {
  const { user } = useAuth();
  const { tasks, events, groups } = useDashboardData();
  const [clockMs, setClockMs] = useState<number>(() => new Date().getTime());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setClockMs(new Date().getTime());
    }, 60_000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const notifications = useMemo(() => {
    if (!user) {
      return [];
    }

    const nowMs = clockMs;

    const candidates: NotificationCandidate[] = [
      ...getOverdueTaskNotifications(tasks, nowMs),
      ...getDueSoonTaskNotifications(tasks, nowMs),
      ...getUpcomingEventNotifications(events, nowMs),
      ...getUpcomingGroupMeetingNotifications(groups, nowMs),
    ];

    return candidates
      .sort((a, b) => b.sortTime - a.sortTime)
      .slice(0, 8)
      .map(({ id, title, message, createdAt }) => ({
        id,
        title,
        message,
        createdAt,
      }));
  }, [clockMs, events, groups, tasks, user]);

  return {
    notifications,
  };
}
