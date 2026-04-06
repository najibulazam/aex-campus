"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  addScheduleEvent,
  deleteScheduleEvent,
  subscribeScheduleEvents,
  updateScheduleEvent,
} from "@/lib/scheduleService";
import type {
  ScheduleEvent,
  ScheduleEventInput,
  ScheduleEventStatus,
} from "@/types/scheduleEvent";

type ScheduleStatusFilter = "all" | ScheduleEventStatus;
type ScheduleRangeFilter = "all" | "today" | "week";
type MutationResult = { ok: true } | { ok: false; message: string };

function getMutationErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

function isInToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function isInWeek(date: Date): boolean {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  return date >= start && date < end;
}

export function useSchedule() {
  const { user } = useAuth();

  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ScheduleStatusFilter>("all");
  const [rangeFilter, setRangeFilter] = useState<ScheduleRangeFilter>("week");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeScheduleEvents(
      user.uid,
      (fetchedEvents) => {
        setEvents(fetchedEvents);
        setEventsLoading(false);
        setEventsError(null);
      },
      (error) => {
        console.error("[useSchedule] Firestore listener error:", error);
        setEventsError("Could not load schedule events. Please check your Firebase configuration.");
        setEventsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleAddEvent = useCallback(
    async (input: Omit<ScheduleEventInput, "userId">) => {
      if (!user) {
        return { ok: false, message: "You must be signed in." } satisfies MutationResult;
      }

      try {
        await addScheduleEvent({
          userId: user.uid,
          ...input,
        });
        return { ok: true } satisfies MutationResult;
      } catch (error) {
        console.error("[useSchedule] Failed to add event:", error);
        return {
          ok: false,
          message: getMutationErrorMessage(error, "Failed to add event."),
        } satisfies MutationResult;
      }
    },
    [user]
  );

  const handleUpdateEvent = useCallback(
    async (id: string, updates: Partial<Omit<ScheduleEventInput, "userId">>) => {
      if (!user) {
        return { ok: false, message: "You must be signed in." } satisfies MutationResult;
      }

      try {
        await updateScheduleEvent(id, user.uid, updates);
        return { ok: true } satisfies MutationResult;
      } catch (error) {
        console.error("[useSchedule] Failed to update event:", error);
        return {
          ok: false,
          message: getMutationErrorMessage(error, "Failed to update event."),
        } satisfies MutationResult;
      }
    },
    [user]
  );

  const handleDeleteEvent = useCallback(
    async (id: string) => {
      if (!user) {
        return { ok: false, message: "You must be signed in." } satisfies MutationResult;
      }

      try {
        await deleteScheduleEvent(id, user.uid);
        return { ok: true } satisfies MutationResult;
      } catch (error) {
        console.error("[useSchedule] Failed to delete event:", error);
        return {
          ok: false,
          message: getMutationErrorMessage(error, "Failed to delete event."),
        } satisfies MutationResult;
      }
    },
    [user]
  );

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const statusMatch = statusFilter === "all" || event.status === statusFilter;
      if (!statusMatch) return false;

      const startAt = new Date(event.startAt);
      if (rangeFilter === "today" && !isInToday(startAt)) return false;
      if (rangeFilter === "week" && !isInWeek(startAt)) return false;

      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;

      const source = `${event.title} ${event.location ?? ""}`.toLowerCase();
      return source.includes(q);
    });
  }, [events, rangeFilter, searchQuery, statusFilter]);

  const eventCounts = useMemo(
    () => ({
      all: events.length,
      planned: events.filter((event) => event.status === "planned").length,
      completed: events.filter((event) => event.status === "completed").length,
      cancelled: events.filter((event) => event.status === "cancelled").length,
    }),
    [events]
  );

  return {
    user,
    events,
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
  };
}
