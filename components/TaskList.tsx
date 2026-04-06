import { Task } from "@/types/task";
import TaskItem from "./TaskItem";

interface TaskListProps {
  tasks: Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function TaskList({ tasks, onToggle, onDelete }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-11 px-4 border border-dashed border-[rgba(34,229,140,0.26)] rounded-[14px] bg-[rgba(34,229,140,0.04)]">
        <p className="neo-text-secondary font-semibold mb-1">No tasks found.</p>
        <p className="text-sm neo-text-muted">You&apos;re all caught up.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
