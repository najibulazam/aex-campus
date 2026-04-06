import { Trash2, Calendar, Clock } from "lucide-react";
import { Task } from "@/types/task";

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  const getPriorityColor = (p?: string) => {
    switch (p) {
      case "high":
        return "bg-[rgba(34,229,140,0.16)] text-[var(--neo-primary)] border-[rgba(34,229,140,0.38)]";
      case "medium":
        return "bg-[rgba(34,229,140,0.1)] text-[var(--neo-text-secondary)] border-[rgba(34,229,140,0.3)]";
      case "low":
        return "bg-[rgba(34,229,140,0.06)] text-[var(--neo-text-muted)] border-[rgba(34,229,140,0.24)]";
      default:
        return "bg-[var(--neo-bg-tertiary)] neo-text-secondary border-[var(--neo-card-border)]";
    }
  };

  const formatDueDate = (rawDate: string) => {
    // Parse date-only values as local dates to avoid timezone day shifts.
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      const [year, month, day] = rawDate.split("-").map(Number);
      const localDate = new Date(year, month - 1, day);
      return localDate.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }

    const parsedDate = new Date(rawDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return rawDate;
    }

    return parsedDate.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTaskTime = (rawTime: string) => {
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(rawTime)) {
      return rawTime;
    }

    const [hours, minutes] = rawTime.split(":").map(Number);
    const isPm = hours >= 12;
    const hour12 = hours % 12 || 12;
    const suffix = isPm ? "PM" : "AM";

    return `${hour12}:${minutes.toString().padStart(2, "0")} ${suffix}`;
  };

  return (
    <div className={`neo-card p-4 sm:p-5 transition-all duration-200 ${task.completed ? "opacity-60" : "hover:border-[rgba(34,229,140,0.28)]"}`}>
      <div className="flex flex-row items-start sm:items-center gap-3 sm:gap-4 group">
        <input
          type="checkbox"
          className="neo-checkbox mt-0.5 sm:mt-0 shrink-0 rounded-md transition-all"
          checked={task.completed}
          onChange={() => onToggle(task.id)}
        />
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <p className={`font-semibold text-sm sm:text-base break-words transition-all ${task.completed ? "line-through neo-text-muted" : "text-(--neo-text-primary)"}`}>
            {task.title}
          </p>
          {(task.priority || task.dueDate || task.time) && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {task.priority && (
                <span className={`px-2 py-0.5 border text-[10px] font-black uppercase tracking-widest rounded-md ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </span>
              )}
              {task.dueDate && (
                <span className={`flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-md ${task.completed ? "neo-text-muted" : "neo-text-secondary bg-[rgba(34,229,140,0.05)]"}`}>
                  <Calendar className="w-3 h-3" />
                  {formatDueDate(task.dueDate)}
                </span>
              )}
              {task.time && (
                <span className={`flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-md ${task.completed ? "neo-text-muted" : "neo-text-secondary bg-[rgba(34,229,140,0.05)]"}`}>
                  <Clock className="w-3 h-3" />
                  {formatTaskTime(task.time)}
                </span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => onDelete(task.id)}
          className="neo-btn neo-btn-ghost h-11 w-11 sm:h-8 sm:w-8 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
          title="Delete task"
          aria-label="Delete task"
        >
          <Trash2 className="w-4.5 h-4.5" />
        </button>
      </div>
    </div>
  );
}
