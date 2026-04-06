import { useState } from "react";
import { Plus } from "lucide-react";
import { Priority } from "@/types/task";

interface TaskInputProps {
  onAddTask: (
    title: string,
    priority?: Priority,
    dueDate?: string,
    time?: string | null
  ) => void;
  layoutMode?: "default" | "workspace";
}

export default function TaskInput({ onAddTask, layoutMode = "default" }: TaskInputProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority | "">("");
  const [dueDate, setDueDate] = useState("");
  const [taskTime, setTaskTime] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !priority || !dueDate) return;
    onAddTask(
      title.trim(),
      priority as Priority,
      dueDate,
      taskTime || null
    );
    setTitle("");
    setPriority("");
    setDueDate("");
    setTaskTime("");
  };

  return (
    <form onSubmit={handleSubmit} className="neo-card p-4 space-y-3">
      <div className="relative">
        <input
          type="text"
          placeholder="What needs to be done?"
          className="neo-input neo-task-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <span className="neo-required-mark" aria-hidden="true">*</span>
      </div>

      {layoutMode === "workspace" ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <select
              className="neo-select neo-picker-select h-11.5 w-full min-w-0"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority | "")}
              aria-label="Task priority"
              required
            >
              <option value="" disabled>
                Priority
              </option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <span className="neo-required-mark" aria-hidden="true">*</span>
          </div>

          <div className="relative">
            <input
              type="date"
              className="neo-input neo-picker-date h-11.5 w-full min-w-0"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              aria-label="Due date"
              required
            />
            <p className="text-[11px] neo-text-muted mt-1">
              {dueDate ? "Date selected" : "No date selected"}
            </p>
            <span className="neo-required-mark" aria-hidden="true">*</span>
          </div>

          <div>
            <input
              type="time"
              className="neo-input neo-picker-time h-11.5 w-full min-w-0"
              value={taskTime}
              onChange={(e) => setTaskTime(e.target.value)}
              aria-label="Due time"
            />
            <p className="text-[11px] neo-text-muted mt-1">
              {taskTime ? "Time selected" : "No time selected"}
            </p>
          </div>

          <button
            type="submit"
            className="neo-btn neo-btn-primary h-11.5 w-full whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            Add
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 items-start">
            <div className="relative min-w-0">
              <select
                className="neo-select neo-picker-select w-full"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority | "")}
                aria-label="Task priority"
                required
              >
                <option value="" disabled>
                  Priority
                </option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <span className="neo-required-mark" aria-hidden="true">*</span>
            </div>

            <div className="relative min-w-0">
              <input
                type="date"
                className="neo-input neo-picker-date w-full"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                aria-label="Due date"
                required
              />
              <p className="text-[11px] neo-text-muted mt-1">
                {dueDate ? "Date selected" : "No date selected"}
              </p>
              <span className="neo-required-mark" aria-hidden="true">*</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <input
                type="time"
                className="neo-input neo-picker-time h-11.5 w-full"
                value={taskTime}
                onChange={(e) => setTaskTime(e.target.value)}
                aria-label="Due time"
              />
              <p className="text-[11px] neo-text-muted mt-1">
                {taskTime ? "Time selected" : "No time selected"}
              </p>
            </div>

            <button
              type="submit"
              className="neo-btn neo-btn-primary h-11.5 w-full whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              Add
            </button>
          </div>
        </>
      )}
    </form>
  );
}
