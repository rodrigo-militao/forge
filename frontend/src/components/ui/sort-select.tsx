import { useRef, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { useOutsideClick } from "../../hooks/useOutsideClick";

interface SortOption {
  value: string;
  label: string;
}

interface SortSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SortOption[];
  label: string;
}

/**
 * A sort dropdown button with a scale-in popover.
 *
 * <SortSelect value={key} onChange={fn} options={[{value, label}]} label="Sort" />
 */
export function SortSelect({ value, onChange, options, label }: SortSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useOutsideClick(ref, () => setOpen(false), open);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--color-border)]/20 px-2.5 py-1.5 text-xs text-[var(--color-text-muted)] transition-all hover:bg-white/5 hover:text-[var(--color-bg-surface)] active:scale-[0.92]"
        data-tooltip={label}
        aria-label={label}
      >
        <ArrowUpDown size={14} />
        {label}
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-50 w-40 animate-[scaleIn_150ms_ease-out] rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-bg-base)] p-1.5 shadow-2xl ring-1 ring-black/30">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`flex w-full cursor-pointer rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                value === opt.value
                  ? "bg-[var(--color-accent-primary)]/20 text-[var(--color-accent-primary)]"
                  : "text-[var(--color-bg-surface)] hover:bg-white/10"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
