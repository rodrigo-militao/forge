import { useTranslation } from "react-i18next";

interface ConfirmDialogProps {
  open: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

/**
 * A modal overlay confirm dialog.
 *
 * <ConfirmDialog open={bool} message={string} onConfirm={fn} onCancel={fn} />
 */
export function ConfirmDialog({
  open,
  message,
  onConfirm,
  onCancel,
  confirmLabel,
  cancelLabel,
}: ConfirmDialogProps) {
  const { t } = useTranslation();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onCancel}
    >
      <div
        className="mx-4 w-full max-w-sm rounded-xl border border-[var(--color-border)]/20 bg-[var(--color-bg-base)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm text-[var(--color-bg-surface)]">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="cursor-pointer rounded-lg border border-[var(--color-border)]/20 px-4 py-2 text-sm text-[var(--color-text-muted)] transition-colors hover:bg-white/10"
          >
            {cancelLabel ?? t("editor.cancel")}
          </button>
          <button
            onClick={onConfirm}
            className="cursor-pointer rounded-lg bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-[var(--color-accent-primary)]/90 active:scale-[0.97]"
          >
            {confirmLabel ?? t("editor.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
