interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  ariaLabel?: string;
}

/**
 * A toggle/switch component styled as a sliding pill.
 *
 * <Toggle checked={bool} onChange={fn} />
 */
export function Toggle({ checked, onChange, ariaLabel }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onChange}
      className={`h-5 w-9 cursor-pointer rounded-full transition-colors duration-150 ${
        checked ? "bg-[var(--color-accent-primary)]" : "bg-white/15"
      }`}
    >
      <span
        className={`block h-4 w-4 translate-y-0.5 rounded-full bg-white transition-transform duration-150 ${
          checked ? "translate-x-[14px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
