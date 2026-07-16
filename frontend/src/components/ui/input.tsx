import { forwardRef, type InputHTMLAttributes } from "react";

const BASE_CLASS =
  "w-full rounded-lg border border-[var(--color-border)]/10 bg-white/5 px-4 py-2 text-sm text-[var(--color-bg-surface)] outline-none transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent-primary)]";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`${BASE_CLASS} ${className}`.trim()}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
