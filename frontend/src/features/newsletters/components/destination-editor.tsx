import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../../api/client";
import { queryKeys } from "../../../lib/queryKeys";

interface DestinationEditorProps {
  value: string | null;
  onChange: (destination: string | null) => void;
  placeholder: string;
}

const DEFAULT_DESTINATIONS = ["Substack", "Markdown genérico", "Texto simples"];

export function DestinationEditor({ value, onChange, placeholder }: DestinationEditorProps) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value ?? "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: usedDestinations } = useQuery({
    queryKey: queryKeys.editions.destinations,
    queryFn: api.newsletters.listDestinations,
  });

  const allSuggestions = [
    ...DEFAULT_DESTINATIONS,
    ...(usedDestinations?.filter((d) => !DEFAULT_DESTINATIONS.includes(d)) ?? []),
  ];

  const filteredSuggestions = inputValue
    ? allSuggestions.filter((d) => d.toLowerCase().includes(inputValue.toLowerCase()))
    : allSuggestions;

  // Outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setEditing(false);
      }
    }
    if (showSuggestions || editing) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [showSuggestions, editing]);

  const handleSelect = useCallback((d: string) => {
    setInputValue(d);
    setShowSuggestions(false);
    setEditing(false);
    onChange(d);
  }, [onChange]);

  const handleBlur = useCallback(() => {
    onChange(inputValue || null);
  }, [inputValue, onChange]);

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex w-full cursor-pointer items-center rounded-lg border border-[var(--color-border)]/10 bg-white/5 px-3 py-1.5 text-xs text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-accent-primary)]/30 hover:bg-white/10 hover:text-[var(--color-bg-surface)]"
      >
        {value || placeholder}
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={inputValue}
        onChange={(e) => { setInputValue(e.target.value); setShowSuggestions(true); }}
        onFocus={() => setShowSuggestions(true)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSelect(inputValue);
          if (e.key === "Escape") { setShowSuggestions(false); (e.target as HTMLInputElement).blur(); }
        }}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[var(--color-border)]/10 bg-white/5 px-3 py-1.5 text-xs text-[var(--color-bg-surface)] outline-none transition-all focus:border-[var(--color-accent-primary)] focus:ring-1 focus:ring-[var(--color-accent-primary)]/30 placeholder:text-[var(--color-text-muted)]"
        autoFocus
      />
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-32 overflow-y-auto rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-bg-base)] p-1 shadow-lg">
          {filteredSuggestions.map((d) => (
            <button
              key={d}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(d)}
              className="flex w-full cursor-pointer rounded-md px-3 py-1.5 text-left text-xs text-[var(--color-bg-surface)] transition-colors hover:bg-white/10"
            >
              {d}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
