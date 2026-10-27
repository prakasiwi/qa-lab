import { useMemo, useState } from "react";

const compare = (left, right) =>
  String(left ?? "").localeCompare(String(right ?? ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });

export function useTableSort(rows, values) {
  const [sort, setSort] = useState({ key: "", direction: "asc" });
  const sortedRows = useMemo(
    () =>
      !sort.key
        ? rows
        : [...rows].sort((left, right) => {
            const result = compare(
              values(left)[sort.key],
              values(right)[sort.key],
            );
            return sort.direction === "asc" ? result : -result;
          }),
    [rows, sort, values],
  );
  const toggleSort = (key) =>
    setSort((current) => {
      if (current.key !== key) return { key, direction: "asc" };
      if (current.direction === "asc") return { key, direction: "desc" };
      return { key: "", direction: "asc" };
    });
  return { sort, sortedRows, toggleSort };
}
