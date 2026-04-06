import { FilterType } from "@/types/task";

interface TaskFilterProps {
  currentFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  taskCounts: Record<FilterType, number>;
}

export default function TaskFilter({
  currentFilter,
  onFilterChange,
  taskCounts,
}: TaskFilterProps) {
  const filters: FilterType[] = ["all", "pending", "completed"];

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {filters.map((filter) => (
        <button
          key={filter}
          onClick={() => onFilterChange(filter)}
          className={`neo-btn h-9 px-3 capitalize text-sm ${
            currentFilter === filter
              ? "neo-btn-primary"
              : "neo-btn-ghost"
          }`}
        >
          {filter}
          <span
            className={`inline-flex items-center justify-center min-w-5 h-5 rounded-full text-[11px] font-semibold ${
              currentFilter === filter
                ? "bg-[rgba(14,19,22,0.85)] text-[var(--neo-primary)]"
                : "bg-[rgba(255,255,255,0.08)] neo-text-secondary"
            }`}
          >
            {taskCounts[filter]}
          </span>
        </button>
      ))}
    </div>
  );
}
