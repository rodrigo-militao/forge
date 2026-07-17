export type SortKey = "newest" | "oldest" | "title";

/** Sort items by newest date first (descending). */
export function sortByDate<T extends { created_at?: string; updated_at?: string }>(
  items: T[],
  direction: "newest" | "oldest",
  dateField: "created_at" | "updated_at" = "updated_at",
): T[] {
  return [...items].sort((a, b) => {
    const aTime = new Date(a[dateField] ?? 0).getTime();
    const bTime = new Date(b[dateField] ?? 0).getTime();
    return direction === "newest" ? bTime - aTime : aTime - bTime;
  });
}

/** Sort items alphabetically by a string field. */
export function sortByField<T>(items: T[], field: keyof T): T[] {
  return [...items].sort((a, b) => {
    const aVal = String(a[field] ?? "");
    const bVal = String(b[field] ?? "");
    return aVal.localeCompare(bVal);
  });
}

/** Generic sort dispatcher for items with date + title fields. */
export function sortItems<T extends { created_at?: string; updated_at?: string; title?: string | null }>(
  items: T[],
  sort: SortKey,
  dateField: "created_at" | "updated_at" = "updated_at",
): T[] {
  if (sort === "title") {
    return sortByField(items, "title" as keyof T);
  }
  return sortByDate(items, sort, dateField);
}
