import { type ReactNode, useState } from "react";
import { ChevronRight } from "lucide-react";

interface CollapsiblePanelProps {
  title: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function CollapsiblePanel({ title, icon, defaultOpen = true, children }: CollapsiblePanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[var(--color-hover-subtle)] transition-colors rounded-md group"
      >
        {icon && <span className="shrink-0 text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)] transition-colors">{icon}</span>}
        <span className="text-xs font-medium text-[var(--color-text-secondary)] flex-1">{title}</span>
        <ChevronRight
          size={13}
          className="text-[var(--color-text-muted)] transition-all duration-200"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
        />
      </button>
      {open && <div className="px-3 pb-3 space-y-2">{children}</div>}
    </div>
  );
}
