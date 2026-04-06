"use client";

import { useCallback, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDashboardData } from "@/context/DashboardDataContext";
import { addTask, deleteTask, toggleTask } from "@/lib/taskService";
import type { FilterType, Priority } from "@/types/task";

export function useTasks() {
  const { user } = useAuth();
  const { tasks, tasksLoading, tasksError } = useDashboardData();

  const [filter, setFilter] = useState<FilterType>("all");

  const handleAddTask = useCallback(
    async (title: string, priority?: Priority, dueDate?: string, time?: string | null) => {
      if (!user) return;
      try {
        await addTask(user.uid, title, priority, dueDate, time);
      } catch (error) {
        console.error("[useTasks] Failed to add task:", error);
      }
    },
    [user]
  );

  const handleToggleTask = useCallback(
    async (id: string) => {
      if (!user) return;
      const task = tasks.find((t) => t.id === id);
      if (!task) return;

      try {
        await toggleTask(id, !task.completed, user.uid);
      } catch (error) {
        console.error("[useTasks] Failed to toggle task:", error);
      }
    },
    [tasks, user]
  );

  const handleDeleteTask = useCallback(
    async (id: string) => {
      if (!user) return;
      try {
        await deleteTask(id, user.uid);
      } catch (error) {
        console.error("[useTasks] Failed to delete task:", error);
      }
    },
    [user]
  );

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (filter === "completed") return task.completed;
      if (filter === "pending") return !task.completed;
      return true;
    });
  }, [tasks, filter]);

  const taskCounts = useMemo(
    () => ({
      all: tasks.length,
      completed: tasks.filter((t) => t.completed).length,
      pending: tasks.filter((t) => !t.completed).length,
    }),
    [tasks]
  );

  const productivityScore = useMemo(() => {
    if (tasks.length === 0) return 0;
    return Math.round((taskCounts.completed / tasks.length) * 100);
  }, [taskCounts.completed, tasks.length]);

  return {
    user,
    tasks,
    filteredTasks,
    filter,
    setFilter,
    taskCounts,
    productivityScore,
    tasksLoading,
    firestoreError: tasksError,
    handleAddTask,
    handleToggleTask,
    handleDeleteTask,
  };
}
