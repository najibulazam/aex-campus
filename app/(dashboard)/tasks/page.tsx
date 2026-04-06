"use client";

import { AlertTriangle } from "lucide-react";
import TaskManagerPanel from "@/components/TaskManagerPanel";
import { useTasks } from "@/lib/useTasks";

export default function TasksPage() {
  const {
    user,
    filteredTasks,
    filter,
    setFilter,
    taskCounts,
    tasksLoading,
    firestoreError,
    handleAddTask,
    handleToggleTask,
    handleDeleteTask,
  } = useTasks();

  if (!user) {
    return null;
  }

  if (tasksLoading) {
    return (
      <section className="neo-page-shell py-6 space-y-5">
        <div className="h-10 neo-skeleton w-56" />
        <div className="h-96 neo-skeleton" />
      </section>
    );
  }

  return (
    <section className="neo-page-shell py-6 space-y-5">
      <div className="neo-card p-6 md:p-8 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Tasks</h1>
        <p className="neo-text-secondary">
          Your dedicated task workspace with real-time sync, filtering, and progress tracking.
        </p>
      </div>

      {firestoreError && (
        <div role="alert" className="neo-alert px-4 py-3.5 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <span className="text-sm font-medium">{firestoreError}</span>
        </div>
      )}

      <TaskManagerPanel
        inputLayout="workspace"
        filter={filter}
        onFilterChange={setFilter}
        taskCounts={taskCounts}
        tasks={filteredTasks}
        onAddTask={handleAddTask}
        onToggleTask={handleToggleTask}
        onDeleteTask={handleDeleteTask}
      />
    </section>
  );
}
