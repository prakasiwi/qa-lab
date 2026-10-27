import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";

export function SortableHeader({ label, sortKey, sort, onSort }) {
  const isActive = sort.key === sortKey;
  const Icon = isActive
    ? sort.direction === "asc"
      ? ChevronUp
      : ChevronDown
    : ChevronsUpDown;
  return (
    <th
      aria-sort={
        isActive
          ? sort.direction === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
    >
      <button
        type="button"
        className={`table-sort-button${isActive ? " is-active" : ""}`}
        onClick={() => onSort(sortKey)}
      >
        <span>{label}</span>
        <Icon size={15} aria-hidden="true" />
      </button>
    </th>
  );
}
