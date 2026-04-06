import TaskFilter from "@/components/TaskFilter";
import TaskInput from "@/components/TaskInput";
import TaskList from "@/components/TaskList";
import type { FilterType, Priority, Task } from "@/types/task";

interface TaskManagerPanelProps {
  title?: string;
  subtitle?: string;
  inputLayout?: "default" | "workspace";
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  taskCounts: Record<FilterType, number>;
  tasks: Task[];
  onAddTask: (title: string, priority?: Priority, dueDate?: string, time?: string | null) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
}

export default function TaskManagerPanel({
  title,
  subtitle,
  inputLayout = "default",
  filter,
  onFilterChange,
  taskCounts,
  tasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
}: TaskManagerPanelProps) {
  return (
    <div className="neo-card p-4 sm:p-5 space-y-4">
      {(title || subtitle) && (
        <div className="space-y-1">
          {title && <h2 className="text-xl font-semibold">{title}</h2>}
          {subtitle && <p className="text-sm neo-text-secondary">{subtitle}</p>}
        </div>
      )}

      <TaskInput onAddTask={onAddTask} layoutMode={inputLayout} />
      <TaskFilter currentFilter={filter} onFilterChange={onFilterChange} taskCounts={taskCounts} />
      <TaskList tasks={tasks} onToggle={onToggleTask} onDelete={onDeleteTask} />
    </div>
  );
}
