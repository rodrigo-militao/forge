import type { ReactNode } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  closestCorners,
} from "@dnd-kit/core";

const COLUMN_HEADERS: Record<string, { label: string; color: string }> = {
  building: { label: "Building", color: "var(--color-accent-primary)" },
  ready: { label: "Ready", color: "var(--color-accent-success)" },
  published: { label: "Published", color: "var(--color-bg-surface)" },
  archived: { label: "Archived", color: "var(--color-text-muted)" },
};

export function KanbanBoard({
  children,
  onDragEnd,
}: {
  children: ReactNode;
  onDragEnd: (event: DragEndEvent) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
      <div className="flex h-full gap-4 overflow-x-auto pb-4 pt-1">
        {children}
      </div>
    </DndContext>
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
  const header = COLUMN_HEADERS[status] ?? { label: status, color: "var(--color-text-muted)" };
  const { isOver, setNodeRef } = useDroppable({ id: `column-${status}` });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[400px] w-[320px] shrink-0 flex-col rounded-xl border transition-all duration-[var(--duration-base)] ${
        isOver
          ? "border-[var(--color-accent-primary)]/40 bg-[var(--color-accent-primary)]/[0.04]"
          : "border-[var(--color-border)]/10 bg-white/[0.015]"
      }`}
    >
      <div className="flex items-center gap-2 border-b border-[var(--color-border)]/10 px-4 py-3">
        <div
          className="flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium"
          style={{ backgroundColor: `${header.color}15`, color: header.color }}
        >
          {header.label}
        </div>
        <span className="text-xs text-[var(--color-text-muted)]">{count}</span>
      </div>

      <div className="flex flex-col gap-2 p-3">
        {children}
        {count === 0 && (
          <div className="mt-8 text-center text-xs text-[var(--color-text-muted)]">
            No releases in this stage
          </div>
        )}
      </div>
    </div>
  );
}
