"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/context/AuthContext";
import { subscribeGroups } from "@/lib/groupService";
import { subscribeScheduleEvents } from "@/lib/scheduleService";
import { subscribeTasks } from "@/lib/taskService";
import type { StudyGroup } from "@/types/studyGroup";
import type { ScheduleEvent } from "@/types/scheduleEvent";
import type { Task } from "@/types/task";

interface DashboardDataContextValue {
  tasks: Task[];
  tasksLoading: boolean;
  tasksError: string | null;
  events: ScheduleEvent[];
  eventsLoading: boolean;
  eventsError: string | null;
  groups: StudyGroup[];
  groupsLoading: boolean;
  groupsError: string | null;
}

const DashboardDataContext = createContext<DashboardDataContextValue | null>(null);

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);

  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupsError, setGroupsError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    return subscribeTasks(
      user.uid,
      (fetchedTasks) => {
        setTasks(fetchedTasks);
        setTasksLoading(false);
        setTasksError(null);
      },
      (error) => {
        console.error("[DashboardDataProvider] Task listener error:", error);
        setTasksLoading(false);
        setTasksError("Could not connect to the database. Please check your Firebase config.");
      }
    );
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    return subscribeScheduleEvents(
      user.uid,
      (fetchedEvents) => {
        setEvents(fetchedEvents);
        setEventsLoading(false);
        setEventsError(null);
      },
      (error) => {
        console.error("[DashboardDataProvider] Schedule listener error:", error);
        setEventsLoading(false);
        setEventsError("Could not load schedule events. Please check your Firebase configuration.");
      }
    );
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    return subscribeGroups(
      user.uid,
      (fetchedGroups) => {
        setGroups(fetchedGroups);
        setGroupsLoading(false);
        setGroupsError(null);
      },
      (error) => {
        console.error("[DashboardDataProvider] Group listener error:", error);
        setGroupsLoading(false);
        setGroupsError("Could not load study groups. Please check your Firebase configuration.");
      }
    );
  }, [user]);

  const value = useMemo(
    () => ({
      tasks,
      tasksLoading,
      tasksError,
      events,
      eventsLoading,
      eventsError,
      groups,
      groupsLoading,
      groupsError,
    }),
    [
      tasks,
      tasksLoading,
      tasksError,
      events,
      eventsLoading,
      eventsError,
      groups,
      groupsLoading,
      groupsError,
    ]
  );

  return (
    <DashboardDataContext.Provider value={value}>
      {children}
    </DashboardDataContext.Provider>
  );
}

export function useDashboardData(): DashboardDataContextValue {
  const context = useContext(DashboardDataContext);
  if (!context) {
    throw new Error("useDashboardData must be used within DashboardDataProvider");
  }

  return context;
}
