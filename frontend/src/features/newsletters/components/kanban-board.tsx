import type { ReactNode } from "react";

const COLUMN_HEADERS: Record<string, { label: string; icon: string; color: string }> = {
  building: {
    label: "Building",
    icon: "⚙",
    color: "var(--color-accent-primary)",
  },
  ready: {
    label: "Ready",
    icon: "✓",
    color: "var(--color-accent-success)",
  },
  published: {
    label: "Published",
    icon: "→",
    color: "var(--color-bg-surface)",
  },
  archived: {
    label: "Archived",
    icon: "□",
    color: "var(--color-text-muted)",
  },
};

export function KanbanBoard({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full gap-4 overflow-x-auto pb-4 pt-1">
      {children}
    </div>
  );
}

export function KanbanColumn({
  status,
  count,
  children,
}: {
  status: string;
  count: number;
  children: ReactNode;
}) {
  const header = COLUMN_HEADERS[status] ?? { label: status, icon: "·", color: "var(--color-text-muted)" };

  return (
    <div className="flex min-h-[400px] w-[320px] shrink-0 flex-col rounded-xl border border-[var(--color-border)]/10 bg-white/[0.015]">
      {/* Column header */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border)]/10 px-4 py-3">
        <div
          className="flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium"
          style={{ backgroundColor: `${header.color}15`, color: header.color }}
        >
          {header.label}
        </div>
        <span className="text-xs text-[var(--color-text-muted)]">{count}</span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 p-3">
        {children}

        {/* Empty-state placeholder */}
        {count === 0 && (
          <div className="mt-8 text-center text-xs text-[var(--color-text-muted)]">
            No releases in this stage
          </div>
        )}
      </div>
    </div>
  );
}
